'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';
import { ArrowLeft, Clock, FileText, KeyRound, PenLine, Sparkles, Target, Upload, type LucideIcon } from 'lucide-react';
import { Badge, Button, ButtonLink, Card, Field, Input, PageHeader, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

type Mode = 'generate' | 'jd' | 'custom';

interface GeneratedModule {
  id?: string;
  title: string;
  description?: string;
  estimated_hours?: number;
  coverage_note?: string;
  interview_topics?: string[];
  skills?: string[];
}

interface GeneratedRoadmap {
  title: string;
  description?: string;
  modules?: GeneratedModule[];
}

const MODES: { id: Mode; icon: LucideIcon; label: string; desc: string }[] = [
  { id: 'generate', icon: Target, label: 'By role', desc: 'Pick a role name' },
  { id: 'jd', icon: FileText, label: 'From a job description', desc: 'Paste or upload a posting' },
  { id: 'custom', icon: PenLine, label: 'Manual', desc: 'Build it yourself' },
];

const ROLE_SUGGESTIONS = ['Frontend Engineer', 'ML Engineer', 'Product Manager', 'Backend Engineer', 'Data Scientist', 'DevOps Engineer', 'Systems Engineer', 'Mobile Engineer'];

export default function NewRoadmapPage() {
  const router = useRouter();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>('generate');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<GeneratedRoadmap | null>(null);

  // Post-generate refinement state
  const [refineComments, setRefineComments] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [showRefine, setShowRefine] = useState(false);
  const [refining, setRefining] = useState(false);

  const handleGenerate = async () => {
    if (!user?.has_gemini_key && !process.env.NEXT_PUBLIC_HAS_GLOBAL_KEY) {
      toast.error('Please add your Gemini API key in Settings first');
      router.push('/settings');
      return;
    }
    setLoading(true);
    setSelectedModuleIds([]);
    setRefineComments('');
    setShowRefine(false);
    try {
      const res = await fetch('/api/roadmaps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: mode === 'generate' ? role : undefined,
          jobDescription: mode === 'jd' ? jd : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedRoadmap(data.roadmap);
      toast.success(`Roadmap with ${data.roadmap.modules?.length || 0} modules generated`);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineComments.trim()) {
      toast.error('Please add comments about what to update');
      return;
    }
    setRefining(true);
    try {
      const res = await fetch('/api/roadmaps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: mode === 'generate' ? role : undefined,
          jobDescription: mode === 'jd' ? jd : undefined,
          refine: true,
          comments: refineComments,
          selected_module_ids: selectedModuleIds,
          current_roadmap: generatedRoadmap,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refinement failed');
      setGeneratedRoadmap(data.roadmap);
      setShowRefine(false);
      setRefineComments('');
      setSelectedModuleIds([]);
      toast.success('Roadmap refined');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setRefining(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/roadmaps/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parsing failed');
      setJd(data.text);
      toast.success('Job description extracted');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!generatedRoadmap) return;
    setSaving(true);
    try {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedRoadmap),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      // Mutate the roadmaps cache to ensure the new roadmap shows up instantly
      const { mutate } = await import('swr');
      mutate('/api/roadmaps');

      toast.success('Roadmap saved');
      router.push('/roadmap');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (index: number) => {
    const key = index.toString();
    setSelectedModuleIds(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };

  if (generatedRoadmap) {
    return (
      <div className="page-container" style={{ maxWidth: 880 }}>
        <PageHeader
          title="Review your roadmap"
          description={`${generatedRoadmap.modules?.length || 0} modules. Refine anything that is off, then save.`}
          action={
            <>
              <Button variant="ghost" onClick={() => setGeneratedRoadmap(null)}><ArrowLeft size={15} aria-hidden /> Start over</Button>
              <Button variant="secondary" onClick={() => setShowRefine(v => !v)} aria-expanded={showRefine}>Refine</Button>
              <Button onClick={handleSave} loading={saving}>{saving ? 'Saving…' : 'Save roadmap'}</Button>
            </>
          }
        />

        {showRefine && (
          <Card className="mb-6 space-y-4 border-signal/30">
            <div>
              <h2 className="text-base font-semibold text-fg">Refine this roadmap</h2>
              <p className="mt-1 text-[13px] text-fg-3">Pick modules to change, or leave all unselected to change the whole roadmap. Then say what should be different.</p>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Modules to change">
              {(generatedRoadmap.modules || []).map((m, i) => {
                const on = selectedModuleIds.includes(i.toString());
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleModule(i)}
                    className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', on ? 'border-signal bg-signal/15 text-signal' : 'border-line bg-raised text-fg-2 hover:border-line-strong')}
                  >
                    {i + 1}. {m.title.length > 24 ? `${m.title.slice(0, 24)}…` : m.title}
                  </button>
                );
              })}
            </div>
            <Field label="What should change?">
              {a => <Textarea {...a} rows={4} value={refineComments} onChange={e => setRefineComments(e.target.value)} placeholder="Add more depth to system design, include Kubernetes and distributed caching. For DSA, focus on graph traversal." />}
            </Field>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setShowRefine(false); setRefineComments(''); setSelectedModuleIds([]); }}>Cancel</Button>
              <Button onClick={handleRefine} loading={refining} disabled={!refineComments.trim()}>{refining ? 'Refining…' : 'Apply refinement'}</Button>
            </div>
          </Card>
        )}

        <Card className="mb-5">
          <h2 className="font-display text-xl font-semibold text-fg">{generatedRoadmap.title}</h2>
          {generatedRoadmap.description && <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{generatedRoadmap.description}</p>}
        </Card>

        <ol className="space-y-3">
          {(generatedRoadmap.modules ?? []).map((m, i) => (
            <li key={i}>
              <Card className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border border-line-strong font-mono text-[13px] text-fg-2" aria-hidden>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-fg">{m.title}</h3>
                  {m.description && <p className="mt-1 text-[13px] leading-relaxed text-fg-2">{m.description}</p>}
                  {(m.interview_topics?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.interview_topics?.slice(0, 5).map((t: string) => <Badge key={t} tone="violet">{t}</Badge>)}
                      {(m.interview_topics?.length ?? 0) > 5 && <Badge>+{(m.interview_topics?.length ?? 0) - 5}</Badge>}
                    </div>
                  )}
                  {(m.skills?.length ?? 0) > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.skills?.map((s: string) => <Badge key={s} tone="signal">{s}</Badge>)}
                    </div>
                  )}
                  {(m.estimated_hours || m.coverage_note) && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-3">
                      {m.estimated_hours && <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden /> About {m.estimated_hours} hours</span>}
                      {m.coverage_note && <span>{m.coverage_note}</span>}
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowRefine(true)}>Refine roadmap</Button>
          <Button size="lg" onClick={handleSave} loading={saving}>{saving ? 'Saving…' : 'Save roadmap'}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      <Link href="/roadmap" className="mb-5 inline-flex items-center gap-1.5 rounded-control text-sm text-fg-3 transition-colors hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> Roadmaps
      </Link>
      <PageHeader title="Create a roadmap" description="AI builds a study plan with 16 to 20 modules, tuned to a role or a specific job posting." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="How to start">
        {MODES.map(({ id, icon: Icon, label, desc }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(id)}
              className={cn('rounded-panel border p-4 text-left transition-colors', active ? 'border-signal bg-signal/10' : 'border-line bg-panel hover:border-line-strong hover:bg-raised')}
            >
              <Icon size={20} aria-hidden className={cn('mb-2', active ? 'text-signal' : 'text-fg-2')} />
              <div className={cn('text-sm font-semibold', active ? 'text-signal' : 'text-fg')}>{label}</div>
              <div className="text-xs text-fg-3">{desc}</div>
            </button>
          );
        })}
      </div>

      <Card className="space-y-5 p-5 sm:p-6">
        {mode === 'generate' && (
          <>
            <Field label="Target role">
              {a => <Input {...a} value={role} onChange={e => setRole(e.target.value)} placeholder="Senior Frontend Engineer at Google" />}
            </Field>
            <div className="flex flex-wrap gap-1.5" aria-label="Suggested roles">
              {ROLE_SUGGESTIONS.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors', role === r ? 'border-signal bg-signal/10 text-signal' : 'border-line bg-raised text-fg-2 hover:border-line-strong')}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'jd' && (
          <>
            <label className={cn('flex cursor-pointer flex-col items-center justify-center gap-1 rounded-panel border border-dashed border-line-strong bg-raised px-4 py-6 text-center transition-colors hover:border-signal', parsing && 'pointer-events-none opacity-60')}>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="sr-only" disabled={parsing} />
              <Upload size={20} className="text-fg-2" aria-hidden />
              <span className="text-sm font-semibold text-fg">{parsing ? 'Reading the file…' : 'Upload a job description'}</span>
              <span className="text-xs text-fg-3">PDF, DOCX or TXT. Or paste it below.</span>
            </label>
            <Field label="Job description">
              {a => <Textarea {...a} rows={8} value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full posting." />}
            </Field>
          </>
        )}

        {mode === 'custom' && (
          <div className="py-6 text-center">
            <PenLine size={28} aria-hidden className="mx-auto mb-3 text-fg-3" />
            <div className="text-sm font-semibold text-fg">The manual builder is not available yet</div>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-fg-3">Generate a roadmap with one of the other options, then edit it with Refine.</p>
          </div>
        )}

        {mode !== 'custom' && (
          <>
            <p className="rounded-control border border-line bg-raised px-3.5 py-2.5 text-[13px] text-fg-2">
              Generates 16 to 20 modules covering the knowledge most interviews for this role draw on.
            </p>
            <Button size="lg" className="w-full" onClick={handleGenerate} loading={loading} disabled={(mode === 'generate' && !role) || (mode === 'jd' && !jd)}>
              {!loading && <Sparkles size={16} aria-hidden />}
              {loading ? 'Generating modules…' : 'Generate roadmap'}
            </Button>
          </>
        )}
      </Card>

      {!user?.has_gemini_key && (
        <div className="mt-4 flex items-start gap-3 rounded-panel border border-live/30 bg-live/10 p-4 text-[13px] text-fg-2">
          <KeyRound size={16} aria-hidden className="mt-0.5 shrink-0 text-live" />
          <span>You need a Gemini API key to generate roadmaps. <ButtonLink href="/settings" variant="ghost" size="sm" className="ml-1 h-7 px-2">Add one in Settings</ButtonLink></span>
        </div>
      )}
    </div>
  );
}
