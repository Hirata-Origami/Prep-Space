import type { GenerativeModel } from '@google/generative-ai';
import { withRetry } from '@/lib/gemini';
import { parseJsonReply } from '@/lib/resume/merge';
import { askDeepWiki, DEEPWIKI_QUESTION } from './deepwiki';
import { getRepoFacts, type RepoFacts } from './api';
import { isGrounded } from './match';
import type { RepoProfile } from './types';

interface ModelProfile {
  summary?: string;
  architecture?: string;
  techStack?: string[];
  highlights?: string[];
  keywords?: string[];
  roleFit?: string[];
  complexity?: number;
}

/** Text the model was shown. Any number or technology in the output must appear here. */
export function corpusOf(facts: RepoFacts, wiki: string | null): string {
  return [
    facts.summary.description,
    facts.summary.topics.join(' '),
    facts.readme,
    Object.keys(facts.languages).join(' '),
    facts.tree.join(' '),
    Object.values(facts.manifests).join('\n'),
    wiki ?? '',
  ].join('\n').toLowerCase();
}

const supported = (item: string, corpus: string) => corpus.includes(item.toLowerCase().replace(/\.js$/, ''));

function promptFor(facts: RepoFacts, wiki: string | null): string {
  const s = facts.summary;
  const langs = Object.entries(facts.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k)
    .join(', ');
  return `You are documenting a software project so it can be described accurately on a resume and matched to job descriptions.
Use ONLY the material below. Never invent features, metrics, users, or technologies. If something is not stated, leave it out.

REPOSITORY: ${s.fullName}${s.private ? ' (private)' : ''}
Description: ${s.description ?? 'none'}
Topics: ${s.topics.join(', ') || 'none'}
Languages: ${langs || 'unknown'}
Stars: ${s.stars}, forks: ${s.forks}, commits: ${facts.commitCount ?? 'unknown'}, contributors: ${facts.contributors ?? 'unknown'}
Top-level files: ${facts.tree.slice(0, 60).join(', ') || 'unknown'}

README
${facts.readme || '(no README)'}

MANIFESTS
${Object.entries(facts.manifests).map(([k, v]) => `--- ${k}\n${v}`).join('\n') || '(none)'}

${wiki ? `DEEPWIKI ANALYSIS (public repo)\n${wiki.slice(0, 9000)}` : ''}

Return ONLY this JSON:
{
  "summary": "one sentence: what it is and who it serves",
  "architecture": "2-4 sentences on main components and data flow",
  "techStack": ["technologies clearly used"],
  "highlights": ["3-5 factual resume bullets. Start with a strong verb. Include a number only if it is stated above."],
  "keywords": ["10-20 skills and keywords a recruiter would search"],
  "roleFit": ["roles this is strong evidence for"],
  "complexity": 1
}`;
}

/** Builds a grounded RepoProfile for one repository. */
export async function indexRepo(fullName: string, token: string | null, model: GenerativeModel): Promise<RepoProfile> {
  const facts = await getRepoFacts(fullName, token);
  const wiki = facts.summary.private ? null : await askDeepWiki(fullName, DEEPWIKI_QUESTION);

  const result = await withRetry(() => model.generateContent([{ text: promptFor(facts, wiki) }]));
  const parsed = parseJsonReply<ModelProfile>(result.response.text());
  const corpus = corpusOf(facts, wiki);
  const s = facts.summary;

  const highlights = (parsed.highlights ?? []).map(h => h.trim()).filter(h => h && isGrounded(h, corpus));
  const techStack = (parsed.techStack ?? []).filter(t => supported(t, corpus));

  return {
    fullName: s.fullName,
    name: s.name,
    url: s.url,
    private: s.private,
    description: s.description,
    language: s.language,
    languages: Object.entries(facts.languages).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k),
    stars: s.stars,
    forks: s.forks,
    pushedAt: s.pushedAt,
    topics: s.topics,
    summary: (parsed.summary ?? s.description ?? '').trim(),
    architecture: (parsed.architecture ?? '').trim(),
    techStack,
    highlights,
    keywords: (parsed.keywords ?? []).map(k => k.trim()).filter(Boolean).slice(0, 24),
    roleFit: (parsed.roleFit ?? []).slice(0, 5),
    complexity: Math.max(1, Math.min(5, Math.round(parsed.complexity ?? 2))),
    source: wiki ? 'deepwiki+github' : 'github',
    indexedAt: new Date().toISOString(),
  };
}
