import type { Experience, ProjectItem, ResumeData, ResumeTemplateId, SkillCategories } from '@/lib/hooks/useResume';
import { splitSkillRows, splitSkillsSafely } from './latexSanitizer';
import { normalizeProjects, normalizeSkills } from './templates';

/**
 * Rules for applying AI edits to a resume without losing the candidate's facts.
 * The model may reword; it may never delete, shorten, or invent.
 */

export const TEMPLATE_IDS: ResumeTemplateId[] = ['modern-two-column', 'classic-single', 'minimal-tech', 'accent-single', 'executive-serif'];

export function coerceTemplateId(value: unknown): ResumeTemplateId {
  return TEMPLATE_IDS.includes(value as ResumeTemplateId) ? (value as ResumeTemplateId) : 'modern-two-column';
}

const lines = (text?: string) => (text ?? '').split('\n').map(l => l.trim()).filter(Boolean);
const words = (text?: string) => (text ?? '').split(/\s+/).filter(Boolean).length;

/** Numbers, versions and percentages the original states; a rewrite must keep them. */
function facts(text: string): string[] {
  return text.match(/\d+(?:[.,]\d+)?\s?(?:%|k|x|ms|s|\+)?/gi)?.map(f => f.replace(/\s/g, '').toLowerCase()) ?? [];
}

/**
 * Accepts the AI's bullets only when nothing was lost: at least as many
 * bullets, at least 85% of the words, and every figure still present.
 */
export function pickBullets(original: string, rewritten?: string): string {
  if (!rewritten || !rewritten.trim()) return original;
  if (!original.trim()) return rewritten;

  const before = lines(original);
  const after = lines(rewritten);
  if (after.length < before.length) return original;
  if (words(rewritten) < words(original) * 0.85) return original;

  const kept = new Set(facts(rewritten));
  if (facts(original).some(f => !kept.has(f))) return original;
  return rewritten;
}

export function pickSummary(original: string | undefined, rewritten?: string): string {
  const base = (original ?? '').trim();
  const next = (rewritten ?? '').trim();
  if (!next) return base;
  if (!base) return next;
  return words(next) >= words(base) * 0.6 ? next : base;
}

/** Adds skills the model suggests only when the resume text actually supports them. */
export function mergeSkills(base: SkillCategories, additions: Partial<SkillCategories> | undefined, corpus: string): SkillCategories {
  if (!additions) return base;
  const haystack = corpus.toLowerCase();
  const out = { ...base };

  (Object.keys(base) as (keyof SkillCategories)[]).forEach(key => {
    const known = new Set(splitSkillRows(base[key]).flat().map(s => s.toLowerCase()));
    const fresh = splitSkillsSafely(additions[key] ?? '').filter(s => {
      const lower = s.toLowerCase();
      return !known.has(lower) && haystack.includes(lower.replace(/\s*\(.*\)$/, ''));
    });
    if (fresh.length) {
      const rows = base[key] ? base[key].split('\n') : [];
      if (rows.length) rows[rows.length - 1] = `${rows[rows.length - 1]}, ${fresh.join(', ')}`;
      else rows.push(fresh.join(', '));
      out[key] = rows.join('\n');
    }
  });
  return out;
}

export interface AiEdits {
  summary?: string;
  experience?: { bullets?: string }[];
  projects?: { bullets?: string }[];
  skills_additions?: Partial<SkillCategories>;
}

/** Applies AI edits onto the candidate's real data. */
export function applyAiEdits(base: ResumeData, edits: AiEdits): ResumeData {
  const { workExperience, projects } = normalizeProjects(base);

  // Keep entries flagged as projects out of the work list, but preserve them in output order
  const nextExperience: Experience[] = workExperience.map((exp, i) => ({
    ...exp,
    bullets: pickBullets(exp.bullets ?? '', edits.experience?.[i]?.bullets),
  }));
  const nextProjects: ProjectItem[] = projects.map((proj, i) => ({
    ...proj,
    bullets: pickBullets(proj.bullets ?? '', edits.projects?.[i]?.bullets),
  }));

  const skills = normalizeSkills(base);
  const corpus = [
    base.profile?.summary,
    ...nextExperience.map(e => e.bullets),
    ...nextProjects.map(p => `${p.title} ${p.context ?? ''} ${p.bullets}`),
  ].join('\n');
  const mergedSkills = mergeSkills(skills, edits.skills_additions, corpus);

  return {
    ...base,
    profile: { ...base.profile, summary: pickSummary(base.profile?.summary, edits.summary) },
    experience: nextExperience,
    projects: nextProjects,
    skills_categorized: mergedSkills,
    skills: Object.values(mergedSkills).filter(Boolean).join(', ').replace(/\n/g, ', '),
  };
}

/** Parses a model reply that should be JSON, tolerating code fences. */
export function parseJsonReply<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as T;
}
