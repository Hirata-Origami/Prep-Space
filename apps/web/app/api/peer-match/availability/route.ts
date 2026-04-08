import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { topic, skill_level, duration_hours = 1 } = await req.json();

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 1. Deactivate old availabilities
  await supabase
    .from('peer_availability')
    .update({ is_active: false })
    .eq('user_id', dbUser.id);

  // 2. Insert new one
  const { data, error } = await supabase
    .from('peer_availability')
    .insert({
      user_id: dbUser.id,
      topic,
      skill_level,
      available_until: new Date(Date.now() + (duration_hours * 60 * 60 * 1000)).toISOString(),
      is_active: true
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });

  return NextResponse.json({ availability: data }, { status: 201 });
}
