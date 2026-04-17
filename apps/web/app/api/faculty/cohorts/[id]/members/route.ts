import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify this is a group the faculty member created or administers
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Get group members
  const { data: groupMembers, error: memberError } = await supabase
    .from('group_members')
    .select('user_id, users(id, full_name, email)')
    .eq('group_id', groupId);

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });
  if (!groupMembers || groupMembers.length === 0) return NextResponse.json({ members: [] });

  const memberUserIds = groupMembers.map((m: { user_id: string }) => m.user_id);

  // Get interview reports for all members
  const { data: reports } = await supabase
    .from('interview_reports')
    .select('user_id, overall_score, hire_recommendation, created_at')
    .in('user_id', memberUserIds)
    .order('created_at', { ascending: false });

  const reportsByUser = (reports || []).reduce((acc: Record<string, { overall_score: number; hire_recommendation: string }[]>, r) => {
    if (!acc[r.user_id]) acc[r.user_id] = [];
    acc[r.user_id].push(r);
    return acc;
  }, {});

  const members = groupMembers.map((gm: { user_id: string; users: { id: string; full_name?: string; email: string } | { id: string; full_name?: string; email: string }[] | null }) => {
    const userInfo = Array.isArray(gm.users) ? gm.users[0] : gm.users;
    const userReports = reportsByUser[gm.user_id] || [];
    const avgScore = userReports.length > 0
      ? Math.round(userReports.reduce((s, r) => s + r.overall_score, 0) / userReports.length)
      : 0;
    const ready = userReports.some(r => r.hire_recommendation?.includes('Hire'));

    return {
      id: gm.user_id,
      full_name: userInfo?.full_name,
      email: userInfo?.email || '',
      avgScore,
      sessionsCount: userReports.length,
      ready,
    };
  });

  return NextResponse.json({ members });
}
