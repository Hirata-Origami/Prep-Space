import type { Experience, EducationItem, ProjectItem, ResumeData, SkillCategories } from '@/lib/hooks/useResume';
import { latexToPlain, readBraceGroup, splitSkillsSafely, displayUrl } from './latexSanitizer';

/**
 * Deterministic importer for .tex files that use the PrepSpace macro
 * vocabulary (\roletitle, \orgline, \projtitle, \edudeg, \skillcat ...).
 * Every template this app exports uses those macros, and so does the
 * hand-written flagship resume it was modelled on, so those files load back
 * exactly, with no model in the loop. Returns null for any other layout.
 */

const ARG_COUNTS: Record<string, number> = {
  sectiontitle: 1,
  resumeheader: 2,
  metaicon: 2,
  roletitle: 1,
  orgline: 3,
  orgdate: 2,
  orgplace: 2,
  orgname: 1,
  projtitle: 2,
  projtitleonly: 1,
  projcontext: 1,
  demolink: 1,
  edudeg: 1,
  eduinst: 1,
  edumeta: 1,
  eduline: 4,
  skillcat: 1,
  skillline: 2,
  sk: 1,
};

interface Token {
  name: string;
  args: string[];
  items?: string[];
  start: number;
  end: number;
}

function skipSpace(src: string, i: number): number {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

function scan(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] !== '\\') { i++; continue; }
    const m = /^\\([a-zA-Z]+)/.exec(src.slice(i, i + 24));
    if (!m) { i += 2; continue; }
    const name = m[1];
    const start = i;
    let p = i + m[0].length;

    if (name === 'begin') {
      const env = readBraceGroup(src, skipSpace(src, p));
      if (env?.content === 'bl') {
        const close = src.indexOf('\\end{bl}', env.end);
        const end = close === -1 ? src.length : close;
        const inner = src.slice(env.end, end);
        const items = inner.split(/\\item\b/).slice(1).map(s => s.trim()).filter(Boolean);
        tokens.push({ name: 'bl', args: [], items, start, end: close === -1 ? end : close + 8 });
        i = close === -1 ? end : close + 8;
        continue;
      }
      i = p;
      continue;
    }

    const count = ARG_COUNTS[name];
    if (count === undefined) { i = p; continue; }

    const args: string[] = [];
    for (let a = 0; a < count; a++) {
      p = skipSpace(src, p);
      const g = readBraceGroup(src, p);
      if (!g) break;
      args.push(g.content);
      p = g.end;
    }
    if (args.length === count) {
      tokens.push({ name, args, start, end: p });
      i = p;
    } else {
      i = start + m[0].length;
    }
  }
  return tokens;
}

const plain = (s: string) => latexToPlain(s);
const rich = (s: string) => latexToPlain(s, { markdown: true });

function titleCaseIfShouting(name: string): string {
  if (name.length < 4 || name !== name.toUpperCase()) return name;
  return name.replace(/\S+/g, w => w[0] + w.slice(1).toLowerCase());
}

function sectionKind(title: string): string | null {
  const t = plain(title).toLowerCase();
  if (/summary|^about|^profile|objective/.test(t)) return 'summary';
  if (/experience|employment|work history/.test(t)) return 'experience';
  if (/project/.test(t)) return 'projects';
  if (/skill|competenc|technolog/.test(t)) return 'skills';
  if (/education|academic/.test(t)) return 'education';
  if (/achievement|honou?r|award/.test(t)) return 'achievements';
  if (/certif|course|licen/.test(t)) return 'certifications';
  return null;
}

function skillKey(label: string): keyof SkillCategories {
  const l = plain(label).toLowerCase();
  if (/language/.test(l)) return 'languages';
  if (/framework|librar/.test(l)) return 'frameworks';
  if (/cloud|data ?base|\bdb\b|storage/.test(l)) return 'cloud_and_databases';
  if (/tool|architect|devops|platform/.test(l)) return 'tools_and_architecture';
  return 'area_of_interest';
}

function splitDates(raw: string): { start: string; end: string } {
  const text = plain(raw);
  const parts = text.split(/\s*[–—]\s*|\s+-{1,2}\s+|\s+to\s+/i).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { start: parts[0], end: parts.slice(1).join(' – ') };
  return { start: parts[0] ?? '', end: '' };
}

function urlOf(raw: string): string {
  return raw.replace(/\\([%#&_])/g, '$1').trim();
}

function parseContact(profile: ResumeData['profile'], icon: string, value: string) {
  const href = /\\href\{([^}]*)\}\{([\s\S]*)\}/.exec(value.trim());
  if (/faPhone/.test(icon)) profile.phone = plain(value);
  else if (/faEnvelope/.test(icon)) profile.email = plain(value).replace(/^mailto:/, '');
  else if (/faLinkedin/.test(icon)) {
    profile.linkedin = href ? urlOf(href[1]) : plain(value);
    const label = href ? plain(href[2]) : '';
    if (label && label !== displayUrl(profile.linkedin)) profile.linkedinLabel = label;
  } else if (/faGithub/.test(icon)) {
    profile.github = href ? urlOf(href[1]) : plain(value);
    const label = href ? plain(href[2]) : '';
    if (label && label !== displayUrl(profile.github)) profile.githubLabel = label;
  } else if (/faMapMarker/.test(icon)) profile.location = plain(value);
}

export type ParsedResume = Pick<ResumeData, 'profile' | 'experience' | 'projects' | 'education' | 'skills' | 'skills_categorized' | 'achievements' | 'certifications'>;

export function parseResumeLatex(tex: string): ParsedResume | null {
  const doc = /\\begin\{document\}([\s\S]*?)\\end\{document\}/.exec(tex);
  if (!doc) return null;
  const body = doc[1].replace(/(^|[^\\])%.*$/gm, '$1');
  const tokens = scan(body);

  const isOwnFormat =
    tokens.some(t => t.name === 'sectiontitle') &&
    tokens.some(t => ['roletitle', 'projtitle', 'projtitleonly', 'edudeg', 'eduline', 'skillcat', 'skillline'].includes(t.name));
  if (!isOwnFormat) return null;

  const profile: ResumeData['profile'] = { name: '', email: '', phone: '', linkedin: '', github: '', location: '', summary: '' };

  // ---- header ----
  const header = tokens.find(t => t.name === 'resumeheader');
  if (header) {
    profile.name = titleCaseIfShouting(plain(header.args[0]));
  } else {
    const first = tokens.find(t => t.name === 'sectiontitle');
    const head = body.slice(0, first ? first.start : body.length);
    const nameMatch = /\\fontsize\{(?:2\d|3\d)\}\{[\d.]+\}\\selectfont\s*\\bfseries(?:\\color\{[^}]*\})?\s*([^}]+)\}/.exec(head);
    if (nameMatch) profile.name = titleCaseIfShouting(plain(nameMatch[1]));
  }
  const contactTokens = [
    ...tokens.filter(t => t.name === 'metaicon'),
    ...(header ? scan(header.args[1]).filter(t => t.name === 'metaicon') : []),
  ];
  contactTokens.forEach(t => parseContact(profile, t.args[0], t.args[1]));

  // ---- sections ----
  const sections = tokens.filter(t => t.name === 'sectiontitle');
  const experience: Experience[] = [];
  const projects: ProjectItem[] = [];
  const education: EducationItem[] = [];
  const skillRows: Record<keyof SkillCategories, string[]> = {
    languages: [], frameworks: [], cloud_and_databases: [], tools_and_architecture: [], area_of_interest: [],
  };
  let achievements = '';
  let certifications = '';

  sections.forEach((sec, idx) => {
    const kind = sectionKind(sec.args[0]);
    if (!kind) return;
    let end = idx + 1 < sections.length ? sections[idx + 1].start : body.length;
    const minipageEnd = body.indexOf('\\end{minipage}', sec.end);
    if (minipageEnd !== -1 && minipageEnd < end) end = minipageEnd;
    const raw = body.slice(sec.end, end);
    const inside = tokens.filter(t => t.start >= sec.end && t.end <= end);

    if (kind === 'summary') {
      profile.summary = rich(raw);
    } else if (kind === 'achievements' || kind === 'certifications') {
      const list = inside.find(t => t.name === 'bl');
      const text = list?.items ? list.items.map(rich).join('\n') : rich(raw);
      if (kind === 'achievements') achievements = text;
      else certifications = text;
    } else if (kind === 'experience') {
      let cur: Experience | null = null;
      inside.forEach(t => {
        if (t.name === 'roletitle') {
          cur = { role: plain(t.args[0]), company: '', start: '', end: '', location: '', bullets: '', type: 'work' };
          experience.push(cur);
        } else if (cur && ['orgline', 'orgdate', 'orgplace', 'orgname'].includes(t.name)) {
          cur.company = plain(t.args[0]);
          if (t.name === 'orgline') { Object.assign(cur, splitDates(t.args[1])); cur.location = plain(t.args[2]); }
          if (t.name === 'orgdate') Object.assign(cur, splitDates(t.args[1]));
          if (t.name === 'orgplace') cur.location = plain(t.args[1]);
        } else if (cur && t.name === 'bl') {
          cur.bullets = (t.items ?? []).map(rich).join('\n');
        }
      });
    } else if (kind === 'projects') {
      let cur: ProjectItem | null = null;
      inside.forEach(t => {
        if (t.name === 'projtitle' || t.name === 'projtitleonly') {
          cur = { title: plain(t.args[0]), repo_url: t.name === 'projtitle' ? urlOf(t.args[1]) : '', demo_url: '', context: '', bullets: '' };
          projects.push(cur);
        } else if (cur && t.name === 'projcontext') cur.context = plain(t.args[0]);
        else if (cur && t.name === 'demolink') cur.demo_url = urlOf(plain(t.args[0]));
        else if (cur && t.name === 'bl') cur.bullets = (t.items ?? []).map(rich).join('\n');
      });
    } else if (kind === 'skills') {
      const cats = inside.filter(t => t.name === 'skillcat' || t.name === 'skillline');
      cats.forEach((cat, ci) => {
        const key = skillKey(cat.args[0]);
        if (cat.name === 'skillline') {
          skillRows[key].push(splitSkillsSafely(plain(cat.args[1])).join(', '));
          return;
        }
        const segEnd = ci + 1 < cats.length ? cats[ci + 1].start : end;
        const segment = body.slice(cat.end, segEnd);
        segment.split(/\\par\b/).forEach(part => {
          const items = scan(part).filter(t => t.name === 'sk').map(t => plain(t.args[0])).filter(Boolean);
          if (items.length) skillRows[key].push(items.join(', '));
        });
      });
    } else if (kind === 'education') {
      let cur: EducationItem | null = null;
      inside.forEach(t => {
        if (t.name === 'edudeg') { cur = { degree: plain(t.args[0]), institution: '', year: '', score: '' }; education.push(cur); }
        else if (cur && t.name === 'eduinst') cur.institution = plain(t.args[0]);
        else if (cur && t.name === 'edumeta') {
          const [year, ...rest] = plain(t.args[0]).split('•').map(s => s.trim());
          cur.year = year ?? '';
          cur.score = rest.join(' • ');
        } else if (t.name === 'eduline') {
          education.push({ degree: plain(t.args[0]), institution: plain(t.args[1]), year: plain(t.args[2]), score: plain(t.args[3]) });
        }
      });
    }
  });

  const skills_categorized: SkillCategories = {
    languages: skillRows.languages.join('\n'),
    frameworks: skillRows.frameworks.join('\n'),
    cloud_and_databases: skillRows.cloud_and_databases.join('\n'),
    tools_and_architecture: skillRows.tools_and_architecture.join('\n'),
    area_of_interest: skillRows.area_of_interest.join('\n'),
  };
  const flatSkills = Object.values(skillRows).flat().join(', ');

  if (!experience.length && !projects.length && !education.length && !flatSkills) return null;

  return { profile, experience, projects, education, skills: flatSkills, skills_categorized, achievements, certifications };
}
