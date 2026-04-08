import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { fetchWithRedis } = await import('@/lib/redis');
  let roadmaps;
  try {
    roadmaps = await fetchWithRedis(
      `api_roadmaps_${dbUser.id}`,
      async () => {
        const { data, error } = await supabase
          .from('roadmaps')
          .select(`
            id, 
            title, 
            status, 
            created_at, 
            target_role,
            modules(status)
          `)
          .eq('user_id', dbUser.id)
          .order('created_at', { ascending: false });
        
        if (error) throw new Error((error instanceof Error ? error.message : "Unknown error"));

        // Map and calculate progress
        return data.map((r: { target_role: string, modules?: { status: string }[] }) => {
          const total = r.modules?.length || 0;
          const completed = r.modules?.filter((m: { status: string }) => m.status === 'completed').length || 0;
          return {
            ...r,
            role: r.target_role || 'General Track',
            progress_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
            modules: { count: total } // Keep modules(count) for compatibility if needed elsewhere
          };
        });
      },
      600 // Cache for 10 minutes
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? (err instanceof Error ? err.message : "Unknown error") : 'Unknown error' }, { status: 500 });
  }

  return NextResponse.json({ roadmaps });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, modules } = body;

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: roadmap, error } = await supabase
    .from('roadmaps')
    .insert({
      user_id: dbUser.id,
      title,
      status: 'active',
      target_role: title, // storing role/title here instead of description
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }

  // Insert modules if provided
  if (modules && modules.length > 0) {
    const moduleRows = modules.map((m: { title: string; description?: string; order?: number }, idx: number) => ({
      roadmap_id: roadmap.id,
      title: m.title,
      description: m.description,
      sequence_order: m.order ?? idx,
      status: 'available',
    }));

    await supabase.from('modules').insert(moduleRows);
  }

  // Invalidate Redis cache for roadmaps
  try {
    const { redis } = await import('@/lib/redis');
    if (redis) {
      await redis.set(`api_roadmaps_${dbUser.id}`, null); // Force deep invalidate
      await redis.del(`api_roadmaps_${dbUser.id}`);
      await redis.del(`roadmaps_${dbUser.id}`);
      console.log(`[POST /api/roadmaps] Invalidated cache for user ${dbUser.id}`);
    }
  } catch (redisErr) {
    console.warn("[POST /api/roadmaps] Redis invalidation failed:", redisErr);
  }

  return NextResponse.json({ roadmap }, { status: 201 });
}

