import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { group_id } = body;

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 1. Check if already a member
  const { data: existing } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', group_id)
    .eq('user_id', dbUser.id)
    .single();

  if (existing) {
    return NextResponse.json({ message: 'Already a member' }, { status: 200 });
  }

  // 2. Join group
  const { error } = await supabase
    .from('group_members')
    .insert({
      group_id,
      user_id: dbUser.id,
      role: 'member'
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true }, { status: 201 });
}
