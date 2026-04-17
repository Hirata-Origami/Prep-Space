import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 1. Get Group Details
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  // 1b. Get Roadmaps from join table
  const { data: groupRoadmaps } = await supabase
    .from('group_roadmaps')
    .select('roadmaps(*)')
    .eq('group_id', id);

  // 2. Check if user is a member
  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: myMembership } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (!myMembership && group.access_type !== 'public') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // 3. Get all members
  const { data: members, error: memError } = await supabase
    .from('group_members')
    .select('role, joined_at, users(id, full_name, email, avatar_url)')
    .eq('group_id', id);

  if (memError) return NextResponse.json({ error: memError.message }, { status: 500 });

  return NextResponse.json({ 
    group, 
    roadmaps: groupRoadmaps?.map(gr => gr.roadmaps) || [],
    members: members.map(m => ({ ...m.users, role: m.role, joined_at: m.joined_at })),
    myRole: myMembership?.role || 'visitor'
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { roadmap_id, action } = await req.json(); // action: 'add' | 'remove' | 'assign' (compat)

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Verify Admin
  const { data: mem } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', id)
    .eq('user_id', dbUser.id)
    .single();

  if (!mem || mem.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can update group settings' }, { status: 403 });
  }

  if (action === 'remove') {
    const { error } = await supabase
      .from('group_roadmaps')
      .delete()
      .eq('group_id', id)
      .eq('roadmap_id', roadmap_id);
    if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  } else if (action === 'add' || action === 'assign' || roadmap_id) {
    // Upsert to join table
    const { error } = await supabase
      .from('group_roadmaps')
      .upsert({ group_id: id, roadmap_id });
    if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

