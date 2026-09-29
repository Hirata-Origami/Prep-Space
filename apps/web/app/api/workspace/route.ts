import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LANGUAGES, sanitizeDiagram } from '@/lib/workspace/types';

export const dynamic = 'force-dynamic';

const MIGRATION_HINT = 'The workspace table is missing. Run supabase/migrations/003_workspace.sql in the Supabase SQL editor.';
const isMissing = (message: string) => /relation|does not exist|schema cache/i.test(message);

async function owner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, dbUser: null };
  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  return { supabase, dbUser };
}

/** GET: the user's documents, newest first. Content is trimmed to a preview. */
export async function GET() {
  const { supabase, dbUser } = await owner();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('workspace_docs')
    .select('id, title, language, content, diagram, updated_at')
    .eq('user_id', dbUser.id)
    .order('updated_at', { ascending: false });

  if (error) {
    const missing = isMissing(error.message);
    return NextResponse.json({ docs: [], setupNeeded: missing, error: missing ? MIGRATION_HINT : error.message }, { status: missing ? 200 : 500 });
  }
  const docs = (data ?? []).map(d => ({
    id: d.id,
    title: d.title,
    language: d.language,
    preview: String(d.content ?? '').slice(0, 160),
    nodeCount: Array.isArray((d.diagram as { nodes?: unknown[] })?.nodes) ? (d.diagram as { nodes: unknown[] }).nodes.length : 0,
    updated_at: d.updated_at,
  }));
  return NextResponse.json({ docs });
}

/** POST { title?, language? } -> a new empty document. */
export async function POST(request: Request) {
  const { supabase, dbUser } = await owner();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { title?: string; language?: string; content?: string; diagram?: unknown };
  const language = LANGUAGES.some(l => l.id === body.language) ? body.language : 'markdown';
  const { data, error } = await supabase
    .from('workspace_docs')
    .insert({
      user_id: dbUser.id,
      title: (body.title?.trim() || 'Untitled').slice(0, 200),
      language,
      content: (body.content ?? '').slice(0, 200_000),
      diagram: sanitizeDiagram(body.diagram),
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: isMissing(error.message) ? MIGRATION_HINT : error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
