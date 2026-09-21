import { ResumeData, ResumeTemplateId, Experience, ProjectItem, EducationItem, SkillCategories } from '@/lib/hooks/useResume';
import { markdownToLatex, sanitizeBullets, sanitizeUrl, escapeLatexSpecialChars, splitSkillsSafely } from './latexSanitizer';

/**
 * Normalizes skills into categories if only a flat string was provided
 */
export function normalizeSkills(data: ResumeData): SkillCategories {
  if (data.skills_categorized && (
    data.skills_categorized.languages ||
    data.skills_categorized.frameworks ||
    data.skills_categorized.cloud_and_databases ||
    data.skills_categorized.tools_and_architecture ||
    data.skills_categorized.area_of_interest
  )) {
    return data.skills_categorized;
  }

  // Fallback / Auto-bucket flat skills string
  const flat = data.skills || '';
  const skillsList = splitSkillsSafely(flat);

  const languages: string[] = [];
  const frameworks: string[] = [];
  const cloudAndDb: string[] = [];
  const tools: string[] = [];
  const interests: string[] = [];

  const langMatch = ['python', 'c++', 'c', 'java', 'typescript', 'javascript', 'go', 'rust', 'dart', 'sql', 'php', 'ruby', 'kotlin', 'swift', 'scala', 'r', 'html', 'css'];
  const fwMatch = ['react', 'next.js', 'nextjs', 'vue', 'angular', 'flutter', 'flask', 'django', 'fastapi', 'express', 'node', 'nodejs', 'tailwind', 'spring', 'pytorch', 'tensorflow', 'keras', 'streamlit'];
  const cloudMatch = ['aws', 'gcp', 'azure', 'postgres', 'postgresql', 'supabase', 'firebase', 'mongodb', 'mysql', 'redis', 'dynamodb', 'bigquery', 'kafka', 'elasticsearch', 's3', 'lambda'];
  const toolMatch = ['git', 'docker', 'kubernetes', 'postman', 'linux', 'bash', 'ci/cd', 'github actions', 'jira', 'figma', 'webpack', 'vite'];

  skillsList.forEach(s => {
    const lower = s.toLowerCase();
    if (langMatch.some(k => lower.includes(k))) languages.push(s);
    else if (fwMatch.some(k => lower.includes(k))) frameworks.push(s);
    else if (cloudMatch.some(k => lower.includes(k))) cloudAndDb.push(s);
    else if (toolMatch.some(k => lower.includes(k))) tools.push(s);
    else interests.push(s);
  });

  return {
    languages: languages.join(', ') || 'Python, TypeScript, SQL',
    frameworks: frameworks.join(', ') || 'React, Next.js, Node.js',
    cloud_and_databases: cloudAndDb.join(', ') || 'PostgreSQL, Supabase, Redis, AWS',
    tools_and_architecture: tools.join(', ') || 'Git, Docker, Postman',
    area_of_interest: interests.join(', ') || 'Machine Learning, Full-Stack Development',
  };
}

/**
 * Normalizes education items into an array
 */
export function normalizeEducation(data: ResumeData): EducationItem[] {
  if (Array.isArray(data.education)) {
    return data.education.filter(e => e.degree || e.institution);
  }
  if (data.education && (data.education.degree || data.education.institution)) {
    return [data.education];
  }
  return [];
}

/**
 * Normalizes projects: extracts project type items from experience if projects[] is empty
 */
export function normalizeProjects(data: ResumeData): { workExperience: Experience[]; projects: ProjectItem[] } {
  let workExperience: Experience[] = [];
  let projects: ProjectItem[] = [];

  if (data.projects && data.projects.length > 0) {
    projects = [...data.projects];
    workExperience = (data.experience || []).filter(e => (e.type || 'work') !== 'project');
  } else {
    // Separate experience items marked as 'project'
    (data.experience || []).forEach(e => {
      if (e.type === 'project') {
        projects.push({
          title: e.role || e.company || 'Project',
          context: e.company !== 'Project' ? e.company : undefined,
          bullets: e.bullets || '',
        });
      } else {
        workExperience.push(e);
      }
    });
  }

  // Also catch any projects that might be in experience even if data.projects has entries
  (data.experience || []).forEach(e => {
    if (e.type === 'project') {
      const alreadyInProjects = projects.some(p => p.title === (e.role || e.company));
      if (!alreadyInProjects) {
        projects.push({
          title: e.role || e.company || 'Project',
          context: e.company !== 'Project' ? e.company : undefined,
          bullets: e.bullets || '',
        });
      }
    }
  });

  return { workExperience, projects };
}

/**
 * TEMPLATE 1: Modern Two-Column (Flagship ATS, Teal & Lato)
 * Faithfully matches original.tex structure, formatting, colors, and tikz pills.
 */
export function renderModernTwoColumn(data: ResumeData): string {
  const profile = data.profile || { name: '', email: '', phone: '', linkedin: '', github: '' };
  const { workExperience, projects } = normalizeProjects(data);
  const educationList = normalizeEducation(data);
  const skillCategories = normalizeSkills(data);

  // Sanitized Header Elements
  const safeName = (profile.name || 'Candidate Name').toUpperCase();
  const contactParts: string[] = [];

  if (profile.phone) {
    contactParts.push(`\\metaicon{\\faPhone}{${escapeLatexSpecialChars(profile.phone)}}`);
  }
  if (profile.email) {
    contactParts.push(`\\metaicon{\\faEnvelope}{${escapeLatexSpecialChars(profile.email)}}`);
  }
  if (profile.linkedin) {
    const linkedInUrl = sanitizeUrl(profile.linkedin);
    const display = linkedInUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, 'linkedin.com/in/').replace(/\/$/, '');
    contactParts.push(`\\metaicon{\\faLinkedin}{\\href{${linkedInUrl}}{${escapeLatexSpecialChars(display)}}}`);
  }
  if (profile.github) {
    const githubUrl = sanitizeUrl(profile.github);
    const display = githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, 'github.com/').replace(/\/$/, '');
    contactParts.push(`\\metaicon{\\faGithub}{\\href{${githubUrl}}{${escapeLatexSpecialChars(display)}}}`);
  }
  if (profile.location) {
    contactParts.push(`\\metaicon{\\faMapMarker}{${escapeLatexSpecialChars(profile.location)}}`);
  }

  // Render Experience
  let expLatex = '';
  if (workExperience.length > 0) {
    expLatex += '\\sectiontitle{Experience}\n\n';
    workExperience.forEach((exp, idx) => {
      const role = markdownToLatex(exp.role || 'Software Engineer');
      const company = markdownToLatex(exp.company || 'Company');
      const dates = `${escapeLatexSpecialChars(exp.start || '')} \\textendash{} ${escapeLatexSpecialChars(exp.end || 'Present')}`;
      const loc = markdownToLatex(exp.location || '');

      expLatex += `\\roletitle{${role}}\n`;
      expLatex += `\\orgline{${company}}{${dates}}{${loc}}\n`;

      const bullets = sanitizeBullets(exp.bullets);
      if (bullets.length > 0) {
        expLatex += `\\begin{bl}\n`;
        bullets.forEach(b => {
          expLatex += `\\item ${b}\n`;
        });
        expLatex += `\\end{bl}\n`;
      }
      if (idx < workExperience.length - 1) {
        expLatex += `\\projgap\n\n`;
      } else {
        expLatex += `\n`;
      }
    });
  }

  // Render Projects
  let projLatex = '';
  if (projects.length > 0) {
    projLatex += '\\sectiontitle{Projects}\n\n';
    projects.forEach((proj, idx) => {
      const title = markdownToLatex(proj.title || 'Project Title');
      const repoUrl = sanitizeUrl(proj.repo_url || '');
      const demoUrl = sanitizeUrl(proj.demo_url || '');

      if (repoUrl) {
        projLatex += `\\projtitle{${title}}{${repoUrl}}\n`;
      } else {
        projLatex += `\\projtitleonly{${title}}\n`;
      }

      if (proj.context) {
        projLatex += `\\projcontext{${markdownToLatex(proj.context)}}\n`;
      }

      if (demoUrl) {
        projLatex += `\\demolink{${demoUrl}}\n`;
      }

      const bullets = sanitizeBullets(proj.bullets);
      if (bullets.length > 0) {
        projLatex += `\\begin{bl}\n`;
        bullets.forEach(b => {
          projLatex += `\\item ${b}\n`;
        });
        projLatex += `\\end{bl}\n`;
      }
      if (idx < projects.length - 1) {
        projLatex += `\\projgap\n\n`;
      } else {
        projLatex += `\n`;
      }
    });
  }

  // Render Skills with Tikz Pills
  const renderSkillPills = (categoryTitle: string, skillString: string) => {
    const list = splitSkillsSafely(skillString);
    if (list.length === 0) return '';
    let res = `\\skillcat{${escapeLatexSpecialChars(categoryTitle)}}\n`;
    res += list.map(s => `\\sk{${escapeLatexSpecialChars(s)}}`).join('');
    res += `\\par\\vspace{4pt}\n\n`;
    return res;
  };

  let skillsLatex = '\\sectiontitle{Skills}\n\n';
  skillsLatex += renderSkillPills('Languages', skillCategories.languages);
  skillsLatex += renderSkillPills('Frameworks', skillCategories.frameworks);
  skillsLatex += renderSkillPills('Cloud \\& Databases', skillCategories.cloud_and_databases);
  skillsLatex += renderSkillPills('Tools \\& Architecture', skillCategories.tools_and_architecture);
  skillsLatex += renderSkillPills('Area of Interest', skillCategories.area_of_interest);

  // Render Summary
  let summaryLatex = '';
  if (profile.summary && profile.summary.trim()) {
    summaryLatex += '\\sectiontitle{Summary}\n';
    summaryLatex += `\\noindent{\\fontsize{8.3}{10.4}\\selectfont\\color{darktext}\\justifying\n`;
    summaryLatex += `${markdownToLatex(profile.summary)}\\par}\n\n`;
  }

  // Render Achievements
  let achievementsLatex = '';
  if (data.achievements && data.achievements.trim()) {
    achievementsLatex += '\\sectiontitle{Achievements}\n';
    achievementsLatex += `\\noindent{\\fontsize{8.2}{10.2}\\selectfont\\color{darktext}\\justifying\n`;
    achievementsLatex += `${markdownToLatex(data.achievements)}\\par}\n\n`;
  }

  // Render Education
  let educationLatex = '';
  if (educationList.length > 0) {
    educationLatex += '\\sectiontitle{Education}\n\n';
    educationList.forEach((edu, idx) => {
      const degree = markdownToLatex(edu.degree);
      const inst = markdownToLatex(edu.institution);
      const yr = escapeLatexSpecialChars(edu.year || '');
      const score = edu.score ? ` \\ \\textbullet\\ \\ \\textbf{${escapeLatexSpecialChars(edu.score)}}` : '';

      educationLatex += `\\edudeg{${degree}}\n`;
      educationLatex += `\\eduinst{${inst}}\n`;
      educationLatex += `\\edumeta{\\faCalendar\\ ${yr}${score}}\n`;
      if (idx < educationList.length - 1) {
        educationLatex += `\\vspace{7pt}\n\n`;
      }
    });
  }

  return `%% ============================================================
%%  ${safeName} — Resume (ATS-optimized Two-Column)
%% ============================================================
\\documentclass[9pt]{extarticle}

\\usepackage[a4paper,top=1.35cm,bottom=1.0cm,left=1.15cm,right=1.15cm]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[default]{lato}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{tikz}
\\usepackage{enumitem}
\\usepackage{microtype}
\\DisableLigatures{encoding = *, family = *}
\\usepackage{hyperref}
\\usepackage{ragged2e}

%% ---------- palette ----------
\\definecolor{accent}{HTML}{00A6C0}   % teal accent
\\definecolor{darktext}{HTML}{2E2E2F} % near-black body text
\\definecolor{graytext}{HTML}{65696D} % section labels / meta text
\\definecolor{linegray}{HTML}{B4B7B9} % divider rules / borders

\\hypersetup{colorlinks=true,urlcolor=accent,linkcolor=accent,pdftitle={${safeName} - Resume}}
\\urlstyle{same}
% --- ATS fix: make ligatures (fl, fi, ffi ...) extract as plain text, not glyphs ---
\\input{glyphtounicode}
\\pdfgentounicode=1
\\pagestyle{empty}
\\setlength{\parindent}{0pt}
\\color{darktext}
\\renewcommand{\\familydefault}{\\latofamily}

%% ---------- helpers ----------
\\newcommand{\\sectiontitle}[1]{%
  \\par\\vspace{5pt}
  {\\color{graytext}\\bfseries\\fontsize{8.7}{10}\\selectfont\\MakeUppercase{#1}}\\par
  \\vspace{-3pt}
  {\\color{linegray}\\rule{\\linewidth}{0.6pt}}\\par
  \\vspace{4pt}
}

% skill "pill" = text with a bottom rule, wraps naturally like tags
\\newcommand{\\sk}[1]{%
  \\tikz[baseline=(t.base)]{\\node[inner sep=1.3pt,outer sep=0pt](t){\\fontsize{7.8}{9}\\selectfont #1};\\draw[linegray,line width=0.45pt]([yshift=-2.2pt]t.south west)--([yshift=-2.2pt]t.south east);}%
  \\hspace{2pt}%
}
\\newcommand{\\skillcat}[1]{\\vspace{2pt}{\\color{accent}\\bfseries\\fontsize{8.3}{10}\\selectfont #1}\\par\\vspace{3pt}}

\\newcommand{\\metaicon}[2]{{\\color{graytext}\\fontsize{7.3}{8.5}\\selectfont #1\\, #2}}

% Experience / project role header
\\newcommand{\\roletitle}[1]{{\\bfseries\\fontsize{9.6}{11}\\selectfont\\color{darktext} #1}\\par\\vspace{1pt}}
\\newcommand{\\orgline}[3]{% company, dates, location
  \\noindent{\\color{accent}\\bfseries\\fontsize{8.6}{10}\\selectfont #1}\\hfill\\metaicon{\\faCalendar}{#2}\\hspace{8pt}\\metaicon{\\faMapMarker}{#3}\\par\\vspace{2pt}
}
\\newcommand{\\projtitle}[2]{% name, url
  {\\bfseries\\fontsize{9.6}{11}\\selectfont\\color{darktext} #1}\\par\\vspace{1pt}
  {\\color{accent}\\fontsize{7.8}{9}\\selectfont\\faLink\\ \\url{#2}}\\par\\vspace{2pt}
}
\\newcommand{\\projtitleonly}[1]{% name only, no public repo link
  {\\bfseries\\fontsize{9.6}{11}\\selectfont\\color{darktext} #1}\\par\\vspace{2pt}
}
\\newcommand{\\projcontext}[1]{% italic client/partner attribution line
  {\\color{graytext}\\itshape\\fontsize{7.9}{9.5}\\selectfont #1}\\par\\vspace{2.5pt}
}
\\newcommand{\\demolink}[1]{% live deployed demo line
  {\\color{accent}\\fontsize{7.8}{9}\\selectfont\\faGlobe\\ \\url{#1}}\\par\\vspace{2pt}
}
\\newcommand{\\projgap}{\\vspace{6pt}}

\\newlist{bl}{itemize}{1}
\\setlist[bl]{leftmargin=10pt,label=\\textbullet,itemsep=1.6pt,topsep=2pt,parsep=0pt,partopsep=0pt,
  font=\\color{darktext},before=\\fontsize{8.3}{10.4}\\selectfont}

\\newcommand{\\edudeg}[1]{{\\bfseries\\fontsize{9.4}{11}\\selectfont\\color{darktext} #1}\\par\\vspace{1pt}}
\\newcommand{\\eduinst}[1]{{\\color{accent}\\bfseries\\fontsize{8.6}{10}\\selectfont #1}\\par\\vspace{1pt}}
\\newcommand{\\edumeta}[1]{{\\color{graytext}\\fontsize{7.6}{9}\\selectfont #1}\\par}

%% ============================================================
\\begin{document}

%% ---------------- HEADER ----------------
{\\fontsize{24}{26}\\selectfont\\bfseries\\color{darktext} ${safeName}}\\par
\\vspace{6pt}
${contactParts.join('\\hspace{7pt}%\n')}\\par
\\vspace{2pt}
{\\color{linegray}\\rule{\\linewidth}{0.6pt}}

%% ---------------- TWO COLUMN BODY ----------------
\\noindent
\\begin{minipage}[t]{0.635\\linewidth}

${expLatex}
${projLatex}

\\end{minipage}%
\\hfill
\\begin{minipage}[t]{0.325\\linewidth}

${summaryLatex}
${skillsLatex}
${achievementsLatex}
${educationLatex}

\\end{minipage}

\\end{document}
`;
}

/**
 * TEMPLATE 2: Classic Single-Column ATS
 * Standard, high-compatibility single column resume.
 */
export function renderClassicSingle(data: ResumeData): string {
  const profile = data.profile || { name: '', email: '', phone: '', linkedin: '', github: '' };
  const { workExperience, projects } = normalizeProjects(data);
  const educationList = normalizeEducation(data);
  const skillCategories = normalizeSkills(data);

  const safeName = (profile.name || 'Candidate Name').toUpperCase();
  const contactItems: string[] = [];
  if (profile.phone) contactItems.push(escapeLatexSpecialChars(profile.phone));
  if (profile.email) contactItems.push(`\\href{mailto:${profile.email}}{${escapeLatexSpecialChars(profile.email)}}`);
  if (profile.linkedin) contactItems.push(`\\href{${sanitizeUrl(profile.linkedin)}}{LinkedIn}`);
  if (profile.github) contactItems.push(`\\href{${sanitizeUrl(profile.github)}}{GitHub}`);
  if (profile.location) contactItems.push(escapeLatexSpecialChars(profile.location));

  let body = '';

  // Summary
  if (profile.summary) {
    body += `\\section*{Professional Summary}\n\\hrule\\vspace{6pt}\n`;
    body += `${markdownToLatex(profile.summary)}\\vspace{10pt}\n\n`;
  }

  // Experience
  if (workExperience.length > 0) {
    body += `\\section*{Experience}\n\\hrule\\vspace{6pt}\n`;
    workExperience.forEach(exp => {
      const role = markdownToLatex(exp.role || 'Role');
      const company = markdownToLatex(exp.company || 'Company');
      const dates = markdownToLatex(`${exp.start || ''} -- ${exp.end || 'Present'}`);
      const loc = markdownToLatex(exp.location || '');

      body += `\\textbf{${role}} $|$ \\textit{${company}}${loc ? ` (${loc})` : ''} \\hfill ${dates}\\\\ \n`;
      const bullets = sanitizeBullets(exp.bullets);
      if (bullets.length > 0) {
        body += `\\begin{itemize}[leftmargin=16pt,itemsep=2pt,topsep=2pt]\n`;
        bullets.forEach(b => {
          body += `  \\item ${b}\n`;
        });
        body += `\\end{itemize}\\vspace{4pt}\n`;
      }
    });
    body += `\\vspace{6pt}\n`;
  }

  // Projects
  if (projects.length > 0) {
    body += `\\section*{Key Projects}\n\\hrule\\vspace{6pt}\n`;
    projects.forEach(p => {
      const title = markdownToLatex(p.title || 'Project');
      const link = p.repo_url || p.demo_url ? ` $|$ \\href{${sanitizeUrl(p.repo_url || p.demo_url || '')}}{Link}` : '';
      const context = p.context ? ` \\textit{(${markdownToLatex(p.context)})}` : '';

      body += `\\textbf{${title}}${link}${context}\\\\ \n`;
      const bullets = sanitizeBullets(p.bullets);
      if (bullets.length > 0) {
        body += `\\begin{itemize}[leftmargin=16pt,itemsep=2pt,topsep=2pt]\n`;
        bullets.forEach(b => {
          body += `  \\item ${b}\n`;
        });
        body += `\\end{itemize}\\vspace{4pt}\n`;
      }
    });
    body += `\\vspace{6pt}\n`;
  }

  // Education
  if (educationList.length > 0) {
    body += `\\section*{Education}\n\\hrule\\vspace{6pt}\n`;
    educationList.forEach(edu => {
      const deg = markdownToLatex(edu.degree);
      const inst = markdownToLatex(edu.institution);
      const yr = escapeLatexSpecialChars(edu.year || '');
      const score = edu.score ? ` (${escapeLatexSpecialChars(edu.score)})` : '';
      body += `\\textbf{${deg}} $|$ ${inst}${score} \\hfill ${yr}\\\\ \n`;
    });
    body += `\\vspace{10pt}\n`;
  }

  // Skills
  body += `\\section*{Technical Skills}\n\\hrule\\vspace{6pt}\n`;
  if (skillCategories.languages) body += `\\textbf{Languages:} ${escapeLatexSpecialChars(skillCategories.languages)}\\\\ \n`;
  if (skillCategories.frameworks) body += `\\textbf{Frameworks \\& Libraries:} ${escapeLatexSpecialChars(skillCategories.frameworks)}\\\\ \n`;
  if (skillCategories.cloud_and_databases) body += `\\textbf{Cloud \\& Databases:} ${escapeLatexSpecialChars(skillCategories.cloud_and_databases)}\\\\ \n`;
  if (skillCategories.tools_and_architecture) body += `\\textbf{Tools \\& Architecture:} ${escapeLatexSpecialChars(skillCategories.tools_and_architecture)}\\\\ \n`;
  if (skillCategories.area_of_interest) body += `\\textbf{Core Competencies:} ${escapeLatexSpecialChars(skillCategories.area_of_interest)}\\\\ \n`;

  // Achievements
  if (data.achievements) {
    body += `\\vspace{6pt}\\section*{Achievements \\& Honors}\n\\hrule\\vspace{6pt}\n`;
    body += `${markdownToLatex(data.achievements)}\\vspace{6pt}\n`;
  }

  return `\\documentclass[9pt]{extarticle}
\\usepackage[a4paper,top=1.2cm,bottom=0.9cm,left=1.2cm,right=1.2cm]{geometry}
\\usepackage{titlesec}
\\usepackage[colorlinks=true, linkcolor=blue, urlcolor=blue]{hyperref}
\\usepackage{enumitem}
\\usepackage[utf8]{inputenc}
\\usepackage{microtype}
\\usepackage{fontawesome5}
\\usepackage[default]{lato}
\\setlength{\\parindent}{0pt}
\\setlength{\\topskip}{0pt}
\\titleformat{\\section}{\\normalsize\\bfseries\\scshape}{}{0em}{}[\\vspace{-2pt}\\hrule\\vspace{3pt}]
\\titlespacing*{\\section}{0pt}{7pt}{3pt}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
    {\\Large \\textbf{${safeName}}} \\\\[3pt]
    {\\small ${contactItems.join(' $|$ ')}}
\\end{center}
\\vspace{4pt}

${body}

\\end{document}
`;
}

/**
 * TEMPLATE 3: Minimal Tech
 * Modern, clean, tech-focused single-column layout with sans-serif aesthetic.
 */
export function renderMinimalTech(data: ResumeData): string {
  const profile = data.profile || { name: '', email: '', phone: '', linkedin: '', github: '' };
  const { workExperience, projects } = normalizeProjects(data);
  const educationList = normalizeEducation(data);
  const skillCategories = normalizeSkills(data);

  const safeName = (profile.name || 'Candidate Name').toUpperCase();
  const contactItems: string[] = [];
  if (profile.email) contactItems.push(`\\href{mailto:${profile.email}}{${escapeLatexSpecialChars(profile.email)}}`);
  if (profile.phone) contactItems.push(escapeLatexSpecialChars(profile.phone));
  if (profile.linkedin) contactItems.push(`\\href{${sanitizeUrl(profile.linkedin)}}{linkedin}`);
  if (profile.github) contactItems.push(`\\href{${sanitizeUrl(profile.github)}}{github}`);
  if (profile.location) contactItems.push(escapeLatexSpecialChars(profile.location));

  let body = '';

  if (profile.summary) {
    body += `\\section*{About}\n${markdownToLatex(profile.summary)}\\vspace{8pt}\n\n`;
  }

  if (workExperience.length > 0) {
    body += `\\section*{Experience}\n`;
    workExperience.forEach(exp => {
      const role = markdownToLatex(exp.role || 'Role');
      const company = markdownToLatex(exp.company || 'Company');
      const dates = markdownToLatex(`${exp.start || ''} -- ${exp.end || 'Present'}`);
      body += `\\textbf{${role}} @ \\textbf{${company}} \\hfill {\\small ${dates}}\\\\ \n`;
      const bullets = sanitizeBullets(exp.bullets);
      if (bullets.length > 0) {
        body += `\\begin{itemize}[leftmargin=12pt,itemsep=1.5pt,topsep=2pt]\n`;
        bullets.forEach(b => {
          body += `  \\item ${b}\n`;
        });
        body += `\\end{itemize}\\vspace{4pt}\n`;
      }
    });
    body += `\\vspace{6pt}\n`;
  }

  if (projects.length > 0) {
    body += `\\section*{Projects}\n`;
    projects.forEach(p => {
      const title = markdownToLatex(p.title || 'Project');
      const link = p.repo_url || p.demo_url ? ` \\hfill {\\small \\href{${sanitizeUrl(p.repo_url || p.demo_url || '')}}{[link]}}` : '';
      body += `\\textbf{${title}}${link}\\\\ \n`;
      const bullets = sanitizeBullets(p.bullets);
      if (bullets.length > 0) {
        body += `\\begin{itemize}[leftmargin=12pt,itemsep=1.5pt,topsep=2pt]\n`;
        bullets.forEach(b => {
          body += `  \\item ${b}\n`;
        });
        body += `\\end{itemize}\\vspace{4pt}\n`;
      }
    });
    body += `\\vspace{6pt}\n`;
  }

  if (educationList.length > 0) {
    body += `\\section*{Education}\n`;
    educationList.forEach(edu => {
      const deg = markdownToLatex(edu.degree);
      const inst = markdownToLatex(edu.institution);
      const yr = escapeLatexSpecialChars(edu.year || '');
      const score = edu.score ? ` \\textbullet\\ ${escapeLatexSpecialChars(edu.score)}` : '';
      body += `\\textbf{${deg}}, ${inst}${score} \\hfill {\\small ${yr}}\\\\ \n`;
    });
    body += `\\vspace{8pt}\n`;
  }

  body += `\\section*{Skills}\n`;
  if (skillCategories.languages) body += `\\textbf{Languages:} ${escapeLatexSpecialChars(skillCategories.languages)}\\\\ \n`;
  if (skillCategories.frameworks) body += `\\textbf{Frameworks:} ${escapeLatexSpecialChars(skillCategories.frameworks)}\\\\ \n`;
  if (skillCategories.cloud_and_databases) body += `\\textbf{Cloud/Data:} ${escapeLatexSpecialChars(skillCategories.cloud_and_databases)}\\\\ \n`;
  if (skillCategories.tools_and_architecture) body += `\\textbf{Tools:} ${escapeLatexSpecialChars(skillCategories.tools_and_architecture)}\\\\ \n`;
  if (skillCategories.area_of_interest) body += `\\textbf{Interests:} ${escapeLatexSpecialChars(skillCategories.area_of_interest)}\\\\ \n`;

  if (data.achievements) {
    body += `\\vspace{6pt}\n\\section*{Achievements}\n`;
    body += `${markdownToLatex(data.achievements)}\\\\ \n`;
  }

  return `\\documentclass[9pt]{extarticle}
\\usepackage[a4paper,top=1.1cm,bottom=0.9cm,left=1.1cm,right=1.1cm]{geometry}
\\usepackage{enumitem}
\\usepackage[colorlinks=true,urlcolor=black,linkcolor=black]{hyperref}
\\usepackage[utf8]{inputenc}
\\usepackage[default]{lato}
\\usepackage{microtype}
\\setlength{\\parindent}{0pt}
\\newcommand{\\sectionrule}{\\vspace{3pt}\\hrule\\vspace{5pt}}
\\pagestyle{empty}

\\begin{document}
{\\Large \\textbf{${safeName}}}\\\\
{\\small ${contactItems.join(' \\ \\textbullet\\ \\ ')}}\\\\
\\vspace{5pt}

${body}

\\end{document}
`;
}

/**
 * Dispatches LaTeX generation to the requested template
 */
export function generateResumeLatex(data: ResumeData, templateId: ResumeTemplateId = 'modern-two-column'): string {
  switch (templateId) {
    case 'modern-two-column':
      return renderModernTwoColumn(data);
    case 'classic-single':
      return renderClassicSingle(data);
    case 'minimal-tech':
      return renderMinimalTech(data);
    default:
      return renderModernTwoColumn(data);
  }
}
