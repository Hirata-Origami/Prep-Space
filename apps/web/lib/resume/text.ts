import type { ResumeData } from '@/lib/hooks/useResume';
import { displayUrl, splitSkillRows } from './latexSanitizer';
import { normalizeEducation, normalizeProjects, normalizeSkills, toItems } from './templates';

/** The resume as plain text, for pasting into application forms that strip formatting. */
export function resumeToPlainText(data: ResumeData): string {
  const p = data.profile;
  const { workExperience, projects } = normalizeProjects(data);
  const clean = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(?<!\*)\*([^*\n]+)\*/g, '$1');
  const bullets = (t?: string) => toItems(t).map(b => `- ${clean(b)}`).join('\n');
  const out: string[] = [];

  out.push((p.name || '').toUpperCase());
  out.push([p.phone, p.email, p.linkedin && displayUrl(p.linkedin), p.github && displayUrl(p.github), p.location].filter(Boolean).join(' | '));

  if (p.summary) out.push('', 'SUMMARY', clean(p.summary));

  if (workExperience.length) {
    out.push('', 'EXPERIENCE');
    workExperience.forEach(e => {
      out.push(`${e.role}, ${e.company}${e.location ? `, ${e.location}` : ''}`);
      const dates = [e.start, e.end || (e.start ? 'Present' : '')].filter(Boolean).join(' - ');
      if (dates) out.push(dates);
      out.push(bullets(e.bullets), '');
    });
  }

  if (projects.length) {
    out.push('PROJECTS');
    projects.forEach(pr => {
      out.push(pr.title);
      if (pr.context) out.push(pr.context);
      if (pr.repo_url) out.push(pr.repo_url);
      if (pr.demo_url) out.push(pr.demo_url);
      out.push(bullets(pr.bullets), '');
    });
  }

  const skills = normalizeSkills(data);
  const skillLines = (Object.entries(skills) as [string, string][])
    .map(([k, v]) => [k.replace(/_/g, ' '), splitSkillRows(v).flat().join(', ')] as const)
    .filter(([, v]) => v);
  if (skillLines.length) {
    out.push('SKILLS');
    skillLines.forEach(([k, v]) => out.push(`${k.charAt(0).toUpperCase()}${k.slice(1)}: ${v}`));
    out.push('');
  }

  const edu = normalizeEducation(data);
  if (edu.length) {
    out.push('EDUCATION');
    edu.forEach(e => out.push([e.degree, e.institution, e.year, e.score].filter(Boolean).join(', ')));
    out.push('');
  }

  const ach = toItems(data.achievements);
  if (ach.length) out.push('ACHIEVEMENTS', ...ach.map(a => `- ${a}`), '');
  const certs = toItems(data.certifications);
  if (certs.length) out.push('CERTIFICATIONS', ...certs.map(a => `- ${a}`), '');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
