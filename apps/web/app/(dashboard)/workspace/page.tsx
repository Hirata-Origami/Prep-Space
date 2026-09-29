'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Braces, Database, FileText, Network, Shapes } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { LANGUAGES, type LanguageId } from '@/lib/workspace/types';
import { DIFFICULTY_CONFIG, PRACTICE_TRACKS, type DifficultyLevel, type PracticeTrack } from '@/lib/workspace/practice';
import { cn } from '@/lib/cn';

interface DocRow {
  id: string;
  title: string;
  language: LanguageId;
  preview: string;
  nodeCount: number;
  updated_at: string;
}

interface SubmissionRow {
  id: string;
  workspace_doc_id?: string | null;
  title: string;
  language: string;
  track: string;
  difficulty: DifficultyLevel;
  status: 'passed' | 'failed' | 'partial';
  score: number;
  time_complexity?: string | null;
  space_complexity?: string | null;
  created_at: string;
}

interface PracticeData {
  submissions: SubmissionRow[];
  solvedTracks?: Record<string, number>;
  stats: { total: number; solved?: number; passed: number; easy: number; medium: number; hard: number; userXp?: number };
  setupNeeded?: boolean;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TEMPLATES: { id: string; title: string; description: string; icon: typeof Database; body: { title: string; language: LanguageId; content: string } }[] = [
  {
    id: 'design',
    title: 'System design',
    description: 'Notes beside a diagram. Ask the AI to draw the architecture.',
    icon: Network,
    body: {
      title: 'System design',
      language: 'markdown',
      content: '# Requirements\n- Functional:\n- Non-functional (scale, latency, availability):\n\n# Estimates\n- Users, requests per second, storage:\n\n# API\n\n# Data model\n\n# Trade-offs\n',
    },
  },
  {
    id: 'sql',
    title: 'SQL scratchpad',
    description: 'Write queries and get them reviewed, optimised or explained.',
    icon: Database,
    body: { title: 'SQL scratchpad', language: 'sql', content: '-- Top 3 customers by revenue in the last 30 days\nSELECT c.name, SUM(o.total) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.created_at >= now() - interval \'30 days\'\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 3;\n' },
  },
  {
    id: 'code',
    title: 'Code scratchpad',
    description: 'Try an idea in any language and have the coach check it.',
    icon: Braces,
    body: { title: 'Code scratchpad', language: 'python', content: '# Merge overlapping intervals\n\ndef merge(intervals):\n    pass\n' },
  },
  {
    id: 'blank',
    title: 'Blank page',
    description: 'A free canvas for notes and sketches.',
    icon: Shapes,
    body: { title: 'Untitled', language: 'markdown', content: '' },
  },
];

const DSA_LANGUAGES = LANGUAGES.filter(l => l.id !== 'markdown' && l.id !== 'sql');
const langLabel = (id: string) => LANGUAGES.find(l => l.id === id)?.label ?? id;
const LEVEL_TONE: Record<DifficultyLevel, 'good' | 'live' | 'bad'> = { easy: 'good', medium: 'live', hard: 'bad' };
const STATUS: Record<SubmissionRow['status'], { label: string; tone: 'good' | 'live' | 'bad' }> = {
  passed: { label: 'Passed', tone: 'good' },
  partial: { label: 'Partial', tone: 'live' },
  failed: { label: 'Failed', tone: 'bad' },
};

export default function WorkspacePage() {
  const router = useRouter();
  const docs = useSWR<{ docs: DocRow[]; setupNeeded?: boolean; error?: string }>('/api/workspace', fetcher);
  const practice = useSWR<PracticeData>('/api/workspace/practice', fetcher);

  const [creating, setCreating] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [dsaLang, setDsaLang] = useState<LanguageId>('python');
  const [history, setHistory] = useState<'all' | 'passed' | 'open'>('all');

  const setupNeeded = docs.data?.setupNeeded || practice.data?.setupNeeded;
  const stats = practice.data?.stats;
  const solvedTracks = practice.data?.solvedTracks ?? {};
  const solved = stats?.solved ?? stats?.passed ?? 0;
  const recent = useMemo(() => practice.data?.submissions ?? [], [practice.data]);
  const passRate = recent.length ? Math.round((recent.filter(s => s.status === 'passed').length / recent.length) * 100) : 0;

  const submissions = useMemo(
    () => recent.filter(s => (history === 'passed' ? s.status === 'passed' : history === 'open' ? s.status !== 'passed' : true)),
    [recent, history]
  );

  const create = async (t: (typeof TEMPLATES)[number]) => {
    setCreating(t.id);
    try {
      const res = await fetch('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`/workspace/${json.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create the document');
      setCreating(null);
    }
  };

  const startProblem = async (track: PracticeTrack, difficulty: DifficultyLevel) => {
    const key = `${track.id}-${difficulty}`;
    setStarting(key);
    try {
      const language: LanguageId = track.category === 'sql' ? 'sql' : dsaLang;
      const res = await fetch('/api/workspace/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, difficulty, language }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not create a problem');
      router.push(`/workspace/${json.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not create a problem');
      setStarting(null);
    }
  };

  const sections: { title: string; tracks: PracticeTrack[] }[] = [
    { title: 'Algorithms', tracks: PRACTICE_TRACKS.filter(t => t.category === 'dsa') },
    { title: 'SQL', tracks: PRACTICE_TRACKS.filter(t => t.category === 'sql') },
  ];

  return (
    <div className="page-container">
      <PageHeader title="Workspace" description="Practise coding and SQL with an AI reviewer, and sketch system designs the AI can draw and critique." />

      {setupNeeded && (
        <Card className="mb-6 border-live/40 bg-live/5 text-sm text-fg-2">
          Some tables are missing. Open the Supabase SQL editor and run <code className="font-mono text-fg">supabase/migrations/004_practice_features.sql</code>, then reload this page.
        </Card>
      )}

      <Tabs defaultValue="practice">
        <TabsList className="mb-6">
          <TabsTrigger value="practice">Practice{solved > 0 && <span className="ml-2 rounded-full bg-signal/15 px-2 py-0.5 text-xs text-signal">{solved} solved</span>}</TabsTrigger>
          <TabsTrigger value="docs">Documents{docs.data?.docs && docs.data.docs.length > 0 && <span className="ml-2 rounded-full bg-raised px-2 py-0.5 text-xs text-fg-3">{docs.data.docs.length}</span>}</TabsTrigger>
        </TabsList>

        {/* practice */}
        <TabsContent value="practice" className="space-y-10 outline-none">
          <Card className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-line">
            <Metric label="Problems solved" value={solved} />
            <div className="sm:pl-6">
              <div className="text-[13px] text-fg-3">By level</div>
              <div className="mt-1 flex items-baseline gap-3 font-mono text-lg font-semibold">
                <span className="text-good">{stats?.easy ?? 0}<span className="ml-0.5 text-xs font-normal text-fg-3">easy</span></span>
                <span className="text-live">{stats?.medium ?? 0}<span className="ml-0.5 text-xs font-normal text-fg-3">med</span></span>
                <span className="text-bad">{stats?.hard ?? 0}<span className="ml-0.5 text-xs font-normal text-fg-3">hard</span></span>
              </div>
            </div>
            <Metric label="Recent pass rate" value={`${passRate}%`} />
            <Metric label="XP" value={stats?.userXp ?? 0} />
          </Card>

          <section aria-label="Problem tracks">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-fg">Pick a track</h2>
                <p className="mt-0.5 text-sm text-fg-3">Each click creates a fresh problem in a new document. Passing a problem for the first time earns XP by level.</p>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-fg-2">
                Language for algorithms
                <Select value={dsaLang} onChange={e => setDsaLang(e.target.value as LanguageId)} className="h-9 w-auto">
                  {DSA_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </Select>
              </label>
            </div>

            <div className="space-y-8">
              {sections.map(sec => (
                <div key={sec.title}>
                  <h3 className="mb-3 text-sm font-semibold text-fg-2">{sec.title}</h3>
                  <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
                    {sec.tracks.map(track => {
                      const done = solvedTracks[track.name] ?? 0;
                      return (
                        <li key={track.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-6">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-fg">{track.name}</h4>
                              {done > 0 && <Badge tone="good">{done} solved</Badge>}
                            </div>
                            <p className="mt-0.5 text-[13px] text-fg-3">{track.description}</p>
                            <p className="mt-1.5 text-xs text-fg-3">{track.topics.join(', ')}</p>
                          </div>
                          <div className="flex shrink-0 gap-1.5" role="group" aria-label={`Start a ${track.name} problem`}>
                            {(['easy', 'medium', 'hard'] as const).map(level => {
                              const key = `${track.id}-${level}`;
                              return (
                                <Button key={level} size="sm" variant="secondary" disabled={!!starting || setupNeeded} loading={starting === key} onClick={() => startProblem(track, level)} className="min-w-[68px]">
                                  {DIFFICULTY_CONFIG[level].label}
                                </Button>
                              );
                            })}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="History">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-fg">Recent attempts</h2>
              <div role="group" aria-label="Filter attempts" className="flex rounded-control border border-line p-0.5">
                {([['all', 'All'], ['passed', 'Passed'], ['open', 'Needs work']] as const).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={history === id} onClick={() => setHistory(id)} className={cn('rounded-[6px] px-3 py-1 text-[13px] transition-colors', history === id ? 'bg-signal text-[var(--text-on-accent)]' : 'text-fg-2 hover:text-fg')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {practice.isLoading && <Skeleton className="h-40" />}
            {!practice.isLoading && submissions.length === 0 && (
              <EmptyState title="No attempts yet" description="Start a problem above, write your solution, then press Judge in the coach panel. The verdict is recorded here." />
            )}
            {submissions.length > 0 && (
              <div className="overflow-x-auto rounded-panel border border-line bg-panel">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="border-b border-line text-fg-3">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">Problem</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Level</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Verdict</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">Time / space</th>
                      <th scope="col" className="px-3 py-2.5 font-medium">When</th>
                      <th scope="col" className="px-4 py-2.5"><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {submissions.map(s => (
                      <tr key={s.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-fg">{s.title}</div>
                          <div className="text-xs text-fg-3">{s.track}, {langLabel(s.language)}</div>
                        </td>
                        <td className="px-3 py-3"><Badge tone={LEVEL_TONE[s.difficulty] ?? 'neutral'}>{DIFFICULTY_CONFIG[s.difficulty]?.label ?? s.difficulty}</Badge></td>
                        <td className="px-3 py-3"><Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label} {s.score}</Badge></td>
                        <td className="px-3 py-3 font-mono text-xs text-fg-2">{s.time_complexity || '–'} / {s.space_complexity || '–'}</td>
                        <td className="px-3 py-3 text-fg-3">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          {s.workspace_doc_id ? <Link href={`/workspace/${s.workspace_doc_id}`} className="rounded-control px-2 py-1 text-signal hover:bg-signal/10">Open</Link> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>

        {/* documents */}
        <TabsContent value="docs" className="outline-none">
          <h2 className="mb-3 text-sm font-semibold text-fg">Start with</h2>
          <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} type="button" disabled={!!creating || setupNeeded} onClick={() => create(t)} className="rounded-panel border border-line bg-panel p-4 text-left transition-colors hover:border-line-strong disabled:opacity-60">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-signal/12 text-signal"><Icon size={17} aria-hidden /></div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-fg">{t.title}{creating === t.id && <span className="live-dot" aria-hidden />}</div>
                  <p className="mt-1 text-[13px] leading-snug text-fg-3">{t.description}</p>
                </button>
              );
            })}
          </div>

          <h2 className="mb-3 text-sm font-semibold text-fg">Your documents</h2>
          {docs.isLoading && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>}
          {docs.error && <ErrorState title="Could not load your documents" description="Check your connection and try again." onRetry={() => docs.mutate()} />}
          {docs.data && !docs.data.setupNeeded && docs.data.docs.length === 0 && (
            <EmptyState icon={<FileText size={20} aria-hidden />} title="Nothing here yet" description="Pick a starting point above. Everything saves automatically." />
          )}
          {docs.data && docs.data.docs.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs.data.docs.map(d => (
                <li key={d.id}>
                  <Link href={`/workspace/${d.id}`} className="block h-full rounded-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/50">
                    <Card className="h-full transition-colors hover:border-line-strong">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-fg">{d.title}</h3>
                        <Badge>{langLabel(d.language)}</Badge>
                      </div>
                      <p className="line-clamp-2 min-h-[2.5rem] font-mono text-xs leading-relaxed text-fg-3">{d.preview || 'Empty'}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-fg-3">
                        {d.nodeCount > 0 && <span className="inline-flex items-center gap-1"><Network size={12} aria-hidden /> {d.nodeCount} shapes</span>}
                        <span className="ml-auto">{new Date(d.updated_at).toLocaleDateString()}</span>
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 sm:pl-6 sm:first:pl-0">
      <div className="text-[13px] text-fg-3">{label}</div>
      <div className="font-mono text-[28px] font-semibold leading-tight text-fg">{value}</div>
    </div>
  );
}
