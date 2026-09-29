import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';
import { GithubError } from '@/lib/github/api';
import { resolveGithubToken } from '@/lib/github/auth';
import { indexRepo } from '@/lib/github/indexer';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST { repo: "owner/name", token? } -> a grounded RepoProfile.
 * One repository per call so the client can show progress and stay inside function time limits.
 * Public repos are enriched with DeepWiki; private repos never leave GitHub and Gemini.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json()) as { repo?: string; token?: string };
  const repo = body.repo?.trim();
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: 'Send the repository as owner/name.' }, { status: 400 });
  }

  const { data: dbUser } = await supabase.from('users').select('gemini_api_key').eq('supabase_uid', user.id).single();
  let model;
  try {
    model = getModel(dbUser?.gemini_api_key, 'FLASH_LITE');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini API key configured' }, { status: 400 });
  }

  try {
    const token = await resolveGithubToken(supabase, user.id, body.token);
    const profile = await indexRepo(repo, token, model);
    return NextResponse.json({ profile });
  } catch (e) {
    const status = e instanceof GithubError ? e.status : 500;
    console.error('GitHub indexing error:', repo, e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to index the repository' }, { status });
  }
}
