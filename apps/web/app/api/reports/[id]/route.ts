import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch report first (without user_id filter to avoid int/uuid mismatch)
  const { data: report, error } = await supabase
    .from('interview_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !report) {
    console.error('[GET /api/reports/[id]] Not found:', id, error?.message);
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Verify ownership
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser || (report.user_id !== dbUser.id && report.user_id !== user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Join session including plan for context
  const { data: session } = await supabase
    .from('interview_sessions')
    .select('id, created_at, interview_type, plan, duration_seconds')
    .eq('id', report.session_id)
    .maybeSingle();

  if (session) {
    (report as any).interview_sessions = session;
    // Propagate duration if not on report
    if (!report.duration_seconds && session.duration_seconds) {
      (report as any).duration_seconds = session.duration_seconds;
    }
  }

  return NextResponse.json({ report });
}
