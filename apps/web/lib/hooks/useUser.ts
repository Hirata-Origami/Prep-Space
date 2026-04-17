'use client';

import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (data?.profile && typeof window !== 'undefined') {
    localStorage.setItem('user_profile_cache', JSON.stringify(data.profile));
  }
  return data;
};

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  target_role?: string;
  target_company?: string;
  linkedin_url?: string;
  github_url?: string;
  avatar_url?: string;
  gemini_api_key?: string | null;
  has_gemini_key: boolean;
  xp: number;
  streak_days: number;
  level: string;
}

function readCache(): { profile: UserProfile } | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('user_profile_cache');
    if (raw) return { profile: JSON.parse(raw) };
  } catch {}
  return undefined;
}

export function useUser() {
  const cachedFallback = readCache();

  const { data, error, isLoading, mutate } = useSWR<{ profile: UserProfile }>(
    '/api/user/profile',
    fetcher,
    {
      revalidateOnFocus: false,
      fallbackData: cachedFallback,
      // Don't treat background revalidation as "loading" when we have cache
      keepPreviousData: true,
    }
  );

  // If we have fallback data from cache, never block the UI with isLoading=true.
  // SWR will still silently revalidate in the background.
  const effectivelyLoading = isLoading && !cachedFallback;

  return {
    user: data?.profile ?? null,
    isLoading: effectivelyLoading,
    isError: !!error,
    mutate,
  };
}
