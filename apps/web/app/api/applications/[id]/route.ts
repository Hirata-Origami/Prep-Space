import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUSES = ['saved', 'applied', 'screen', 'interview', 'offer', 'rejected', 'withdrawn'];
const FIELDS = ['company', 'role', 'status', 'url', 'jd_text', 'notes', 'resume_version_id', 'applied_at', 'next_step', 'next_step_at'];

async function owner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, dbUser: null };
  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  return { supabase, dbUser };
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, dbUser } = await owner();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of FIELDS) if (f in body) updates[f] = body[f] === '' ? null : body[f];
  if (updates.status && !STATUSES.includes(updates.status as string)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  }
  // A move to "applied" stamps the date the first time
  if (updates.status === 'applied' && !('applied_at' in body)) updates.applied_at = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.from('applications').update(updates).eq('id', id).eq('user_id', dbUser.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { supabase, dbUser } = await owner();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase.from('applications').delete().eq('id', id).eq('user_id', dbUser.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: true });
}
