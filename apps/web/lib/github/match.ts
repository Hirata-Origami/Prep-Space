import type { ProjectItem } from '@/lib/hooks/useResume';
import type { RepoProfile } from './types';

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
