import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';
import { CODE_ACTIONS, DIAGRAM_ACTIONS, runCodeAction, runDiagramAction, runJudgeAction, type CodeAction, type DiagramAction } from '@/lib/workspace/ai';
import { LANGUAGES, sanitizeDiagram, type LanguageId } from '@/lib/workspace/types';
import { mergeIntoExisting } from '@/lib/workspace/layout';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface Body {
  target?: 'code' | 'diagram';
  action?: string;
  instruction?: string;
  language?: string;
  code?: string;
  diagram?: unknown;
  notes?: string;
  docId?: string;
  problemTitle?: string;
  track?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * POST -> the model writes, judges, or draws.
 * code target:    { action: review|explain|fix|solve|optimize|tests|problem|judge, language, code, instruction?, docId?, problemTitle?, track?, difficulty? } -> { message, code?, judge? }
 * diagram target: { action: draw|edit|critique|writeup, instruction, diagram, notes? }                                                          -> { message, diagram?, writeup? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as Body;
  const instruction = (body.instruction ?? '').trim();

  const { data: profile } = await supabase.from('users').select('id, gemini_api_key').eq('supabase_uid', user.id).single();
  let model;
  try {
    model = getModel(profile?.gemini_api_key, 'FLASH');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini API key configured' }, { status: 400 });
  }

  try {
    if (body.target === 'code') {
      const action = body.action as CodeAction;
      if (!CODE_ACTIONS.includes(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
      const language = (LANGUAGES.some(l => l.id === body.language) ? body.language : 'markdown') as LanguageId;
      if (!body.code?.trim() && action !== 'solve' && action !== 'problem') return NextResponse.json({ error: 'Write some code first.' }, { status: 400 });
      if (action === 'solve' && !instruction && !body.code?.trim()) {
        return NextResponse.json({ error: 'Describe the problem, or paste it into the editor.' }, { status: 400 });
      }

      if (action === 'judge') {
        const problemContext = body.notes || instruction || body.code?.slice(0, 500) || '';
        const judgeResult = await runJudgeAction(model, language, body.code ?? '', problemContext);

        // Try saving submission to coding_submissions and award XP
        if (profile?.id) {
          try {
            const track = body.track || (language === 'sql' ? 'SQL Practice' : 'Algorithms & Data Structures');
            const difficulty = body.difficulty || 'medium';
            const title = body.problemTitle || (body.notes ? body.notes.split('\n')[0].replace(/^#*\s*/, '').slice(0, 100) : 'Coding Challenge');

            const { data: sub } = await supabase.from('coding_submissions').insert({
              user_id: profile.id,
              workspace_doc_id: body.docId || null,
              title: title || 'Coding Problem',
              language,
              track,
              difficulty,
              status: judgeResult.status,
              score: judgeResult.score,
              time_complexity: judgeResult.timeComplexity,
              space_complexity: judgeResult.spaceComplexity,
              feedback: judgeResult.feedback,
              test_results: judgeResult.testResults,
              code: body.code ?? '',
            }).select('id').single();

            if (sub?.id) {
              judgeResult.submissionId = sub.id;
            }

            if (judgeResult.xpAwarded > 0) {
              await supabase.rpc('increment_xp', { user_id: profile.id, amount: judgeResult.xpAwarded });
            }
          } catch (dbErr) {
            console.warn('Could not record coding submission:', dbErr);
          }
        }

        return NextResponse.json({
          message: judgeResult.message,
          judge: judgeResult,
        });
      }

      return NextResponse.json(await runCodeAction(model, action, language, body.code ?? '', instruction));
    }

    if (body.target === 'diagram') {
      const action = body.action as DiagramAction;
      if (!DIAGRAM_ACTIONS.includes(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
      const existing = sanitizeDiagram(body.diagram, 200);
      if ((action === 'critique' || action === 'writeup') && !existing.nodes.length) {
        return NextResponse.json({ error: 'Draw something first, or ask the AI to draw it.' }, { status: 400 });
      }
      if ((action === 'draw' || action === 'edit') && !instruction && !body.notes?.trim()) {
        return NextResponse.json({ error: 'Describe what to draw.' }, { status: 400 });
      }
      const out = await runDiagramAction(model, action, instruction, existing, body.notes ?? '');
      if (out.diagram) {
        // "draw" replaces the graph but keeps the user's pen strokes; "edit" also keeps positions
        const merged = action === 'edit' ? mergeIntoExisting(existing, out.diagram) : mergeIntoExisting({ ...existing, nodes: [], edges: [] }, out.diagram);
        return NextResponse.json({ message: out.message, diagram: merged });
      }
      return NextResponse.json(out);
    }

    return NextResponse.json({ error: 'Unknown target.' }, { status: 400 });
  } catch (e) {
    console.error('Workspace AI error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'The AI request failed' }, { status: 500 });
  }
}
