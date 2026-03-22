'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

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

export function useUser() {
  const { data, error, isLoading, mutate } = useSWR<{ profile: UserProfile }>(
    '/api/user/profile',
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    user: data?.profile ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}
