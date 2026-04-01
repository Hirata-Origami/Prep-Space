'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const DEFAULT_LATEX = `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[colorlinks=true, linkcolor=blue, urlcolor=blue]{hyperref}
\\usepackage{tabularx}
\\begin{document}
\\begin{center}
    \\textbf{\\Huge \\scshape Jane Doe} \\\\ \\vspace{1pt}
    123-456-7890 $|$ \\href{mailto:email@example.com}{email@example.com} $|$ 
    \\href{https://linkedin.com/in/jane}{linkedin.com/in/jane} $|$
    \\href{https://github.com/jane}{github.com/jane}
\\end{center}
\\section{Experience}
  \\textbf{Software Engineer} $|$ Tech Corp \\hfill Jan 2022 -- Present
  \\begin{itemize}
    \\item Built scalable microservices serving 10M+ users with 99.99\\% uptime
    \\item Reduced API latency by 40\\% through query optimization and caching
  \\end{itemize}
\\section{Education}
  \\textbf{B.S. Computer Science} $|$ University of Technology \\hfill May 2022
\\section{Skills}
  \\textbf{Languages:} Python, TypeScript, Go, Rust \\\\
  \\textbf{Technologies:} React, Node.js, PostgreSQL, Redis, Docker, Kubernetes
\\end{document}`;

export default function ResumeBuilderPage() {
  const [tab, setTab] = useState<'profile' | 'experience' | 'skills' | 'latex'>('profile');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latexTab, setLatexTab] = useState<'code' | 'preview'>('code');
  const [latexCode, setLatexCode] = useState<string>(DEFAULT_LATEX);
  const [resumeData, setResumeData] = useState<{
    summary?: string;
    skills?: string[];
    experience_bullets?: string[];
  } | null>(null);

  // Form state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    targetRole: '',
    targetCompany: '',
  });
  const [experience, setExperience] = useState<Array<{
    company: string;
    role: string;
    start: string;
    end: string;
    bullets: string;
  }>>([{ company: '', role: '', start: '', end: 'Present', bullets: '' }]);
  const [education, setEducation] = useState({ degree: '', institution: '', year: '' });
  const [skills, setSkills] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load saved profile from DB on mount
  useEffect(() => {
    fetch('/api/resume/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile_sections) {
          const s = data.profile_sections;
          if (s.profile) setProfile(prev => ({ ...prev, ...s.profile }));
          if (s.experience) setExperience(s.experience);
          if (s.education) setEducation(s.education);
          if (s.skills) setSkills(s.skills);
          if (s.latex_code) setLatexCode(s.latex_code);
        }
      })
      .catch(() => {/* silently fail, use defaults */})
      .finally(() => setDataLoaded(true));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/resume/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_sections: { profile, experience, education, skills, latex_code: latexCode },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Resume data saved!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLaTeX = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: profile.targetRole,
          targetCompany: profile.targetCompany,
          profile,
          experience,
          education,
          skills: skills.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResumeData(data);
      if (data.latex_code) setLatexCode(data.latex_code);
      toast.success('Resume generated!');
      setTab('latex');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (format: 'tex' | 'pdf' | 'txt') => {
    if (!latexCode) { toast.error('No content to export'); return; }
    
    if (format === 'tex') {
      const blob = new Blob([latexCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.tex';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // Browser-based PDF: open in new tab with print dialog
      const win = window.open('', '_blank');
      if (!win) { toast.error('Popup blocked — allow popups to export PDF'); return; }
      win.document.write(`<!DOCTYPE html><html><head><title>Resume</title><style>
        body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.5; }
        code, pre { font-family: monospace; white-space: pre-wrap; font-size: 9px; }
        @media print { body { margin: 0; } }
      </style></head><body><pre>${latexCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 500);
      toast('Download as PDF from the print dialog', { icon: 'ℹ️' });
    } else if (format === 'txt') {
      // Plain text version — strip LaTeX
      const plain = latexCode
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/\\href\{[^}]+\}\{([^}]+)\}/g, '$1')
        .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1')
        .replace(/\\[a-zA-Z]+/g, '')
        .replace(/[{}$|\\]/g, '')
        .replace(/\s{3,}/g, '\n\n')
        .trim();
      const blob = new Blob([plain], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const addExperience = () => setExperience(prev => [...prev, { company: '', role: '', start: '', end: 'Present', bullets: '' }]);
  const removeExperience = (idx: number) => setExperience(prev => prev.filter((_, i) => i !== idx));
  const updateExp = (idx: number, field: string, value: string) =>
    setExperience(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));

  const inputStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', fontWeight: 600 as const, color: 'var(--text-muted)' as const, display: 'block' as const, marginBottom: '6px' };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Resume Builder</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>AI-powered ATS-optimized resume with LaTeX export</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleSaveProfile} disabled={saving} className="btn-secondary" style={{ fontSize: '13px' }}>
            {saving ? '💾 Saving…' : '💾 Save'}
          </button>
          <button onClick={handleGenerateLaTeX} disabled={generating} className="btn-primary" style={{ fontSize: '13px', opacity: generating ? 0.7 : 1 }}>
            {generating ? '✨ Generating…' : '✨ Generate with AI'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {(['profile', 'experience', 'skills', 'latex'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', transition: 'all 0.15s', background: tab === t ? 'var(--bg-surface)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>Personal Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div><label style={labelStyle}>Full Name</label><input style={inputStyle} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" /></div>
            <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" /></div>
            <div><label style={labelStyle}>LinkedIn URL</label><input style={inputStyle} value={profile.linkedin} onChange={e => setProfile(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/..." /></div>
            <div><label style={labelStyle}>GitHub URL</label><input style={inputStyle} value={profile.github} onChange={e => setProfile(p => ({ ...p, github: e.target.value }))} placeholder="github.com/..." /></div>
            <div />
            <div><label style={labelStyle}>Target Role</label><input style={inputStyle} value={profile.targetRole} onChange={e => setProfile(p => ({ ...p, targetRole: e.target.value }))} placeholder="Senior Frontend Engineer" /></div>
            <div><label style={labelStyle}>Target Company</label><input style={inputStyle} value={profile.targetCompany} onChange={e => setProfile(p => ({ ...p, targetCompany: e.target.value }))} placeholder="Google, Meta, Stripe..." /></div>
          </div>
        </motion.div>
      )}

      {tab === 'experience' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {experience.map((exp, idx) => (
            <div key={idx} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Experience #{idx + 1}</h3>
                {experience.length > 1 && <button onClick={() => removeExperience(idx)} style={{ background: 'none', border: 'none', color: '#FF4D6A', cursor: 'pointer', fontSize: '18px' }}>✕</button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>Company</label><input style={inputStyle} value={exp.company} onChange={e => updateExp(idx, 'company', e.target.value)} placeholder="Google" /></div>
                <div><label style={labelStyle}>Role</label><input style={inputStyle} value={exp.role} onChange={e => updateExp(idx, 'role', e.target.value)} placeholder="Software Engineer" /></div>
                <div><label style={labelStyle}>Start Date</label><input style={inputStyle} value={exp.start} onChange={e => updateExp(idx, 'start', e.target.value)} placeholder="Jan 2022" /></div>
                <div><label style={labelStyle}>End Date</label><input style={inputStyle} value={exp.end} onChange={e => updateExp(idx, 'end', e.target.value)} placeholder="Present" /></div>
              </div>
              <div>
                <label style={labelStyle}>Bullet Points (one per line, use metrics and impact)</label>
                <textarea value={exp.bullets} onChange={e => updateExp(idx, 'bullets', e.target.value)} rows={4}
                  placeholder="Built scalable API serving 10M+ requests/day, reducing latency by 40%&#10;Led team of 5 engineers to deliver feature 2 weeks ahead of schedule"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>
            </div>
          ))}
          <button onClick={addExperience} className="btn-secondary">+ Add Experience</button>

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Education</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '12px' }}>
              <div><label style={labelStyle}>Degree</label><input style={inputStyle} value={education.degree} onChange={e => setEducation(ed => ({ ...ed, degree: e.target.value }))} placeholder="B.S. Computer Science" /></div>
              <div><label style={labelStyle}>Institution</label><input style={inputStyle} value={education.institution} onChange={e => setEducation(ed => ({ ...ed, institution: e.target.value }))} placeholder="MIT" /></div>
              <div><label style={labelStyle}>Year</label><input style={inputStyle} value={education.year} onChange={e => setEducation(ed => ({ ...ed, year: e.target.value }))} placeholder="2022" /></div>
            </div>
          </div>
        </motion.div>
      )}

      {tab === 'skills' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Skills</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Enter your skills as a comma-separated list. AI will categorize and optimize these for the target role.</p>
          <textarea value={skills} onChange={e => setSkills(e.target.value)} rows={6}
            placeholder="Python, TypeScript, React, Node.js, PostgreSQL, Redis, Docker, Kubernetes, Distributed Systems, Machine Learning, REST APIs, GraphQL, AWS, GCP"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />

          {resumeData?.skills && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>AI-Filtered Skills for {profile.targetRole || 'Target Role'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {resumeData.skills.map(s => (
                  <span key={s} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '100px', background: 'rgba(77,255,160,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(77,255,160,0.2)', fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'latex' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            {/* Code/Preview toggle */}
            <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button onClick={() => setLatexTab('code')} style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, background: latexTab === 'code' ? 'var(--bg-surface)' : 'transparent', color: latexTab === 'code' ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                {'</>'}  Code
              </button>
              <button onClick={() => setLatexTab('preview')} style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, background: latexTab === 'preview' ? 'var(--bg-surface)' : 'transparent', color: latexTab === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                👁 Preview
              </button>
            </div>

            {/* Export buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => handleExport('tex')} className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px' }}>
                ⬇ .tex
              </button>
              <button onClick={() => handleExport('pdf')} className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px' }}>
                ⬇ PDF
              </button>
              <button onClick={() => handleExport('txt')} className="btn-secondary" style={{ fontSize: '12px', padding: '8px 14px' }}>
                ⬇ .txt
              </button>
            </div>
          </div>

          {latexTab === 'code' ? (
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(77,255,160,0.03)', display: 'flex', gap: '6px' }}>
                {['#FF5F57', '#FFBD2E', '#28CA41'].map((c, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>resume.tex</span>
              </div>
              <textarea
                value={latexCode}
                onChange={e => setLatexCode(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '480px',
                  padding: '20px',
                  background: 'var(--bg-base)',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--accent-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <div className="card" style={{ padding: '24px', minHeight: '480px' }}>
              <div style={{ background: 'white', color: '#111', padding: '40px', borderRadius: '6px', fontFamily: 'Georgia, serif', lineHeight: 1.6, fontSize: '13px', minHeight: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontVariant: 'small-caps', fontSize: '22px', color: '#000' }}>{profile.name || 'Jane Doe'}</h2>
                  <p style={{ margin: '6px 0', color: '#444', fontSize: '12px' }}>
                    {profile.phone} | {profile.email} | {profile.linkedin} | {profile.github}
                  </p>
                </div>
                {experience.filter(e => e.company || e.role).map((exp, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#000' }}>
                      <span>{exp.role} @ {exp.company}</span>
                      <span style={{ fontWeight: 'normal', fontSize: '12px' }}>{exp.start} – {exp.end}</span>
                    </div>
                    <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                      {exp.bullets.split('\n').filter(Boolean).map((b, j) => (
                        <li key={j} style={{ color: '#333', fontSize: '12px', marginBottom: '3px' }}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {education.degree && (
                  <div>
                    <div style={{ borderBottom: '1.5px solid #000', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px', paddingBottom: '2px' }}>EDUCATION</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold' }}>{education.degree}</span>
                      <span style={{ color: '#666', fontSize: '12px' }}>{education.institution} — {education.year}</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                ℹ️ This is a simplified HTML preview. For exact output, compile the .tex file using LaTeX or Overleaf.
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
