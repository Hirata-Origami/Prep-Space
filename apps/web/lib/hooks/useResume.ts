'use client';

import useSWR from 'swr';

export interface ResumeProfile {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  targetRole: string;
  targetCompany: string;
}

export interface Experience {
  company: string;
  role: string;
  start: string;
  end: string;
  bullets: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface ResumeData {
  profile: ResumeProfile;
  experience: Experience[];
  education: Education;
  skills: string;
  latex_code: string;
}

export function useResume() {
  const { data, error, isLoading, mutate } = useSWR<{ profile_sections: ResumeData }>(
    '/api/resume/profile',
    (url: string) => fetch(url).then(res => res.json()),
    { revalidateOnFocus: false }
  );

  const updateResume = async (newData: Partial<ResumeData>) => {
    // Optimistic update
    const currentData = data?.profile_sections;
    if (currentData) {
      mutate(
        { profile_sections: { ...currentData, ...newData } },
        false
      );
    }

    try {
      const res = await fetch('/api/resume/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_sections: { ...currentData, ...newData },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      mutate(updated);
      return updated;
    } catch (e) {
      // Rollback on error
      mutate();
      throw e;
    }
  };

  return {
    resumeData: data?.profile_sections,
    isLoading,
    isError: !!error,
    mutate,
    updateResume,
  };
}
