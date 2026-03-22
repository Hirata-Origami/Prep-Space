import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'weekly';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '25'), 100);

  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, xp, streak_days, created_at')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const ranked = (users ?? []).map((u, idx) => ({
    ...u,
    rank: idx + 1,
    // Compute average score from sessions (placeholder — full impl needs join)
    avg_score: null,
  }));

  return NextResponse.json({ users: ranked, period, userRank });
}

