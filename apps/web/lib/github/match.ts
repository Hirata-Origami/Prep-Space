import type { ProjectItem } from '@/lib/hooks/useResume';
import { parseGithubUsername, type RepoProfile } from './types';

/** Client-safe helpers for relating GitHub repos to resume projects. */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** True when a resume project already points at this repository. */
export function projectMatchesRepo(p: ProjectItem, repo: RepoProfile): boolean {
  if (p.repo_url && p.repo_url.toLowerCase().includes(repo.fullName.toLowerCase())) return true;
  return norm(repo.name).length > 3 && norm(p.title).includes(norm(repo.name));
}

/** Keeps a bullet only if every figure in it is stated in the source text. */
export function isGrounded(bullet: string, corpus: string): boolean {
  const figures = bullet.match(/\d+(?:[.,]\d+)?\s?(?:%|k\b|x\b|ms\b|\+)?/gi) ?? [];
  return figures.every(f => {
    const digits = f.replace(/[^\d.,]/g, '');
    return digits.length <= 1 || corpus.includes(digits);
  });
}

function profileText(r: RepoProfile): string {
  return [r.description, r.summary, r.architecture, r.techStack.join(' '), r.highlights.join(' '), r.topics.join(' '), r.languages.join(' ')]
    .join('\n')
    .toLowerCase();
}

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Turns an indexed repo into a resume project, using only what was verified about it. */
export function projectFromRepo(r: RepoProfile, bullets?: string): ProjectItem {
  const corpus = profileText(r);
  const proposed = (bullets ?? '').split('\n').map(l => l.trim()).filter(Boolean).filter(b => isGrounded(b, corpus));
  const lines = proposed.length >= 2 ? proposed : r.highlights;
  return {
    title: titleCase(r.name),
    repo_url: r.private ? '' : r.url,
    demo_url: '',
    context: r.techStack.slice(0, 6).join(', '),
    bullets: lines.join('\n'),
  };
}

/** True when two GitHub handles or profile URLs point at the same account. */
export function sameGithubAccount(a?: string | null, b?: string | null): boolean {
  const x = parseGithubUsername(a).toLowerCase();
  const y = parseGithubUsername(b).toLowerCase();
  return !!x && x === y;
}

/**
 * Orders indexed repos by how much they add to a resume, without needing a job description: depth of the
 * work, evidence of results, breadth of stack, activity and interest. Highest first.
 */
export function rankRepos(repos: RepoProfile[]): RepoProfile[] {
  const now = Date.now();
  const score = (r: RepoProfile) => {
    const figures = r.highlights.filter(h => /\d/.test(h)).length;
    const ageMonths = r.pushedAt ? (now - new Date(r.pushedAt).getTime()) / (30 * 86_400_000) : 60;
    return (
      r.complexity * 3 +
      Math.min(r.highlights.length, 5) +
      figures * 2 +
      Math.min(r.techStack.length, 8) * 0.4 +
      Math.min(r.stars, 40) * 0.1 +
      Math.max(0, 3 - ageMonths / 12) +
      (r.source === 'deepwiki+github' ? 1 : 0) -
      (r.highlights.length === 0 ? 5 : 0)
    );
  };
  return [...repos].sort((a, b) => score(b) - score(a));
}
