import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (dbUserError || !dbUser) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const { fetchWithRedis } = await import('@/lib/redis');
  let sessions;
  try {
    sessions = await fetchWithRedis(
      `api_sessions_${dbUser.id}`,
      async () => {
        const { data, error } = await supabase
          .from('interview_sessions')
          .select(`id, created_at, state, duration_seconds, overall_score, interview_type, reports(id, overall_score, recommendation, created_at)`)
          .eq('user_id', dbUser.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw new Error(error.message);
        return data;
      },
      300
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { interview_type, roadmap_id, role } = body;

  const { data: dbUser, error: dbUserError } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (dbUserError || !dbUser) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({
      user_id: dbUser.id,
      interview_type: interview_type || 'general',
      state: 'IN_PROGRESS',
      plan: { role: role || 'Software Engineer', roadmap_id },
    })
    .select();
    
  const session = data?.[0];

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session }, { status: 201 });
}

