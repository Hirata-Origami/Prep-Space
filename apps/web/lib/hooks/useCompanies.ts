'use client';

import useSWR from 'swr';

export interface Company {
  id: string;
  name: string;
  logo_emoji: string;
  industry: string;
  size: string;
  interview_culture: string;
  rounds: string[];
  round_topics?: Record<string, string[]>;
  known_patterns: string[];
  community_pass_rate: number;
  difficulty_rating: number;
}

export function useCompanies() {
  const { data, error, isLoading, mutate } = useSWR<{ companies: Company[] }>(
    '/api/mock-companies',
    (url: string) => fetch(url).then(res => res.json()),
    { revalidateOnFocus: false }
  );

  return {
    companies: data?.companies ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
