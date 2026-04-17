import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time without env vars, return a stub that won't be used
    // In production, env vars must be set
    if (typeof window === 'undefined') {
      return null as unknown as ReturnType<typeof createBrowserClient>;
    }
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to apps/web/.env.local and fill in your Supabase keys.'
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Singleton for client components
let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    const c = createClient();
    if (!c) return null as unknown as ReturnType<typeof createBrowserClient>;
    client = c;
  }
  return client;
}
