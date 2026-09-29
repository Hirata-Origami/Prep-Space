import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';
import { CODE_ACTIONS, DIAGRAM_ACTIONS, runCodeAction, runDiagramAction, runJudgeAction, type CodeAction, type DiagramAction } from '@/lib/workspace/ai';
import { LANGUAGES, sanitizeDiagram, type LanguageId } from '@/lib/workspace/types';
import { mergeIntoExisting } from '@/lib/workspace/layout';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { DIFFICULTY_CONFIG } from '@/lib/workspace/practice';

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
  /** Real output from running the code in the browser, when the user ran it. */
  execution?: string;
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
        // practice documents carry their problem in the header and the level in the title
        let docTitle = body.problemTitle ?? '';
        let docContent = '';
        if (body.docId) {
          const { data: doc } = await supabase.from('workspace_docs').select('title, content').eq('id', body.docId).eq('user_id', profile?.id ?? '').maybeSingle();
          if (doc) {
            docTitle = doc.title;
            docContent = doc.content;
          }
        }
        const LEVEL_TAG = /^\[(EASY|MEDIUM|HARD)\]\s*/i;
        const level = LEVEL_TAG.exec(docTitle)?.[1]?.toLowerCase() as 'easy' | 'medium' | 'hard' | undefined;
        const trackName = /Track:\s*(.+?)\s{2,}Difficulty:/.exec(docContent)?.[1];
        const problemContext = docContent.slice(0, 3000) || instruction || body.code?.slice(0, 500) || '';
        const judgeResult = await runJudgeAction(model, language, body.code ?? '', problemContext, typeof body.execution === 'string' ? body.execution : undefined);

        // Try saving submission to coding_submissions and award XP
        if (profile?.id) {
          try {
            const track = trackName || (language === 'sql' ? 'SQL practice' : 'Free practice');
            const difficulty = level && level in DIFFICULTY_CONFIG ? level : 'medium';
            const title = (docTitle.replace(LEVEL_TAG, '') || 'Coding challenge').slice(0, 100);

            // XP is decided here, never by the client or the model, and each problem pays out once
            const { data: prior } = await supabase
              .from('coding_submissions')
              .select('status')
              .eq('user_id', profile.id)
              .eq('title', title)
              .eq('language', language);
            const alreadyPassed = (prior ?? []).some(p => p.status === 'passed');
            const firstTry = (prior ?? []).length === 0;
            const base = DIFFICULTY_CONFIG[difficulty].xp;
            judgeResult.xpAwarded = alreadyPassed ? 0 : judgeResult.status === 'passed' ? base : firstTry && judgeResult.status === 'partial' ? Math.round(base * 0.3) : 0;

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

            if (judgeResult.xpAwarded > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
              // increment_xp is locked to the service role (see migration 004)
              const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
              await admin.rpc('increment_xp', { user_id: profile.id, amount: judgeResult.xpAwarded });
            } else {
              judgeResult.xpAwarded = 0;
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
