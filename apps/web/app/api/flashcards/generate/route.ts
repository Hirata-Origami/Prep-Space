import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { parseJsonReply } from '@/lib/resume/merge';

export const dynamic = 'force-dynamic';

interface GeneratedCard {
  question: string;
  answer: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id, gemini_api_key').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let model;
  try {
    model = getModel(dbUser.gemini_api_key, 'FLASH');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini key' }, { status: 400 });
  }

  // Fetch the user's latest 3 interview reports to extract weak points
  const { data: reports } = await supabase
    .from('interview_reports')
    .select('id, overall_score, hire_recommendation, analysis')
    .eq('user_id', dbUser.id)
    .order('generated_at', { ascending: false })
    .limit(3);

  const weakPoints: string[] = [];

  if (reports && reports.length > 0) {
    for (const r of reports) {
      const a = r.analysis as Record<string, unknown> | null;
      if (!a) continue;

      if (Array.isArray(a.areas_for_improvement)) {
        weakPoints.push(...a.areas_for_improvement.map(String));
      }
      if (Array.isArray(a.next_focus_areas)) {
        weakPoints.push(...a.next_focus_areas.map(String));
      }
      if (Array.isArray(a.competencies)) {
        for (const comp of a.competencies as { name?: string; score?: number; feedback?: string }[]) {
          if (comp.score !== undefined && comp.score < 7) {
            weakPoints.push(`${comp.name || 'Skill'}: ${comp.feedback || 'Needs practice'}`);
          }
        }
      }
    }
  }

  const prompt = `You are an expert technical interview tutor creating spaced repetition flashcards.
Target Candidate Weak Areas from Interview Feedback:
${weakPoints.length > 0 ? weakPoints.slice(0, 8).map(w => `- ${w}`).join('\n') : '- System design fundamentals, database concurrency, caching trade-offs, and algorithm time complexities'}

Generate 5 high-yield active-recall interview flashcards addressing these weak points.
Requirements:
- "question": Sharp, specific interview question (conceptual, algorithmic, architectural, or behavioral).
- "answer": Clear, concise, model answer with core intuition and key terms (2-3 sentences max).
- "category": Short domain tag (e.g., 'System Design', 'Algorithms', 'Databases', 'Networking').
- "difficulty": 'easy' | 'medium' | 'hard'.

Return ONLY valid JSON:
{
  "cards": [
    {
      "question": "What is the difference between optimistic and pessimistic locking, and when would you choose each?",
      "answer": "Pessimistic locking locks the record on read until transaction commit (preventing any concurrent modifications); optimistic locking allows concurrent reads and checks version numbers at write time. Use optimistic for high-read/low-contention workflows; pessimistic for high-contention financial ledgers.",
      "category": "Databases",
      "difficulty": "medium"
    }
  ]
}`;

  try {
    const result = await withRetry(() => model.generateContent([{ text: prompt }]));
    const parsed = parseJsonReply<{ cards?: GeneratedCard[] }>(result.response.text());
    const cards = parsed.cards ?? [];

    if (cards.length === 0) {
      return NextResponse.json({ error: 'Could not generate flashcards' }, { status: 500 });
    }

    const reportId = reports?.[0]?.id || null;
    const inserts = cards.map(c => ({
      user_id: dbUser.id,
      report_id: reportId,
      question: c.question,
      answer: c.answer,
      category: c.category || 'Interview Prep',
      difficulty: c.difficulty || 'medium',
      interval: 1,
      repetition: 0,
      ease_factor: 2.5,
      due_date: new Date().toISOString().split('T')[0],
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('flashcards')
      .insert(inserts)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ cards: inserted, count: inserted?.length ?? 0 });
  } catch (e) {
    console.error('Flashcard generation error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 500 });
  }
}
