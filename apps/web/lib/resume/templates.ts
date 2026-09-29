import type {
  ResumeData,
  ResumeTemplateId,
  Experience,
  ProjectItem,
  EducationItem,
  SkillCategories,
} from '@/lib/hooks/useResume';
import {
  markdownToLatex,
  sanitizeBullets,
  sanitizeUrl,
  displayUrl,
  boldScore,
  escapeLatexSpecialChars,
  splitSkillsSafely,
  splitSkillRows,
} from './latexSanitizer';

/* ==========================================================================
 * Normalisation
 * ======================================================================== */

const LANG_KEYWORDS = new Set(['python', 'c++', 'c', 'c#', 'java', 'typescript', 'javascript', 'go', 'golang', 'rust', 'dart', 'sql', 'php', 'ruby', 'kotlin', 'swift', 'scala', 'r', 'html', 'css', 'bash', 'matlab']);
const FRAMEWORK_KEYWORDS = ['react', 'next.js', 'nextjs', 'vue', 'angular', 'flutter', 'flask', 'django', 'fastapi', 'express', 'node', 'tailwind', 'spring', 'pytorch', 'tensorflow', 'keras', 'streamlit', 'scikit', 'pandas', 'numpy'];
const CLOUD_KEYWORDS = ['aws', 'gcp', 'azure', 'postgres', 'supabase', 'firebase', 'mongodb', 'mysql', 'redis', 'dynamodb', 'bigquery', 'kafka', 'elasticsearch', 's3', 'lambda', 'sqlite'];
const TOOL_KEYWORDS = ['git', 'docker', 'kubernetes', 'postman', 'linux', 'ci/cd', 'github actions', 'jira', 'figma', 'webpack', 'vite', 'terraform'];

const hasKeyword = (lower: string, list: string[]) => list.some(k => lower === k || (k.length > 2 && lower.includes(k)));

const EMPTY_SKILLS: SkillCategories = {
  languages: '',
  frameworks: '',
  cloud_and_databases: '',
  tools_and_architecture: '',
  area_of_interest: '',
};

/** Uses the categorised skills when present, otherwise buckets a flat list. Never invents skills. */
export function normalizeSkills(data: ResumeData): SkillCategories {
  const cat = data.skills_categorized;
  if (cat && Object.values(cat).some(v => v && v.trim())) {
    return { ...EMPTY_SKILLS, ...cat };
  }

  const buckets: Record<keyof SkillCategories, string[]> = {
    languages: [],
    frameworks: [],
    cloud_and_databases: [],
    tools_and_architecture: [],
    area_of_interest: [],
  };

  splitSkillsSafely(data.skills || '').forEach(skill => {
    const lower = skill.toLowerCase();
    if (LANG_KEYWORDS.has(lower)) buckets.languages.push(skill);
    else if (hasKeyword(lower, FRAMEWORK_KEYWORDS)) buckets.frameworks.push(skill);
    else if (hasKeyword(lower, CLOUD_KEYWORDS)) buckets.cloud_and_databases.push(skill);
    else if (hasKeyword(lower, TOOL_KEYWORDS)) buckets.tools_and_architecture.push(skill);
    else buckets.area_of_interest.push(skill);
  });

  return {
    languages: buckets.languages.join(', '),
    frameworks: buckets.frameworks.join(', '),
    cloud_and_databases: buckets.cloud_and_databases.join(', '),
    tools_and_architecture: buckets.tools_and_architecture.join(', '),
    area_of_interest: buckets.area_of_interest.join(', '),
  };
}

export function normalizeEducation(data: ResumeData): EducationItem[] {
  if (Array.isArray(data.education)) {
    return data.education.filter(e => e.degree || e.institution);
  }
  if (data.education && (data.education.degree || data.education.institution)) {
    return [data.education];
  }
  return [];
}

/** Splits entries flagged as projects out of the experience list. */
export function normalizeProjects(data: ResumeData): { workExperience: Experience[]; projects: ProjectItem[] } {
  const workExperience: Experience[] = [];
  const projects: ProjectItem[] = [...(data.projects ?? [])];

  (data.experience ?? []).forEach(e => {
    if (e.type === 'project') {
      const title = e.role || e.company || 'Project';
      if (!projects.some(p => p.title === title)) {
        projects.push({
          title,
          context: e.company && e.company !== 'Project' && e.company !== title ? e.company : undefined,
          bullets: e.bullets || '',
        });
      }
    } else {
      workExperience.push(e);
    }
  });

  return {
    workExperience: workExperience.filter(e => e.role || e.company || e.bullets),
    projects: projects.filter(p => p.title || p.bullets),
  };
}

/** Splits a free-text block into list items (one per line, bullet markers removed). */
export function toItems(text?: string): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map(l => l.trim().replace(/^[*\-\u2022]\s+/, ''))
    .filter(Boolean);
}

/* ==========================================================================
 * Template registry (used by the UI)
 * ======================================================================== */

export interface TemplateMeta {
  id: ResumeTemplateId;
  label: string;
  description: string;
  columns: 1 | 2;
  font: string;
  atsNote: string;
}

export const TEMPLATE_META: TemplateMeta[] = [
  {
    id: 'modern-two-column',
    label: 'Modern Two-Column',
    description: 'Teal accent, skill pills, dense one-page layout',
    columns: 2,
    font: 'Lato',
    atsNote: 'Text-based with Unicode mapping, parses well in modern ATS. Single-column is safest for legacy systems.',
  },
  {
    id: 'classic-single',
    label: 'Classic ATS',
    description: 'Times-style serif, the safest layout for any ATS',
    columns: 1,
    font: 'Times',
    atsNote: 'Plain single column, standard headings, no graphics.',
  },
  {
    id: 'minimal-tech',
    label: 'Minimal Tech',
    description: 'Clean sans-serif, black and white, compact',
    columns: 1,
    font: 'Lato',
    atsNote: 'Plain single column, standard headings, no graphics.',
  },
  {
    id: 'accent-single',
    label: 'Modern Accent',
    description: 'Single column with a teal accent and skill lines',
    columns: 1,
    font: 'Lato',
    atsNote: 'Single column with colour used only on text and rules.',
  },
  {
    id: 'executive-serif',
    label: 'Executive Serif',
    description: 'Palatino with small-caps headings, formal tone',
    columns: 1,
    font: 'Palatino',
    atsNote: 'Plain single column, standard headings, no graphics.',
  },
];

/* ==========================================================================
 * Shared content builders (same macro vocabulary in every template, so any
 * exported file can be parsed back into data)
 * ======================================================================== */

interface Prepared {
  profile: ResumeData['profile'];
  properName: string;
  upperName: string;
  work: Experience[];
  projects: ProjectItem[];
  education: EducationItem[];
  skills: SkillCategories;
  achievements: string[];
  certifications: string[];
  certificates: PreparedCertificate[];
  summary: string;
}

export interface PreparedCertificate {
  name: string;
  issuer?: string;
  year?: string;
  verifyUrl?: string;
}

export function normalizeCertificates(data: ResumeData): PreparedCertificate[] {
  if (Array.isArray(data.certificates) && data.certificates.length > 0) {
    return data.certificates
      .filter(c => c && c.name?.trim())
      .map(c => ({
        name: c.name.trim(),
        issuer: c.issuer?.trim() || undefined,
        year: c.year?.trim() || undefined,
        verifyUrl: c.verifyUrl?.trim() || undefined,
      }));
  }

  // Fall back to parsing strings from data.certifications
  const items = toItems(data.certifications);
  return items.map(line => {
    let name = line;
    let verifyUrl = '';

    // Extract URL if present: [url] or https://...
    const urlMatch = line.match(/(https?:\/\/[^\s)\]]+)/i);
    if (urlMatch) {
      verifyUrl = urlMatch[1];
      name = line.replace(urlMatch[0], '').replace(/[()[\]]/g, '').trim();
    }

    // Extract year
    let year = '';
    const yearMatch = name.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) {
      year = yearMatch[1];
      name = name.replace(yearMatch[0], '').replace(/[,\s-]+$/, '').trim();
    }

    // Extract issuer
    let issuer = '';
    if (name.includes(' - ')) {
      const parts = name.split(' - ');
      name = parts[0].trim();
      issuer = parts[1].trim();
    } else if (name.includes(' – ')) {
      const parts = name.split(' – ');
      name = parts[0].trim();
      issuer = parts[1].trim();
    } else if (name.includes(', ')) {
      const parts = name.split(', ');
      name = parts[0].trim();
      issuer = parts.slice(1).join(', ').trim();
    }

    return {
      name: name || line,
      issuer: issuer || undefined,
      year: year || undefined,
      verifyUrl: verifyUrl || undefined,
    };
  });
}

type SectionKey = 'summary' | 'experience' | 'projects' | 'skills' | 'education' | 'achievements' | 'certifications';

interface Layout {
  skillStyle: 'pills' | 'lines';
  eduStyle: 'stacked' | 'inline';
  textBlock: 'twocol' | 'plain';
  linkEmail: boolean;
  titles: Record<SectionKey, string>;
  skillLabels: Record<keyof SkillCategories, string>;
}

function prepare(data: ResumeData): Prepared {
  const profile = data.profile || { name: '', email: '', phone: '', linkedin: '', github: '' };
  const { workExperience, projects } = normalizeProjects(data);
  const properName = (profile.name || 'Candidate Name').trim();
  return {
    profile,
    properName,
    upperName: properName.toUpperCase(),
    work: workExperience,
    projects,
    education: normalizeEducation(data),
    skills: normalizeSkills(data),
    achievements: toItems(data.achievements),
    certifications: toItems(data.certifications),
    certificates: normalizeCertificates(data),
    summary: (profile.summary || '').trim(),
  };
}

function buildContacts(p: Prepared, linkEmail: boolean): string[] {
  const { profile } = p;
  const items: string[] = [];
  if (profile.phone) items.push(`\\metaicon{\\faPhone}{${escapeLatexSpecialChars(profile.phone)}}`);
  if (profile.email) {
    const mail = escapeLatexSpecialChars(profile.email);
    const body = linkEmail ? `\\href{mailto:${sanitizeUrl(profile.email).replace(/^https:\/\//, '')}}{${mail}}` : mail;
    items.push(`\\metaicon{\\faEnvelope}{${body}}`);
  }
  if (profile.linkedin) {
    const url = sanitizeUrl(profile.linkedin);
    items.push(`\\metaicon{\\faLinkedin}{\\href{${url}}{${escapeLatexSpecialChars(profile.linkedinLabel || displayUrl(profile.linkedin))}}}`);
  }
  if (profile.github) {
    const url = sanitizeUrl(profile.github);
    items.push(`\\metaicon{\\faGithub}{\\href{${url}}{${escapeLatexSpecialChars(profile.githubLabel || displayUrl(profile.github))}}}`);
  }
  if (profile.location) items.push(`\\metaicon{\\faMapMarker}{${escapeLatexSpecialChars(profile.location)}}`);
  return items;
}

function formatDates(start?: string, end?: string): string {
  const s = escapeLatexSpecialChars((start || '').trim());
  const e = escapeLatexSpecialChars((end || '').trim() || (start ? 'Present' : ''));
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} \\textendash{} ${e}`;
}

function bulletList(bullets: string, indent = ''): string {
  const items = sanitizeBullets(bullets);
  if (items.length === 0) return '';
  return `${indent}\\begin{bl}\n${items.map(b => `\\item ${b}\n`).join('')}\\end{bl}\n`;
}

function buildExperience(p: Prepared, L: Layout): string {
  if (p.work.length === 0) return '';
  let out = `\\sectiontitle{${L.titles.experience}}\n\n`;
  p.work.forEach((exp, idx) => {
    const role = markdownToLatex(exp.role || exp.company || 'Role');
    const company = markdownToLatex(exp.company || '');
    const dates = formatDates(exp.start, exp.end);
    const loc = markdownToLatex(exp.location || '');

    out += `\\roletitle{${role}}\n`;
    if (dates && loc) out += `\\orgline{${company}}{${dates}}{${loc}}\n`;
    else if (dates) out += `\\orgdate{${company}}{${dates}}\n`;
    else if (loc) out += `\\orgplace{${company}}{${loc}}\n`;
    else out += `\\orgname{${company}}\n`;

    out += bulletList(exp.bullets);
    out += idx < p.work.length - 1 ? `\\projgap\n\n` : `\n`;
  });
  return out;
}

function buildProjects(p: Prepared, L: Layout, maxProjectsHint?: number): string {
  if (p.projects.length === 0) return '';

  // Cap the number of projects to avoid spilling onto page 2.
  // The caller supplies maxProjectsHint based on template column layout.
  // Default: 3 for single-column, 4 for two-column (tighter column).
  const limit = maxProjectsHint ?? (L.textBlock === 'twocol' ? 4 : 3);
  const shown = p.projects.slice(0, limit);

  let out = `\\sectiontitle{${L.titles.projects}}\n\n`;
  shown.forEach((proj, idx) => {
    const title = markdownToLatex(proj.title || 'Project');
    const repo = sanitizeUrl(proj.repo_url || '');
    const demo = sanitizeUrl(proj.demo_url || '');

    out += repo ? `\\projtitle{${title}}{${repo}}\n` : `\\projtitleonly{${title}}\n`;
    if (proj.context) out += `\\projcontext{${markdownToLatex(proj.context)}}\n`;
    if (demo) out += `\\demolink{${demo}}\n`;
    out += bulletList(proj.bullets);
    out += idx < shown.length - 1 ? `\\projgap\n\n` : `\n`;
  });

  // Fill any remaining vertical space so the page looks deliberately full
  if (shown.length > 0) out += `\\vfill\n`;

  return out;
}

function buildSummary(p: Prepared, L: Layout): string {
  if (!p.summary) return '';
  const text = markdownToLatex(p.summary);
  if (L.textBlock === 'twocol') {
    return `\\sectiontitle{${L.titles.summary}}\n\\noindent{\\fontsize{8.3}{10.4}\\selectfont\\color{darktext}\\justifying\n${text}\\par}\n\n`;
  }
  return `\\sectiontitle{${L.titles.summary}}\n${text}\\par\n\n`;
}

function buildTextSection(title: string, items: string[], L: Layout, fontSize: string): string {
  if (items.length === 0) return '';
  if (L.textBlock === 'twocol' && items.length === 1) {
    return `\\sectiontitle{${title}}\n\\noindent{\\fontsize{${fontSize}}\\selectfont\\color{darktext}\\justifying\n${markdownToLatex(items[0])}\\par}\n\n`;
  }
  return `\\sectiontitle{${title}}\n${bulletList(items.join('\n'))}\n`;
}

function buildSkills(p: Prepared, L: Layout): string {
  const order: (keyof SkillCategories)[] = ['languages', 'frameworks', 'cloud_and_databases', 'tools_and_architecture', 'area_of_interest'];
  const present = order.filter(k => splitSkillRows(p.skills[k]).length > 0);
  if (present.length === 0) return '';

  let out = `\\sectiontitle{${L.titles.skills}}\n\n`;
  present.forEach(key => {
    const rows = splitSkillRows(p.skills[key]);
    const label = L.skillLabels[key];
    if (L.skillStyle === 'pills') {
      out += `\\skillcat{${label}}\n`;
      out += rows.map(row => `${row.map(s => `\\sk{${escapeLatexSpecialChars(s)}}`).join('')}\\par`).join('\n');
      out += `\\vspace{4pt}\n\n`;
    } else {
      const all = rows.flat().map(s => escapeLatexSpecialChars(s)).join(', ');
      out += `\\skillline{${label}}{${all}}\n`;
    }
  });
  return `${out}\n`;
}

function buildEducation(p: Prepared, L: Layout): string {
  if (p.education.length === 0) return '';
  let out = `\\sectiontitle{${L.titles.education}}\n\n`;
  p.education.forEach((edu, idx) => {
    const degree = markdownToLatex(edu.degree || '');
    const inst = markdownToLatex(edu.institution || '');
    const year = escapeLatexSpecialChars(edu.year || '');
    if (L.eduStyle === 'stacked') {
      const score = edu.score ? ` \\ \\textbullet\\ \\ ${boldScore(edu.score)}` : '';
      const meta = year || score ? `\\faCalendar\\ ${year}${score}` : '';
      out += `\\edudeg{${degree}}\n\\eduinst{${inst}}\n${meta ? `\\edumeta{${meta}}\n` : ''}`;
      if (idx < p.education.length - 1) out += `\\vspace{7pt}\n\n`;
    } else {
      out += `\\eduline{${degree}}{${inst}}{${year}}{${edu.score ? boldScore(edu.score) : ''}}\n`;
    }
  });
  return `${out}\n`;
}

function buildCertifications(p: Prepared, L: Layout): string {
  if (p.certificates.length === 0) return '';
  let out = `\\sectiontitle{${L.titles.certifications}}\n\n`;
  p.certificates.forEach((cert, idx) => {
    const name = markdownToLatex(cert.name);
    const issuer = cert.issuer ? markdownToLatex(cert.issuer) : '';
    const year = cert.year ? escapeLatexSpecialChars(cert.year) : '';
    const verify = cert.verifyUrl ? sanitizeUrl(cert.verifyUrl) : '';

    if (L.textBlock === 'twocol') {
      out += `\\noindent{\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{darktext} ${name}}`;
      if (issuer) out += `{\\fontsize{8}{10}\\selectfont\\color{graytext}\\ \\textbullet\\ ${issuer}}`;
      out += `\\par\n`;
      if (year || verify) {
        out += `\\noindent{\\fontsize{7.5}{9}\\selectfont\\color{graytext}`;
        if (year) out += `${year}`;
        if (year && verify) out += ` \\ \\textbullet\\ \\ `;
        if (verify) out += `{\\color{accent}\\href{${verify}}{Verify \\faExternalLink}}`;
        out += `}\\par\n`;
      }
      out += idx < p.certificates.length - 1 ? `\\vspace{3.5pt}\n\n` : `\\vspace{2pt}\n\n`;
    } else {
      out += `\\noindent{\\bfseries ${name}}`;
      if (issuer) out += `\\ \\textbullet\\ ${issuer}`;
      if (year) out += `\\hfill{\\small ${year}}`;
      out += `\\par\n`;
      if (verify) {
        out += `\\noindent{\\small\\color{accent}\\href{${verify}}{Verify certificate \\faExternalLink}}\\par\n`;
      }
      out += `\\vspace{3pt}\n`;
    }
  });
  return `${out}\n`;
}

function buildSection(key: SectionKey, p: Prepared, L: Layout, maxProjectsHint?: number): string {
  switch (key) {
    case 'summary': return buildSummary(p, L);
    case 'experience': return buildExperience(p, L);
    case 'projects': return buildProjects(p, L, maxProjectsHint);
    case 'skills': return buildSkills(p, L);
    case 'education': return buildEducation(p, L);
    case 'achievements': return buildTextSection(L.titles.achievements, p.achievements, L, '8.2}{10.2');
    case 'certifications': return buildCertifications(p, L);
  }
}

const pdfSafe = (s: string) => s.replace(/[{}\\%#&$_^~]/g, '');

/* ==========================================================================
 * TEMPLATE 1: Modern Two-Column (the flagship layout, byte-compatible with
 * the original hand-written resume)
 * ======================================================================== */

const TWO_COLUMN_LAYOUT: Layout = {
  skillStyle: 'pills',
  eduStyle: 'stacked',
  textBlock: 'twocol',
  linkEmail: false,
  titles: {
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    education: 'Education',
    achievements: 'Achievements',
    certifications: 'Certifications',
  },
  skillLabels: {
    languages: 'Languages',
    frameworks: 'Frameworks',
    cloud_and_databases: 'Cloud \\& Databases',
    tools_and_architecture: 'Tools \\& Architecture',
    area_of_interest: 'Area of Interest',
  },
};

export function renderModernTwoColumn(data: ResumeData): string {
  const p = prepare(data);
  const L = TWO_COLUMN_LAYOUT;
  const safeName = escapeLatexSpecialChars(p.upperName);
  const contacts = buildContacts(p, L.linkEmail);

  const left = [buildExperience(p, L), buildProjects(p, L, 4)].join('\n');
  const education = buildEducation(p, L);
  const right = [
    buildSummary(p, L),
    buildSkills(p, L),
    buildSection('achievements', p, L),
    buildSection('certifications', p, L),
    education ? `\\vspace{10pt}\n${education}` : '',
  ].join('\n');

  return String.raw`%% ============================================================
%%  ${safeName} — Resume (ATS-optimized Two-Column)
%% ============================================================
\documentclass[9pt]{extarticle}

\usepackage[a4paper,top=1.35cm,bottom=1.0cm,left=1.15cm,right=1.15cm]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage[default]{lato}
\usepackage{xcolor}
\usepackage{fontawesome5}
\usepackage{tikz}
\usepackage{enumitem}
\usepackage{microtype}
\DisableLigatures{encoding = *, family = *}
\usepackage{hyperref}
\usepackage{ragged2e}

%% ---------- palette ----------
\definecolor{accent}{HTML}{00A6C0}   % teal accent
\definecolor{darktext}{HTML}{2E2E2F} % near-black body text
\definecolor{graytext}{HTML}{65696D} % section labels / meta text
\definecolor{linegray}{HTML}{B4B7B9} % divider rules / borders

\hypersetup{colorlinks=true,urlcolor=accent,linkcolor=accent,pdftitle={${pdfSafe(p.properName)} - Resume},pdfauthor={${pdfSafe(p.properName)}}}
\urlstyle{same}
% --- ATS fix: make ligatures (fl, fi, ffi ...) extract as plain text, not glyphs ---
\input{glyphtounicode}
\pdfgentounicode=1
\pagestyle{empty}
\setlength{\parindent}{0pt}
\color{darktext}
\renewcommand{\familydefault}{\latofamily}

%% ---------- helpers ----------
\newcommand{\sectiontitle}[1]{%
  \par\vspace{5pt}
  {\color{graytext}\bfseries\fontsize{8.7}{10}\selectfont\MakeUppercase{#1}}\par
  \vspace{-3pt}
  {\color{linegray}\rule{\linewidth}{0.6pt}}\par
  \vspace{4pt}
}

% skill "pill" = text with a bottom rule, wraps naturally like tags
\newcommand{\sk}[1]{%
  \tikz[baseline=(t.base)]{\node[inner sep=1.3pt,outer sep=0pt](t){\fontsize{7.8}{9}\selectfont #1};\draw[linegray,line width=0.45pt]([yshift=-2.2pt]t.south west)--([yshift=-2.2pt]t.south east);}%
  \hspace{2pt}%
}
\newcommand{\skillcat}[1]{\vspace{2pt}{\color{accent}\bfseries\fontsize{8.3}{10}\selectfont #1}\par\vspace{3pt}}

\newcommand{\metaicon}[2]{{\color{graytext}\fontsize{7.3}{8.5}\selectfont #1\, #2}}

% Experience / project role header
\newcommand{\roletitle}[1]{{\bfseries\fontsize{9.6}{11}\selectfont\color{darktext} #1}\par\vspace{1pt}}
\newcommand{\orgline}[3]{% company, dates, location
  \noindent{\color{accent}\bfseries\fontsize{8.6}{10}\selectfont #1}\hfill\metaicon{\faCalendar}{#2}\hspace{8pt}\metaicon{\faMapMarker}{#3}\par\vspace{2pt}
}
% variants used when the dates or the location are empty
\newcommand{\orgdate}[2]{\noindent{\color{accent}\bfseries\fontsize{8.6}{10}\selectfont #1}\hfill\metaicon{\faCalendar}{#2}\par\vspace{2pt}}
\newcommand{\orgplace}[2]{\noindent{\color{accent}\bfseries\fontsize{8.6}{10}\selectfont #1}\hfill\metaicon{\faMapMarker}{#2}\par\vspace{2pt}}
\newcommand{\orgname}[1]{\noindent{\color{accent}\bfseries\fontsize{8.6}{10}\selectfont #1}\par\vspace{2pt}}
\newcommand{\projtitle}[2]{% name, url
  {\bfseries\fontsize{9.6}{11}\selectfont\color{darktext} #1}\par\vspace{1pt}
  {\color{accent}\fontsize{7.8}{9}\selectfont\faLink\ \url{#2}}\par\vspace{2pt}
}
\newcommand{\projtitleonly}[1]{% name only, no public repo link
  {\bfseries\fontsize{9.6}{11}\selectfont\color{darktext} #1}\par\vspace{2pt}
}
\newcommand{\projcontext}[1]{% italic client/partner attribution line
  {\color{graytext}\itshape\fontsize{7.9}{9.5}\selectfont #1}\par\vspace{2.5pt}
}
\newcommand{\demolink}[1]{% live deployed demo line
  {\color{accent}\fontsize{7.8}{9}\selectfont\faGlobe\ \url{#1}}\par\vspace{2pt}
}
\newcommand{\projgap}{\vspace{6pt}}

\newlist{bl}{itemize}{1}
\setlist[bl]{leftmargin=10pt,label=\textbullet,itemsep=1.6pt,topsep=2pt,parsep=0pt,partopsep=0pt,
  font=\color{darktext},before=\fontsize{8.3}{10.4}\selectfont}

\newcommand{\edudeg}[1]{{\bfseries\fontsize{9.4}{11}\selectfont\color{darktext} #1}\par\vspace{1pt}}
\newcommand{\eduinst}[1]{{\color{accent}\bfseries\fontsize{8.6}{10}\selectfont #1}\par\vspace{1pt}}
\newcommand{\edumeta}[1]{{\color{graytext}\fontsize{7.6}{9}\selectfont #1}\par}

%% ============================================================
\begin{document}

%% ---------------- HEADER ----------------
{\fontsize{24}{26}\selectfont\bfseries\color{darktext} ${safeName}}\par
\vspace{6pt}
${contacts.join('\\hspace{7pt}%\n')}\par
\vspace{2pt}
{\color{linegray}\rule{\linewidth}{0.6pt}}

%% ---------------- TWO COLUMN BODY ----------------
\noindent
\begin{minipage}[t]{0.635\linewidth}

${left}
\end{minipage}%
\hfill
\begin{minipage}[t]{0.325\linewidth}

${right}
\end{minipage}

\end{document}
`;
}

/* ==========================================================================
 * SINGLE-COLUMN TEMPLATES (one builder, four looks)
 * ======================================================================== */

interface SingleStyle {
  id: ResumeTemplateId;
  docClass: string;
  geometry: string;
  fonts: string;
  link: string;
  orgFmt: string;
  header: string;
  section: string;
  roleSize: string;
  /** "size}{leading" in pt, applied as \normalsize so serif templates stay compact but readable */
  baseSize?: string;
  contactSep: string;
  order: SectionKey[];
  titles?: Partial<Record<SectionKey, string>>;
  skillLabels?: Partial<Record<keyof SkillCategories, string>>;
}

const SINGLE_TITLES: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Technical Skills',
  education: 'Education',
  achievements: 'Achievements',
  certifications: 'Certifications',
};

const SINGLE_SKILL_LABELS: Record<keyof SkillCategories, string> = {
  languages: 'Languages',
  frameworks: 'Frameworks \\& Libraries',
  cloud_and_databases: 'Cloud \\& Databases',
  tools_and_architecture: 'Tools \\& Architecture',
  area_of_interest: 'Core Competencies',
};

const PALETTE = String.raw`\definecolor{accent}{HTML}{00A6C0}
\definecolor{darktext}{HTML}{1F1F20}
\definecolor{graytext}{HTML}{555A5F}
\definecolor{linegray}{HTML}{B4B7B9}`;

const SINGLE_STYLES: Record<Exclude<ResumeTemplateId, 'modern-two-column'>, SingleStyle> = {
  'classic-single': {
    id: 'classic-single',
    docClass: '[10pt]{article}',
    geometry: 'a4paper,top=1.2cm,bottom=1.0cm,left=1.5cm,right=1.5cm',
    baseSize: '9.6}{11.6',
    fonts: String.raw`\usepackage{mathptmx}`,
    link: 'black',
    orgFmt: String.raw`{\itshape #1}`,
    header: String.raw`\begin{center}{\LARGE\bfseries #1}\\[4pt]{\small #2}\end{center}\vspace{-6pt}`,
    section: String.raw`\par\vspace{7pt}{\bfseries\MakeUppercase{#1}}\par\vspace{-3pt}\rule{\linewidth}{0.5pt}\par\vspace{3pt}`,
    roleSize: '\\normalsize',
    contactSep: '\\ \\textbar\\ ',
    order: ['summary', 'experience', 'projects', 'skills', 'education', 'achievements', 'certifications'],
  },
  'minimal-tech': {
    id: 'minimal-tech',
    docClass: '[9pt]{extarticle}',
    geometry: 'a4paper,top=1.2cm,bottom=1.0cm,left=1.3cm,right=1.3cm',
    fonts: String.raw`\usepackage[default]{lato}`,
    link: 'black',
    orgFmt: String.raw`{\bfseries #1}`,
    header: String.raw`{\Large\bfseries #1}\par\vspace{3pt}{\small #2}\par\vspace{2pt}`,
    section: String.raw`\par\vspace{6pt}{\bfseries\MakeUppercase{#1}}\par\vspace{-3pt}{\color{linegray}\rule{\linewidth}{0.5pt}}\par\vspace{3pt}`,
    roleSize: '\\normalsize',
    contactSep: '\\ \\textbullet\\ ',
    order: ['summary', 'experience', 'projects', 'skills', 'education', 'achievements', 'certifications'],
    titles: { summary: 'About' },
  },
  'accent-single': {
    id: 'accent-single',
    docClass: '[9pt]{extarticle}',
    geometry: 'a4paper,top=1.25cm,bottom=1.0cm,left=1.35cm,right=1.35cm',
    fonts: String.raw`\usepackage[default]{lato}`,
    link: 'accent',
    orgFmt: String.raw`{\color{accent}\bfseries #1}`,
    header: String.raw`{\fontsize{22}{24}\selectfont\bfseries #1}\par\vspace{4pt}{\small\color{graytext} #2}\par\vspace{2pt}{\color{linegray}\rule{\linewidth}{0.6pt}}\par`,
    section: String.raw`\par\vspace{7pt}{\color{accent}\bfseries\MakeUppercase{#1}}\par\vspace{-3pt}{\color{accent}\rule{\linewidth}{0.6pt}}\par\vspace{3pt}`,
    roleSize: '\\normalsize',
    contactSep: '\\ \\textbar\\ ',
    order: ['summary', 'skills', 'experience', 'projects', 'education', 'achievements', 'certifications'],
  },
  'executive-serif': {
    id: 'executive-serif',
    docClass: '[10pt]{article}',
    geometry: 'a4paper,top=1.2cm,bottom=1.1cm,left=1.6cm,right=1.6cm',
    baseSize: '9.6}{11.8',
    fonts: String.raw`\usepackage{mathpazo}`,
    link: 'black',
    orgFmt: String.raw`{\scshape #1}`,
    header: String.raw`\begin{center}{\Huge\scshape #1}\\[5pt]{\small #2}\end{center}\vspace{-6pt}`,
    section: String.raw`\par\vspace{8pt}{\scshape\large #1}\par\vspace{-3pt}\rule{\linewidth}{0.4pt}\par\vspace{3pt}`,
    roleSize: '\\normalsize',
    contactSep: '\\ \\textbar\\ ',
    order: ['summary', 'experience', 'projects', 'skills', 'education', 'achievements', 'certifications'],
  },
};

function renderSingle(data: ResumeData, style: SingleStyle): string {
  const p = prepare(data);
  const L: Layout = {
    skillStyle: 'lines',
    eduStyle: 'inline',
    textBlock: 'plain',
    linkEmail: true,
    titles: { ...SINGLE_TITLES, ...style.titles },
    skillLabels: { ...SINGLE_SKILL_LABELS, ...style.skillLabels },
  };
  const contacts = buildContacts(p, L.linkEmail).join(style.contactSep);
  const body = style.order.map(key => buildSection(key, p, L)).join('\n');
  const safeName = escapeLatexSpecialChars(p.upperName);

  return String.raw`%% ============================================================
%%  ${safeName} — Resume (${style.id})
%% ============================================================
\documentclass${style.docClass}

\usepackage[${style.geometry}]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
${style.fonts}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage{microtype}
\DisableLigatures{encoding = *, family = *}
\usepackage{hyperref}

${PALETTE}

\hypersetup{colorlinks=true,urlcolor=${style.link},linkcolor=${style.link},pdftitle={${pdfSafe(p.properName)} - Resume},pdfauthor={${pdfSafe(p.properName)}}}
\urlstyle{same}
% --- ATS: make ligatures extract as plain text ---
\input{glyphtounicode}
\pdfgentounicode=1
\pagestyle{empty}
\setlength{\parindent}{0pt}
\color{darktext}
${style.baseSize ? '\\renewcommand{\\normalsize}{\\fontsize{' + style.baseSize + '}\\selectfont}' : ''}
%% ---------- content macros (shared by every template) ----------
\newcommand{\faPhone}{}\newcommand{\faEnvelope}{}\newcommand{\faLinkedin}{}
\newcommand{\faGithub}{}\newcommand{\faMapMarker}{}\newcommand{\faCalendar}{}
\newcommand{\metaicon}[2]{#2}
\newcommand{\resumeheader}[2]{${style.header}}
\newcommand{\sectiontitle}[1]{${style.section}}
\newcommand{\orgfmt}[1]{${style.orgFmt}}
\newcommand{\roletitle}[1]{\par\vspace{2pt}{\bfseries ${style.roleSize} #1}\par}
\newcommand{\orgline}[3]{\noindent\orgfmt{#1}\hfill{\small #2\ \textbar\ #3}\par\vspace{1.5pt}}
\newcommand{\orgdate}[2]{\noindent\orgfmt{#1}\hfill{\small #2}\par\vspace{1.5pt}}
\newcommand{\orgplace}[2]{\noindent\orgfmt{#1}\hfill{\small #2}\par\vspace{1.5pt}}
\newcommand{\orgname}[1]{\noindent\orgfmt{#1}\par\vspace{1.5pt}}
\newcommand{\projtitle}[2]{{\bfseries #1}\par{\small Code: \url{#2}}\par\vspace{1pt}}
\newcommand{\projtitleonly}[1]{{\bfseries #1}\par\vspace{1pt}}
\newcommand{\projcontext}[1]{{\itshape\small #1}\par\vspace{1pt}}
\newcommand{\demolink}[1]{{\small Live demo: \url{#1}}\par\vspace{1pt}}
\newcommand{\projgap}{\vspace{5pt}}
\newlist{bl}{itemize}{1}
\setlist[bl]{leftmargin=12pt,label=\textbullet,itemsep=1.4pt,topsep=2pt,parsep=0pt,partopsep=0pt}
\newcommand{\skillline}[2]{\noindent{\bfseries #1:} #2\par\vspace{1.5pt}}
\newcommand{\eduline}[4]{\noindent{\bfseries #1}\hfill{\small #3}\par\noindent\orgfmt{#2}\if\relax\detokenize{#4}\relax\else\ \textbullet\ {\small #4}\fi\par\vspace{3pt}}

%% ============================================================
\begin{document}
${style.baseSize ? '\\normalsize\n' : ''}
\resumeheader{${safeName}}{${contacts}}

${body}
\end{document}
`;
}

export const renderClassicSingle = (data: ResumeData) => renderSingle(data, SINGLE_STYLES['classic-single']);
export const renderMinimalTech = (data: ResumeData) => renderSingle(data, SINGLE_STYLES['minimal-tech']);
export const renderAccentSingle = (data: ResumeData) => renderSingle(data, SINGLE_STYLES['accent-single']);
export const renderExecutiveSerif = (data: ResumeData) => renderSingle(data, SINGLE_STYLES['executive-serif']);

/** Dispatches LaTeX generation to the requested template. */
export function generateResumeLatex(data: ResumeData, templateId: ResumeTemplateId = 'modern-two-column'): string {
  switch (templateId) {
    case 'classic-single': return renderClassicSingle(data);
    case 'minimal-tech': return renderMinimalTech(data);
    case 'accent-single': return renderAccentSingle(data);
    case 'executive-serif': return renderExecutiveSerif(data);
    case 'modern-two-column':
    default: return renderModernTwoColumn(data);
  }
}
