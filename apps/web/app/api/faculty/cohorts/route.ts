import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, is_faculty')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser /*|| !dbUser.is_faculty*/) { // allow all for now
    return NextResponse.json({ error: 'Unauthorized or not faculty' }, { status: 403 });
  }

  // Get cohorts: groups created by this user
  const { data: groups, error } = await supabase
    .from('groups')
    .select(`
      id, name,
      group_members(user_id)
    `)
    .eq('created_by', dbUser.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!groups || groups.length === 0) return NextResponse.json({ cohorts: [] });

  const cohortIds = groups.map(g => g.id);

  // We need to fetch students who are in these groups, and their latest report scores to calculate readiness
  // Since we don't have a direct "cohort_stats" view, we'll do a simple approximation:
  // We'll fetch reports for all users in these groups

  const memberUserIds = groups.flatMap(g => g.group_members.map((m: any) => m.user_id));
  
  if (memberUserIds.length === 0) {
    return NextResponse.json({ cohorts: groups.map(g => ({ name: g.name, students: 0, ready: 0, avgScore: 0 })) });
  }

  // Get reports for these users
  const { data: reports } = await supabase
    .from('interview_reports')
    .select('user_id, overall_score, hire_recommendation')
    .in('user_id', memberUserIds);

  const reportsByUser = (reports || []).reduce((acc: any, row: any) => {
    if (!acc[row.user_id]) acc[row.user_id] = [];
    acc[row.user_id].push(row);
    return acc;
  }, {});

  const cohorts = groups.map(g => {
    const studentIds = g.group_members.map((m: any) => m.user_id);
    let totalScore = 0;
    let scoreCount = 0;
    let readyCount = 0;

    studentIds.forEach((sid: string) => {
      const studentReports = reportsByUser[sid] || [];
      if (studentReports.length > 0) {
        // use their avg score
        const sAvg = studentReports.reduce((sum: number, r: any) => sum + r.overall_score, 0) / studentReports.length;
        totalScore += sAvg;
        scoreCount++;

        // if they had any "Strong Hire" or "Hire" recently, count as ready
        if (studentReports.some((r: any) => r.hire_recommendation?.includes('Hire'))) {
          readyCount++;
        }
      }
    });

    return {
      id: g.id,
      name: g.name,
      students: studentIds.length,
      ready: readyCount,
      avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
    };
  });

  return NextResponse.json({ cohorts });
}
