import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id, is_recruiter').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Fetch pipelines created by this recruiter's tenant or user
  const { data: pipelines, error } = await supabase
    .from('hiring_pipelines')
    .select(`
      *,
      pipeline_candidates (
        id, name, email, stage, composite_score, round_scores, invited_at, completed_at,
        users ( full_name, email, avatar_url )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });

  return NextResponse.json({ pipelines: pipelines || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { role_name, rounds, pass_threshold, deadline } = body;

  if (!role_name || !rounds) {
    return NextResponse.json({ error: 'role_name and rounds are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('hiring_pipelines')
    .insert({ role_name, rounds, pass_threshold: pass_threshold || 70, deadline, status: 'active' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });

  return NextResponse.json({ pipeline: data }, { status: 201 });
}
