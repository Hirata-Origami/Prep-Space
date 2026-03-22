import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'my'; // 'my' or 'discover'

  const { data: dbUser } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (type === 'my') {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups!inner(*)')
      .eq('user_id', dbUser.id);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ groups: data.map(d => d.groups) }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59' },
    });
  } else {
    // Discover: all public groups the user is NOT in
    const { data: myGroupIds } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', dbUser.id);
    
    const excludedIds = myGroupIds?.map(g => g.group_id) || [];

    const query = supabase
      .from('groups')
      .select('*')
      .eq('access_type', 'public');
    
    if (excludedIds.length > 0) {
      query.not('id', 'in', `(${excludedIds.join(',')})`);
    }

    const { data: discoverGroups, error: groupsError } = await query;
    if (groupsError) return NextResponse.json({ error: groupsError.message }, { status: 500 });
    return NextResponse.json({ groups: discoverGroups }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59' },
    });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, access_type, roadmap_id } = body;

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 1. Create group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      description,
      access_type,
      roadmap_id,
      created_by: dbUser.id,
      tenant_id: dbUser.tenant_id
    })
    .select()
    .single();

  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });

  // 2. Add creator as member (admin)
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: dbUser.id,
      role: 'admin'
    });

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });

  return NextResponse.json({ group }, { status: 201 });
}
