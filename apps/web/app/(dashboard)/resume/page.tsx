'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useResume, Experience, ProjectItem, EducationItem, SkillCategories, ResumeTemplateId } from '@/lib/hooks/useResume';
import useSWR from 'swr';
import {
  FileText, Sparkles, Copy, Download, Briefcase, FolderGit2,
  RefreshCw, Upload, Eye,
  Layers, GraduationCap, Columns2, Zap, type LucideIcon,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface ResumeVersion {
  id: string;
  version_name: string;
  company?: string;
  role?: string;
  latex_code: string;
  created_at: string;
}

const TEMPLATES: { id: ResumeTemplateId; label: string; desc: string; icon: LucideIcon }[] = [
  { id: 'modern-two-column', label: 'Modern Two-Column', desc: 'Teal & Lato — Flagship ATS', icon: Columns2 },
  { id: 'classic-single',    label: 'Classic Single',   desc: 'High-compatibility ATS',       icon: FileText },
  { id: 'minimal-tech',      label: 'Minimal Tech',     desc: 'Clean modern tech style',      icon: Zap },
];

const TABS = [
  { id: 'profile',    label: 'Profile',              icon: Briefcase   },
  { id: 'experience', label: 'Work Experience',       icon: Briefcase   },
  { id: 'projects',   label: 'Projects',              icon: FolderGit2  },
  { id: 'skills',     label: 'Skills',                icon: Layers      },
  { id: 'education',  label: 'Education',             icon: GraduationCap },
  { id: 'preview',    label: 'Preview & Export',      icon: Eye         },
  { id: 'optimize',   label: 'Optimize for JD',   icon: Sparkles    },
] as const;

type TabId = typeof TABS[number]['id'];

/* ─── Styles ─────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '10px 14px',
  background: 'var(--bg-elevated)',
  border: '1.5px solid var(--border)',
  borderRadius: '8px', color: 'var(--text-primary)',
  fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none',
  transition: 'border-color .15s',
  boxSizing: 'border-box' as const,
};
const lbl = {
  fontSize: '12px', fontWeight: 700 as const, letterSpacing: '0',
  color: 'var(--text-muted)' as const, display: 'block' as const,
  marginBottom: '5px',
};

/* ─── Page ───────────────────────────────────────────────── */
export default function ResumeBuilderPage() {
  const { resumeData, isLoading, updateResume } = useResume();

  const [tab, setTab] = useState<TabId>('profile');
  const [latexView, setLatexView] = useState<'preview' | 'code'>('preview');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [templateId, setTemplateId] = useState<ResumeTemplateId>('modern-two-column');

  /* ─ Form state ─ */
  const [profile, setProfile] = useState({
    name: '', email: '', phone: '', linkedin: '', github: '',
    location: '', summary: '', targetRole: '', targetCompany: '',
  });
  const [experience, setExperience] = useState<Experience[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([{ degree: '', institution: '', year: '', score: '' }]);
  const [skills, setSkills] = useState('');
  const [skillsCat, setSkillsCat] = useState<SkillCategories>({
    languages: '', frameworks: '', cloud_and_databases: '', tools_and_architecture: '', area_of_interest: '',
  });
  const [achievements, setAchievements] = useState('');
  const [latexCode, setLatexCode] = useState('');

  /* ─ JD optimizer state ─ */
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdCompany, setJdCompany] = useState('');
  const [jdRole, setJdRole] = useState('');
  const [detectedRoles, setDetectedRoles] = useState<string[]>([]);
  const [detectedCompany, setDetectedCompany] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  /* ─ Versions ─ */
  const { data: versionsData, mutate: mutateVersions } = useSWR<{ versions: ResumeVersion[] }>(
    '/api/resume/versions',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  );
  const versions = versionsData?.versions || [];

  /* ─ Sync from SWR ─ */
  useEffect(() => {
    if (!resumeData) return;
    if (resumeData.profile) setProfile(p => ({ ...p, ...resumeData.profile }));
    if (resumeData.experience?.length) setExperience(resumeData.experience);
    if (resumeData.projects?.length) setProjects(resumeData.projects);
    if (resumeData.skills) setSkills(resumeData.skills);
    if (resumeData.skills_categorized) setSkillsCat(sc => ({ ...sc, ...resumeData.skills_categorized }));
    if (resumeData.achievements) setAchievements(resumeData.achievements);
    if (resumeData.latex_code) setLatexCode(resumeData.latex_code);
    if (resumeData.templateId) setTemplateId(resumeData.templateId);

    const edu = resumeData.education;
    if (edu) {
      if (Array.isArray(edu) && edu.length > 0) setEducation(edu);
      else if (!Array.isArray(edu) && (edu.degree || edu.institution)) setEducation([edu]);
    }
  }, [resumeData]);

  const collectData = useCallback(() => ({
    templateId, profile, experience, projects,
    education, skills, skills_categorized: skillsCat, achievements, latex_code: latexCode,
  }), [templateId, profile, experience, projects, education, skills, skillsCat, achievements, latexCode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateResume(collectData());
      toast.success('Resume saved!');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  };

  /* ─ Generate with AI ─ */
  const handleGenerate = async () => {
    if (!profile.targetRole) { toast.error('Fill in Target Role first'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...collectData(), targetRole: profile.targetRole, targetCompany: profile.targetCompany }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLatexCode(data.latex_code);
      if (data.resume_data) {
        const rd = data.resume_data;
        if (rd.profile) setProfile(p => ({ ...p, ...rd.profile }));
        if (rd.experience?.length) setExperience(rd.experience);
        if (rd.projects?.length) setProjects(rd.projects);
        if (rd.skills) setSkills(rd.skills);
        if (rd.skills_categorized) setSkillsCat(sc => ({ ...sc, ...rd.skills_categorized }));
        if (rd.achievements) setAchievements(rd.achievements);
        if (rd.education?.length) setEducation(rd.education);
      }
      setTab('preview');
      toast.success('Full 1-page resume generated!');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to generate');
    } finally { setGenerating(false); }
  };

  /* ─ Export ─ */
  const handleExport = (format: 'tex' | 'pdf') => {
    if (!latexCode) { toast.error('Generate a resume first!'); return; }
    if (format === 'tex') {
      const blob = new Blob([latexCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(profile.name || 'resume').replace(/\s+/g, '_')}.tex`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported .tex file');
    } else {
      window.print();
    }
  };

  /* ─ File upload ─ */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resume/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const ex = data.extracted;

      const updatedProfile = ex?.profile ? { ...profile, ...ex.profile } : profile;
      const updatedExp = ex?.experience?.length ? ex.experience : experience;
      const updatedProj = ex?.projects?.length ? ex.projects : projects;
      const updatedSkills = ex?.skills || skills;
      const updatedSkillsCat = ex?.skills_categorized ? { ...skillsCat, ...ex.skills_categorized } : skillsCat;
      const updatedAchieve = ex?.achievements || achievements;
      const updatedEdu = ex?.education?.length ? ex.education : education;

      setProfile(updatedProfile);
      setExperience(updatedExp);
      setProjects(updatedProj);
      setSkills(updatedSkills);
      setSkillsCat(updatedSkillsCat);
      setAchievements(updatedAchieve);
      setEducation(updatedEdu);

      // Immediately persist to Supabase
      await updateResume({
        profile: updatedProfile,
        experience: updatedExp,
        projects: updatedProj,
        skills: updatedSkills,
        skills_categorized: updatedSkillsCat,
        achievements: updatedAchieve,
        education: updatedEdu,
        templateId,
      });

      toast.success('Resume extracted and saved!');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Extraction failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  /* ─ Optimize ─ */
  const handleOptimize = async (roleOverride?: string) => {
    if (!jdText.trim() && !jdFile) { toast.error('Paste a JD or upload a file.'); return; }
    setIsOptimizing(true);
    try {
      const fd = new FormData();
      if (jdFile) fd.append('file', jdFile);
      fd.append('jd_text', jdText);
      fd.append('company', jdCompany || detectedCompany);
      fd.append('role', roleOverride || jdRole);
      fd.append('template_id', templateId);
      fd.append('resume_data', JSON.stringify(collectData()));
      if (roleOverride) fd.append('selected_role', roleOverride);

      const res = await fetch('/api/resume/optimize', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.requires_selection && data.roles_detected?.length > 1) {
        setDetectedRoles(data.roles_detected);
        setDetectedCompany(data.company || jdCompany);
        setShowRoleModal(true);
        return;
      }

      setShowRoleModal(false);
      setLatexCode(data.latex_code);
      mutateVersions();
      toast.success(`Optimized: ${data.version_name}`);
      setTab('preview');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Optimization failed');
    } finally { setIsOptimizing(false); }
  };

  /* ─ Experience helpers ─ */
  const addExp = () => setExperience(p => [...p, { company: '', role: '', start: '', end: '', location: '', bullets: '', type: 'work' }]);
  const updateExp = (i: number, f: keyof Experience, v: Experience[keyof Experience]) => setExperience(p => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c; });
  const removeExp = (i: number) => setExperience(p => p.filter((_, idx) => idx !== i));

  /* ─ Project helpers ─ */
  const addProj = () => setProjects(p => [...p, { title: '', repo_url: '', demo_url: '', context: '', bullets: '' }]);
  const updateProj = (i: number, f: keyof ProjectItem, v: string) => setProjects(p => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c; });
  const removeProj = (i: number) => setProjects(p => p.filter((_, idx) => idx !== i));

  /* ─ Education helpers ─ */
  const addEdu = () => setEducation(p => [...p, { degree: '', institution: '', year: '', score: '' }]);
  const updateEdu = (i: number, f: keyof EducationItem, v: string) => setEducation(p => { const c = [...p]; c[i] = { ...c[i], [f]: v }; return c; });
  const removeEdu = (i: number) => setEducation(p => p.filter((_, idx) => idx !== i));

  /* ─ Visual preview for modern-two-column ─ */
  const ModernTwoColPreview = () => {
    const expItems = experience.filter(e => (e.type || 'work') === 'work' && (e.role || e.company));
    const projItems = projects.filter(p => p.title);
    return (
      <div style={{ fontFamily: '"Lato","Helvetica Neue",sans-serif', fontSize: '9.5px', lineHeight: 1.45, color: '#2E2E2F', background: 'white', padding: '24px', borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minHeight: '500px' }}>
        {/* Header */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#2E2E2F', letterSpacing: '.06em' }}>{profile.name?.toUpperCase() || 'YOUR NAME'}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px', color: '#65696D', fontSize: '8px' }}>
            {profile.phone && <span>📞 {profile.phone}</span>}
            {profile.email && <span>✉ {profile.email}</span>}
            {profile.linkedin && <span style={{ color: '#00A6C0' }}>🔗 LinkedIn</span>}
            {profile.github && <span style={{ color: '#00A6C0' }}>💻 GitHub</span>}
            {profile.location && <span>📍 {profile.location}</span>}
          </div>
          <div style={{ borderTop: '1.5px solid #B4B7B9', marginTop: '6px' }} />
        </div>
        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '61% 35%', gap: '12px' }}>
          {/* Left */}
          <div>
            {expItems.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#65696D', fontWeight: 700, fontSize: '8.7px', letterSpacing: '.08em', marginBottom: '3px' }}>EXPERIENCE</div>
                <div style={{ borderTop: '0.6px solid #B4B7B9', marginBottom: '5px' }} />
                {expItems.slice(0, 3).map((e, i) => (
                  <div key={i} style={{ marginBottom: '7px' }}>
                    <div style={{ fontWeight: 700, fontSize: '9.5px' }}>{e.role || '—'}</div>
                    <div style={{ color: '#00A6C0', fontWeight: 700, fontSize: '8.5px' }}>{e.company} {e.location ? `· ${e.location}` : ''} <span style={{ color: '#65696D', fontWeight: 400 }}>· {e.start}–{e.end}</span></div>
                    {e.bullets && <ul style={{ paddingLeft: '10px', marginTop: '2px' }}>{e.bullets.split('\n').filter(Boolean).slice(0, 2).map((b, j) => <li key={j} style={{ color: '#2E2E2F', fontSize: '8.2px', marginBottom: '1px' }}>{b.replace(/^[\*\-•]\s*/, '')}</li>)}</ul>}
                  </div>
                ))}
              </div>
            )}
            {projItems.length > 0 && (
              <div>
                <div style={{ color: '#65696D', fontWeight: 700, fontSize: '8.7px', letterSpacing: '.08em', marginBottom: '3px' }}>PROJECTS</div>
                <div style={{ borderTop: '0.6px solid #B4B7B9', marginBottom: '5px' }} />
                {projItems.slice(0, 2).map((p, i) => (
                  <div key={i} style={{ marginBottom: '7px' }}>
                    <div style={{ fontWeight: 700, fontSize: '9.5px' }}>{p.title}</div>
                    {p.repo_url && <div style={{ color: '#00A6C0', fontSize: '7.8px' }}>🔗 {p.repo_url}</div>}
                    {p.context && <div style={{ color: '#65696D', fontStyle: 'italic', fontSize: '8px' }}>{p.context}</div>}
                    {p.bullets && <ul style={{ paddingLeft: '10px', marginTop: '2px' }}>{p.bullets.split('\n').filter(Boolean).slice(0, 2).map((b, j) => <li key={j} style={{ color: '#2E2E2F', fontSize: '8.2px', marginBottom: '1px' }}>{b.replace(/^[\*\-•]\s*/, '')}</li>)}</ul>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Right */}
          <div>
            {profile.summary && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#65696D', fontWeight: 700, fontSize: '8.7px', letterSpacing: '.08em', marginBottom: '3px' }}>SUMMARY</div>
                <div style={{ borderTop: '0.6px solid #B4B7B9', marginBottom: '4px' }} />
                <p style={{ fontSize: '8.3px', color: '#2E2E2F', lineHeight: 1.5 }}>{profile.summary}</p>
              </div>
            )}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: '#65696D', fontWeight: 700, fontSize: '8.7px', letterSpacing: '.08em', marginBottom: '3px' }}>SKILLS</div>
              <div style={{ borderTop: '0.6px solid #B4B7B9', marginBottom: '5px' }} />
              {[
                { label: 'Languages', val: skillsCat.languages },
                { label: 'Frameworks', val: skillsCat.frameworks },
                { label: 'Cloud & DBs', val: skillsCat.cloud_and_databases },
                { label: 'Tools', val: skillsCat.tools_and_architecture },
              ].map(({ label, val }) => val ? (
                <div key={label} style={{ marginBottom: '4px' }}>
                  <div style={{ color: '#00A6C0', fontWeight: 700, fontSize: '8.3px', marginBottom: '2px' }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {val.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                      <span key={s} style={{ fontSize: '7.8px', color: '#2E2E2F', borderBottom: '0.5px solid #B4B7B9', paddingBottom: '1px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              ) : null)}
            </div>
            {education.filter(e => e.degree || e.institution).length > 0 && (
              <div>
                <div style={{ color: '#65696D', fontWeight: 700, fontSize: '8.7px', letterSpacing: '.08em', marginBottom: '3px' }}>EDUCATION</div>
                <div style={{ borderTop: '0.6px solid #B4B7B9', marginBottom: '5px' }} />
                {education.filter(e => e.degree || e.institution).map((e, i) => (
                  <div key={i} style={{ marginBottom: '6px' }}>
                    <div style={{ fontWeight: 700, fontSize: '9.4px' }}>{e.degree}</div>
                    <div style={{ color: '#00A6C0', fontWeight: 700, fontSize: '8.5px' }}>{e.institution}</div>
                    <div style={{ color: '#65696D', fontSize: '7.8px' }}>📅 {e.year} {e.score && `· ${e.score}`}</div>
                  </div>
                ))}
              </div>
            )}
            {achievements && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ color: '#65696D', fontWeight: 700, fontSize: '8.7px', letterSpacing: '.08em', marginBottom: '3px' }}>ACHIEVEMENTS</div>
                <div style={{ borderTop: '0.6px solid #B4B7B9', marginBottom: '4px' }} />
                <p style={{ fontSize: '8.2px', color: '#2E2E2F', lineHeight: 1.5 }}>{achievements}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ClassicPreview = () => (
    <div style={{ fontFamily: 'Georgia, serif', fontSize: '12px', color: '#111', background: 'white', padding: '32px', borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minHeight: '500px' }}>
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, fontVariant: 'small-caps' }}>{profile.name || 'YOUR NAME'}</div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
          {[profile.phone, profile.email, profile.location].filter(Boolean).join(' | ')}
        </div>
      </div>
      {profile.summary && <><div style={{ fontSize: '12px', fontWeight: 700, borderBottom: '1.5px solid #000', paddingBottom: '2px', marginBottom: '6px' }}>PROFESSIONAL SUMMARY</div><p style={{ fontSize: '12px', lineHeight: 1.6, marginBottom: '12px' }}>{profile.summary}</p></>}
      {experience.filter(e => e.role).length > 0 && <><div style={{ fontSize: '12px', fontWeight: 700, borderBottom: '1.5px solid #000', paddingBottom: '2px', marginBottom: '6px' }}>EXPERIENCE</div>{experience.filter(e => e.role).slice(0, 3).map((e, i) => <div key={i} style={{ marginBottom: '8px' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>{e.role} @ {e.company}</span><span style={{ fontWeight: 400, fontSize: '12px' }}>{e.start} – {e.end}</span></div>{e.bullets && <ul style={{ marginTop: '3px', paddingLeft: '16px' }}>{e.bullets.split('\n').filter(Boolean).map((b, j) => <li key={j} style={{ fontSize: '12px', color: '#333' }}>{b.replace(/^[\*\-•]\s*/, '')}</li>)}</ul>}</div>)}</>}
    </div>
  );

  const MinimalPreview = () => (
    <div style={{ fontFamily: '"Helvetica Neue",Arial,sans-serif', fontSize: '12px', color: '#111', background: 'white', padding: '28px', borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minHeight: '500px' }}>
      <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '2px' }}>{profile.name?.toUpperCase() || 'YOUR NAME'}</div>
      <div style={{ fontSize: '12px', color: '#444', marginBottom: '16px' }}>{[profile.email, profile.phone, profile.location].filter(Boolean).join(' · ')}</div>
      {profile.summary && <p style={{ fontSize: '12px', color: '#333', lineHeight: 1.6, marginBottom: '14px', borderLeft: '3px solid #000', paddingLeft: '10px' }}>{profile.summary}</p>}
      {experience.filter(e => e.role).length > 0 && <><div style={{ fontWeight: 700, fontSize: '12px', borderBottom: '2px solid #111', marginBottom: '6px', paddingBottom: '2px' }}>Experience</div>{experience.filter(e => e.role).slice(0, 3).map((e, i) => <div key={i} style={{ marginBottom: '8px' }}><div style={{ fontWeight: 700 }}>{e.role} @ {e.company} <span style={{ fontWeight: 400, fontSize: '12px', float: 'right' }}>{e.start} – {e.end}</span></div>{e.bullets && <ul style={{ paddingLeft: '14px', marginTop: '2px' }}>{e.bullets.split('\n').filter(Boolean).map((b, j) => <li key={j} style={{ fontSize: '12px', color: '#333' }}>{b.replace(/^[\*\-•]\s*/, '')}</li>)}</ul>}</div>)}</>}
    </div>
  );

  const renderPreview = () => {
    if (templateId === 'modern-two-column') return <ModernTwoColPreview />;
    if (templateId === 'classic-single') return <ClassicPreview />;
    return <MinimalPreview />;
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading resume…</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1140px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-display mb-1.5 text-[26px] font-bold leading-tight tracking-tight text-fg sm:text-[32px]">Resume Builder</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>ATS-optimized LaTeX resume with AI enhancement & JD targeting</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-primary-dim)', border: '1px solid var(--accent-primary)', padding: '7px 14px', borderRadius: '8px', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer', opacity: isUploading ? 0.7 : 1, transition: 'all .15s' }}>
            <Upload size={13} />
            {isUploading ? 'Extracting…' : 'Upload Resume (.pdf / .tex / .docx)'}
            <input type="file" accept=".pdf,.tex,.docx,.txt,application/pdf,text/plain" style={{ display: 'none' }} onChange={handleFileUpload} disabled={isUploading} />
          </label>
          <button onClick={handleSave} disabled={saving} className="btn-secondary" style={{ fontSize: '13px', padding: '7px 18px' }}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary" style={{ fontSize: '13px', padding: '7px 18px', opacity: generating ? 0.7 : 1 }}>
            <Sparkles size={14} style={{ display: 'inline', marginRight: '5px' }} />
            {generating ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '.06em', marginBottom: '10px' }}>Template</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplateId(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px', padding: '12px 18px', borderRadius: '10px', border: `2px solid ${templateId === t.id ? 'var(--accent-primary)' : 'var(--border)'}`, background: templateId === t.id ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)', cursor: 'pointer', transition: 'all .15s', minWidth: '155px', flex: '1 1 155px' }}>
              <t.icon size={18} aria-hidden />
              <span style={{ fontSize: '13px', fontWeight: 700, color: templateId === t.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{t.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tabs-scrollable" style={{ gap: '4px', marginBottom: '22px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '12px', width: '100%', maxWidth: '100%' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as TabId)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)', transition: 'all .15s', background: tab === t.id ? 'var(--bg-surface)' : 'transparent', color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.25)' : 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ PROFILE TAB ═══ */}
        {tab === 'profile' && (
          <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>Personal Information</h2>
            <div className="grid-responsive-2" style={{ gap: '14px', marginBottom: '14px' }}>
              <div><label style={lbl}>Full Name</label><input style={inp} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your Full Name" /></div>
              <div><label style={lbl}>Email</label><input style={inp} value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" /></div>
              <div><label style={lbl}>Location</label><input style={inp} value={profile.location || ''} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="Chennai, Tamil Nadu, India" /></div>
              <div><label style={lbl}>LinkedIn URL</label><input style={inp} value={profile.linkedin} onChange={e => setProfile(p => ({ ...p, linkedin: e.target.value }))} placeholder="https://linkedin.com/in/..." /></div>
              <div><label style={lbl}>GitHub URL</label><input style={inp} value={profile.github} onChange={e => setProfile(p => ({ ...p, github: e.target.value }))} placeholder="https://github.com/..." /></div>
              <div><label style={lbl}>Target Role</label><input style={inp} value={profile.targetRole || ''} onChange={e => setProfile(p => ({ ...p, targetRole: e.target.value }))} placeholder="Senior Software Engineer" /></div>
              <div><label style={lbl}>Target Company</label><input style={inp} value={profile.targetCompany || ''} onChange={e => setProfile(p => ({ ...p, targetCompany: e.target.value }))} placeholder="Google, Meta, Stripe…" /></div>
            </div>
            <div>
              <label style={lbl}>Professional Summary</label>
              <textarea value={profile.summary || ''} onChange={e => setProfile(p => ({ ...p, summary: e.target.value }))} rows={4} placeholder="A results-driven engineer with 3+ years of experience in building scalable full-stack products…" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </motion.div>
        )}

        {/* ═══ EXPERIENCE TAB ═══ */}
        {tab === 'experience' && (
          <motion.div key="experience" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {experience.length === 0 && (
              <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No experience added yet.<br /><br /><button className="btn-primary" onClick={addExp} style={{ fontSize: '13px' }}>+ Add Work Experience</button></div>
            )}
            {experience.map((exp, idx) => (
              <div key={idx} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Experience #{idx + 1}</h3>
                    {/* Work/Project toggle */}
                    <div style={{ display: 'flex', background: 'var(--bg-base)', borderRadius: '6px', padding: '2px' }}>
                      {(['work', 'project'] as const).map(t => (
                        <button key={t} onClick={() => updateExp(idx, 'type', t)} style={{ padding: '3px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body)', background: (exp.type || 'work') === t ? 'var(--bg-surface)' : 'transparent', color: (exp.type || 'work') === t ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'all .15s' }}>
                          {t === 'work' ? 'Work' : 'Project'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => removeExp(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '13px' }}>Remove</button>
                </div>
                <div className="grid-responsive-2" style={{ gap: '10px', marginBottom: '10px' }}>
                  <div><label style={lbl}>{(exp.type || 'work') === 'work' ? 'Company' : 'Organization'}</label><input style={inp} value={exp.company} onChange={e => updateExp(idx, 'company', e.target.value)} placeholder="Google" /></div>
                  <div><label style={lbl}>Role / Title</label><input style={inp} value={exp.role} onChange={e => updateExp(idx, 'role', e.target.value)} placeholder="Software Engineer" /></div>
                  <div><label style={lbl}>Start Date</label><input style={inp} value={exp.start} onChange={e => updateExp(idx, 'start', e.target.value)} placeholder="Jan 2022" /></div>
                  <div><label style={lbl}>End Date</label><input style={inp} value={exp.end} onChange={e => updateExp(idx, 'end', e.target.value)} placeholder="Present" /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Location</label><input style={inp} value={exp.location || ''} onChange={e => updateExp(idx, 'location', e.target.value)} placeholder="San Francisco, CA (Remote)" /></div>
                </div>
                <div>
                  <label style={lbl}>Bullet Points (one per line — use metrics and action verbs)</label>
                  <textarea value={exp.bullets} onChange={e => updateExp(idx, 'bullets', e.target.value)} rows={4} placeholder="Designed and shipped real-time notification service processing 2M+ events/day, reducing latency by 40%&#10;Led cross-functional team of 6 to deliver feature 3 weeks ahead of schedule" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
              </div>
            ))}
            {experience.length > 0 && (
              <button onClick={addExp} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>+ Add Experience</button>
            )}
          </motion.div>
        )}

        {/* ═══ PROJECTS TAB ═══ */}
        {tab === 'projects' && (
          <motion.div key="projects" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {projects.length === 0 && (
              <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No projects added yet.<br /><br /><button className="btn-primary" onClick={addProj} style={{ fontSize: '13px' }}>+ Add Project</button></div>
            )}
            {projects.map((proj, idx) => (
              <div key={idx} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Project #{idx + 1}</h3>
                  <button onClick={() => removeProj(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '13px' }}>Remove</button>
                </div>
                <div className="grid-responsive-2" style={{ gap: '10px', marginBottom: '10px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Project Title</label><input style={inp} value={proj.title} onChange={e => updateProj(idx, 'title', e.target.value)} placeholder="PrepSpace — AI Interview Trainer" /></div>
                  <div><label style={lbl}>GitHub / Repo URL</label><input style={inp} value={proj.repo_url || ''} onChange={e => updateProj(idx, 'repo_url', e.target.value)} placeholder="https://github.com/user/repo" /></div>
                  <div><label style={lbl}>Live Demo URL</label><input style={inp} value={proj.demo_url || ''} onChange={e => updateProj(idx, 'demo_url', e.target.value)} placeholder="https://prepspace.app" /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Client / Context Attribution <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label><input style={inp} value={proj.context || ''} onChange={e => updateProj(idx, 'context', e.target.value)} placeholder="Built for XYZ Company · Open source contribution" /></div>
                </div>
                <div>
                  <label style={lbl}>Bullet Points (one per line)</label>
                  <textarea value={proj.bullets} onChange={e => updateProj(idx, 'bullets', e.target.value)} rows={3} placeholder="Architected scalable real-time API using Next.js, Supabase, and Gemini Live API&#10;Reduced session startup latency from 4s to 800ms through connection pooling" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
              </div>
            ))}
            {projects.length > 0 && (
              <button onClick={addProj} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>+ Add Project</button>
            )}
          </motion.div>
        )}

        {/* ═══ SKILLS TAB ═══ */}
        {tab === 'skills' && (
          <motion.div key="skills" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Categorized Skills</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>These map exactly to the skills section in the Modern Two-Column template (teal skill pills).</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {([
                  { key: 'languages', label: 'Programming Languages', placeholder: 'Python, TypeScript, C++, Java, SQL, Dart' },
                  { key: 'frameworks', label: 'Frameworks & Libraries', placeholder: 'React, Next.js, FastAPI, Flutter, PyTorch, Streamlit' },
                  { key: 'cloud_and_databases', label: 'Cloud & Databases', placeholder: 'AWS, GCP, Supabase, PostgreSQL, MongoDB, Redis, Firebase' },
                  { key: 'tools_and_architecture', label: 'Tools & Architecture', placeholder: 'Git, Docker, Postman, Linux, CI/CD, REST APIs, Microservices' },
                  { key: 'area_of_interest', label: 'Area of Interest / Core Competencies', placeholder: 'Machine Learning, Full-Stack Development, System Design, NLP' },
                ] as { key: keyof SkillCategories; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input style={inp} value={skillsCat[key] || ''} onChange={e => setSkillsCat(s => ({ ...s, [key]: e.target.value }))} placeholder={placeholder} />
                    {skillsCat[key] && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                        {skillsCat[key].split(',').map(s => s.trim()).filter(Boolean).map(s => (
                          <span key={s} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '100px', background: 'var(--accent-primary-dim)', color: 'var(--accent-primary)', fontWeight: 600, border: '1px solid rgba(var(--accent-primary-rgb), 0.2)' }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Achievements & Honors</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hackathons, awards, recognitions, scholarships.</p>
              </div>
              <textarea value={achievements} onChange={e => setAchievements(e.target.value)} rows={4} placeholder="1st Place — Smart India Hackathon 2024 (National Level)&#10;AIR 3 in ICPC Asia-West Regionals 2023" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </motion.div>
        )}

        {/* ═══ EDUCATION TAB ═══ */}
        {tab === 'education' && (
          <motion.div key="education" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {education.map((edu, idx) => (
              <div key={idx} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Education #{idx + 1}</h3>
                  {education.length > 1 && <button onClick={() => removeEdu(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '13px' }}>Remove</button>}
                </div>
                <div className="grid-responsive-3" style={{ gap: '12px', marginBottom: '12px' }}>
                  <div><label style={lbl}>Degree / Course</label><input style={inp} value={edu.degree} onChange={e => updateEdu(idx, 'degree', e.target.value)} placeholder="B.Tech. Computer Science & Engineering" /></div>
                  <div><label style={lbl}>Institution</label><input style={inp} value={edu.institution} onChange={e => updateEdu(idx, 'institution', e.target.value)} placeholder="IIT Madras" /></div>
                  <div><label style={lbl}>Year / Duration</label><input style={inp} value={edu.year} onChange={e => updateEdu(idx, 'year', e.target.value)} placeholder="2020 – 2024" /></div>
                </div>
                <div><label style={lbl}>Score / CGPA / Percentage <span style={{ fontWeight: 400 }}>(optional)</span></label><input style={inp} value={edu.score || ''} onChange={e => updateEdu(idx, 'score', e.target.value)} placeholder="CGPA: 8.31 / 10.00  or  Percentage: 96.33%" /></div>
              </div>
            ))}
            <button onClick={addEdu} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>+ Add Education</button>
          </motion.div>
        )}

        {/* ═══ PREVIEW TAB ═══ */}
        {tab === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                {(['preview', 'code'] as const).map(v => (
                  <button key={v} onClick={() => setLatexView(v)} style={{ padding: '7px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, background: latexView === v ? 'var(--bg-surface)' : 'transparent', color: latexView === v ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all .15s' }}>
                    {v === 'preview' ? 'Visual preview' : 'LaTeX source'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleExport('tex')} className="btn-secondary" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}><Download size={13} /> Export .tex</button>
                <button onClick={() => handleExport('pdf')} className="btn-secondary" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}><Download size={13} /> Print / Save PDF</button>
              </div>
            </div>

            {latexView === 'code' ? (
              <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {['#FF5F57', '#FFBD2E', '#28CA41'].map((c, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>resume.tex</span>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(latexCode); toast.success('LaTeX copied!'); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                    <Copy size={13} /> Copy Code
                  </button>
                </div>
                <textarea value={latexCode} onChange={e => setLatexCode(e.target.value)} style={{ width: '100%', minHeight: '520px', padding: '20px', background: 'var(--bg-base)', border: 'none', outline: 'none', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7, resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            ) : (
              <div className="card" style={{ padding: '24px', minHeight: '520px', overflow: 'auto' }}>
                {latexCode ? (
                  <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                    {renderPreview()}
                    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Preview is an approximation. Export .tex for exact rendering in Overleaf or LaTeX editors.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px', color: 'var(--text-muted)' }}>
                    <FileText size={48} strokeWidth={1} />
                    <p style={{ fontSize: '14px' }}>No resume generated yet.</p>
                    <button onClick={handleGenerate} disabled={generating} className="btn-primary" style={{ fontSize: '13px', opacity: generating ? 0.7 : 1 }}>
                      <Sparkles size={14} style={{ display: 'inline', marginRight: '6px' }} />
                      {generating ? 'Generating…' : 'Generate with AI'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ OPTIMIZE TAB ═══ */}
        {tab === 'optimize' && (
          <motion.div key="optimize" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid-main-sidebar" style={{ alignItems: 'start', gap: '20px' }}>
              <div className="card" style={{ padding: 'clamp(16px, 4vw, 24px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--accent-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Targeted JD Optimization</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>AI keyword-matches your resume to a specific job posting</p>
                  </div>
                </div>
                <div className="grid-responsive-2" style={{ gap: '12px', marginBottom: '14px' }}>
                  <div><label style={lbl}>Company (Optional)</label><input style={inp} value={jdCompany} onChange={e => setJdCompany(e.target.value)} placeholder="Stripe, Google, Datadog…" /></div>
                  <div><label style={lbl}>Role (Optional)</label><input style={inp} value={jdRole} onChange={e => setJdRole(e.target.value)} placeholder="Senior Backend Engineer" /></div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>Paste Job Description</label>
                  <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={8} placeholder="Paste the full job posting text including responsibilities, required qualifications, and tech stack…" style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={lbl}>Or Upload JD File (.docx / .pdf)</label>
                  <div style={{ border: '1.5px dashed var(--border)', borderRadius: '10px', padding: '16px', textAlign: 'center', background: 'var(--bg-elevated)', cursor: 'pointer' }}>
                    <input type="file" accept=".pdf,.docx,application/pdf" id="jd-file-input" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setJdFile(f); toast.success(`Attached: ${f.name}`); } }} />
                    <label htmlFor="jd-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Upload size={20} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{jdFile ? jdFile.name : 'Click to select .docx or .pdf'}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supports Microsoft Word and PDF job listings</span>
                    </label>
                  </div>
                </div>
                <button onClick={() => handleOptimize()} disabled={isOptimizing} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: 700, opacity: isOptimizing ? 0.7 : 1 }}>
                  {isOptimizing ? 'Analyzing & Tailoring…' : 'Optimize for this JD'}
                </button>
              </div>

              {/* Saved versions */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Saved Versions ({versions.length})</h3>
                  <button onClick={() => mutateVersions()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><RefreshCw size={13} /></button>
                </div>
                {versions.length === 0 ? (
                  <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.6 }}>No saved versions yet. Optimize for a JD to save custom resume variations.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {versions.map(ver => (
                      <div key={ver.id} style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>{ver.version_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{new Date(ver.created_at).toLocaleDateString()}</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => { setLatexCode(ver.latex_code); setTab('preview'); toast.success(`Loaded ${ver.version_name}`); }} style={{ padding: '4px 10px', borderRadius: '4px', background: 'var(--accent-primary-dim)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Load</button>
                          <button onClick={() => { navigator.clipboard.writeText(ver.latex_code); toast.success('LaTeX copied!'); }} style={{ padding: '4px 10px', borderRadius: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>Copy</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-role selection modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(12px, 3vw, 24px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: 'clamp(18px, 4vw, 28px)', maxWidth: '520px', width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Multiple Roles Detected</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>Found several roles at <strong style={{ color: 'var(--text-primary)' }}>{detectedCompany || 'this company'}</strong>. Select which position to target:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {detectedRoles.map(role => (
                  <button key={role} onClick={() => handleOptimize(role)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all .15s ease' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-primary-dim)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}>
                    <span>{role}</span>
                    <span style={{ color: 'var(--accent-primary)', fontSize: '12px' }}>Target this</span>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowRoleModal(false)} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
