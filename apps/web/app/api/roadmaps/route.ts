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
          .select(`id, title, status, created_at, modules(count)`)
          .eq('user_id', dbUser.id)
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
      },
      300
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
  const { title, description, modules } = body;

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  return NextResponse.json({ roadmap }, { status: 201 });
}

