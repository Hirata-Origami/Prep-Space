import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/sessions/[id]/complete
 * Marks a session as COMPLETE, awards XP, updates streak, and busts caches.
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

  // Fetch the db user id + current XP + streak
  const { data: dbUser } = await supabase
    .from('users')
    .select('id, xp, streak_days')
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

  // ── Award XP ──────────────────────────────────────────────────────────
  // Base: 25 XP per session + 1 XP per 30 seconds completed (capped at 75 bonus XP)
  const durationBonus = typeof duration_seconds === 'number'
    ? Math.min(Math.floor(duration_seconds / 30), 75)
    : 0;
  const xpGained = 25 + durationBonus;
  const newXp = (dbUser.xp ?? 0) + xpGained;

  // ── Update Streak ─────────────────────────────────────────────────────
  // Find the most recent PRIOR completed session for this user (excluding current)
  const { data: previousSessions } = await supabase
    .from('interview_sessions')
    .select('updated_at')
    .eq('user_id', dbUser.id)
    .eq('state', 'COMPLETE')
    .neq('id', sessionId)
    .order('updated_at', { ascending: false })
    .limit(1);

  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  let newStreak = dbUser.streak_days ?? 1;

  if (previousSessions && previousSessions.length > 0) {
    const lastDate = new Date(previousSessions[0].updated_at).toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (lastDate === todayStr) {
      // Already practiced today — keep streak as-is
      newStreak = dbUser.streak_days ?? 1;
    } else if (lastDate === yesterday) {
      // Practiced yesterday — extend streak
      newStreak = (dbUser.streak_days ?? 1) + 1;
    } else {
      // Missed a day — reset streak to 1
      newStreak = 1;
    }
  } else {
    // First ever session — start at 1
    newStreak = 1;
  }

  // Update user's XP and streak
  await supabase
    .from('users')
    .update({ xp: newXp, streak_days: newStreak })
    .eq('id', dbUser.id);

  // Bust Redis caches so sidebar + profile reflect new values immediately
  try {
    const { redis } = await import('@/lib/redis');
    if (redis) {
      await Promise.all([
        redis.del(`api_sessions_${dbUser.id}`),
        redis.del(`api_profile_${user.id}`),
      ]);
    }
  } catch {
    // Cache bust failure is non-fatal
  }

  return NextResponse.json({ success: true, xp_gained: xpGained, new_xp: newXp, streak: newStreak });
}

