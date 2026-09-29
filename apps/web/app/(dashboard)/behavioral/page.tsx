'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Copy, MessageSquareCode, Pencil, Plus, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

interface StarStory {
  id: string;
  title: string;
  theme: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string | null;
  feedback?: string | null;
  updated_at: string;
}

interface Draft {
  id: string | null;
  title: string;
  theme: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics: string;
  feedback: string;
}

const THEMES = ['Leadership and ownership', 'Conflict and disagreement', 'Failure and learning', 'Tight deadlines', 'Ambiguity and initiative', 'Customer focus'];

const EMPTY: Draft = { id: null, title: '', theme: THEMES[0], situation: '', task: '', action: '', result: '', metrics: '', feedback: '' };

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Could not load your stories');
  return json as { stories: StarStory[]; resumeBullets: string[] };
};

const asAnswer = (s: Pick<StarStory, 'situation' | 'task' | 'action' | 'result'>) =>
  [s.situation, s.task, s.action, s.result].map(p => p?.trim()).filter(Boolean).join('\n\n');

export default function BehavioralPage() {
  const { data, error, mutate, isLoading } = useSWR('/api/behavioral', fetcher);
  const [theme, setTheme] = useState('All');
  const [editing, setEditing] = useState<Draft | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const stories = useMemo(() => data?.stories ?? [], [data]);
  const themes = useMemo(() => ['All', ...Array.from(new Set([...THEMES, ...stories.map(s => s.theme)])).filter(t => THEMES.includes(t) || stories.some(s => s.theme === t))], [stories]);
  const shown = theme === 'All' ? stories : stories.filter(s => s.theme === theme);

  const copy = (s: StarStory) => {
    navigator.clipboard.writeText(asAnswer(s));
    setCopied(s.id);
    toast.success('Copied as a spoken answer');
    setTimeout(() => setCopied(null), 1800);
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/behavioral?id=${id}`, { method: 'DELETE' });
    setDeleting(null);
    if (res.ok) {
      toast.success('Story deleted');
      mutate();
    } else toast.error('Could not delete the story');
  };

  return (
    <div className="page-container">
      <PageHeader
        title="STAR stories"
        description="Keep a handful of real stories ready. Most behavioural questions can be answered with one of them."
        action={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={15} aria-hidden /> New story</Button>}
      />

      {error && <ErrorState title="Could not load your stories" description={error.message} onRetry={() => mutate()} />}
      {isLoading && <div className="grid gap-4 md:grid-cols-2">{[0, 1].map(i => <Skeleton key={i} className="h-56" />)}</div>}

      {data && stories.length === 0 && (
        <EmptyState
          icon={<MessageSquareCode size={20} aria-hidden />}
          title="No stories yet"
          description="Write down one thing you are proud of, even roughly. The AI can shape it into Situation, Task, Action and Result without adding anything you did not say."
          action={<Button onClick={() => setEditing({ ...EMPTY })}><Plus size={15} aria-hidden /> Write your first story</Button>}
        />
      )}

      {stories.length > 0 && (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by theme">
            {themes.map(t => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
                className={cn('rounded-full border px-3 py-1 text-[13px] transition-colors', theme === t ? 'border-signal bg-signal/12 text-fg' : 'border-line text-fg-2 hover:border-line-strong hover:text-fg')}
              >
                {t}
              </button>
            ))}
          </div>

          <ul className="grid gap-4 lg:grid-cols-2">
            {shown.map(s => (
              <li key={s.id}>
                <Card className="flex h-full flex-col">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold text-fg">{s.title}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge>{s.theme}</Badge>
                        {s.metrics && <Badge tone="good">{s.metrics}</Badge>}
                      </div>
                    </div>
                  </div>

                  <dl className="flex-1 space-y-2.5 text-[13px] leading-relaxed">
                    {([['Situation', s.situation], ['Task', s.task], ['Action', s.action], ['Result', s.result]] as const).filter(([, v]) => v?.trim()).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[72px_1fr] gap-3">
                        <dt className="pt-px text-fg-3">{k}</dt>
                        <dd className="line-clamp-4 whitespace-pre-line text-fg-2">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-line pt-3">
                    <Button size="sm" variant="ghost" onClick={() => copy(s)}>
                      {copied === s.id ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} Copy answer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing({ id: s.id, title: s.title, theme: s.theme, situation: s.situation, task: s.task, action: s.action, result: s.result, metrics: s.metrics ?? '', feedback: s.feedback ?? '' })}>
                      <Pencil size={14} aria-hidden /> Edit
                    </Button>
                    <span className="ml-auto flex items-center gap-1.5">
                      {deleting === s.id ? (
                        <>
                          <Button size="sm" variant="danger" onClick={() => remove(s.id)}>Delete</Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>Keep</Button>
                        </>
                      ) : (
                        <Button size="icon" variant="ghost" aria-label={`Delete ${s.title}`} onClick={() => setDeleting(s.id)}><Trash2 size={15} aria-hidden /></Button>
                      )}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <StoryEditor
          key={editing.id ?? 'new'}
          initial={editing}
          bullets={data?.resumeBullets ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); mutate(); }}
        />
      )}
    </div>
  );
}

function StoryEditor({ initial, bullets, onClose, onSaved }: { initial: Draft; bullets: string[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [bullet, setBullet] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [before, setBefore] = useState<Draft | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }));

  const notes = [d.situation && `Situation: ${d.situation}`, d.task && `Task: ${d.task}`, d.action && `Action: ${d.action}`, d.result && `Result: ${d.result}`, d.metrics && `Metrics: ${d.metrics}`].filter(Boolean).join('\n');

  const polish = async () => {
    if (!notes.trim() && !bullet) {
      toast.error('Write a few notes first, or pick a resume bullet to start from.');
      return;
    }
    setPolishing(true);
    try {
      const res = await fetch('/api/behavioral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'polish', rawInput: notes || bullet, theme: d.theme, resumeBullet: bullet }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const p = json.polished as Partial<Draft> & { score?: number };
      setBefore(d);
      setD(prev => ({
        ...prev,
        title: prev.title || p.title || '',
        situation: p.situation ?? prev.situation,
        task: p.task ?? prev.task,
        action: p.action ?? prev.action,
        result: p.result ?? prev.result,
        metrics: p.metrics ?? prev.metrics,
        feedback: p.feedback ?? prev.feedback,
      }));
      setScore(typeof p.score === 'number' ? p.score : null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'The rewrite failed');
    } finally {
      setPolishing(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/behavioral', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'save', ...d }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Story saved');
      onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save the story');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={o => !o && onClose()}
      title={initial.id ? 'Edit story' : 'New story'}
      description="Rough notes are fine. Use the AI to tidy the structure; it only works from what you wrote."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!d.title.trim() || !d.situation.trim() || !d.action.trim()}>Save story</Button>
        </>
      }
    >
      <div className="space-y-4">
        {bullets.length > 0 && (
          <Field label="Start from a resume bullet" hint="Optional. The AI keeps its facts and asks you for anything missing.">
            {a => (
              <Select {...a} value={bullet} onChange={e => { setBullet(e.target.value); if (e.target.value && !d.action) set('action', e.target.value); }}>
                <option value="">None</option>
                {bullets.map(b => <option key={b} value={b}>{b.length > 90 ? `${b.slice(0, 90)}…` : b}</option>)}
              </Select>
            )}
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <Field label="Title">{a => <Input {...a} value={d.title} onChange={e => set('title', e.target.value)} placeholder="Cut checkout latency by half" />}</Field>
          <Field label="Theme">
            {a => (
              <Select {...a} value={d.theme} onChange={e => set('theme', e.target.value)}>
                {Array.from(new Set([...THEMES, d.theme])).map(t => <option key={t}>{t}</option>)}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Situation" hint="Where and when, and what was at stake.">{a => <Textarea {...a} rows={2} value={d.situation} onChange={e => set('situation', e.target.value)} />}</Field>
        <Field label="Task" hint="What you were responsible for.">{a => <Textarea {...a} rows={2} value={d.task} onChange={e => set('task', e.target.value)} />}</Field>
        <Field label="Action" hint="What you did. Say I, not we.">{a => <Textarea {...a} rows={4} value={d.action} onChange={e => set('action', e.target.value)} />}</Field>
        <Field label="Result">{a => <Textarea {...a} rows={2} value={d.result} onChange={e => set('result', e.target.value)} />}</Field>
        <Field label="Numbers" hint="Only real figures, such as 40% faster or 3 engineers.">{a => <Input {...a} value={d.metrics} onChange={e => set('metrics', e.target.value)} />}</Field>

        <div className="flex flex-wrap items-center gap-2 rounded-panel border border-line bg-raised p-3">
          <Button variant="secondary" size="sm" onClick={polish} loading={polishing}><Sparkles size={14} aria-hidden /> Tidy with AI</Button>
          {before && <Button variant="ghost" size="sm" onClick={() => { setD(before); setBefore(null); setScore(null); }}><Undo2 size={14} aria-hidden /> Undo rewrite</Button>}
          {score !== null && <Badge tone={score >= 80 ? 'good' : score >= 60 ? 'live' : 'bad'}>Strength {score}/100</Badge>}
        </div>
        {d.feedback && (
          <div className="rounded-panel border border-signal/20 bg-signal/5 p-3.5">
            <div className="mb-1 text-xs font-medium text-signal">Coach notes</div>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-fg-2">{d.feedback}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
