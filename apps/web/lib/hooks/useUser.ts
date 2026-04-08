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

export function useUser() {
  const getCachedProfile = () => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('user_profile_cache');
      if (cached) {
        try {
          return { profile: JSON.parse(cached) };
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  };

  const { data, error, isLoading, mutate } = useSWR<{ profile: UserProfile }>(
    '/api/user/profile',
    fetcher,
    { 
      revalidateOnFocus: false,
      fallbackData: getCachedProfile()
    }
  );

  return {
    user: data?.profile ?? null,
    isLoading,
    isError: !!error,
    mutate,
  };
}
