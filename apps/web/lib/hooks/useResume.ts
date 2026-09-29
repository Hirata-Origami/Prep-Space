'use client';

import useSWR from 'swr';

export interface ResumeProfile {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  /** Visible text for the link when it should differ from the URL (for example a short vanity form). */
  linkedinLabel?: string;
  githubLabel?: string;
  location?: string;
  summary?: string;
  targetRole?: string;
  targetCompany?: string;
}

export interface Experience {
  company: string;
  role: string;
  start: string;
  end: string;
  location?: string;
  bullets: string;
  type?: 'work' | 'project';
}

export interface ProjectItem {
  title: string;
  repo_url?: string;
  demo_url?: string;
  context?: string;
  bullets: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
  score?: string; // e.g. "CGPA: 8.31/10.00" or "Percentage: 96.33%"
}

// Backward compatibility alias
export type Education = EducationItem;

export interface SkillCategories {
  languages: string;
  frameworks: string;
  cloud_and_databases: string;
  tools_and_architecture: string;
  area_of_interest: string;
}

export type ResumeTemplateId =
  | 'modern-two-column'
  | 'classic-single'
  | 'minimal-tech'
  | 'accent-single'
  | 'executive-serif';

export interface ResumeData {
  templateId?: ResumeTemplateId;
  profile: ResumeProfile;
  experience: Experience[];
  projects?: ProjectItem[];
  education: EducationItem | EducationItem[];
  skills: string; // flat string for quick editing
  skills_categorized?: SkillCategories;
  achievements?: string;
  /** Newline-separated certifications and courses. */
  certifications?: string;
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
