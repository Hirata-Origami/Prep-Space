'use client';

import useSWR from 'swr';

export interface Group {
  id: string;
  name: string;
  description: string;
  access_type: 'private' | 'shared' | 'public';
  roadmap_id?: string;
  created_at: string;
}

export function useGroups(type: 'my' | 'discover' = 'my') {
  const { data, error, isLoading, mutate, isValidating } = useSWR<{ groups: Group[] }>(
    `/api/groups?type=${type}`,
    (url: string) => fetch(url).then(res => res.json()),
    { revalidateOnFocus: false }
  );

  return {
    groups: data?.groups ?? [],
    isLoading,
    isError: !!error,
    isValidating,
    mutate,
  };
}
