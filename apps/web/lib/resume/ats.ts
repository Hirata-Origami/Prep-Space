import type { ResumeData, ResumeTemplateId } from '@/lib/hooks/useResume';
import { normalizeEducation, normalizeProjects, normalizeSkills, toItems, TEMPLATE_META } from './templates';
import { splitSkillRows } from './latexSanitizer';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface AtsCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  weight: number;
}

export interface AtsReport {
  score: number;
  checks: AtsCheck[];
  /** Rough share of one A4 page the content fills; above 100 means it spills onto a second page. */
  pageFill: number;
  keywordCoverage?: { matched: string[]; missing: string[] };
}

const STRONG_VERBS = new Set([
  'achieved', 'architected', 'automated', 'built', 'created', 'delivered', 'deployed', 'designed', 'developed', 'drove', 'engineered',
  'enabled', 'established', 'implemented', 'improved', 'integrated', 'launched', 'led', 'maintained', 'managed', 'migrated', 'optimized',
  'orchestrated', 'overhauled', 'reduced', 'refactored', 'resolved', 'scaled', 'shipped', 'streamlined', 'trained', 'increased',
  'decreased', 'boosted', 'evaluated', 'analyzed', 'collaborated', 'mentored', 'formulated', 'facilitated', 'minimized', 'ensured',
]);

const STOP = new Set(['the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'from', 'that', 'this', 'have', 'has', 'able', 'work', 'team', 'role', 'years', 'experience', 'skills', 'strong', 'including', 'such', 'other', 'their', 'not', 'all', 'but', 'can', 'who', 'what', 'about', 'more', 'ability', 'across', 'within', 'using', 'used', 'use', 'new', 'must', 'may']);

const bulletsOf = (text?: string) => toItems(text);
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function extractKeywords(jd: string, limit = 30): string[] {
  const counts = new Map<string, number>();
  (jd.toLowerCase().match(/[a-z][a-z0-9+#./-]{1,}/g) ?? []).forEach(tok => {
    const t = tok.replace(/[./-]+$/, '');
    if (t.length < 3 || STOP.has(t)) return;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([k]) => k);
}

/** Approximate lines of text the resume needs, to warn before it spills onto page two. */
function estimatePageFill(data: ResumeData, templateId: ResumeTemplateId): number {
  const meta = TEMPLATE_META.find(t => t.id === templateId);
  const two = meta?.columns === 2;
  const { workExperience, projects } = normalizeProjects(data);
  const charsPerLine = two ? 88 : 110;
  const linesFor = (text: string, cpl = charsPerLine) => Math.max(1, Math.ceil(text.length / cpl));

  let main = 0;
  workExperience.forEach(e => { main += 3 + bulletsOf(e.bullets).reduce((n, b) => n + linesFor(b), 0); });
  projects.forEach(p => { main += 3 + (p.context ? 1 : 0) + bulletsOf(p.bullets).reduce((n, b) => n + linesFor(b), 0); });

  let side = 0;
  const sideCpl = two ? 52 : charsPerLine;
  if (data.profile?.summary) side += 2 + linesFor(data.profile.summary, sideCpl);
  const skills = normalizeSkills(data);
  side += 2 + Object.values(skills).reduce((n, v) => n + (v ? (two ? splitSkillRows(v).length + Math.ceil(v.length / 60) : 1) + 1 : 0), 0);
  side += 3 * normalizeEducation(data).length + 2;
  side += toItems(data.achievements).reduce((n, a) => n + linesFor(a, sideCpl), 0);
  side += toItems(data.certifications).reduce((n, a) => n + linesFor(a, sideCpl), 0);

  const capacity = two ? 82 : 66;
  const used = two ? Math.max(main, side) : main + side + 4;
  return Math.round((used / capacity) * 100);
}

export function analyzeResume(data: ResumeData, templateId: ResumeTemplateId, jdText?: string): AtsReport {
  const checks: AtsCheck[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string, weight: number) =>
    checks.push({ id, label, status, detail, weight });

  const p = data.profile;
  const { workExperience, projects } = normalizeProjects(data);
  const education = normalizeEducation(data);
  const entries = [...workExperience.map(e => e.bullets), ...projects.map(x => x.bullets)];
  const allBullets = entries.flatMap(bulletsOf);
  const meta = TEMPLATE_META.find(t => t.id === templateId);

  // Contact
  const missing = [!p?.name && 'name', !p?.email && 'email', !p?.phone && 'phone'].filter(Boolean) as string[];
  add('contact', 'Contact details', missing.length === 0 ? 'pass' : missing.includes('name') || missing.includes('email') ? 'fail' : 'warn',
    missing.length === 0 ? 'Name, email and phone are present.' : `Missing: ${missing.join(', ')}.`, 12);

  add('links', 'Profile links', p?.linkedin || p?.github ? 'pass' : 'warn',
    p?.linkedin || p?.github ? 'LinkedIn or GitHub is listed as visible text.' : 'Add a LinkedIn or GitHub link; recruiters look for one.', 6);

  // Sections
  const sections = [
    ['experience or projects', workExperience.length + projects.length > 0],
    ['education', education.length > 0],
    ['skills', Object.values(normalizeSkills(data)).some(Boolean)],
  ] as const;
  const absent = sections.filter(([, ok]) => !ok).map(([n]) => n);
  add('sections', 'Standard sections', absent.length === 0 ? 'pass' : 'fail',
    absent.length === 0 ? 'Experience, education and skills use standard headings.' : `Missing: ${absent.join(', ')}.`, 14);

  // Bullets
  const thin = [...workExperience.map(e => ({ n: e.role || e.company, b: e.bullets })), ...projects.map(x => ({ n: x.title, b: x.bullets }))]
    .filter(x => bulletsOf(x.b).length < 2);
  add('depth', 'Detail per entry', thin.length === 0 ? 'pass' : 'warn',
    thin.length === 0 ? 'Every role and project has at least two bullets.' : `Add detail to: ${thin.map(t => t.n || 'untitled').slice(0, 3).join(', ')}.`, 10);

  if (allBullets.length > 0) {
    const verbs = allBullets.filter(b => STRONG_VERBS.has(b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '')).length;
    const verbPct = Math.round((verbs / allBullets.length) * 100);
    add('verbs', 'Action verbs', verbPct >= 70 ? 'pass' : verbPct >= 40 ? 'warn' : 'fail',
      `${verbPct}% of bullets start with a strong action verb.`, 10);

    const numeric = allBullets.filter(b => /\d/.test(b)).length;
    const numPct = Math.round((numeric / allBullets.length) * 100);
    add('metrics', 'Measurable results', numPct >= 40 ? 'pass' : numPct >= 20 ? 'warn' : 'fail',
      `${numPct}% of bullets include a number, percentage or scale.`, 12);

    const long = allBullets.filter(b => wordCount(b) > 45).length;
    const short = allBullets.filter(b => wordCount(b) < 8).length;
    add('length', 'Bullet length', long + short === 0 ? 'pass' : 'warn',
      long + short === 0 ? 'Bullets are a readable length.' : `${long} bullet(s) over 45 words, ${short} under 8 words.`, 6);
  }

  const summaryWords = wordCount(p?.summary ?? '');
  add('summary', 'Summary', summaryWords === 0 ? 'warn' : summaryWords <= 90 ? 'pass' : 'warn',
    summaryWords === 0 ? 'A two to four sentence summary helps ATS keyword matching.' : summaryWords <= 90 ? `${summaryWords} words.` : `${summaryWords} words. Trim it under 90.`, 6);

  const undated = workExperience.filter(e => !e.start).length;
  add('dates', 'Dates', undated === 0 ? 'pass' : 'warn',
    undated === 0 ? 'Every role has a start date.' : `${undated} role(s) have no start date.`, 6);

  const fill = estimatePageFill(data, templateId);
  add('length-page', 'Page length', fill <= 100 ? 'pass' : fill <= 115 ? 'warn' : 'fail',
    fill <= 100 ? `About ${fill}% of one A4 page.` : `About ${fill}% of a page. Shorten it or pick a denser template for a one-page resume.`, 8);

  add('layout', 'Layout', meta?.columns === 1 ? 'pass' : 'warn', meta?.atsNote ?? '', 10);
  add('text', 'Text extraction', 'pass', 'Ligatures are mapped to Unicode and special characters are escaped, so text copies out cleanly.', 0);

  // Keywords against a job description
  let keywordCoverage: AtsReport['keywordCoverage'];
  if (jdText && jdText.trim().length > 40) {
    const corpus = [
      p?.summary,
      ...entries,
      ...projects.map(x => `${x.title} ${x.context ?? ''}`),
      ...Object.values(normalizeSkills(data)),
    ].join(' ').toLowerCase();
    const keywords = extractKeywords(jdText, 25);
    const matched = keywords.filter(k => corpus.includes(k));
    const missingKw = keywords.filter(k => !corpus.includes(k));
    const pct = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
    keywordCoverage = { matched, missing: missingKw };
    add('keywords', 'Job description match', pct >= 60 ? 'pass' : pct >= 35 ? 'warn' : 'fail',
      `${pct}% of the job description's top keywords appear in your resume.`, 10);
  }

  const totalWeight = checks.reduce((n, c) => n + c.weight, 0);
  const earned = checks.reduce((n, c) => n + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0);
  return { score: totalWeight ? Math.round((earned / totalWeight) * 100) : 0, checks, pageFill: fill, keywordCoverage };
}
