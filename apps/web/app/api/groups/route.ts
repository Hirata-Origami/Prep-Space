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

  const { fetchWithRedis } = await import('@/lib/redis');

  const ttl = type === 'discover' ? 1800 : 300; // 30m for discover, 5m for my groups
  
  let groups;
  try {
    groups = await fetchWithRedis(
      `api_groups_${dbUser.id}_${type}`,
      async () => {
        if (type === 'my') {
          const { data, error } = await supabase
            .from('group_members')
            .select('group_id, groups!inner(*)')
            .eq('user_id', dbUser.id);
          if (error) throw new Error((error instanceof Error ? error.message : "Unknown error"));
          return data.map(d => d.groups);
        } else {
          const { data: myGroupIds } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', dbUser.id);
          const excludedIds = myGroupIds?.map(g => g.group_id) || [];

          const query = supabase.from('groups').select('*').eq('access_type', 'public');
          if (excludedIds.length > 0) {
            query.not('id', 'in', `(${excludedIds.join(',')})`);
          }

          const { data: discoverGroups, error: groupsError } = await query;
          if (groupsError) throw new Error(groupsError.message);
          return discoverGroups;
        }
      },
      ttl
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "Unknown error") }, { status: 500 });
  }

  return NextResponse.json({ groups });
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

  // Invalidate caches
  try {
    const { redis } = await import('@/lib/redis');
    await redis.del(`api_groups_${dbUser.id}_my`);
    await redis.del(`api_groups_${dbUser.id}_discover`);
  } catch (e) {
    console.warn("Redis invalidation failed", e);
  }

  return NextResponse.json({ group }, { status: 201 });
}
