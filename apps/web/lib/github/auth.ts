import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret } from '@/lib/crypto';

/** Server-only: the token to use for a request. A token in the request wins; otherwise the stored one. */
export async function resolveGithubToken(supabase: SupabaseClient, authUid: string, fromBody?: string | null): Promise<string | null> {
  const given = fromBody?.trim();
  if (given) return given;
  const { data, error } = await supabase.from('users').select('github_token_enc').eq('supabase_uid', authUid).maybeSingle();
  if (error) return null; // column not migrated yet
  return decryptSecret((data as { github_token_enc?: string | null } | null)?.github_token_enc);
}
