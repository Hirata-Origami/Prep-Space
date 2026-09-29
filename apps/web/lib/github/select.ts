import type { GenerativeModel } from '@google/generative-ai';
import type { ProjectItem, ResumeData } from '@/lib/hooks/useResume';
import { withRetry } from '@/lib/gemini';
import { parseJsonReply, pickBullets } from '@/lib/resume/merge';
import { normalizeProjects } from '@/lib/resume/templates';
import { projectFromRepo, projectMatchesRepo } from './match';
import type { ProjectChoice, RepoProfile } from './types';

interface ModelChoices {
  choices?: { source?: string; ref?: string; relevance?: number; reason?: string; bullets?: string }[];
}

export interface Selection {
  choices: ProjectChoice[];
  dropped: string[];
}

/** Asks the model to pick the projects that best fit a job description, from the resume and the GitHub catalog. */
export async function chooseProjects(opts: {
  model: GenerativeModel;
  jd: string;
  role: string;
  company: string;
  data: ResumeData;
  catalog: RepoProfile[];
  max: number;
}): Promise<Selection> {
  const { model, jd, role, company, data, catalog, max } = opts;
  const { projects } = normalizeProjects(data);
  const extra = catalog.filter(r => !projects.some(p => projectMatchesRepo(p, r)));

  const resumeBlock = projects.map(p => ({ source: 'resume', ref: p.title, context: p.context ?? '', bullets: p.bullets }));
  const githubBlock = extra.map(r => ({
    source: 'github',
    ref: r.fullName,
    summary: r.summary,
    architecture: r.architecture,
    techStack: r.techStack,
    highlights: r.highlights,
    keywords: r.keywords,
    complexity: r.complexity,
    lastActive: r.pushedAt?.slice(0, 10),
  }));

  const prompt = `You are matching a candidate's projects to a job. Choose the ${max} projects that best prove the skills this job asks for.

TARGET ROLE: ${role}
COMPANY: ${company}

JOB DESCRIPTION
"""
${jd.slice(0, 9000)}
"""

CANDIDATE PROJECTS
${JSON.stringify([...resumeBlock, ...githubBlock], null, 1)}

RULES
1. Choose only from the projects above. Refer to them by the exact "source" and "ref".
2. For source "resume", rewrite the bullets for this job but keep every number, technology, client and link that is there. Do not remove bullets.
3. For source "github", write 3 to 4 bullets using ONLY the summary, architecture, techStack and highlights given. Do not add metrics or technologies that are not listed.
4. Put the strongest match first. relevance is 0-100. reason is one short sentence naming the JD requirement the project proves.
5. Prefer breadth of relevant skills over near-duplicates. Prefer recent, complex projects when relevance is equal.

Return ONLY: {"choices":[{"source":"resume|github","ref":"","relevance":0,"reason":"","bullets":"one bullet per line"}]}`;

  const result = await withRetry(() => model.generateContent([{ text: prompt }]));
  const parsed = parseJsonReply<ModelChoices>(result.response.text());

  const valid: ProjectChoice[] = [];
  for (const c of parsed.choices ?? []) {
    if (!c.ref || (c.source !== 'resume' && c.source !== 'github')) continue;
    const exists = c.source === 'resume' ? projects.some(p => p.title === c.ref) : extra.some(r => r.fullName === c.ref);
    if (!exists || valid.some(v => v.ref === c.ref)) continue;
    valid.push({
      source: c.source,
      ref: c.ref,
      relevance: Math.max(0, Math.min(100, Math.round(c.relevance ?? 0))),
      reason: (c.reason ?? '').trim(),
      bullets: c.bullets ?? '',
    });
  }
  valid.sort((a, b) => b.relevance - a.relevance);
  const chosen = valid.slice(0, max);

  const keep = new Set(chosen.map(c => c.ref));
  const dropped = [...projects.map(p => p.title), ...extra.map(r => r.fullName)].filter(ref => !keep.has(ref));
  return { choices: chosen, dropped };
}

/** Builds the tailored project list from a selection. Resume facts are protected by pickBullets. */
export function applySelection(base: ResumeData, selection: Selection, catalog: RepoProfile[]): ProjectItem[] {
  const { projects } = normalizeProjects(base);
  const out: ProjectItem[] = [];
  for (const c of selection.choices) {
    if (c.source === 'resume') {
      const original = projects.find(p => p.title === c.ref);
      if (original) out.push({ ...original, bullets: pickBullets(original.bullets, c.bullets) });
    } else {
      const repo = catalog.find(r => r.fullName === c.ref);
      if (repo) out.push(projectFromRepo(repo, c.bullets));
    }
  }
  // Never return fewer projects than the model could justify: fall back to the originals
  return out.length ? out : projects;
}
