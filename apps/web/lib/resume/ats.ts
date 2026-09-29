import type { ResumeData, ResumeTemplateId } from '@/lib/hooks/useResume';
import { normalizeEducation, normalizeProjects, normalizeSkills, toItems, TEMPLATE_META } from './templates';
import { splitSkillRows } from './latexSanitizer';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface AtsCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** How much this check is worth. 0 means informational. */
  weight: number;
  /** Share of the weight earned, 0 to 1. */
  earned: number;
  /** What to do about it, shown only when it costs points. */
  fix?: string;
}

export interface AtsReport {
  /** 0 to 100. Deliberately hard: a resume with warnings should not score in the nineties. */
  score: number;
  grade: 'Excellent' | 'Strong' | 'Fair' | 'Weak';
  checks: AtsCheck[];
  /** The fixes worth the most points, biggest first. */
  topFixes: AtsCheck[];
  /** Share of one A4 page the content fills; above 100 means it spills onto a second page. */
  pageFill: number;
  /** True when pageFill came from laying the resume out, not from an estimate. */
  measured: boolean;
  keywordCoverage?: { matched: string[]; missing: string[] };
}

export const STRONG_VERBS = new Set([
  'achieved', 'architected', 'automated', 'built', 'created', 'delivered', 'deployed', 'designed', 'developed', 'drove', 'engineered',
  'enabled', 'established', 'implemented', 'improved', 'integrated', 'launched', 'led', 'maintained', 'managed', 'migrated', 'optimized',
  'optimised', 'orchestrated', 'overhauled', 'reduced', 'refactored', 'resolved', 'scaled', 'shipped', 'streamlined', 'trained', 'increased',
  'decreased', 'boosted', 'evaluated', 'analyzed', 'analysed', 'collaborated', 'mentored', 'formulated', 'facilitated', 'minimized', 'ensured',
  'accelerated', 'authored', 'consolidated', 'cut', 'debugged', 'diagnosed', 'documented', 'eliminated', 'extended', 'generated', 'hardened',
  'instrumented', 'introduced', 'modernized', 'monitored', 'negotiated', 'owned', 'partnered', 'prototyped', 'rebuilt', 'redesigned',
  'replaced', 'secured', 'simplified', 'spearheaded', 'standardized', 'tested', 'transformed', 'unified', 'validated', 'won',
]);

const WEAK_PHRASES = /\b(responsible for|worked on|worked with|helped|assisted (with|in)|various|etc\.?|duties (included|include)|in charge of|involved in|participated in|tasked with|utilized|a variety of)\b/i;
const FIRST_PERSON = /(^|\s)(i|my|me|myself)\s/i;
const BUZZWORDS = /\b(team player|hard[- ]?working|results[- ]driven|passionate|detail[- ]oriented|synergy|go[- ]getter|self[- ]motivated|think outside the box|rockstar|ninja|guru|proven track record)\b/gi;

const STOP = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'from', 'that', 'this', 'have', 'has', 'able', 'work', 'team', 'role',
  'years', 'experience', 'skills', 'strong', 'including', 'such', 'other', 'their', 'not', 'all', 'but', 'can', 'who', 'what', 'about',
  'more', 'ability', 'across', 'within', 'using', 'used', 'use', 'new', 'must', 'may', 'we', 'us', 'be', 'is', 'as', 'an', 'or', 'to',
  'of', 'in', 'on', 'at', 'by', 'it', 'its', 'if', 'so', 'do', 'per', 'etc', 'good', 'great', 'best', 'looking', 'join', 'company',
  'candidate', 'responsibilities', 'requirements', 'preferred', 'required', 'plus', 'bonus', 'help', 'make', 'ensure', 'day', 'get',
]);

const bulletsOf = (text?: string) => toItems(text);
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const firstWord = (b: string) => b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';

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

/** Approximate lines of text the resume needs. Used until the resume has been laid out and measured. */
export function estimatePageFill(data: ResumeData, templateId: ResumeTemplateId): number {
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

  const capacity = two ? 58 : 66;
  const used = two ? Math.max(main, side) : main + side + 4;
  return Math.round((used / capacity) * 100);
}

const statusOf = (earned: number): CheckStatus => (earned >= 0.9 ? 'pass' : earned >= 0.5 ? 'warn' : 'fail');

const skillList = (data: ResumeData) =>
  Object.values(normalizeSkills(data))
    .flatMap(v => (v ?? '').split(/[,\n]/))
    .map(s => s.trim())
    .filter(Boolean);

/**
 * Scores a resume the way a strict screener would. Every check earns a share of its weight, the total is
 * curved so that small gaps cost real points, and a resume that spills onto a second page or lacks core
 * sections cannot score above the low sixties however good the rest is.
 */
export function analyzeResume(data: ResumeData, templateId: ResumeTemplateId, jdText?: string, measuredFill?: number): AtsReport {
  const checks: AtsCheck[] = [];
  const add = (id: string, label: string, weight: number, earned: number, detail: string, fix?: string) => {
    const e = clamp01(earned);
    checks.push({ id, label, weight, earned: e, status: weight === 0 ? 'pass' : statusOf(e), detail, fix: e < 0.9 ? fix : undefined });
  };

  const p = data.profile;
  const { workExperience, projects } = normalizeProjects(data);
  const education = normalizeEducation(data);
  const skills = skillList(data);
  const meta = TEMPLATE_META.find(t => t.id === templateId);
  const entries = [...workExperience.map(e => ({ name: e.role || e.company, bullets: bulletsOf(e.bullets) })), ...projects.map(x => ({ name: x.title, bullets: bulletsOf(x.bullets) }))];
  const allBullets = entries.flatMap(e => e.bullets);

  /* contact */
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p?.email ?? '');
  const phoneOk = (p?.phone ?? '').replace(/\D/g, '').length >= 8;
  const parts = [!!p?.name?.trim(), emailOk, phoneOk, !!p?.location?.trim()];
  const missingContact = ['name', 'a valid email', 'a phone number', 'a city'].filter((_, i) => !parts[i]);
  add('contact', 'Contact details', 10, parts.filter(Boolean).length / 4,
    missingContact.length ? `Missing ${missingContact.join(', ')}.` : 'Name, email, phone and city are present.',
    `Add ${missingContact.join(', ')}. Recruiters and parsers look for all four.`);

  const hasLi = !!p?.linkedin?.trim();
  const hasGh = !!p?.github?.trim();
  add('links', 'Profile links', 6, hasLi && hasGh ? 1 : hasLi || hasGh ? 0.6 : 0,
    hasLi && hasGh ? 'LinkedIn and GitHub are listed.' : hasLi || hasGh ? `Only ${hasLi ? 'LinkedIn' : 'GitHub'} is listed.` : 'No profile links.',
    'List both LinkedIn and GitHub as visible text.');

  /* structure */
  const sectionsOk = [workExperience.length + projects.length > 0, education.length > 0, skills.length > 0];
  add('sections', 'Standard sections', 10, sectionsOk.filter(Boolean).length / 3,
    sectionsOk.every(Boolean) ? 'Experience or projects, education and skills all use standard headings.' : 'A core section is empty.',
    'Fill in experience or projects, education and skills. ATS parsers key on those headings.');

  const summaryWords = wordCount(p?.summary ?? '');
  add('summary', 'Summary', 5, summaryWords === 0 ? 0 : summaryWords >= 25 && summaryWords <= 65 ? 1 : summaryWords >= 15 && summaryWords <= 90 ? 0.6 : 0.3,
    summaryWords === 0 ? 'No summary.' : `${summaryWords} words.`,
    'Write a 25 to 65 word summary naming your role, years or scale, and two or three core technologies.');

  const eduFull = education.filter(e => e.degree && e.institution && e.year).length;
  add('education', 'Education detail', 4, education.length ? eduFull / education.length : 0,
    education.length ? `${eduFull} of ${education.length} entries have degree, institution and year.` : 'No education listed.',
    'Give every education entry a degree, an institution and a year.');

  /* bullets */
  if (allBullets.length > 0) {
    const perEntry: number[] = entries.map(e => {
      const n = e.bullets.length;
      return n >= 3 && n <= 5 ? 1 : n === 2 ? 0.6 : n === 1 ? 0.3 : n > 5 ? 0.7 : 0;
    });
    const thin = entries.filter(e => e.bullets.length < 3).map(e => e.name || 'untitled');
    const heavy = entries.filter(e => e.bullets.length > 5).map(e => e.name || 'untitled');
    add('depth', 'Detail per entry', 10, perEntry.reduce((a, b) => a + b, 0) / perEntry.length,
      thin.length || heavy.length ? [thin.length && `Under three bullets: ${thin.slice(0, 3).join(', ')}.`, heavy.length && `Over five: ${heavy.slice(0, 3).join(', ')}.`].filter(Boolean).join(' ') : 'Every entry has three to five bullets.',
      'Aim for three to five bullets per role or project: enough to show depth, few enough to be read.');

    const startWords = allBullets.map(firstWord);
    const strong = startWords.filter(w => STRONG_VERBS.has(w)).length;
    const strongPct = Math.round((strong / allBullets.length) * 100);
    const counts = new Map<string, number>();
    startWords.forEach(w => STRONG_VERBS.has(w) && counts.set(w, (counts.get(w) ?? 0) + 1));
    const repeated = [...counts.entries()].filter(([, n]) => n > 2).map(([w]) => w);
    add('verbs', 'Action verbs', 10, clamp01((strongPct - 40) / 50) - (repeated.length ? Math.min(0.25, repeated.length * 0.08) : 0),
      `${strongPct}% of bullets open with a strong verb.${repeated.length ? ` Overused: ${repeated.slice(0, 3).join(', ')}.` : ''}`,
      'Start each bullet with a distinct action verb such as built, cut, led or shipped. Do not repeat one more than twice.');

    const withNumber = allBullets.filter(b => /\d/.test(b)).length;
    const numPct = Math.round((withNumber / allBullets.length) * 100);
    add('metrics', 'Measurable results', 12, clamp01(numPct / 60),
      `${numPct}% of bullets include a number. Screeners look for at least 60%.`,
      'Add a real figure to more bullets: a percentage, a count, a latency, a team size or a scale. Only if it is true.');

    const good = allBullets.filter(b => { const w = wordCount(b); return w >= 10 && w <= 28; }).length;
    const tooLong = allBullets.filter(b => wordCount(b) > 34).length;
    add('length', 'Bullet length', 6, clamp01(good / allBullets.length) - Math.min(0.3, tooLong * 0.1),
      `${good} of ${allBullets.length} bullets are 10 to 28 words.${tooLong ? ` ${tooLong} run past 34.` : ''}`,
      'Keep bullets to one or two lines: 10 to 28 words. Split or trim the long ones.');

    const weak = allBullets.filter(b => WEAK_PHRASES.test(b) || FIRST_PERSON.test(` ${b}`)).length;
    add('phrasing', 'Passive phrasing', 6, 1 - clamp01(weak / Math.max(1, allBullets.length * 0.25)),
      weak ? `${weak} bullet(s) use phrases like "responsible for", "worked on" or "I".` : 'No weak or first-person phrasing.',
      'Replace "responsible for" and "worked on" with what you did and what changed. Drop "I" and "my".');

    const endings = allBullets.map(b => /[.!]$/.test(b.trim()));
    const withStop = endings.filter(Boolean).length;
    const consistent = Math.max(withStop, endings.length - withStop) / endings.length;
    add('punctuation', 'Consistent punctuation', 2, consistent >= 0.95 ? 1 : consistent >= 0.8 ? 0.6 : 0.2,
      consistent >= 0.95 ? 'Bullets end consistently.' : 'Some bullets end with a full stop and some do not.',
      'Either end every bullet with a full stop or none of them.');
  } else {
    add('depth', 'Detail per entry', 10, 0, 'There are no bullets yet.', 'Add achievements under each role or project.');
  }

  const buzz = ((p?.summary ?? '') + ' ' + allBullets.join(' ')).match(BUZZWORDS) ?? [];
  add('buzzwords', 'Buzzwords', 3, buzz.length === 0 ? 1 : buzz.length === 1 ? 0.5 : 0,
    buzz.length ? `Found: ${[...new Set(buzz.map(b => b.toLowerCase()))].slice(0, 3).join(', ')}.` : 'No filler buzzwords.',
    'Cut phrases like "team player" and "results-driven". Show it with a fact instead.');

  /* skills and projects */
  const categories = Object.values(normalizeSkills(data)).filter(v => (v ?? '').trim()).length;
  add('skills', 'Skills section', 7, (skills.length >= 12 ? 1 : skills.length >= 8 ? 0.7 : skills.length >= 4 ? 0.4 : 0) * (categories >= 3 ? 1 : 0.8),
    `${skills.length} skills in ${categories} group${categories === 1 ? '' : 's'}.`,
    'List at least 12 concrete skills, grouped into three or more categories such as languages, frameworks and tools.');

  const projFull = projects.filter(x => (x.context ?? '').trim() && (x.repo_url || x.demo_url)).length;
  add('projects', 'Projects', 6, projects.length === 0 ? (workExperience.length ? 0.3 : 0) : (projects.length >= 2 ? 1 : 0.6) * (0.6 + 0.4 * (projFull / projects.length)),
    projects.length ? `${projects.length} project${projects.length === 1 ? '' : 's'}, ${projFull} with a tech stack and a link.` : 'No projects.',
    'Add two or more projects, each with its tech stack and a repository or demo link.');

  /* dates */
  const dated = workExperience.filter(e => e.start);
  const formatOk = dated.filter(e => /^(?:[A-Za-z]{3,9}\.?\s+)?\d{4}$/.test(e.start.trim()) || /^\d{1,2}\/\d{4}$/.test(e.start.trim())).length;
  add('dates', 'Dates', 5, workExperience.length === 0 ? 0.7 : (dated.length / workExperience.length) * (dated.length ? 0.5 + 0.5 * (formatOk / dated.length) : 1),
    workExperience.length === 0 ? 'No roles to date.' : `${dated.length} of ${workExperience.length} roles are dated${formatOk < dated.length ? ', not all in one format' : ''}.`,
    'Give every role a start date in one format such as "Jun 2024".');

  /* layout */
  const measured = typeof measuredFill === 'number';
  const fill = measured ? measuredFill : estimatePageFill(data, templateId);
  const pageEarned = fill > 108 ? 0 : fill > 100 ? 0.3 : fill >= 70 ? 1 : fill >= 55 ? 0.7 : 0.4;
  add('length-page', 'One page', 12, pageEarned,
    fill > 100 ? `Fills about ${fill}% of a page, so it runs onto a second page.` : fill < 70 ? `Fills about ${fill}% of a page. It looks thin.` : `Fills about ${fill}% of one page.`,
    fill > 100 ? 'Use "Fit to one page" or cut bullets and projects. Most recruiters expect one page under ten years of experience.' : 'Add detail until the page is at least 70% full.');

  add('layout', 'Layout', 8, meta?.columns === 1 ? 1 : 0.75, meta?.atsNote || (meta?.columns === 1 ? 'Single column: the safest layout for every parser.' : 'Two columns.'),
    'Some older parsers read two columns in the wrong order. A single-column template is the safest choice.');

  add('text', 'Text extraction', 0, 1, 'Ligatures are mapped to Unicode and special characters are escaped, so text copies out cleanly.');

  /* job description */
  let keywordCoverage: AtsReport['keywordCoverage'];
  if (jdText && jdText.trim().length > 40) {
    const corpus = [p?.summary, ...allBullets, ...projects.map(x => `${x.title} ${x.context ?? ''}`), ...skills].join(' ').toLowerCase();
    const keywords = extractKeywords(jdText, 25);
    const matched = keywords.filter(k => corpus.includes(k));
    const missingKw = keywords.filter(k => !corpus.includes(k));
    const pct = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
    keywordCoverage = { matched, missing: missingKw };
    add('keywords', 'Job description match', 16, clamp01(pct / 75),
      `${pct}% of the job description's top keywords appear in your resume. Strong matches are 75% or more.`,
      'Work the missing keywords into your skills and bullets, only where they are true.');
  }

  /* total */
  const totalWeight = checks.reduce((n, c) => n + c.weight, 0);
  const points = checks.reduce((n, c) => n + c.weight * c.earned, 0);
  let score = Math.round(Math.pow(totalWeight ? points / totalWeight : 0, 1.5) * 100);
  const critical = (id: string) => checks.find(c => c.id === id)?.earned ?? 1;
  if (critical('length-page') < 0.5) score = Math.min(score, 60);
  if (critical('sections') < 1 || critical('contact') < 0.5) score = Math.min(score, 65);
  if (allBullets.length === 0) score = Math.min(score, 40);

  const topFixes = checks
    .filter(c => c.weight > 0 && c.earned < 0.9 && c.fix)
    .sort((a, b) => b.weight * (1 - b.earned) - a.weight * (1 - a.earned))
    .slice(0, 3);

  return {
    score,
    grade: score >= 90 ? 'Excellent' : score >= 78 ? 'Strong' : score >= 60 ? 'Fair' : 'Weak',
    checks,
    topFixes,
    pageFill: fill,
    measured,
    keywordCoverage,
  };
}
