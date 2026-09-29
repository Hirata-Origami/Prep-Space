import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ token: string }>;
}

/** GET /api/shared/[token] — publicly readable; increments view count */
export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch the share record (policy allows public SELECT on is_active=true rows)
  const { data: share, error: shareErr } = await supabase
    .from('shared_reports')
    .select('id, report_id, is_active, expires_at, view_count')
    .eq('share_token', token)
    .eq('is_active', true)
    .single();

  if (shareErr || !share) {
    return NextResponse.json({ error: 'Shared report not found or link has been revoked.' }, { status: 404 });
  }

  // Check expiry
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This share link has expired.' }, { status: 410 });
  }

  // A serverless function may stop once it responds, so wait for the count to be written
  await supabase
    .from('shared_reports')
    .update({ view_count: (share.view_count || 0) + 1 })
    .eq('id', share.id);

  // Fetch the actual report (service role bypasses RLS)
  const { data: report, error: reportErr } = await supabase
    .from('interview_reports')
    .select(`
      id, overall_score, hire_recommendation, analysis, generated_at,
      interview_sessions ( plan )
    `)
    .eq('id', share.report_id)
    .single();

  if (reportErr || !report) {
    return NextResponse.json({ error: 'Report data unavailable.' }, { status: 404 });
  }

  // Share only what a mentor needs: no audio link, no proctoring detail, no raw answers
  const a = (report.analysis ?? {}) as Record<string, unknown>;
  const sampleAnswers = Array.isArray(a.sample_answers)
    ? (a.sample_answers as { question?: string; score?: number; ideal_answer?: string }[]).map(q => ({ question: q.question, score: q.score, ideal_answer: q.ideal_answer }))
    : [];
  const video = a.video as { scores?: unknown; summary?: string } | undefined;
  const safe = {
    overall_score: report.overall_score,
    hire_recommendation: report.hire_recommendation,
    generated_at: report.generated_at,
    interview_sessions: report.interview_sessions,
    analysis: {
      summary: a.summary,
      scores: a.scores,
      strengths: a.strengths,
      improvements: a.improvements,
      sample_answers: sampleAnswers,
      video: video ? { scores: video.scores, summary: video.summary } : undefined,
    },
  };

  return NextResponse.json({
    report: safe,
    meta: {
      share_id: share.id,
      expires_at: share.expires_at,
      view_count: (share.view_count || 0) + 1,
    },
  });
}
