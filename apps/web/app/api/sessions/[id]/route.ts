import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sessions/[id]
 * Retrieves a single session by id with its plan, question_log (transcript), and report.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) {
    return NextResponse.json({ error: 'User record not found' }, { status: 404 });
  }

  const { data: session, error } = await supabase
    .from('interview_sessions')
    .select('id, created_at, state, duration_seconds, interview_type, plan, question_log')
    .eq('id', sessionId)
    .eq('user_id', dbUser.id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Extract transcript from question_log or plan.transcript
  const transcript =
    Array.isArray(session.question_log) && session.question_log.length > 0
      ? session.question_log
      : (session.plan as { transcript?: unknown[] })?.transcript || [];

  return NextResponse.json({
    session: {
      ...session,
      transcript,
    },
  });
}
