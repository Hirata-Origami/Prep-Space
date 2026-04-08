import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic');
  const skill_level = searchParams.get('skill_level');

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 1. Find other active availabilities matching topic and level
  const { data: matches, error } = await supabase
    .from('peer_availability')
    .select('id, user_id, topic, skill_level, users(full_name, avatar_url)')
    .eq('topic', topic)
    .eq('skill_level', skill_level)
    .eq('is_active', true)
    .neq('user_id', dbUser.id)
    .gte('available_until', new Date().toISOString())
    .limit(1);

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  
  if (!matches || matches.length === 0) {
    return NextResponse.json({ match: null });
  }

  const match = matches[0];

  // 2. Create a peer session (auto-match)
  // In a real app, this would notify both users.
  const { data: session, error: sessionError } = await supabase
    .from('peer_sessions')
    .insert({
      user1_id: dbUser.id,
      user2_id: match.user_id,
      topic,
      status: 'established',
      room_id: `peer_${Math.random().toString(36).substring(7)}`
    })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  // 3. Mark availabilities as inactive since matched
  await supabase
    .from('peer_availability')
    .update({ is_active: false })
    .in('id', [match.id]);

  return NextResponse.json({ 
    match: {
      ...match,
      session_id: session.id,
      room_id: session.room_id
    }
  });
}
