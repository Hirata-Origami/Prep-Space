/** Shared, client-safe types for GitHub project indexing. */

export interface RepoSummary {
  /** owner/name */
  fullName: string;
  name: string;
  url: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string | null;
  sizeKb: number;
  topics: string[];
}

/** What the platform understood about one repository. Every claim is grounded in repo facts. */
export interface RepoProfile {
  fullName: string;
  name: string;
  url: string;
  private: boolean;
  description: string | null;
  language: string | null;
  languages: string[];
  stars: number;
  forks: number;
  pushedAt: string | null;
  topics: string[];
  /** One sentence: what the project is and who it is for. */
  summary: string;
  /** How it is built: main components and data flow. */
  architecture: string;
  techStack: string[];
  /** Resume-ready factual bullets, one per line. Numbers only when the repo states them. */
  highlights: string[];
  /** Skills and keywords a recruiter or ATS would match on. */
  keywords: string[];
  /** Roles this project is strong evidence for, e.g. "Backend Engineer". */
  roleFit: string[];
  /** rough 1-5 sense of engineering depth */
  complexity: number;
  source: 'deepwiki+github' | 'github';
  indexedAt: string;
}

export interface GithubIndex {
  username: string;
  indexedAt: string;
  projects: RepoProfile[];
}

export interface IndexProgress {
  fullName: string;
  status: 'queued' | 'indexing' | 'done' | 'failed';
  error?: string;
}

/** The catalog entry the tailoring step is allowed to write about. */
export interface ProjectChoice {
  source: 'resume' | 'github';
  /** resume project title, or the repo fullName */
  ref: string;
  relevance: number;
  reason: string;
  bullets: string;
}

/** Extracts a GitHub username from a profile URL or handle. */
export function parseGithubUsername(input?: string | null): string {
  if (!input) return '';
  const cleaned = input.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/^@/, '');
  return cleaned.split(/[/?#]/)[0].trim();
}
