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

  // Increment view count (fire-and-forget)
  supabase
    .from('shared_reports')
    .update({ view_count: (share.view_count || 0) + 1 })
    .eq('id', share.id)
    .then(() => {/* noop */});

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

  return NextResponse.json({
    report,
    meta: {
      share_id: share.id,
      expires_at: share.expires_at,
      view_count: (share.view_count || 0) + 1,
    },
  });
}
