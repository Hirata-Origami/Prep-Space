import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GithubError, listRepos } from '@/lib/github/api';
import { resolveGithubToken } from '@/lib/github/auth';
import { parseGithubUsername } from '@/lib/github/types';

export const dynamic = 'force-dynamic';

/** POST { username, token? } -> the user's repositories (private ones too when the token is theirs). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { username?: string; token?: string };
  const username = parseGithubUsername(body.username);
  if (!username) return NextResponse.json({ error: 'Enter a GitHub username or profile URL.' }, { status: 400 });

  try {
    const token = await resolveGithubToken(supabase, user.id, body.token);
    const { repos, includesPrivate } = await listRepos(username, token);
    return NextResponse.json({ username, repos, includesPrivate, usedToken: !!token });
  } catch (e) {
    const status = e instanceof GithubError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not list repositories' }, { status });
  }
}
