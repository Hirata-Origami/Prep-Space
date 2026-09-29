import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const APPLICATION_STATUSES = ['saved', 'applied', 'screen', 'interview', 'offer', 'rejected', 'withdrawn'] as const;

const FIELDS = ['company', 'role', 'status', 'url', 'jd_text', 'notes', 'resume_version_id', 'applied_at', 'next_step', 'next_step_at'] as const;

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, dbUser: null };
  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  return { supabase, dbUser };
}

const MIGRATION_HINT = 'The applications table is missing. Run supabase/migrations/004_practice_features.sql in the Supabase SQL editor.';

export async function GET() {
  const { supabase, dbUser } = await currentUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('applications')
    .select('id, company, role, status, url, jd_text, notes, resume_version_id, applied_at, next_step, next_step_at, created_at, updated_at')
    .eq('user_id', dbUser.id)
    .order('updated_at', { ascending: false });

  if (error) {
    const missing = /relation|does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ applications: [], setupNeeded: missing, error: missing ? MIGRATION_HINT : error.message }, { status: missing ? 200 : 500 });
  }
  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, dbUser } = await currentUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const row: Record<string, unknown> = { user_id: dbUser.id };
  for (const f of FIELDS) if (f in body && body[f] !== '') row[f] = body[f];

  if (!row.company || !row.role) return NextResponse.json({ error: 'Company and role are required.' }, { status: 400 });
  if (row.status && !APPLICATION_STATUSES.includes(row.status as (typeof APPLICATION_STATUSES)[number])) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 });
  }

  const { data, error } = await supabase.from('applications').insert(row).select().single();
  if (error) {
    const missing = /relation|does not exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? MIGRATION_HINT : error.message }, { status: 500 });
  }
  return NextResponse.json({ application: data });
}
