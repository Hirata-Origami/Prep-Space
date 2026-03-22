'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export interface Roadmap {
  id: string;
  title: string;
  role: string;
  status: 'active' | 'completed' | 'paused';
  progress_pct: number;
  created_at: string;
}

export function useRoadmaps() {
  const { data, error, isLoading, mutate } = useSWR<{ roadmaps: Roadmap[] }>(
    '/api/roadmaps',
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    roadmaps: data?.roadmaps ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export interface InterviewSession {
  id: string;
  created_at: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  duration_seconds?: number;
  overall_score?: number;
  interview_type: string;
  role?: string;
  company?: string;
  reports?: Array<{ id: string; overall_score: number; recommendation: string }>;
}

export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<{ sessions: InterviewSession[] }>(
    '/api/sessions',
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    sessions: data?.sessions ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
