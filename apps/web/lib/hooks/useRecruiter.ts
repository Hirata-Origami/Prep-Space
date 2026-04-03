'use client';

import useSWR from 'swr';

export interface Candidate {
  id: string;
  name?: string;
  email: string;
  stage: string;
  composite_score?: number;
  round_scores?: Record<string, number>;
  invited_at?: string;
  completed_at?: string;
  users?: { full_name: string; email: string; avatar_url?: string };
}

export interface Pipeline {
  id: string;
  role_name: string;
  rounds: string[];
  pass_threshold: number;
  deadline?: string;
  status: string;
  created_at: string;
  pipeline_candidates: Candidate[];
}

export function useRecruiter() {
  const { data, error, isLoading, mutate } = useSWR<{ pipelines: Pipeline[] }>(
    '/api/recruiter/pipelines',
    (url: string) => fetch(url).then(res => res.json()),
    { revalidateOnFocus: false }
  );

  return {
    pipelines: data?.pipelines ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
