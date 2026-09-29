import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';
import { parseJsonReply } from '@/lib/resume/merge';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ stories: [], resumeBullets: [] });

  try {
    const [storiesRes, resumesRes] = await Promise.all([
      supabase
        .from('star_stories')
        .select('*')
        .eq('user_id', dbUser.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('resumes')
        .select('profile_sections')
        .eq('user_id', dbUser.id)
        .limit(1)
        .maybeSingle(),
    ]);

    const stories = storiesRes.data ?? [];

    // Extract experience bullets from resume profile_sections if present
    const bullets: string[] = [];
    const sections = (resumesRes.data?.profile_sections ?? {}) as Record<string, unknown>;
    if (Array.isArray(sections.experience)) {
      for (const exp of sections.experience as { highlights?: string[]; description?: string }[]) {
        if (Array.isArray(exp.highlights)) {
          bullets.push(...exp.highlights);
        } else if (typeof exp.description === 'string') {
          bullets.push(exp.description);
        }
      }
    }

    return NextResponse.json({ stories, resumeBullets: bullets.slice(0, 15) });
  } catch {
    return NextResponse.json({ stories: [], resumeBullets: [] });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id, gemini_api_key').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();

  if (body.operation === 'save') {
    const { id, title, theme, situation, task, action, result, metrics, feedback } = body;
    if (!title?.trim() || !situation?.trim() || !action?.trim()) {
      return NextResponse.json({ error: 'Title, situation, and action are required' }, { status: 400 });
    }

    if (id) {
      const { data: updated, error } = await supabase
        .from('star_stories')
        .update({
          title: title.trim(),
          theme: theme || 'General',
          situation: situation.trim(),
          task: (task || '').trim(),
          action: action.trim(),
          result: (result || '').trim(),
          metrics: metrics || null,
          feedback: feedback || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', dbUser.id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ story: updated });
    } else {
      const { data: created, error } = await supabase
        .from('star_stories')
        .insert({
          user_id: dbUser.id,
          title: title.trim(),
          theme: theme || 'General',
          situation: situation.trim(),
          task: (task || '').trim(),
          action: action.trim(),
          result: (result || '').trim(),
          metrics: metrics || null,
          feedback: feedback || null,
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ story: created });
    }
  }

  if (body.operation === 'polish') {
    let model;
    try {
      model = getModel(dbUser.gemini_api_key, 'FLASH');
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini key' }, { status: 400 });
    }

    const { rawInput, theme, resumeBullet } = body;
    const prompt = `You are a principal bar raiser / behavioural interview coach.
Convert this candidate story/bullet point into a compelling, high-scoring STAR response:
Theme: ${theme || 'General'}
Resume bullet: ${resumeBullet || '(none)'}
Raw notes / Story:
${rawInput}

Requirements:
- Situation: 1-2 concise sentences establishing context, company scale, and the core stakes.
- Task: 1 crisp sentence clarifying the specific challenge and the candidate's personal ownership.
- Action: 3-4 bullet sentences using strong active verbs. Emphasize "I" over "we". Describe technical decision-making, trade-offs, and conflict navigation.
- Result: 1-2 punchy sentences with concrete, quantifiable outcomes (% improvements, latency reductions, revenue, uptime).
- Score: 1-100 rating based on FAANG/top tech behavioral bar.
- Critique: 2 actionable bullet points on how to make the delivery even more memorable.

Return ONLY JSON:
{
  "title": "Short title",
  "situation": "...",
  "task": "...",
  "action": "...",
  "result": "...",
  "metrics": "e.g. 45% latency drop, $150K saved",
  "score": 85,
  "feedback": "Critique and delivery tips"
}`;

    try {
      const res = await withRetry(() => model.generateContent([{ text: prompt }]));
      const parsed = parseJsonReply<{
        title?: string;
        situation?: string;
        task?: string;
        action?: string;
        result?: string;
        metrics?: string;
        score?: number;
        feedback?: string;
      }>(res.response.text());

      return NextResponse.json({ polished: parsed });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Polish failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Story id required' }, { status: 400 });

  const { error } = await supabase.from('star_stories').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
