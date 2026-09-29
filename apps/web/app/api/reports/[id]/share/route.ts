import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET /api/reports/[id]/share  — fetch current share record for this report */
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ share: null });

  const { data: share } = await supabase
    .from('shared_reports')
    .select('id, share_token, is_active, view_count, expires_at, created_at')
    .eq('report_id', id)
    .eq('user_id', dbUser.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ share: share ?? null });
}

/** POST /api/reports/[id]/share  — create or revoke a share link */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json() as { action: 'create' | 'revoke'; expires_days?: number };

  if (body.action === 'create') {
    // Deactivate any existing shares for this report
    await supabase
      .from('shared_reports')
      .update({ is_active: false })
      .eq('report_id', id)
      .eq('user_id', dbUser.id);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = body.expires_days
      ? new Date(Date.now() + body.expires_days * 86400_000).toISOString()
      : null;

    const { data: share, error } = await supabase
      .from('shared_reports')
      .insert({
        report_id: id,
        user_id: dbUser.id,
        share_token: token,
        is_active: true,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ share });
  }

  if (body.action === 'revoke') {
    await supabase
      .from('shared_reports')
      .update({ is_active: false })
      .eq('report_id', id)
      .eq('user_id', dbUser.id);
    return NextResponse.json({ revoked: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
