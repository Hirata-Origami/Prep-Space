import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Find candidate entries that match this user's email
  const { data: authUserData } = await supabase.auth.getUser();
  const email = authUserData.user?.email;
  if (!email) return NextResponse.json({ invites: [] });

  const { data: invites, error } = await supabase
    .from('pipeline_candidates')
    .select(`
      id, name, email, stage, composite_score, round_scores, invited_at, completed_at,
      pipeline_id,
      hiring_pipelines (
        id, role_name, rounds, pass_threshold, status
      )
    `)
    .eq('email', email)
    .not('stage', 'eq', 'rejected')
    .order('invited_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: invites || [] });
}
