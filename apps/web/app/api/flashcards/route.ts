import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateSM2, type ReviewRating } from '@/lib/flashcards/sm2';

export const dynamic = 'force-dynamic';

const MIGRATION_HINT = 'The flashcards table is missing. Run supabase/migrations/004_practice_features.sql in the Supabase SQL editor.';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ cards: [], dueCards: [], stats: { total: 0, dueToday: 0, mastered: 0, learning: 0 } });

  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: cards, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('due_date', { ascending: true });

    if (error) {
      const missing = /relation|does not exist|schema cache/i.test(error.message);
      return NextResponse.json({ cards: [], dueCards: [], stats: { total: 0, dueToday: 0, mastered: 0, learning: 0 }, setupNeeded: missing, error: missing ? MIGRATION_HINT : error.message }, { status: missing ? 200 : 500 });
    }

    const allCards = cards ?? [];
    const dueCards = allCards.filter(c => !c.due_date || c.due_date <= today);
    const mastered = allCards.filter(c => (c.interval ?? 0) >= 21).length;
    const learning = allCards.length - mastered;

    return NextResponse.json({
      cards: allCards,
      dueCards,
      stats: {
        total: allCards.length,
        dueToday: dueCards.length,
        mastered,
        learning,
      },
    });
  } catch {
    return NextResponse.json({ cards: [], dueCards: [], stats: { total: 0, dueToday: 0, mastered: 0, learning: 0 } });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();

  if (body.action === 'review') {
    const { id, rating } = body as { id: string; rating: ReviewRating };
    if (![1, 2, 3, 4].includes(rating)) return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    const { data: card } = await supabase.from('flashcards').select('*').eq('id', id).eq('user_id', dbUser.id).single();
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    const sm2 = calculateSM2(
      {
        interval: card.interval || 1,
        repetition: card.repetition || 0,
        easeFactor: card.ease_factor || 2.5,
      },
      rating
    );

    const { data: updated, error } = await supabase
      .from('flashcards')
      .update({
        interval: sm2.interval,
        repetition: sm2.repetition,
        ease_factor: sm2.easeFactor,
        due_date: sm2.nextDueDate,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', dbUser.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ card: updated });
  }

  if (body.action === 'create') {
    const { question, answer, category, difficulty } = body;
    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    const { data: created, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: dbUser.id,
        question: question.trim(),
        answer: answer.trim(),
        category: category?.trim() || 'General',
        difficulty: difficulty || 'medium',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ card: created });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Card id required' }, { status: 400 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const { error } = await supabase.from('flashcards').delete().eq('id', id).eq('user_id', dbUser.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
