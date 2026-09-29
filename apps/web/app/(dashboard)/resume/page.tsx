'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowUp, Copy, Download, ExternalLink, FileText, Github, Mail, Plus, Printer, RotateCcw, Save, Sparkles, Trash2, Upload,
} from 'lucide-react';
import {
  useResume,
  type EducationItem, type Experience, type ProjectItem, type ResumeData, type ResumeProfile, type ResumeTemplateId, type SkillCategories,
} from '@/lib/hooks/useResume';
import { generateResumeLatex, normalizeEducation, normalizeProjects, normalizeSkills } from '@/lib/resume/templates';
import { parseResumeLatex } from '@/lib/resume/parseLatex';
import { analyzeResume } from '@/lib/resume/ats';
import { resumeToPlainText } from '@/lib/resume/text';
import { projectFromRepo, projectMatchesRepo } from '@/lib/github/match';
import type { GithubIndex, ProjectChoice } from '@/lib/github/types';
import { GithubPanel } from '@/components/resume/GithubPanel';
import { ResumePreview } from '@/components/resume/ResumePreview';
import { TemplatePicker } from '@/components/resume/TemplatePicker';
import { AtsPanel } from '@/components/resume/AtsPanel';
import {
  Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Textarea,
} from '@/components/ui';
import { cn } from '@/lib/cn';

interface ResumeVersion {
  id: string;
  version_name: string;
  company?: string;
  role?: string;
  latex_code: string;
  created_at: string;
}

const EMPTY_SKILLS: SkillCategories = { languages: '', frameworks: '', cloud_and_databases: '', tools_and_architecture: '', area_of_interest: '' };
const EMPTY_PROFILE: ResumeProfile = { name: '', email: '', phone: '', linkedin: '', github: '', location: '', summary: '', targetRole: '', targetCompany: '' };
const blankEdu = (): EducationItem => ({ degree: '', institution: '', year: '', score: '' });
const DRAFT_KEY = 'prepspace_resume_draft';

/** The data the form starts with, in the same shape the snapshot uses, so a draft can be compared to it. */
function initialFor(initial?: ResumeData): ResumeData {
  const split = initial ? normalizeProjects(initial) : { workExperience: [], projects: [] };
  const edu = initial ? normalizeEducation(initial) : [];
  const skillsCat = initial ? normalizeSkills(initial) : EMPTY_SKILLS;
  return {
    templateId: initial?.templateId ?? 'modern-two-column',
    profile: { ...EMPTY_PROFILE, ...(initial?.profile ?? {}) },
    experience: split.workExperience,
    projects: split.projects,
    education: edu.length ? edu : [blankEdu()],
    skills: Object.values(skillsCat).filter(Boolean).join(', ').replace(/\n/g, ', '),
    skills_categorized: skillsCat,
    achievements: initial?.achievements ?? '',
    certifications: initial?.certifications ?? '',
    github: initial?.github,
    latex_code: '',
  };
}

const SKILL_FIELDS: { key: keyof SkillCategories; label: string; placeholder: string }[] = [
  { key: 'languages', label: 'Programming languages', placeholder: 'Python, TypeScript, C++, SQL' },
  { key: 'frameworks', label: 'Frameworks and libraries', placeholder: 'React, Next.js, FastAPI, PyTorch' },
  { key: 'cloud_and_databases', label: 'Cloud and databases', placeholder: 'AWS (Lambda, S3), PostgreSQL, Redis' },
  { key: 'tools_and_architecture', label: 'Tools and architecture', placeholder: 'Git, Docker, CI/CD, REST API design' },
  { key: 'area_of_interest', label: 'Areas of interest or core competencies', placeholder: 'Machine Learning, Distributed Systems' },
];

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function bulletCount(text?: string) {
  return (text ?? '').split('\n').filter(l => l.trim()).length;
}

/** Wrapper for one repeatable entry (role, project, degree) with reorder and remove controls. */
function EntryCard({
  title, index, total, onMove, onRemove, children,
}: { title: string; index: number; total: number; onMove: (to: number) => void; onRemove: () => void; children: React.ReactNode }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold text-fg">{title || `Entry ${index + 1}`}</h3>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp size={15} /></Button>
          <Button variant="ghost" size="icon" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(index + 1)}><ArrowDown size={15} /></Button>
          <Button variant="ghost" size="icon" aria-label="Remove entry" onClick={onRemove} className="text-bad hover:text-bad"><Trash2 size={15} /></Button>
        </div>
      </div>
      {children}
    </Card>
  );
}

function ResumeBuilder({ initial }: { initial?: ResumeData }) {
  const { updateResume } = useResume();

  const initialSplit = useMemo(() => (initial ? normalizeProjects(initial) : { workExperience: [], projects: [] }), [initial]);
  const initialEdu = initial ? normalizeEducation(initial) : [];

  /* ── form state ── */
  const [templateId, setTemplateId] = useState<ResumeTemplateId>(initial?.templateId ?? 'modern-two-column');
  const [profile, setProfile] = useState<ResumeProfile>({ ...EMPTY_PROFILE, ...(initial?.profile ?? {}) });
  const [experience, setExperience] = useState<Experience[]>(initialSplit.workExperience);
  const [projects, setProjects] = useState<ProjectItem[]>(initialSplit.projects);
  const [education, setEducation] = useState<EducationItem[]>(initialEdu.length ? initialEdu : [blankEdu()]);
  const [skillsCat, setSkillsCat] = useState<SkillCategories>(initial ? normalizeSkills(initial) : EMPTY_SKILLS);
  const [achievements, setAchievements] = useState(initial?.achievements ?? '');
  const [certifications, setCertifications] = useState(initial?.certifications ?? '');
  const [latexOverride, setLatexOverride] = useState<string | null>(null);
  const [github, setGithub] = useState<GithubIndex | undefined>(initial?.github);
  const githubRef = useRef<GithubIndex | undefined>(initial?.github);
  const [useGithub, setUseGithub] = useState(true);
  const [maxProjects, setMaxProjects] = useState(4);
  const [selection, setSelection] = useState<{ choices: ProjectChoice[]; dropped: string[] } | null>(null);
  const [letter, setLetter] = useState('');
  const [letterTone, setLetterTone] = useState('professional');
  const [writingLetter, setWritingLetter] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [draftOffer, setDraftOffer] = useState<ResumeData | null>(null);

  /* ── ui state ── */
  const [editTab, setEditTab] = useState('profile');
  const [viewTab, setViewTab] = useState('preview');
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<null | 'upload' | 'enhance' | 'optimize'>(null);

  /* ── JD optimiser state ── */
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdCompany, setJdCompany] = useState('');
  const [jdRole, setJdRole] = useState('');
  const [detectedRoles, setDetectedRoles] = useState<string[]>([]);
  const [detectedCompany, setDetectedCompany] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  const { data: versionsData, mutate: mutateVersions } = useSWR<{ versions: ResumeVersion[] }>(
    '/api/resume/versions',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  );
  const versions = versionsData?.versions ?? [];

  const overleafForm = useRef<HTMLFormElement>(null);

  /* ── derived data ── */
  const flatSkills = useMemo(
    () => Object.values(skillsCat).filter(Boolean).join(', ').replace(/\n/g, ', '),
    [skillsCat]
  );
  const data: ResumeData = useMemo(() => ({
    templateId, profile, experience, projects, education, skills: flatSkills, skills_categorized: skillsCat,
    achievements, certifications, github, latex_code: '',
  }), [templateId, profile, experience, projects, education, flatSkills, skillsCat, achievements, certifications, github]);

  const generatedLatex = useMemo(() => generateResumeLatex(data, templateId), [data, templateId]);
  const latex = latexOverride ?? generatedLatex;
  const ats = useMemo(() => analyzeResume(data, templateId, jdText), [data, templateId, jdText]);

  /* ── unsaved changes, local draft and leave guard ── */
  const snapshot = useMemo(() => JSON.stringify({ ...data, latex_code: '' }), [data]);
  const dirty = savedSnapshot !== '' && snapshot !== savedSnapshot;

  useEffect(() => {
    // The first render defines "saved": what the server returned, or a blank form
    setSavedSnapshot(prev => (prev === '' ? snapshot : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, snapshot); } catch { /* storage is optional */ }
    }, 700);
    return () => clearTimeout(t);
  }, [dirty, snapshot]);

  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('prepspace_pending_jd');
      if (pending) {
        const j = JSON.parse(pending) as { company?: string; role?: string; jd?: string };
        setJdCompany(j.company ?? '');
        setJdRole(j.role ?? '');
        setJdText(j.jd ?? '');
        setEditTab('tailor');
        sessionStorage.removeItem('prepspace_pending_jd');
      }
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw && raw !== JSON.stringify({ ...(initialFor(initial)), latex_code: '' })) setDraftOffer(JSON.parse(raw) as ResumeData);
    } catch { /* ignore a corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── helpers ── */
  const applyData = (rd: Partial<ResumeData>) => {
    const split = normalizeProjects({ ...data, ...rd } as ResumeData);
    if (rd.profile) setProfile(p => ({ ...p, ...rd.profile }));
    if (rd.experience || rd.projects) { setExperience(split.workExperience); setProjects(split.projects); }
    if (rd.skills_categorized) setSkillsCat({ ...EMPTY_SKILLS, ...rd.skills_categorized });
    else if (rd.skills) setSkillsCat(normalizeSkills({ ...data, skills: rd.skills, skills_categorized: undefined }));
    if (rd.achievements !== undefined) setAchievements(rd.achievements);
    if (rd.certifications !== undefined) setCertifications(rd.certifications);
    if (rd.github !== undefined) { setGithub(rd.github); githubRef.current = rd.github; }
    if (rd.education) {
      const edu = normalizeEducation({ ...data, education: rd.education });
      setEducation(edu.length ? edu : [blankEdu()]);
    }
    setLatexOverride(null);
  };

  const persist = async (next?: ResumeData) => {
    const payload = next ?? data;
    await updateResume({ ...payload, latex_code: next ? generateResumeLatex(next, templateId) : latex });
    setSavedSnapshot(JSON.stringify({ ...payload, latex_code: '' }));
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persist();
      toast.success('Resume saved');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save the resume');
    } finally {
      setSaving(false);
    }
  };

  /* ── AI enhance (rewording only; never drops facts) ── */
  const handleEnhance = async () => {
    if (!profile.targetRole) {
      toast.error('Add a target role on the Profile tab first.');
      setEditTab('profile');
      return;
    }
    const before = data;
    setBusy('enhance');
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, mode: 'enhance', targetRole: profile.targetRole, targetCompany: profile.targetCompany }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.warning) toast.warning(json.warning);
      if (json.enhanced && json.resume_data) {
        applyData(json.resume_data);
        toast.success('Wording improved. Nothing was removed.', {
          action: { label: 'Undo', onClick: () => applyData(before) },
        });
      }
      setViewTab('preview');
      setMobileView('preview');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not improve the resume');
    } finally {
      setBusy(null);
    }
  };

  /* ── import an existing resume ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy('upload');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resume/extract', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const ex = json.extracted as Partial<ResumeData>;
      applyData({ ...ex, skills: ex.skills });
      const next: ResumeData = {
        ...data,
        ...ex,
        profile: { ...profile, ...(ex.profile ?? {}) },
        latex_code: '',
      } as ResumeData;
      await updateResume({ ...next, templateId, latex_code: '' });
      toast.success(json.source === 'latex' ? 'Imported exactly from your LaTeX file' : 'Resume imported. Check each section against your original.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(null);
      if (e.target) e.target.value = '';
    }
  };

  /* ── tailor to a job description ── */
  const handleOptimize = async (roleOverride?: string) => {
    if (!jdText.trim() && !jdFile) { toast.error('Paste a job description or upload one.'); return; }
    setBusy('optimize');
    try {
      const fd = new FormData();
      if (jdFile) fd.append('file', jdFile);
      fd.append('jd_text', jdText);
      fd.append('company', jdCompany || detectedCompany);
      fd.append('role', roleOverride || jdRole);
      fd.append('template_id', templateId);
      fd.append('resume_data', JSON.stringify(data));
      fd.append('use_github', useGithub && (github?.projects.length ?? 0) > 0 ? '1' : '0');
      fd.append('max_projects', String(maxProjects));
      if (roleOverride) fd.append('selected_role', roleOverride);

      const res = await fetch('/api/resume/optimize', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (json.requires_selection && json.roles_detected?.length > 1) {
        setDetectedRoles(json.roles_detected);
        setDetectedCompany(json.company || jdCompany);
        setShowRoleModal(true);
        return;
      }

      setShowRoleModal(false);
      setSelection(json.project_selection ?? null);
      if (json.resume_data) applyData(json.resume_data);
      mutateVersions();
      toast.success(`Tailored copy saved as “${json.version_name}”. Your saved resume is unchanged until you press Save.`);
      setViewTab('ats');
      setMobileView('preview');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Tailoring failed');
    } finally {
      setBusy(null);
    }
  };

  const loadVersion = (ver: ResumeVersion) => {
    const parsed = parseResumeLatex(ver.latex_code);
    if (parsed) {
      applyData(parsed);
      toast.success(`Loaded “${ver.version_name}” into the editor`);
    } else {
      setLatexOverride(ver.latex_code);
      setViewTab('latex');
      toast.success(`Loaded “${ver.version_name}” as LaTeX`);
    }
    setMobileView('preview');
  };

  /* ── export ── */
  const download = () => {
    const blob = new Blob([latex], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(profile.name || 'resume').trim().replace(/\s+/g, '_')}.tex`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported .tex file');
  };

  const copyLatex = async () => {
    await navigator.clipboard.writeText(latex);
    toast.success('LaTeX copied');
  };

  const writeLetter = async () => {
    setWritingLetter(true);
    try {
      const res = await fetch('/api/resume/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_data: data, jd_text: jdText, company: jdCompany || detectedCompany, role: jdRole, tone: letterTone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLetter(json.letter);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not write the letter');
    } finally {
      setWritingLetter(false);
    }
  };

  const copyPlainText = async () => {
    await navigator.clipboard.writeText(resumeToPlainText(data));
    toast.success('Plain text copied. Paste it into application forms.');
  };

  /* ── github ── */
  const setGithubIndex = (next: GithubIndex | undefined) => {
    githubRef.current = next;
    setGithub(next);
  };
  const onGithubIndexed = async () => {
    try {
      await updateResume({ ...data, github: githubRef.current, latex_code: latex });
      setSavedSnapshot(JSON.stringify({ ...data, github: githubRef.current, latex_code: '' }));
    } catch { /* the Save button still works */ }
  };
  const addRepoAsProject = (repo: Parameters<typeof projectFromRepo>[0]) => {
    setProjects(p => [...p, projectFromRepo(repo)]);
    toast.success(`Added ${repo.name} to your projects`);
  };

  /* ── list helpers ── */
  const setExp = (i: number, patch: Partial<Experience>) => setExperience(p => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const setProj = (i: number, patch: Partial<ProjectItem>) => setProjects(p => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const setEdu = (i: number, patch: Partial<EducationItem>) => setEducation(p => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const setProf = (patch: Partial<ResumeProfile>) => setProfile(p => ({ ...p, ...patch }));

  const uploading = busy === 'upload';

  return (
    <div className="page-container">
      <PageHeader
        title="Resume builder"
        description="Edit once, export to five ATS-safe LaTeX templates. Your wording is never changed unless you ask for it."
        action={
          <>
            <label
              className={cn(
                'inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-panel px-4 text-sm font-semibold text-fg transition-colors hover:bg-raised focus-within:outline focus-within:outline-2 focus-within:outline-signal',
                uploading && 'pointer-events-none opacity-60'
              )}
            >
              <Upload size={15} aria-hidden />
              {uploading ? 'Importing…' : 'Import resume'}
              <input type="file" accept=".pdf,.tex,.docx,.txt,application/pdf,text/plain" className="sr-only" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <Button variant="secondary" onClick={handleEnhance} loading={busy === 'enhance'}>
              <Sparkles size={15} aria-hidden /> Improve wording
            </Button>
            {dirty && <Badge tone="live" className="self-center">Unsaved changes</Badge>}
            <Button onClick={handleSave} loading={saving}>
              <Save size={15} aria-hidden /> Save
            </Button>
          </>
        }
      />

      {draftOffer && (
        <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-live/30 bg-live/10 px-4 py-3 text-sm text-fg-2">
          <span>You have an unsaved draft from an earlier visit.</span>
          <span className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => { applyData(draftOffer); if (draftOffer.templateId) setTemplateId(draftOffer.templateId); setDraftOffer(null); }}>Restore draft</Button>
            <Button size="sm" variant="ghost" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } setDraftOffer(null); }}>Discard</Button>
          </span>
        </div>
      )}

      <section aria-labelledby="tpl-heading" className="mb-6">
        <h2 id="tpl-heading" className="mb-2.5 text-sm font-semibold text-fg">Template</h2>
        <TemplatePicker value={templateId} onChange={setTemplateId} />
      </section>

      {/* mobile switch between editing and previewing */}
      <div className="mb-4 flex rounded-control border border-line bg-raised p-0.5 lg:hidden" role="tablist" aria-label="Editor or preview">
        {(['edit', 'preview'] as const).map(v => (
          <button
            key={v}
            role="tab"
            aria-selected={mobileView === v}
            onClick={() => setMobileView(v)}
            className={cn('h-9 flex-1 rounded-[6px] text-sm font-medium transition-colors', mobileView === v ? 'bg-panel text-fg shadow-sm' : 'text-fg-3')}
          >
            {v === 'edit' ? 'Edit' : 'Preview and export'}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ═════════ editor ═════════ */}
        <div className={cn('min-w-0', mobileView === 'preview' && 'hidden lg:block')}>
          <Tabs value={editTab} onValueChange={setEditTab}>
            <TabsList aria-label="Resume sections" className="mb-5">
              {[
                ['profile', 'Profile'], ['experience', `Experience (${experience.length})`], ['projects', `Projects (${projects.length})`],
                ['skills', 'Skills'], ['education', 'Education'], ['extras', 'Achievements'], ['github', `GitHub (${github?.projects.length ?? 0})`], ['tailor', 'Tailor to a job'],
              ].map(([id, label]) => <TabsTrigger key={id} value={id}>{label}</TabsTrigger>)}
            </TabsList>

            {/* profile */}
            <TabsContent value="profile" className="space-y-5 outline-none">
              <Card className="space-y-4">
                <h3 className="text-sm font-semibold text-fg">Contact</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">{a => <Input {...a} value={profile.name} onChange={e => setProf({ name: e.target.value })} placeholder="Ada Lovelace" autoComplete="name" />}</Field>
                  <Field label="Email">{a => <Input {...a} type="email" value={profile.email} onChange={e => setProf({ email: e.target.value })} placeholder="you@example.com" autoComplete="email" />}</Field>
                  <Field label="Phone">{a => <Input {...a} value={profile.phone} onChange={e => setProf({ phone: e.target.value })} placeholder="+91 98765 43210" autoComplete="tel" />}</Field>
                  <Field label="Location">{a => <Input {...a} value={profile.location ?? ''} onChange={e => setProf({ location: e.target.value })} placeholder="Chennai, Tamil Nadu" />}</Field>
                  <Field label="LinkedIn URL">{a => <Input {...a} value={profile.linkedin} onChange={e => setProf({ linkedin: e.target.value })} placeholder="https://linkedin.com/in/…" />}</Field>
                  <Field label="LinkedIn shown as" hint="Optional. Leave blank to show the URL.">{a => <Input {...a} value={profile.linkedinLabel ?? ''} onChange={e => setProf({ linkedinLabel: e.target.value })} placeholder="linkedin.com/in/ada" />}</Field>
                  <Field label="GitHub URL">{a => <Input {...a} value={profile.github} onChange={e => setProf({ github: e.target.value })} placeholder="https://github.com/…" />}</Field>
                  <Field label="GitHub shown as" hint="Optional.">{a => <Input {...a} value={profile.githubLabel ?? ''} onChange={e => setProf({ githubLabel: e.target.value })} placeholder="github.com/ada" />}</Field>
                </div>
              </Card>
              <Card className="space-y-4">
                <h3 className="text-sm font-semibold text-fg">Summary</h3>
                <Field label="Professional summary" hint={`${(profile.summary ?? '').split(/\s+/).filter(Boolean).length} words. Two to four sentences works best.`}>
                  {a => <Textarea {...a} rows={5} value={profile.summary ?? ''} onChange={e => setProf({ summary: e.target.value })} placeholder="Backend engineer with 4 years building payment systems…" />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Target role" hint="Used by Improve wording.">{a => <Input {...a} value={profile.targetRole ?? ''} onChange={e => setProf({ targetRole: e.target.value })} placeholder="Senior Software Engineer" />}</Field>
                  <Field label="Target company">{a => <Input {...a} value={profile.targetCompany ?? ''} onChange={e => setProf({ targetCompany: e.target.value })} placeholder="Stripe" />}</Field>
                </div>
              </Card>
            </TabsContent>

            {/* experience */}
            <TabsContent value="experience" className="space-y-4 outline-none">
              {experience.length === 0 && (
                <EmptyState title="No work experience yet" description="Add internships and jobs here. Personal and client projects go in the Projects tab."
                  action={<Button onClick={() => setExperience([{ company: '', role: '', start: '', end: '', location: '', bullets: '', type: 'work' }])}><Plus size={15} aria-hidden /> Add experience</Button>} />
              )}
              {experience.map((exp, i) => (
                <EntryCard key={i} index={i} total={experience.length} title={[exp.role, exp.company].filter(Boolean).join(' · ')} onMove={to => setExperience(p => move(p, i, to))} onRemove={() => setExperience(p => p.filter((_, x) => x !== i))}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Role">{a => <Input {...a} value={exp.role} onChange={e => setExp(i, { role: e.target.value })} placeholder="Software Engineer" />}</Field>
                    <Field label="Company">{a => <Input {...a} value={exp.company} onChange={e => setExp(i, { company: e.target.value })} placeholder="Stripe" />}</Field>
                    <Field label="Start">{a => <Input {...a} value={exp.start} onChange={e => setExp(i, { start: e.target.value })} placeholder="05/2025" />}</Field>
                    <Field label="End" hint="Leave blank for Present.">{a => <Input {...a} value={exp.end} onChange={e => setExp(i, { end: e.target.value })} placeholder="11/2025" />}</Field>
                    <Field label="Location" className="sm:col-span-2">{a => <Input {...a} value={exp.location ?? ''} onChange={e => setExp(i, { location: e.target.value })} placeholder="Chennai" />}</Field>
                  </div>
                  <Field label="Bullets" hint={`${bulletCount(exp.bullets)} bullets. One per line. Start with a verb and include a number where you can. Use **bold** for emphasis.`}>
                    {a => <Textarea {...a} rows={6} value={exp.bullets} onChange={e => setExp(i, { bullets: e.target.value })} />}
                  </Field>
                </EntryCard>
              ))}
              {experience.length > 0 && <Button variant="secondary" onClick={() => setExperience(p => [...p, { company: '', role: '', start: '', end: '', location: '', bullets: '', type: 'work' }])}><Plus size={15} aria-hidden /> Add experience</Button>}
            </TabsContent>

            {/* projects */}
            <TabsContent value="projects" className="space-y-4 outline-none">
              {projects.length === 0 && (
                <EmptyState title="No projects yet" description="Add personal, academic, client or open-source work."
                  action={<Button onClick={() => setProjects([{ title: '', repo_url: '', demo_url: '', context: '', bullets: '' }])}><Plus size={15} aria-hidden /> Add project</Button>} />
              )}
              {projects.map((pr, i) => (
                <EntryCard key={i} index={i} total={projects.length} title={pr.title} onMove={to => setProjects(p => move(p, i, to))} onRemove={() => setProjects(p => p.filter((_, x) => x !== i))}>
                  <Field label="Project title">{a => <Input {...a} value={pr.title} onChange={e => setProj(i, { title: e.target.value })} placeholder="PrepSpace – AI Interview Preparation Platform" />}</Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Repository URL">{a => <Input {...a} value={pr.repo_url ?? ''} onChange={e => setProj(i, { repo_url: e.target.value })} placeholder="https://github.com/…" />}</Field>
                    <Field label="Live demo URL">{a => <Input {...a} value={pr.demo_url ?? ''} onChange={e => setProj(i, { demo_url: e.target.value })} placeholder="https://…" />}</Field>
                  </div>
                  <Field label="Context line" hint="Optional. Shown in italics under the title, for example a client, partner or tech stack.">
                    {a => <Input {...a} value={pr.context ?? ''} onChange={e => setProj(i, { context: e.target.value })} placeholder="Client project for Acme – a logistics startup" />}
                  </Field>
                  <Field label="Bullets" hint={`${bulletCount(pr.bullets)} bullets. One per line.`}>
                    {a => <Textarea {...a} rows={6} value={pr.bullets} onChange={e => setProj(i, { bullets: e.target.value })} />}
                  </Field>
                </EntryCard>
              ))}
              {projects.length > 0 && <Button variant="secondary" onClick={() => setProjects(p => [...p, { title: '', repo_url: '', demo_url: '', context: '', bullets: '' }])}><Plus size={15} aria-hidden /> Add project</Button>}
            </TabsContent>

            {/* skills */}
            <TabsContent value="skills" className="outline-none">
              <Card className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">Skills</h3>
                  <p className="mt-1 text-[13px] text-fg-3">Separate skills with commas. In the two-column template, put each row on its own line to control how the skill tags wrap.</p>
                </div>
                {SKILL_FIELDS.map(f => (
                  <Field key={f.key} label={f.label}>
                    {a => <Textarea {...a} rows={2} className="min-h-[3.25rem]" value={skillsCat[f.key]} placeholder={f.placeholder} onChange={e => setSkillsCat(s => ({ ...s, [f.key]: e.target.value }))} />}
                  </Field>
                ))}
              </Card>
            </TabsContent>

            {/* education */}
            <TabsContent value="education" className="space-y-4 outline-none">
              {education.map((ed, i) => (
                <EntryCard key={i} index={i} total={education.length} title={[ed.degree, ed.institution].filter(Boolean).join(' · ')} onMove={to => setEducation(p => move(p, i, to))} onRemove={() => setEducation(p => (p.length > 1 ? p.filter((_, x) => x !== i) : [blankEdu()]))}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Degree or course">{a => <Input {...a} value={ed.degree} onChange={e => setEdu(i, { degree: e.target.value })} placeholder="M.Sc. Software Systems" />}</Field>
                    <Field label="Institution">{a => <Input {...a} value={ed.institution} onChange={e => setEdu(i, { institution: e.target.value })} placeholder="PSG College of Technology" />}</Field>
                    <Field label="Years">{a => <Input {...a} value={ed.year} onChange={e => setEdu(i, { year: e.target.value })} placeholder="2022 – 2027 (Expected)" />}</Field>
                    <Field label="Score" hint="Optional. The first number is set in bold.">{a => <Input {...a} value={ed.score ?? ''} onChange={e => setEdu(i, { score: e.target.value })} placeholder="CGPA: 8.31/10.00" />}</Field>
                  </div>
                </EntryCard>
              ))}
              <Button variant="secondary" onClick={() => setEducation(p => [...p, blankEdu()])}><Plus size={15} aria-hidden /> Add education</Button>
            </TabsContent>

            {/* achievements and certifications */}
            <TabsContent value="extras" className="space-y-5 outline-none">
              <Card className="space-y-2">
                <Field label="Achievements and honours" hint="One per line. Hackathons, awards, scholarships.">
                  {a => <Textarea {...a} rows={5} value={achievements} onChange={e => setAchievements(e.target.value)} placeholder="Finalist, Smart India Hackathon 2024" />}
                </Field>
              </Card>
              <Card className="space-y-2">
                <Field label="Certifications and courses" hint="One per line. Include the issuer and year.">
                  {a => <Textarea {...a} rows={4} value={certifications} onChange={e => setCertifications(e.target.value)} placeholder="AWS Certified Cloud Practitioner, 2025" />}
                </Field>
              </Card>
            </TabsContent>

            {/* github */}
            <TabsContent value="github" className="outline-none">
              <GithubPanel
                profileGithub={profile.github}
                index={github}
                isOnResume={r => projects.some(pr => projectMatchesRepo(pr, r))}
                onChange={setGithubIndex}
                onIndexed={onGithubIndexed}
                onAddProject={addRepoAsProject}
              />
            </TabsContent>

            {/* tailor to a job */}
            <TabsContent value="tailor" className="space-y-5 outline-none">
              <Card className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">Tailor to a job description</h3>
                  <p className="mt-1 text-[13px] text-fg-3">Gemini rewords and reorders what you already have to match the posting. It cannot add facts, and your saved resume stays as it is until you press Save.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company (optional)">{a => <Input {...a} value={jdCompany} onChange={e => setJdCompany(e.target.value)} placeholder="Stripe" />}</Field>
                  <Field label="Role (optional)">{a => <Input {...a} value={jdRole} onChange={e => setJdRole(e.target.value)} placeholder="Senior Backend Engineer" />}</Field>
                </div>
                <Field label="Job description" hint="Also powers the keyword check on the ATS tab.">
                  {a => <Textarea {...a} rows={9} value={jdText} onChange={e => setJdText(e.target.value)} placeholder="Paste the full posting, including responsibilities and requirements." />}
                </Field>
                <div>
                  <label className="flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-line-strong bg-raised px-4 py-3 text-sm text-fg-2 hover:border-signal">
                    <Upload size={16} className="text-signal" aria-hidden />
                    <span className="min-w-0 truncate">{jdFile ? jdFile.name : 'Or attach a job description (.pdf, .docx)'}</span>
                    <input type="file" accept=".pdf,.docx,application/pdf" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) { setJdFile(f); toast.success(`Attached ${f.name}`); } }} />
                  </label>
                </div>
                {(github?.projects.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-raised px-4 py-3">
                    <label className="flex items-center gap-2 text-sm text-fg">
                      <input type="checkbox" checked={useGithub} onChange={e => setUseGithub(e.target.checked)} className="h-4 w-4 accent-[var(--accent-primary)]" />
                      Pick the best projects from my {github?.projects.length} indexed GitHub repositories
                    </label>
                    <div className="flex items-center gap-2 text-[13px] text-fg-2">
                      Show up to
                      <Select aria-label="Number of projects" value={maxProjects} onChange={e => setMaxProjects(Number(e.target.value))} className="h-9 w-16">
                        {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setEditTab('github')} className="flex w-full items-center gap-2 rounded-panel border border-dashed border-line-strong px-4 py-3 text-left text-[13px] text-fg-2 transition-colors hover:border-signal">
                    <Github size={15} className="text-fg-3" aria-hidden /> Index your GitHub repositories so the best projects are picked for each job.
                  </button>
                )}
                <Button size="lg" className="w-full" onClick={() => handleOptimize()} loading={busy === 'optimize'}>
                  {busy === 'optimize' ? 'Tailoring…' : 'Tailor my resume'}
                </Button>
              </Card>

              {selection && (
                <Card className="space-y-3">
                  <h3 className="text-sm font-semibold text-fg">Projects chosen for this job</h3>
                  <ol className="space-y-2.5">
                    {selection.choices.map((c, i) => (
                      <li key={c.ref} className="flex gap-3 rounded-control border border-line bg-raised p-3">
                        <span className="font-mono text-sm text-fg-3">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-fg">{c.ref}</span>
                            <Badge tone={c.source === 'github' ? 'violet' : 'signal'}>{c.source === 'github' ? 'From GitHub' : 'From resume'}</Badge>
                            <Badge tone={c.relevance >= 75 ? 'good' : c.relevance >= 50 ? 'live' : 'neutral'} className="font-mono">{c.relevance}% match</Badge>
                          </div>
                          <p className="mt-1 text-[13px] text-fg-2">{c.reason}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {selection.dropped.length > 0 && <p className="text-xs text-fg-3">Left out for this job: {selection.dropped.join(', ')}.</p>}
                </Card>
              )}

              <Card className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-fg">Cover letter</h3>
                    <p className="mt-1 text-[13px] text-fg-3">Written from your resume and this job description. It only states facts you have already listed.</p>
                  </div>
                  <Select aria-label="Tone" value={letterTone} onChange={e => setLetterTone(e.target.value)} className="h-9 w-36 shrink-0">
                    <option value="professional">Professional</option>
                    <option value="warm">Warm</option>
                    <option value="bold">Direct</option>
                  </Select>
                </div>
                <Button variant="secondary" onClick={writeLetter} loading={writingLetter} disabled={!jdText.trim()}>
                  <Mail size={15} aria-hidden /> {letter ? 'Write again' : 'Write cover letter'}
                </Button>
                {letter && (
                  <>
                    <Textarea aria-label="Cover letter" rows={14} value={letter} onChange={e => setLetter(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(letter); toast.success('Letter copied'); }}><Copy size={13} aria-hidden /> Copy</Button>
                    </div>
                  </>
                )}
              </Card>

              <Card padded={false}>
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <h3 className="text-sm font-semibold text-fg">Saved versions ({versions.length})</h3>
                  <Button variant="ghost" size="icon" aria-label="Refresh versions" onClick={() => mutateVersions()}><RotateCcw size={14} /></Button>
                </div>
                {versions.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-fg-3">No versions yet. Each tailored resume is saved here.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {versions.map(ver => (
                      <li key={ver.id} className="flex items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-fg">{ver.version_name}</div>
                          <div className="text-xs text-fg-3">{new Date(ver.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <Button size="sm" variant="secondary" onClick={() => loadVersion(ver)}>Load</Button>
                          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(ver.latex_code); toast.success('LaTeX copied'); }}>Copy</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ═════════ preview / latex / ats ═════════ */}
        <div className={cn('min-w-0 lg:sticky lg:top-4', mobileView === 'edit' && 'hidden lg:block')}>
          <Tabs value={viewTab} onValueChange={setViewTab}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <TabsList aria-label="Output" className="border-b-0">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="latex">LaTeX{latexOverride !== null && ' (edited)'}</TabsTrigger>
                <TabsTrigger value="ats">
                  ATS <Badge tone={ats.score >= 80 ? 'good' : ats.score >= 60 ? 'live' : 'bad'} className="ml-1.5 font-mono">{ats.score}</Badge>
                </TabsTrigger>
              </TabsList>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={download}><Download size={14} aria-hidden /> .tex</Button>
                <Button size="sm" variant="secondary" onClick={copyPlainText}><Copy size={14} aria-hidden /> Text</Button>
                <Button size="sm" variant="secondary" onClick={() => overleafForm.current?.submit()}><ExternalLink size={14} aria-hidden /> Open in Overleaf</Button>
                <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer size={14} aria-hidden /> Print</Button>
              </div>
            </div>

            <TabsContent value="preview" className="outline-none">
              <div id="resume-print">
                <ResumePreview data={data} templateId={templateId} />
              </div>
              <p className="mt-3 text-center text-xs text-fg-3">
                A close preview of the layout. For the exact PDF, open the LaTeX in Overleaf; it compiles with pdfLaTeX.
              </p>
            </TabsContent>

            <TabsContent value="latex" className="outline-none">
              {latexOverride !== null && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-live/30 bg-live/10 px-3 py-2 text-[13px] text-fg-2">
                  <span>You edited the LaTeX by hand. Changes in the form no longer update it.</span>
                  <Button size="sm" variant="secondary" onClick={() => setLatexOverride(null)}><RotateCcw size={13} aria-hidden /> Reset to generated</Button>
                </div>
              )}
              <Card padded={false} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-line bg-raised px-4 py-2">
                  <span className="flex items-center gap-2 text-xs text-fg-3"><FileText size={13} aria-hidden /> resume.tex</span>
                  <Button size="sm" variant="ghost" onClick={copyLatex}><Copy size={13} aria-hidden /> Copy</Button>
                </div>
                <textarea
                  aria-label="LaTeX source"
                  spellCheck={false}
                  value={latex}
                  onChange={e => setLatexOverride(e.target.value)}
                  className="block h-[560px] w-full resize-y bg-canvas p-4 font-mono text-xs leading-relaxed text-fg outline-none"
                />
              </Card>
            </TabsContent>

            <TabsContent value="ats" className="outline-none">
              <AtsPanel report={ats} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Overleaf accepts a POSTed snippet and opens it as a new project */}
      <form ref={overleafForm} action="https://www.overleaf.com/docs" method="post" target="_blank" className="hidden">
        <input type="hidden" name="snip" value={latex} readOnly />
        <input type="hidden" name="engine" value="pdflatex" />
        <input type="hidden" name="snip_name" value={`${profile.name || 'resume'}.tex`} />
      </form>

      <Modal
        open={showRoleModal}
        onOpenChange={setShowRoleModal}
        title="Choose a role"
        description={`Several roles were found at ${detectedCompany || 'this company'}. Pick the one to tailor for.`}
        footer={<Button variant="ghost" onClick={() => setShowRoleModal(false)}>Cancel</Button>}
      >
        <ul className="space-y-2">
          {detectedRoles.map(role => (
            <li key={role}>
              <button
                onClick={() => handleOptimize(role)}
                className="flex w-full items-center justify-between rounded-control border border-line bg-raised px-4 py-3 text-left text-sm font-medium text-fg transition-colors hover:border-signal hover:bg-signal/10"
              >
                <span>{role}</span>
                <span className="text-xs text-signal">Tailor for this role</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      {/* print only the resume sheet */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #resume-print, #resume-print * { visibility: visible !important; }
          #resume-print { position: absolute; left: 0; top: 0; width: 100%; }
          .dashboard-shell, .dashboard-main-content { overflow: visible !important; height: auto !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}

export default function ResumeBuilderPage() {
  const { resumeData, isLoading } = useResume();

  if (isLoading) {
    return (
      <div className="page-container" aria-busy="true" aria-label="Loading resume">
        <Skeleton className="mb-3 h-9 w-64" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <Skeleton className="mb-6 h-24 rounded-panel" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-panel" />
          <Skeleton className="h-96 rounded-panel" />
        </div>
      </div>
    );
  }

  return <ResumeBuilder initial={resumeData ?? undefined} />;
}
