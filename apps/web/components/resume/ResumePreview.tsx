'use client';

import { Fragment } from 'react';
import { Calendar, Github, Globe, Linkedin, Link2, Mail, MapPin, Phone } from 'lucide-react';
import type { ResumeData, ResumeTemplateId } from '@/lib/hooks/useResume';
import { normalizeEducation, normalizeProjects, normalizeSkills, toItems } from '@/lib/resume/templates';
import { displayUrl, splitSkillRows } from '@/lib/resume/latexSanitizer';

/**
 * Faithful HTML rendering of every template, driven by the same data as the LaTeX.
 * Sizes use container-query units so the page always scales like an A4 sheet
 * (1cqw = 1% of page width), which keeps line breaks close to the real PDF.
 */

const TEAL = '#00A6C0';
const GRAY = '#65696D';
const RULE = '#B4B7B9';
const INK = '#2E2E2F';

/** Renders **bold** and *italic* markers as elements. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b>
        : part.startsWith('*') && part.length > 2 ? <i key={i}>{part.slice(1, -1)}</i>
        : <Fragment key={i}>{part}</Fragment>
      )}
    </>
  );
}

const cleanBullets = (text?: string) => toItems(text);

function dates(start?: string, end?: string) {
  const s = (start ?? '').trim();
  const e = (end ?? '').trim() || (s ? 'Present' : '');
  return s && e ? `${s} – ${e}` : s || e;
}

interface PageProps {
  base: number; // font size in pt at A4 width
  font: string;
  color?: string;
  padding: string;
  children: React.ReactNode;
}

function Page({ base, font, color = INK, padding, children }: PageProps) {
  return (
    <div style={{ containerType: 'inline-size', width: '100%' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '141.4cqw',
          background: '#fff',
          color,
          fontFamily: font,
          fontSize: `${(base / 595.3) * 100}cqw`,
          lineHeight: 1.3,
          padding,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
          borderRadius: 3,
        }}
      >
        {children}
        <div
          aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, top: '141.4cqw', borderTop: '1px dashed #d97706', pointerEvents: 'none' }}
        >
          <span style={{ position: 'absolute', right: 8, top: 2, fontSize: 10, color: '#b45309', background: '#fff' }}>Page 2 starts here</span>
        </div>
      </div>
    </div>
  );
}

function Contacts({ data, icons, sep, color = GRAY, linkColor = TEAL, size = '0.81em' }: { data: ResumeData; icons: boolean; sep?: string; color?: string; linkColor?: string; size?: string }) {
  const p = data.profile;
  const items: { icon: React.ReactNode; text: string; link?: boolean }[] = [];
  if (p.phone) items.push({ icon: <Phone size="1em" />, text: p.phone });
  if (p.email) items.push({ icon: <Mail size="1em" />, text: p.email });
  if (p.linkedin) items.push({ icon: <Linkedin size="1em" />, text: p.linkedinLabel || displayUrl(p.linkedin), link: true });
  if (p.github) items.push({ icon: <Github size="1em" />, text: p.githubLabel || displayUrl(p.github), link: true });
  if (p.location) items.push({ icon: <MapPin size="1em" />, text: p.location });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: icons ? '0 1.6em' : 0, color, fontSize: size }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em', color: it.link ? linkColor : color }}>
          {icons && <span style={{ display: 'inline-flex', width: '1em', height: '1em' }}>{it.icon}</span>}
          {it.text}
          {!icons && sep && i < items.length - 1 && <span style={{ margin: '0 0.6em' }}>{sep}</span>}
        </span>
      ))}
    </div>
  );
}

const Bullets = ({ text, size = '0.92em', color = INK, gap = '0.15em' }: { text?: string; size?: string; color?: string; gap?: string }) => {
  const items = cleanBullets(text);
  if (!items.length) return null;
  return (
    <ul style={{ margin: '0.15em 0 0', paddingLeft: '1.1em', fontSize: size, lineHeight: 1.28, color, listStyle: 'disc' }}>
      {items.map((b, i) => <li key={i} style={{ marginBottom: gap }}><Inline text={b} /></li>)}
    </ul>
  );
};

/* ---------------------------------------------------------------- two-column */

function TwoTitle({ children }: { children: string }) {
  return (
    <div style={{ margin: '0.55em 0 0.4em' }}>
      <div style={{ color: GRAY, fontWeight: 700, fontSize: '0.967em', textTransform: 'uppercase', lineHeight: 1.1 }}>{children}</div>
      <div style={{ borderTop: `0.6pt solid ${RULE}`, marginTop: '0.3em' }} />
    </div>
  );
}


function TwoColumn({ data }: { data: ResumeData }) {
  const { workExperience, projects } = normalizeProjects(data);
  const education = normalizeEducation(data);
  const skills = normalizeSkills(data);
  const p = data.profile;
  const achievements = toItems(data.achievements);
  const certs = toItems(data.certifications);

  const meta = (icon: React.ReactNode, text: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3em', color: GRAY, fontSize: '0.81em' }}>
      <span style={{ display: 'inline-flex', width: '1em', height: '1em' }}>{icon}</span>{text}
    </span>
  );
  const link = (icon: React.ReactNode, url: string) => (
    <div style={{ color: TEAL, fontSize: '0.867em', display: 'flex', alignItems: 'center', gap: '0.35em', wordBreak: 'break-all' }}>
      <span style={{ display: 'inline-flex', width: '0.95em', height: '0.95em' }}>{icon}</span>{url}
    </div>
  );

  const skillLabels: [keyof typeof skills, string][] = [
    ['languages', 'Languages'], ['frameworks', 'Frameworks'], ['cloud_and_databases', 'Cloud & Databases'],
    ['tools_and_architecture', 'Tools & Architecture'], ['area_of_interest', 'Area of Interest'],
  ];

  return (
    <Page base={9} font="var(--font-body), 'Helvetica Neue', Arial, sans-serif" padding="6.4cqw 5.5cqw 4cqw">
      <div style={{ fontSize: '2.67em', fontWeight: 700, lineHeight: 1.05, letterSpacing: '0.005em' }}>{(p.name || 'YOUR NAME').toUpperCase()}</div>
      <div style={{ marginTop: '0.4em' }}><Contacts data={data} icons /></div>
      <div style={{ borderTop: `0.6pt solid ${RULE}`, marginTop: '0.5em' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '63.5% 32.5%', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          {workExperience.length > 0 && <TwoTitle>Experience</TwoTitle>}
          {workExperience.map((e, i) => (
            <div key={i} style={{ marginBottom: '0.65em' }}>
              <div style={{ fontWeight: 700, fontSize: '1.067em' }}><Inline text={e.role || e.company} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span style={{ color: TEAL, fontWeight: 700, fontSize: '0.955em' }}>{e.company}</span>
                <span style={{ display: 'inline-flex', gap: '0.8em' }}>
                  {dates(e.start, e.end) && meta(<Calendar size="1em" />, dates(e.start, e.end))}
                  {e.location && meta(<MapPin size="1em" />, e.location)}
                </span>
              </div>
              <Bullets text={e.bullets} size="0.922em" />
            </div>
          ))}

          {projects.length > 0 && <TwoTitle>Projects</TwoTitle>}
          {projects.map((pr, i) => (
            <div key={i} style={{ marginBottom: '0.65em' }}>
              <div style={{ fontWeight: 700, fontSize: '1.067em' }}><Inline text={pr.title} /></div>
              {pr.repo_url && link(<Link2 size="1em" />, pr.repo_url)}
              {pr.context && <div style={{ color: GRAY, fontStyle: 'italic', fontSize: '0.877em' }}>{pr.context}</div>}
              {pr.demo_url && link(<Globe size="1em" />, pr.demo_url)}
              <Bullets text={pr.bullets} size="0.922em" />
            </div>
          ))}
        </div>

        <div>
          {p.summary && <><TwoTitle>Summary</TwoTitle><p style={{ margin: 0, fontSize: '0.922em', textAlign: 'justify', lineHeight: 1.25 }}><Inline text={p.summary} /></p></>}

          {skillLabels.some(([k]) => skills[k]) && <TwoTitle>Skills</TwoTitle>}
          {skillLabels.map(([key, label]) => {
            const rows = splitSkillRows(skills[key]);
            if (!rows.length) return null;
            return (
              <div key={key} style={{ marginBottom: '0.45em' }}>
                <div style={{ color: TEAL, fontWeight: 700, fontSize: '0.922em', marginBottom: '0.25em' }}>{label}</div>
                {rows.map((row, r) => (
                  <div key={r} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.15em 0.35em', marginBottom: '0.1em' }}>
                    {row.map(s => <span key={s} style={{ fontSize: '0.867em', borderBottom: `0.5pt solid ${RULE}`, padding: '0 0.12em 0.05em' }}>{s}</span>)}
                  </div>
                ))}
              </div>
            );
          })}

          {achievements.length > 0 && <><TwoTitle>Achievements</TwoTitle><TextList items={achievements} /></>}
          {certs.length > 0 && <><TwoTitle>Certifications</TwoTitle><TextList items={certs} /></>}

          {education.length > 0 && <div style={{ marginTop: '0.8em' }}><TwoTitle>Education</TwoTitle></div>}
          {education.map((ed, i) => (
            <div key={i} style={{ marginBottom: '0.6em' }}>
              <div style={{ fontWeight: 700, fontSize: '1.044em' }}>{ed.degree}</div>
              <div style={{ color: TEAL, fontWeight: 700, fontSize: '0.955em' }}>{ed.institution}</div>
              <div style={{ color: GRAY, fontSize: '0.844em', display: 'flex', alignItems: 'center', gap: '0.3em' }}>
                <span style={{ display: 'inline-flex', width: '1em', height: '1em' }}><Calendar size="1em" /></span>
                {ed.year}{ed.score && <> &nbsp;•&nbsp; <ScoreText text={ed.score} /></>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function TextList({ items }: { items: string[] }) {
  if (items.length === 1) return <p style={{ margin: 0, fontSize: '0.911em', textAlign: 'justify' }}><Inline text={items[0]} /></p>;
  return (
    <ul style={{ margin: 0, paddingLeft: '1.1em', fontSize: '0.911em', listStyle: 'disc' }}>
      {items.map((it, i) => <li key={i}><Inline text={it} /></li>)}
    </ul>
  );
}

/** Bolds the first number in a score, like the LaTeX does. */
function ScoreText({ text }: { text: string }) {
  const m = text.match(/^(.*?)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return <>{text}</>;
  return <>{m[1]}<b>{m[2]}</b>{m[3]}</>;
}

/* ------------------------------------------------------------- single column */

interface SingleLook {
  base: number;
  font: string;
  padding: string;
  align: 'center' | 'left';
  nameSize: string;
  nameStyle?: React.CSSProperties;
  accent?: string;
  sepChar: string;
  sectionStyle: React.CSSProperties;
  ruleColor: string;
  order: ('summary' | 'skills' | 'experience' | 'projects' | 'education' | 'achievements' | 'certifications')[];
  summaryTitle: string;
  orgStyle: React.CSSProperties;
}

const LOOKS: Record<Exclude<ResumeTemplateId, 'modern-two-column'>, SingleLook> = {
  'classic-single': {
    base: 9.6, font: "'Times New Roman', Times, serif", padding: '5.7cqw 7.1cqw 4.8cqw', align: 'center', nameSize: '2em',
    sepChar: '|', sectionStyle: { fontWeight: 700, textTransform: 'uppercase' }, ruleColor: '#111',
    order: ['summary', 'experience', 'projects', 'skills', 'education', 'achievements', 'certifications'],
    summaryTitle: 'Professional Summary', orgStyle: { fontStyle: 'italic' },
  },
  'minimal-tech': {
    base: 9, font: "var(--font-body), 'Helvetica Neue', Arial, sans-serif", padding: '5.7cqw 6.2cqw 4.5cqw', align: 'left', nameSize: '1.9em',
    sepChar: '•', sectionStyle: { fontWeight: 700, textTransform: 'uppercase' }, ruleColor: RULE,
    order: ['summary', 'experience', 'projects', 'skills', 'education', 'achievements', 'certifications'],
    summaryTitle: 'About', orgStyle: { fontWeight: 700 },
  },
  'accent-single': {
    base: 9, font: "var(--font-body), 'Helvetica Neue', Arial, sans-serif", padding: '6cqw 6.4cqw 4.5cqw', align: 'left', nameSize: '2.44em', accent: TEAL,
    sepChar: '|', sectionStyle: { fontWeight: 700, textTransform: 'uppercase', color: TEAL }, ruleColor: TEAL,
    order: ['summary', 'skills', 'experience', 'projects', 'education', 'achievements', 'certifications'],
    summaryTitle: 'Professional Summary', orgStyle: { color: TEAL, fontWeight: 700 },
  },
  'executive-serif': {
    base: 9.6, font: "Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif", padding: '5.7cqw 7.6cqw 5.2cqw', align: 'center', nameSize: '2.6em',
    sepChar: '|', sectionStyle: { fontVariant: 'small-caps', fontSize: '1.2em' }, ruleColor: '#111',
    order: ['summary', 'experience', 'projects', 'skills', 'education', 'achievements', 'certifications'],
    summaryTitle: 'Professional Summary', orgStyle: { fontVariant: 'small-caps' },
  },
};

const SKILL_LABELS = {
  languages: 'Languages', frameworks: 'Frameworks & Libraries', cloud_and_databases: 'Cloud & Databases',
  tools_and_architecture: 'Tools & Architecture', area_of_interest: 'Core Competencies',
} as const;

function SingleTitle({ look, children }: { look: SingleLook; children: string }) {
  return (
    <div style={{ margin: '0.8em 0 0.35em' }}>
      <div style={{ ...look.sectionStyle, lineHeight: 1.1 }}>{children}</div>
      <div style={{ borderTop: `0.6pt solid ${look.ruleColor}`, marginTop: '0.25em' }} />
    </div>
  );
}

function Single({ data, look }: { data: ResumeData; look: SingleLook }) {
  const { workExperience, projects } = normalizeProjects(data);
  const education = normalizeEducation(data);
  const skills = normalizeSkills(data);
  const p = data.profile;
  const achievements = toItems(data.achievements);
  const certs = toItems(data.certifications);


  const sections: Record<SingleLook['order'][number], React.ReactNode> = {
    summary: p.summary ? <><SingleTitle look={look}>{look.summaryTitle}</SingleTitle><p style={{ margin: 0 }}><Inline text={p.summary} /></p></> : null,
    skills: Object.values(skills).some(Boolean) ? (
      <>
        <SingleTitle look={look}>Technical Skills</SingleTitle>
        {(Object.keys(SKILL_LABELS) as (keyof typeof SKILL_LABELS)[]).map(k => {
          const all = splitSkillRows(skills[k]).flat();
          return all.length ? <div key={k} style={{ marginBottom: '0.1em' }}><b>{SKILL_LABELS[k]}:</b> {all.join(', ')}</div> : null;
        })}
      </>
    ) : null,
    experience: workExperience.length ? (
      <>
        <SingleTitle look={look}>Experience</SingleTitle>
        {workExperience.map((e, i) => (
          <div key={i} style={{ marginBottom: '0.55em' }}>
            <div style={{ fontWeight: 700 }}><Inline text={e.role || e.company} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '1em' }}>
              <span style={look.orgStyle}>{e.company}</span>
              <span style={{ fontSize: '0.9em' }}>{[dates(e.start, e.end), e.location].filter(Boolean).join(' | ')}</span>
            </div>
            <Bullets text={e.bullets} size="1em" />
          </div>
        ))}
      </>
    ) : null,
    projects: projects.length ? (
      <>
        <SingleTitle look={look}>Projects</SingleTitle>
        {projects.map((pr, i) => (
          <div key={i} style={{ marginBottom: '0.55em' }}>
            <div style={{ fontWeight: 700 }}><Inline text={pr.title} /></div>
            {pr.repo_url && <div style={{ fontSize: '0.9em', wordBreak: 'break-all' }}>Code: {pr.repo_url}</div>}
            {pr.context && <div style={{ fontStyle: 'italic', fontSize: '0.9em' }}>{pr.context}</div>}
            {pr.demo_url && <div style={{ fontSize: '0.9em', wordBreak: 'break-all' }}>Live demo: {pr.demo_url}</div>}
            <Bullets text={pr.bullets} size="1em" />
          </div>
        ))}
      </>
    ) : null,
    education: education.length ? (
      <>
        <SingleTitle look={look}>Education</SingleTitle>
        {education.map((ed, i) => (
          <div key={i} style={{ marginBottom: '0.4em' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{ed.degree}</b><span style={{ fontSize: '0.9em' }}>{ed.year}</span>
            </div>
            <div><span style={look.orgStyle}>{ed.institution}</span>{ed.score && <> • <span style={{ fontSize: '0.9em' }}><ScoreText text={ed.score} /></span></>}</div>
          </div>
        ))}
      </>
    ) : null,
    achievements: achievements.length ? <><SingleTitle look={look}>Achievements</SingleTitle><Bullets text={achievements.join('\n')} size="1em" /></> : null,
    certifications: certs.length ? <><SingleTitle look={look}>Certifications</SingleTitle><Bullets text={certs.join('\n')} size="1em" /></> : null,
  };

  return (
    <Page base={look.base} font={look.font} padding={look.padding}>
      <div style={{ textAlign: look.align, ...look.nameStyle }}>
        <div style={{ fontSize: look.nameSize, fontWeight: 700, lineHeight: 1.1, textTransform: look.font.includes('Palatino') ? 'none' : 'uppercase', fontVariant: look.font.includes('Palatino') ? 'small-caps' : undefined }}>
          {p.name || 'Your Name'}
        </div>
        <div style={{ marginTop: '0.35em', display: 'flex', justifyContent: look.align === 'center' ? 'center' : 'flex-start' }}>
          <Contacts data={data} icons={false} sep={look.sepChar} color={INK} linkColor={look.accent ?? INK} size="0.9em" />
        </div>
        {look.accent && <div style={{ borderTop: `0.6pt solid ${RULE}`, marginTop: '0.5em' }} />}
      </div>
      {look.order.map(key => <Fragment key={key}>{sections[key]}</Fragment>)}
    </Page>
  );
}

export function ResumePreview({ data, templateId }: { data: ResumeData; templateId: ResumeTemplateId }) {
  if (templateId === 'modern-two-column') return <TwoColumn data={data} />;
  return <Single data={data} look={LOOKS[templateId]} />;
}
