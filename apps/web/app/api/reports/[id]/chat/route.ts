import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function POST(
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

  // Fetch report via admin client
  const { data: report, error: reportError } = await adminSupabase
    .from('interview_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (reportError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, role, gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Ownership Check
  const isOwner = report.user_id === dbUser.id || report.user_id === user.id;
  
  let isRecruiterAuthor = false;
  if (dbUser.role === 'recruiter') {
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { message, chat_history } = body;

  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });

  let model;
  try {
    model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');
  } catch (e: unknown) {
    const msg = e instanceof Error ? (e instanceof Error ? e.message : "Unknown error") : 'No Gemini API key configured';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const analysis = report.analysis || {};
  const scores = analysis.scores || {};
  const strengths = (analysis.strengths || []).join(', ');
  const improvements = (analysis.improvements || []).join(', ');
  const summary = analysis.summary || '';
  const role = report.interview_sessions?.plan?.role || report.interview_sessions?.interview_type || 'Software Engineer';
  const interviewType = report.interview_sessions?.interview_type || 'technical';
  const durationMins = report.duration_seconds ? Math.round(report.duration_seconds / 60) : null;
  const pacing = analysis.session_pacing || null;

  const systemContext = `You are an expert career coach and technical interview mentor for PrepSpace.
You are helping a candidate improve based on their interview report.

INTERVIEW REPORT CONTEXT:
- Role: ${role}
- Interview Type: ${interviewType}
- Overall Score: ${report.overall_score}%
- Duration: ${durationMins != null ? `${durationMins} minutes` : 'unknown'}${pacing ? ` (${pacing})` : ''}
- Hire Recommendation: ${report.hire_recommendation}
- Summary: ${summary}
- Competency Scores: ${JSON.stringify(scores)}
- Key Strengths: ${strengths}
- Areas to Improve: ${improvements}

Your job is to:
1. Answer questions about the interview performance specifically
2. Provide concrete, actionable coaching advice
3. Suggest resources, practice strategies, or specific topics to work on
4. Be encouraging but honest
5. Reference specific scores and feedback from their report when relevant

Keep responses concise and actionable (2-4 sentences max unless more detail is genuinely needed).`;

  const historyText = (chat_history || [])
    .slice(-6)
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Candidate' : 'Coach'}: ${m.content}`)
    .join('\n');

  const prompt = `${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}Candidate: ${message}\nCoach:`;

  try {
    const result = await withRetry(() => model.generateContent([
      { text: systemContext },
      { text: prompt },
    ]));

    const reply = result.response.text().trim();
    return NextResponse.json({ reply });
  } catch (e: unknown) {
    console.error('Report chat error:', e);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
