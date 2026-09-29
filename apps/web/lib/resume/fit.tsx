'use client';

import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { Experience, ProjectItem, ResumeData, ResumeTemplateId } from '@/lib/hooks/useResume';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { normalizeProjects, toItems } from './templates';
import { STRONG_VERBS, extractKeywords } from './ats';

/** A4 is 297 / 210 times as tall as it is wide. */
const A4_RATIO = 297 / 210;
/** Real PDF layout differs a little from the preview, so aim below the edge. */
const TARGET = 96;

/**
 * Lays the resume out off screen with the same renderer as the preview and returns how much of one A4 page
 * the content fills, in percent. Over 100 means it spills onto a second page.
 */
export function measureFill(data: ResumeData, templateId: ResumeTemplateId): number {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;visibility:hidden;pointer-events:none';
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<ResumePreview data={data} templateId={templateId} />));
    const page = host.firstElementChild?.firstElementChild as HTMLElement | null;
    if (!page) return 0;
    const style = getComputedStyle(page);
    // the page has a minimum height, so read where the content ends instead of the box height
    const content = Array.from(page.children).filter(c => getComputedStyle(c).position !== 'absolute') as HTMLElement[];
    const bottom = content.reduce((m, c) => Math.max(m, c.offsetTop + c.offsetHeight), 0) + parseFloat(style.paddingBottom || '0');
    return Math.round((bottom / (page.offsetWidth * A4_RATIO)) * 100);
  } finally {
    root.unmount();
    host.remove();
  }
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const firstWord = (b: string) => b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? '';

/** How much a bullet is worth keeping: figures, strong verbs and job keywords score; rambling loses points. */
function bulletValue(b: string, keywords: string[]): number {
  const lower = b.toLowerCase();
  let v = 0;
  if (/\d/.test(b)) v += 3;
  if (STRONG_VERBS.has(firstWord(b))) v += 1;
  v += keywords.filter(k => lower.includes(k)).length;
  if (words(b) > 34) v -= 1;
  return v;
}

/**
 * Shortens a long bullet by dropping a trailing clause or a parenthetical, but only when what is removed
 * contains no figure. Returns the original when nothing can be cut safely.
 */
export function tightenBullet(b: string, maxWords = 26): string {
  if (words(b) <= maxWords) return b;
  const ended = /[.!]$/.test(b.trim());
  let out = b.replace(/\s*\(([^)]*)\)/g, (m, inner: string) => (/\d/.test(inner) ? m : ''));
  if (words(out) <= maxWords) return out;

  const cuts: number[] = [];
  const re = /(,\s+(?:which|enabling|allowing|ensuring|resulting|leading|so that|while|making)\b|\s+(?:while|which|enabling|allowing|ensuring)\s|,\s+and\s|;\s|\s[–-]\s)/gi;
  for (let m = re.exec(out); m; m = re.exec(out)) cuts.push(m.index);
  // prefer the latest cut that leaves a bullet short enough, so as much meaning as possible survives
  for (let i = cuts.length - 1; i >= 0; i--) {
    const head = out.slice(0, cuts[i]).trimEnd();
    const tail = out.slice(cuts[i]);
    if (words(head) >= 10 && words(head) <= maxWords && !/\d/.test(tail)) {
      out = head.replace(/[,;:–-]$/, '');
      return ended ? `${out}.` : out;
    }
  }
  return words(out) < words(b) ? out : b;
}

export interface FitResult {
  data: ResumeData;
  /** What was changed, in order, in plain words. */
  steps: string[];
  fill: number;
  fits: boolean;
}

interface Working {
  data: ResumeData;
  experience: Experience[];
  projects: ProjectItem[];
}

const rebuild = (w: Working, base: ResumeData): ResumeData => ({ ...base, experience: w.experience, projects: w.projects });

/** Keeps the `keep` most valuable bullets of an entry, in their original order. */
function keepBest(bullets: string, keep: number, keywords: string[]): { text: string; removed: number } {
  const items = toItems(bullets);
  if (items.length <= keep) return { text: bullets, removed: 0 };
  const ranked = items.map((b, i) => ({ b, i, v: bulletValue(b, keywords) - i * 0.01 })).sort((a, b) => b.v - a.v).slice(0, keep).sort((a, b) => a.i - b.i);
  return { text: ranked.map(r => r.b).join('\n'), removed: items.length - keep };
}

const sentences = (s: string) => s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)?.map(x => x.trim()) ?? [s];

/**
 * Trims a resume until it fits one page, changing as little as it can, in this order: shorten long bullets,
 * trim the summary, cap bullets per entry keeping the strongest, drop the weakest projects, then tighten
 * older roles. Projects named in keepTitles win ties. It never touches contact details, education or skills, and never invents text.
 */
export function fitToOnePage(input: ResumeData, templateId: ResumeTemplateId, jd?: string, keepTitles: string[] = []): FitResult {
  const keywords = jd && jd.trim().length > 40 ? extractKeywords(jd, 25) : [];
  const split = normalizeProjects(input);
  const w: Working = { data: input, experience: split.workExperience.map(e => ({ ...e, type: 'work' as const })), projects: split.projects.map(p => ({ ...p })) };
  const steps: string[] = [];
  let fill = measureFill(rebuild(w, input), templateId);
  const check = () => {
    fill = measureFill(rebuild(w, w.data), templateId);
    return fill <= TARGET;
  };
  const dropped: { project: ProjectItem; value: number }[] = [];

  /** Trimming overshoots by whole projects, so give back any dropped project that still fits. */
  const regrow = () => {
    for (const d of [...dropped].sort((a, b) => b.value - a.value)) {
      w.projects = [...w.projects, d.project];
      fill = measureFill(rebuild(w, w.data), templateId);
      if (fill <= TARGET) {
        const at = steps.indexOf(`Dropped the project "${d.project.title}"`);
        if (at >= 0) steps.splice(at, 1);
      } else {
        w.projects = w.projects.slice(0, -1);
        fill = measureFill(rebuild(w, w.data), templateId);
      }
    }
  };

  const done = (): FitResult => {
    if (dropped.length && fill <= TARGET) regrow();
    return { data: rebuild(w, w.data), steps, fill, fits: fill <= 100 };
  };

  if (fill <= TARGET) return done();

  // 1. shorten long bullets
  let shortened = 0;
  const shorten = (b: string) => {
    const t = tightenBullet(b);
    if (t !== b) shortened++;
    return t;
  };
  w.experience = w.experience.map(e => ({ ...e, bullets: toItems(e.bullets).map(shorten).join('\n') }));
  w.projects = w.projects.map(p => ({ ...p, bullets: toItems(p.bullets).map(shorten).join('\n') }));
  if (shortened) steps.push(`Shortened ${shortened} long ${shortened === 1 ? 'bullet' : 'bullets'}`);
  if (check()) return done();

  // 2. summary down to two sentences
  const summary = w.data.profile?.summary ?? '';
  if (words(summary) > 40) {
    const two = sentences(summary).slice(0, 2).join(' ');
    if (two && two !== summary) {
      w.data = { ...w.data, profile: { ...w.data.profile, summary: two } };
      steps.push('Trimmed the summary to two sentences');
      if (check()) return done();
    }
  }

  // 3. cap bullets per entry, keeping the strongest
  // work experience keeps at least four bullets until projects have been dropped
  const caps: [number, number][] = [[5, 3], [5, 2], [4, 2]];
  for (const [workCap, projCap] of caps) {
    let removed = 0;
    w.experience = w.experience.map((e, i) => {
      const cap = i === 0 ? workCap : Math.max(2, workCap - 1);
      const r = keepBest(e.bullets, cap, keywords);
      removed += r.removed;
      return { ...e, bullets: r.text };
    });
    w.projects = w.projects.map(p => {
      const r = keepBest(p.bullets, projCap, keywords);
      removed += r.removed;
      return { ...p, bullets: r.text };
    });
    if (removed) steps.push(`Kept the strongest ${workCap} bullets per role and ${projCap} per project (removed ${removed})`);
    if (check()) return done();
  }

  // 4. achievements and certifications
  for (const key of ['achievements', 'certifications'] as const) {
    const items = toItems(w.data[key]);
    if (items.length > 3) {
      w.data = { ...w.data, [key]: items.slice(0, 3).join('\n') };
      steps.push(`Kept ${key === 'achievements' ? 'three achievements' : 'three certifications'}`);
    }
  }
  if (check()) return done();

  // 5. drop the least valuable project, one at a time, keeping at least one
  while (w.projects.length > 1) {
    const worst = w.projects
      .map((p, i) => ({ i, v: toItems(p.bullets).reduce((s, b) => s + bulletValue(b, keywords), 0) + keywords.filter(k => `${p.title} ${p.context ?? ''}`.toLowerCase().includes(k)).length * 2 + (p.repo_url ? 1 : 0) + (keepTitles.includes(p.title) ? 2 : 0) }))
      .sort((a, b) => a.v - b.v)[0];
    steps.push(`Dropped the project "${w.projects[worst.i].title}"`);
    dropped.push({ project: w.projects[worst.i], value: worst.v });
    w.projects = w.projects.filter((_, i) => i !== worst.i);
    if (check()) return done();
  }

  // 6. work bullets down to three, older roles to two
  w.experience = w.experience.map((e, i) => ({ ...e, bullets: keepBest(e.bullets, i === 0 ? 3 : 2, keywords).text }));
  steps.push('Cut work bullets to three, and older roles to two');
  if (check()) return done();

  // 7. last resorts
  if (w.data.achievements || w.data.certifications) {
    w.data = { ...w.data, achievements: '', certifications: '' };
    steps.push('Removed achievements and certifications');
    if (check()) return done();
  }
  if (w.data.profile?.summary) {
    w.data = { ...w.data, profile: { ...w.data.profile, summary: '' } };
    steps.push('Removed the summary');
    check();
  }
  return done();
}
