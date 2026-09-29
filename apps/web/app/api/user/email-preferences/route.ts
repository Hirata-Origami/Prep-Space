import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const isMissingColumn = (message: string) => /email_updates|column|schema cache/i.test(message);

/** GET: whether weekly and daily emails are on. `available` is false until migration 005 has run. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.from('users').select('email_updates').eq('supabase_uid', user.id).maybeSingle();
  if (error) {
    return isMissingColumn(error.message)
      ? NextResponse.json({ enabled: true, available: false })
      : NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ enabled: data?.email_updates !== false, available: true });
}

/** PUT { enabled }: turn the weekly digest and daily tip on or off. Report-ready emails are always sent. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { enabled } = (await request.json()) as { enabled?: boolean };
  if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'Send enabled as true or false.' }, { status: 400 });

  const { error } = await supabase.from('users').update({ email_updates: enabled }).eq('supabase_uid', user.id);
  if (error) {
    return isMissingColumn(error.message)
      ? NextResponse.json({ error: 'Run supabase/migrations/004_practice_features.sql first.' }, { status: 409 })
      : NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ enabled });
}
