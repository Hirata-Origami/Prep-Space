import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'weekly';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);

  const { fetchWithRedis } = await import('@/lib/redis');

  let result;
  try {
    result = await fetchWithRedis(
      `api_leaderboard_${period}_${limit}`,
      async () => {
        const { data: users, error } = await supabase
          .from('users')
          .select('id, full_name, avatar_url, xp, streak_days, created_at, target_role')
          .order('xp', { ascending: false })
          .limit(limit);

        if (error) {
          throw new Error(error.message);
        }

        const ranked = (users ?? []).map((u, idx) => ({
          ...u,
          rank: idx + 1,
          avg_score: null,
        }));

        return ranked;
      },
      180 // Cache for 3 minutes
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }

  // Get current user's position
  const { data: { user } } = await supabase.auth.getUser();
  let userRank = null;

  if (user) {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gt('xp', supabase.from('users').select('xp').eq('supabase_uid', user.id));

    userRank = (count ?? 0) + 1;
  }

  return NextResponse.json({ users: result, period, userRank });
}
