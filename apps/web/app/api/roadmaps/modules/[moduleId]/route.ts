import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await request.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  // Verify ownership via roadmap
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('id, roadmap_id, roadmaps(user_id)')
    .eq('id', moduleId)
    .single();

  if (moduleError || !module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  const roadmapUserId = (module as unknown as { roadmaps?: { user_id: string } }).roadmaps?.user_id;
  if (roadmapUserId !== dbUser.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Update the module status
  const { error: updateError } = await supabase
    .from('modules')
    .update({ status })
    .eq('id', moduleId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Check if all modules in roadmap are completed → update roadmap status
  if (status === 'completed') {
    const { data: allModules } = await supabase
      .from('modules')
      .select('status')
      .eq('roadmap_id', module.roadmap_id);

    const allDone = allModules?.every(m => m.status === 'completed');
    if (allDone) {
      await supabase
        .from('roadmaps')
        .update({ status: 'completed' })
        .eq('id', module.roadmap_id);
    }
  }

  // Invalidate cache
  try {
    const { redis } = await import('@/lib/redis');
    if (redis) {
      await redis.del(`api_roadmaps_${dbUser.id}`);
      await redis.del(`roadmaps_${dbUser.id}`);
    }
  } catch {}

  return NextResponse.json({ success: true, moduleId, status });
}
