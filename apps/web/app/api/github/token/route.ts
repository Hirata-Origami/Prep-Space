import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canEncrypt, encryptSecret } from '@/lib/crypto';
import { GithubError, verifyToken } from '@/lib/github/api';
import { resolveGithubToken } from '@/lib/github/auth';

export const dynamic = 'force-dynamic';

/** GET: is a token saved and still valid? The token itself is never returned. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canStore = canEncrypt();
  const token = await resolveGithubToken(supabase, user.id);
  if (!token) return NextResponse.json({ connected: false, canStore });
  try {
    const info = await verifyToken(token);
    return NextResponse.json({ connected: true, login: info.login, scopes: info.scopes, canStore });
  } catch {
    return NextResponse.json({ connected: false, expired: true, canStore });
  }
}

/** PUT: verify a token and, when the server can encrypt it, save it. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token, remember } = (await request.json()) as { token?: string; remember?: boolean };
  if (!token?.trim()) return NextResponse.json({ error: 'Paste a GitHub token first.' }, { status: 400 });

  let info;
  try {
    info = await verifyToken(token.trim());
  } catch (e) {
    const status = e instanceof GithubError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not verify the token' }, { status });
  }

  let stored = false;
  let note: string | undefined;
  if (remember) {
    const enc = encryptSecret(token.trim());
    if (!enc) {
      note = 'The server has no APP_ENCRYPTION_KEY, so the token was not saved. It will be used for this session only.';
    } else {
      const { error } = await supabase.from('users').update({ github_token_enc: enc }).eq('supabase_uid', user.id);
      if (error) note = 'Could not save the token. Run the latest database migration, then try again.';
      else stored = true;
    }
  }

  return NextResponse.json({ connected: true, login: info.login, scopes: info.scopes, stored, note, canStore: canEncrypt() });
}

/** DELETE: forget the saved token. */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await supabase.from('users').update({ github_token_enc: null }).eq('supabase_uid', user.id);
  return NextResponse.json({ removed: true });
}
