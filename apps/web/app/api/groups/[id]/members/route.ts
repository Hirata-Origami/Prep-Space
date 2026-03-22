import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { email } = await req.json();

  // 1. Check if user is admin
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: adminMem } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (!adminMem || adminMem.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Only admins can invite' }, { status: 403 });
  }

  // 2. Find target user by email
  const { data: targetUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: 'User with this email not found on PrepSpace' }, { status: 404 });
  }

  // 3. Add to group
  const { error: inviteError } = await supabase
    .from('group_members')
    .insert({
      group_id: id,
      user_id: targetUser.id,
      role: 'member'
    });

  if (inviteError) {
    if (inviteError.code === '23505') return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { user_id: targetUserId, role } = await req.json();

  // 1. Check if user is admin
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: adminMem } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (!adminMem || adminMem.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Only admins can manage roles' }, { status: 403 });
  }

  // 2. Update role
  const { error } = await supabase
    .from('group_members')
    .update({ role })
    .eq('group_id', id)
    .eq('user_id', targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get('user_id');

  if (!targetUserId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  // 1. Check if user is admin
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: adminMem } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (!adminMem || adminMem.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized: Only admins can remove members' }, { status: 403 });
  }

  // 2. Remove member
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', id)
    .eq('user_id', targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
