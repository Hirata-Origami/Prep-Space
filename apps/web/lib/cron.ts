import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Scheduled endpoints are public URLs, so they must not be able to send unlimited mail to everyone.
 *
 * - If CRON_SECRET is set, the caller must present it (the strictest option, recommended).
 * - If it is not set, the job still runs, but only once per period: repeat hits inside the window are
 *   ignored, so a stranger who finds the URL cannot make it send more than the schedule would.
 */
export function cronSecretOk(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

/**
 * Claims the right to run `job` now. Returns false when it already ran within `minHours`.
 * Uses Redis when it is configured, then the cron_runs table, and allows the run when neither is available.
 */
export async function claimRun(supabase: SupabaseClient, job: string, minHours: number): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { redis } = await import('@/lib/redis');
      const res = await redis.set(`cron_run_${job}`, new Date().toISOString(), { nx: true, ex: Math.round(minHours * 3600) });
      return res === 'OK';
    } catch (e) {
      console.warn('[cron] Redis claim failed, trying the database', e);
    }
  }

  const { data, error } = await supabase.from('cron_runs').select('ran_at').eq('job', job).maybeSingle();
  if (error) {
    // the table is created by migration 004; until then the job runs as it always did
    console.warn('[cron] cron_runs unavailable, running without a once-per-period guard:', error.message);
    return true;
  }
  if (data && Date.now() - new Date(data.ran_at).getTime() < minHours * 3_600_000) return false;
  const { error: writeError } = await supabase.from('cron_runs').upsert({ job, ran_at: new Date().toISOString() });
  return !writeError;
}
