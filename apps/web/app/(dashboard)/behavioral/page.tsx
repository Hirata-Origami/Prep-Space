'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Award,
  Check,
  Copy,
  FileText,
  MessageSquare,
  MessageSquareCode,
  PenTool,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

interface StarStory {
  id: string;
  title: string;
  theme: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string;
  feedback?: string;
  updated_at: string;
}

const THEMES = [
  'All',
  'Leadership & Ownership',
  'Conflict & Disagreement',
  'Failure & Post-Mortem',
  'Tight Deadlines',
  'Ambiguity & Innovation',
  'Customer Obsession',
];

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BehavioralPage() {
  const { data, mutate, isLoading } = useSWR<{ stories: StarStory[]; resumeBullets: string[] }>('/api/behavioral', fetcher);
  const [selectedTheme, setSelectedTheme] = useState('All');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState(THEMES[1]);
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [metrics, setMetrics] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);

  const [polishing, setPolishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    setTitle('');
    setTheme(THEMES[1]);
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
    setMetrics('');
    setFeedback('');
    setScore(null);
    setIsEditing(true);
  };

  const openEdit = (s: StarStory) => {
    setEditingId(s.id);
    setTitle(s.title);
    setTheme(s.theme);
    setSituation(s.situation);
    setTask(s.task);
    setAction(s.action);
    setResult(s.result);
    setMetrics(s.metrics || '');
    setFeedback(s.feedback || '');
    setScore(null);
    setIsEditing(true);
  };

  const handlePolish = async () => {
    const raw = `Situation: ${situation}\nTask: ${task}\nAction: ${action}\nResult: ${result}\nMetrics: ${metrics}`;
    if (!raw.trim()) {
      toast.error('Write some story notes first to polish');
      return;
    }

    setPolishing(true);
    try {
      const res = await fetch('/api/behavioral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'polish',
          rawInput: raw,
          theme,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const p = json.polished;
      if (p.title && !title) setTitle(p.title);
      if (p.situation) setSituation(p.situation);
      if (p.task) setTask(p.task);
      if (p.action) setAction(p.action);
      if (p.result) setResult(p.result);
      if (p.metrics) setMetrics(p.metrics);
      if (p.feedback) setFeedback(p.feedback);
      if (p.score) setScore(p.score);

      toast.success('STAR story polished & rated!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Polish failed');
    } finally {
      setPolishing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !situation.trim() || !action.trim()) {
      toast.error('Title, Situation, and Action are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/behavioral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'save',
          id: editingId || undefined,
          title,
          theme,
          situation,
          task,
          action,
          result,
          metrics,
          feedback,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(editingId ? 'Story updated' : 'Story saved to bank');
      setIsEditing(false);
      mutate();
    } catch {
      toast.error('Could not save story');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this story?')) return;
    try {
      const res = await fetch(`/api/behavioral?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Story deleted');
        mutate();
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const copyStory = (s: StarStory) => {
    const text = `**${s.title}** (${s.theme})

*Situation:* ${s.situation}
*Task:* ${s.task}
*Action:* ${s.action}
*Result:* ${s.result}${s.metrics ? `\n*Impact:* ${s.metrics}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedId(s.id);
    toast.success('Story copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stories = data?.stories ?? [];
  const filteredStories = stories.filter(s => selectedTheme === 'All' || s.theme === selectedTheme);

  return (
    <div className="page-container space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="STAR Behavioural Story Bank"
          description="Craft, polish, and store high-scoring Situation-Task-Action-Result responses tied to your resume bullets for leadership and behavioral rounds."
        />
        <Button onClick={openNew} className="flex items-center gap-1.5">
          <Plus size={16} /> New Story
        </Button>
      </div>

      {/* Theme Filters */}
      <div className="flex flex-wrap gap-1.5 border-b border-line pb-4">
        {THEMES.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedTheme(t)}
            className={cn(
              'rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors',
              selectedTheme === t
                ? 'bg-signal text-[var(--text-on-accent)]'
                : 'text-fg-2 hover:bg-raised hover:text-fg'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Editor Modal / Section */}
      {isEditing && (
        <Card className="border-signal/30 p-6 space-y-5 bg-panel shadow-lg">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="text-base font-semibold text-fg">
              {editingId ? 'Edit STAR Story' : 'Build a New STAR Story'}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={polishing}
                onClick={handlePolish}
                className="flex items-center gap-1.5 text-signal"
              >
                <Sparkles size={14} />
                {polishing ? 'Scoring & Enhancing…' : 'AI Bar-Raiser Polish'}
              </Button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-fg-3 hover:text-fg"
              >
                ✕
              </button>
            </div>
          </div>

          {score && (
            <div className="flex items-center justify-between rounded-control border border-signal/20 bg-signal/5 p-3 text-xs">
              <div className="flex items-center gap-2 text-signal font-semibold">
                <Award size={16} /> FAANG Bar Score: {score}/100
              </div>
              {metrics && <span className="font-mono text-fg-2">Metrics: {metrics}</span>}
            </div>
          )}

          {data?.resumeBullets && data.resumeBullets.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-3">
                Quick-import from your Resume:
              </label>
              <select
                onChange={e => {
                  if (e.target.value) {
                    setSituation(`While working on this project: ${e.target.value}`);
                    setAction(`Led the implementation by...`);
                  }
                }}
                className="w-full rounded-control border border-line bg-raised/50 p-2 text-xs text-fg-2 outline-none"
              >
                <option value="">-- Choose a bullet point to expand into STAR --</option>
                {data.resumeBullets.map((b, idx) => (
                  <option key={idx} value={b}>
                    {b.slice(0, 90)}...
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-fg-2">Story Title</label>
                <input
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Migrating payments to event-driven ledger"
                  className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-fg-2">Behavioral Theme</label>
                <select
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
                >
                  {THEMES.filter(t => t !== 'All').map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-fg-2">
                <span className="font-bold text-signal">S</span>ituation (Context & Scale)
              </label>
              <textarea
                required
                rows={2}
                value={situation}
                onChange={e => setSituation(e.target.value)}
                placeholder="What was the business context, company scale, and challenge at hand?"
                className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-fg-2">
                <span className="font-bold text-signal">T</span>ask (Your Specific Ownership)
              </label>
              <textarea
                rows={2}
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="What was your direct responsibility? What constraints or risks existed?"
                className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
              />
            </div>

            <div>
              <label className="mb-1 block font-medium text-fg-2">
                <span className="font-bold text-signal">A</span>ction (Decisions & Leadership — emphasize &quot;I&quot;)
              </label>
              <textarea
                required
                rows={3}
                value={action}
                onChange={e => setAction(e.target.value)}
                placeholder="Detailed steps you took, technical trade-offs resolved, and pushback handled."
                className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-fg-2">
                  <span className="font-bold text-signal">R</span>esult (Measurable Business Impact)
                </label>
                <textarea
                  rows={2}
                  value={result}
                  onChange={e => setResult(e.target.value)}
                  placeholder="What was the concrete outcome? Customer impact, time saved?"
                  className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-fg-2">Quantifiable Metrics</label>
                <input
                  value={metrics}
                  onChange={e => setMetrics(e.target.value)}
                  placeholder="e.g. 99.99% uptime, -40% p99 latency, $120k cost savings"
                  className="w-full rounded-control border border-line bg-panel p-2.5 text-fg outline-none focus:border-signal"
                />
              </div>
            </div>

            {feedback && (
              <div className="rounded-control border border-line bg-raised/40 p-3 text-xs text-fg-2">
                <div className="mb-1 font-semibold text-signal">Coach Feedback & Delivery Tip:</div>
                <p className="leading-relaxed">{feedback}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Save Story
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Story Cards List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map(i => <Skeleton key={i} className="h-44" />)}</div>
      ) : filteredStories.length === 0 ? (
        <EmptyState
          icon={<MessageSquareCode size={24} className="text-signal" />}
          title="No stories in this theme yet"
          description="Draft high-impact STAR answers to nail leadership and behavioral questions."
          action={
            <Button onClick={openNew} className="gap-1.5">
              <Plus size={15} /> Build First Story
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredStories.map(s => (
            <Card key={s.id} className="flex flex-col justify-between p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-fg">{s.title}</h3>
                    <Badge className="mt-1">{s.theme}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyStory(s)}
                      aria-label="Copy story"
                    >
                      {copiedId === s.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(s)}
                      aria-label="Edit story"
                    >
                      <PenTool size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(s.id)}
                      aria-label="Delete story"
                      className="text-fg-3 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-xs leading-relaxed">
                  <div>
                    <span className="font-semibold text-signal">Situation: </span>
                    <span className="text-fg-2">{s.situation}</span>
                  </div>
                  {s.task && (
                    <div>
                      <span className="font-semibold text-fg-3">Task: </span>
                      <span className="text-fg-2">{s.task}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-signal">Action: </span>
                    <span className="text-fg-2">{s.action}</span>
                  </div>
                  {s.result && (
                    <div>
                      <span className="font-semibold text-emerald-400">Result: </span>
                      <span className="text-fg-2">{s.result}</span>
                    </div>
                  )}
                </div>
              </div>

              {s.metrics && (
                <div className="border-t border-line/60 pt-2.5 flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <Target size={13} /> {s.metrics}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
