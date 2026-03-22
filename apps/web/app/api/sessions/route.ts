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
        // Fetch sessions first
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('interview_sessions')
          .select(`id, created_at, state, duration_seconds, interview_type`)
          .eq('user_id', dbUser.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (sessionsError) {
          console.error("[GET /api/sessions] Supabase sessions error:", sessionsError);
          throw new Error(sessionsError.message);
        }

        if (!sessionsData || sessionsData.length === 0) return [];

        // Fetch corresponding reports manually because of missing FK relationship in DB
        const sessionIds = sessionsData.map(s => s.id);
        const { data: reportsData, error: reportsError } = await supabase
          .from('interview_reports')
          .select('id, session_id, overall_score, hire_recommendation, generated_at')
          .in('session_id', sessionIds);

        if (reportsError) {
          console.error("[GET /api/sessions] Supabase reports error:", reportsError);
          // Don't fail the whole request if reports fail, just return sessions without reports
          return sessionsData.map(s => ({ ...s, interview_reports: [] }));
        }

        // Map reports to sessions
        return sessionsData.map(session => ({
          ...session,
          interview_reports: reportsData.filter(r => r.session_id === session.id)
        }));
      },
      300
    );
  } catch (err: any) {
    console.error("[GET /api/sessions] Unexpected Error:", err);
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
  const { interview_type, roadmap_id, role, company, round } = body;

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
      plan: { role: role || 'Software Engineer', roadmap_id, company, round },
    })
    .select();
    
  const session = data?.[0];

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session }, { status: 201 });
}

