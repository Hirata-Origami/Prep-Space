import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';
import { CODE_ACTIONS, DIAGRAM_ACTIONS, runCodeAction, runDiagramAction, type CodeAction, type DiagramAction } from '@/lib/workspace/ai';
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
}

/**
 * POST -> the model writes or draws.
 * code target:    { action: review|explain|fix|solve|optimize|tests, language, code, instruction? } -> { message, code? }
 * diagram target: { action: draw|edit|critique|writeup, instruction, diagram, notes? }             -> { message, diagram?, writeup? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as Body;
  const instruction = (body.instruction ?? '').trim();

  const { data: profile } = await supabase.from('users').select('gemini_api_key').eq('supabase_uid', user.id).single();
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
