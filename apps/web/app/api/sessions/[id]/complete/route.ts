import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/sessions/[id]/complete
 * Marks a session as COMPLETE and busts the sessions cache.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;
  const body = await request.json().catch(() => ({}));
  const { duration_seconds, transcript } = body;

  // Fetch the db user id
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = { state: 'COMPLETE' };
  if (typeof duration_seconds === 'number') {
    updatePayload.duration_seconds = duration_seconds;
  }

  if (Array.isArray(transcript) && transcript.length > 0) {
    updatePayload.question_log = transcript;
    
    // Also save in plan.transcript for resilience
    try {
      const { data: currentSession } = await supabase
        .from('interview_sessions')
        .select('plan')
        .eq('id', sessionId)
        .single();
      
      const currentPlan = (currentSession?.plan as Record<string, unknown>) || {};
      updatePayload.plan = { ...currentPlan, transcript };
    } catch {}
  }

  const { error } = await supabase
    .from('interview_sessions')
    .update(updatePayload)
    .eq('id', sessionId)
    .eq('user_id', dbUser.id); // security: only the owner can complete their session

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Bust the Redis cache so the sessions list refreshes
  try {
    const { redis } = await import('@/lib/redis');
    if (redis) {
      await redis.del(`api_sessions_${dbUser.id}`);
    }
  } catch {
    // Cache bust failure is non-fatal
  }

  return NextResponse.json({ success: true });
}
