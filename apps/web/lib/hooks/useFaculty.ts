'use client';

import useSWR from 'swr';

export interface Cohort {
  id: string;
  name: string;
  students: number;
  ready: number;
  avgScore: number;
}

export function useFaculty() {
  const { data, error, isLoading, mutate } = useSWR<{ cohorts: Cohort[] }>(
    '/api/faculty/cohorts',
    (url: string) => fetch(url).then(res => res.json()),
    { revalidateOnFocus: false }
  );

  return {
    cohorts: data?.cohorts ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
