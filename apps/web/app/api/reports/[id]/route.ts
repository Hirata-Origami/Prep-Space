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

  console.log("[GET /api/reports/[id]] Fetching report for ID:", id);

  const { data: report, error } = await supabase
    .from('interview_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !report) {
    console.error("[GET /api/reports/[id]] Report not found or DB error:", error, "ID requested:", id);
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  console.log("[GET /api/reports/[id]] Found report:", report.id);

  // Manual join for session since FK is missing
  const { data: session } = await supabase
    .from('interview_sessions')
    .select('id, created_at, interview_type')
    .eq('id', report.session_id)
    .single();

  if (session) {
    (report as any).interview_sessions = session;
  }

  // Ensure the report belongs to the user
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser || report.user_id !== dbUser.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ report });
}
