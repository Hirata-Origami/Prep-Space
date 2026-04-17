import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic') ?? 'General';
  const skill_level = searchParams.get('skill_level') ?? 'Intermediate';

  const { data: dbUser } = await supabase
    .from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 1. Find someone waiting (no self-match, active, not expired)
  const { data: matches } = await supabase
    .from('peer_availability')
    .select('id, user_id, topic, skill_level, users(full_name, avatar_url)')
    .eq('topic', topic)
    .eq('skill_level', skill_level)
    .eq('is_active', true)
    .neq('user_id', dbUser.id)
    .gte('available_until', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(1);

  if (!matches || matches.length === 0) return NextResponse.json({ match: null });

  const match = matches[0];

  // 2. Mark both users inactive immediately (narrows any remaining window)
  await supabase.from('peer_availability').update({ is_active: false })
    .or(`user_id.eq.${dbUser.id},user_id.eq.${match.user_id}`);

  // 3. Atomically get-or-create session via DB function (NO race condition possible)
  //    The function stores users sorted by LEAST/GREATEST so both callers
  //    always look up the same row key regardless of call order.
  const { data: rpcResult, error: rpcError } = await supabase.rpc('get_or_create_peer_session', {
    p_user1_id: dbUser.id,
    p_user2_id: match.user_id,
    p_topic: topic,
  });

  if (rpcError || !rpcResult || rpcResult.length === 0) {
    console.error('[find] RPC failed:', rpcError?.message);
    return NextResponse.json({ error: rpcError?.message ?? 'Failed to create session' }, { status: 500 });
  }

  const sessionId = rpcResult[0].session_id;
  const isNew = rpcResult[0].is_new;
  console.log(`[find] Session ${isNew ? 'CREATED' : 'EXISTING'}: ${sessionId}`);

  return NextResponse.json({
    match: {
      ...match,
      session_id: sessionId,
      room_id: sessionId,
    }
  });
}
