import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/peer-match/session/[id]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // RLS is disabled on peer_sessions — anon key reads everything
  const { data: session, error } = await supabase
    .from('peer_sessions')
    .select('id, topic, status, room_id, created_at, user1_id, user2_id')
    .eq('id', id)
    .maybeSingle(); // maybeSingle returns null instead of erroring on 0 rows

  if (error) {
    console.error('[session GET] DB error:', id, error.code, error.message);
    return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 });
  }

  if (!session) {
    console.error('[session GET] Session not found:', id);
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  // Verify participation (manual check since RLS is off)
  if (session.user1_id !== dbUser.id && session.user2_id !== dbUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const partnerId = session.user1_id === dbUser.id ? session.user2_id : session.user1_id;
  const myRole = session.user1_id === dbUser.id ? 'interviewer' : 'interviewee';

  const { data: partner } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, level, target_role')
    .eq('id', partnerId)
    .maybeSingle();

  console.log('[session GET] OK:', id, 'role:', myRole, 'partner:', partner?.full_name);

  return NextResponse.json({
    session: { ...session, partner, myRole, myUserId: dbUser.id }
  });
}

// POST /api/peer-match/session/[id] — submit score
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { rating, feedback } = await req.json();
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 });
  }

  await supabase.from('peer_sessions').update({ status: 'completed' }).eq('id', id);
  await supabase.rpc('increment_xp', { user_id: dbUser.id, amount: 25 });

  return NextResponse.json({ message: 'Scored', rating, feedback });
}
