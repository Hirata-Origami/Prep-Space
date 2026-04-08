import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { createAdminClient, createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch report via admin client to allow recruiter/faculty access
  const { data: report, error } = await adminSupabase
    .from('interview_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Get current user's DB profiles
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Permission Logic:
  // 1. Owner (the candidate)
  const isOwner = report.user_id === dbUser.id || report.user_id === user.id;
  
  // 2. Recruiter check (if recruiter, check if they manage this candidate's pipeline)
  let isRecruiterAuthor = false;
  if (dbUser.role === 'recruiter') {
    // Check if report.session_id belongs to a pipeline this recruiter owns
    // Actually, report has a session_id, and session may have invite_candidate_id
    const { data: session } = await adminSupabase
      .from('interview_sessions')
      .select('invite_candidate_id')
      .eq('id', report.session_id)
      .maybeSingle();
      
    if (session?.invite_candidate_id) {
       const { data: candidate } = await adminSupabase
         .from('pipeline_candidates')
         .select('pipeline_id')
         .eq('id', session.invite_candidate_id)
         .maybeSingle();
         
       if (candidate?.pipeline_id) {
         const { data: pipeline } = await adminSupabase
           .from('hiring_pipelines')
           .select('created_by')
           .eq('id', candidate.pipeline_id)
           .maybeSingle();
           
         if (pipeline?.created_by === dbUser.id) isRecruiterAuthor = true;
       }
    }
  }

  if (!isOwner && !isRecruiterAuthor) {
    return NextResponse.json({ error: 'Unauthorized access to this report' }, { status: 401 });
  }

  // Join session including plan for context
  const { data: session } = await supabase
    .from('interview_sessions')
    .select('id, created_at, interview_type, plan, duration_seconds')
    .eq('id', report.session_id)
    .maybeSingle();

  if (session) {
    (report as Record<string, unknown>).interview_sessions = session;
    // Propagate duration if not on report
    if (!report.duration_seconds && session.duration_seconds) {
      (report as Record<string, unknown>).duration_seconds = session.duration_seconds;
    }
  }

  return NextResponse.json({ report });
}
