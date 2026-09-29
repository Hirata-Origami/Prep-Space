import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GithubError, listRepos } from '@/lib/github/api';
import { parseGithubUsername } from '@/lib/github/types';

export const dynamic = 'force-dynamic';

/** POST { username } -> the user's public repositories. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { username?: string };
  const username = parseGithubUsername(body.username);
  if (!username) return NextResponse.json({ error: 'Enter a GitHub username or profile URL.' }, { status: 400 });

  try {
    const { repos } = await listRepos(username);
    return NextResponse.json({ username, repos });
  } catch (e) {
    const status = e instanceof GithubError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not list repositories' }, { status });
  }
}
