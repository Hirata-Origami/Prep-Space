import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LANGUAGES, sanitizeDiagram } from '@/lib/workspace/types';

export const dynamic = 'force-dynamic';

async function owner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, dbUser: null };
  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  return { supabase, dbUser };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, dbUser } = await owner();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('workspace_docs')
    .select('id, title, language, content, diagram, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', dbUser.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  return NextResponse.json({ doc: { ...data, diagram: sanitizeDiagram(data.diagram, 200) } });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, dbUser } = await owner();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { title?: string; language?: string; content?: string; diagram?: unknown };
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === 'string') updates.title = body.title.trim().slice(0, 200) || 'Untitled';
  if (typeof body.language === 'string' && LANGUAGES.some(l => l.id === body.language)) updates.language = body.language;
  if (typeof body.content === 'string') updates.content = body.content.slice(0, 200_000);
  if (body.diagram !== undefined) updates.diagram = sanitizeDiagram(body.diagram, 200);

  const { error } = await supabase.from('workspace_docs').update(updates).eq('id', id).eq('user_id', dbUser.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true, updated_at: updates.updated_at });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, dbUser } = await owner();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('workspace_docs').delete().eq('id', id).eq('user_id', dbUser.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
