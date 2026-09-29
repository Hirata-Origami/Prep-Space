'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  Award,
  Braces,
  CheckCircle2,
  Database,
  FileText,
  Network,
  Scale,
  Shapes,
  Sparkles,
  TrendingUp,
  XCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { LANGUAGES, type LanguageId } from '@/lib/workspace/types';
import {
  PRACTICE_TRACKS,
  DIFFICULTY_CONFIG,
  type DifficultyLevel,
  type PracticeTrack,
} from '@/lib/workspace/practice';
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
  workspace_doc_id?: string;
  title: string;
  language: string;
  track: string;
  difficulty: DifficultyLevel;
  status: 'passed' | 'failed' | 'partial';
  score: number;
  time_complexity?: string;
  space_complexity?: string;
  created_at: string;
}

interface PracticeStats {
  total: number;
  passed: number;
  easy: number;
  medium: number;
  hard: number;
  userXp: number;
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
    title: 'SQL practice',
    description: 'Write queries and get them reviewed, optimised or explained.',
    icon: Database,
    body: { title: 'SQL practice', language: 'sql', content: '-- Top 3 customers by revenue in the last 30 days\nSELECT c.name, SUM(o.total) AS revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.created_at >= now() - interval \'30 days\'\nGROUP BY c.name\nORDER BY revenue DESC\nLIMIT 3;\n' },
  },
  {
    id: 'code',
    title: 'Coding problem',
    description: 'Paste a problem, solve it, and have the coach check it.',
    icon: Braces,
    body: { title: 'Coding problem', language: 'python', content: '# Problem: given a list of intervals, merge all overlapping ones.\n\ndef merge(intervals):\n    pass\n' },
  },
  {
    id: 'blank',
    title: 'Blank page',
    description: 'A free canvas for notes and sketches.',
    icon: Shapes,
    body: { title: 'Untitled', language: 'markdown', content: '' },
  },
];

const langLabel = (id: string) => LANGUAGES.find(l => l.id === id)?.label ?? id;

export default function WorkspacePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'docs' | 'practice'>('docs');
  const [trackCategory, setTrackCategory] = useState<'all' | 'dsa' | 'sql'>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [startingProblem, setStartingProblem] = useState<string | null>(null);

  const { data: docsData, error: docsError, isLoading: docsLoading } = useSWR<{ docs: DocRow[]; setupNeeded?: boolean; error?: string }>('/api/workspace', fetcher);
  const { data: practiceData, isLoading: practiceLoading } = useSWR<{ submissions: SubmissionRow[]; stats: PracticeStats }>('/api/workspace/practice', fetcher);

  const [creating, setCreating] = useState<string | null>(null);

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

  const startTrackProblem = async (track: PracticeTrack, difficulty: DifficultyLevel) => {
    const key = `${track.id}-${difficulty}`;
    setStartingProblem(key);
    try {
      const res = await fetch('/api/workspace/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          difficulty,
          language: track.recommendedLanguages[0],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate problem');
      toast.success(`Generated ${track.name} (${difficulty})!`);
      router.push(`/workspace/${json.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not generate problem');
      setStartingProblem(null);
    }
  };

  const filteredTracks = PRACTICE_TRACKS.filter(t => trackCategory === 'all' || t.category === trackCategory);
  const submissions = practiceData?.submissions ?? [];
  const filteredSubmissions = submissions.filter(s => {
    if (historyFilter === 'passed') return s.status === 'passed';
    if (historyFilter === 'failed') return s.status === 'failed' || s.status === 'partial';
    return true;
  });

  const stats = practiceData?.stats;
  const passRate = stats && stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Workspace & Practice"
        description="Solve interview problems with an AI judge, draft algorithms and SQL queries, and sketch architectures."
      />

      {docsData?.setupNeeded && (
        <Card className="mb-6 border-live/40 bg-live/5 text-sm text-fg-2">
          The workspace table does not exist yet. Open the Supabase SQL editor and run <code className="font-mono text-fg">supabase/migrations/003_workspace.sql</code> and <code className="font-mono text-fg">004_coding_practice.sql</code>, then reload this page.
        </Card>
      )}

      {/* Tabs */}
      <div className="mb-6 flex border-b border-line">
        <button
          type="button"
          onClick={() => setTab('docs')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
            tab === 'docs' ? 'border-signal text-fg' : 'border-transparent text-fg-3 hover:text-fg'
          )}
        >
          <FileText size={16} />
          Documents & Canvases
          {docsData?.docs && <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-fg-3">{docsData.docs.length}</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab('practice')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
            tab === 'practice' ? 'border-signal text-fg' : 'border-transparent text-fg-3 hover:text-fg'
          )}
        >
          <Scale size={16} />
          Coding Tracks & AI Judge
          {stats && stats.passed > 0 && (
            <span className="rounded-full bg-signal/15 px-2 py-0.5 text-xs font-semibold text-signal">
              {stats.passed} solved
            </span>
          )}
        </button>
      </div>

      {tab === 'docs' ? (
        <>
          <h2 className="mb-3 text-sm font-semibold text-fg">Start with</h2>
          <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={!!creating || docsData?.setupNeeded}
                  onClick={() => create(t)}
                  className="group rounded-panel border border-line bg-panel p-4 text-left transition-colors hover:border-line-strong disabled:opacity-60"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-control bg-signal/12 text-signal">
                    <Icon size={17} aria-hidden />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                    {t.title}
                    {creating === t.id && <span className="live-dot" aria-hidden />}
                  </div>
                  <p className="mt-1 text-[13px] leading-snug text-fg-3">{t.description}</p>
                </button>
              );
            })}
          </div>

          <h2 className="mb-3 text-sm font-semibold text-fg">Your documents</h2>
          {docsLoading && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>}
          {docsError && <ErrorState title="Could not load your documents" description="Check your connection and try again." />}
          {docsData && !docsData.setupNeeded && docsData.docs.length === 0 && (
            <EmptyState icon={<FileText size={20} aria-hidden />} title="Nothing here yet" description="Pick a starting point above, or explore Coding Tracks to practice." />
          )}
          {docsData && docsData.docs.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docsData.docs.map(d => (
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
        </>
      ) : (
        <div className="space-y-8">
          {/* Practice Stats Overview */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{stats?.passed ?? 0}</div>
                <div className="text-xs text-fg-3">Problems Solved</div>
              </div>
            </Card>

            <Card className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-signal/10 text-signal">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{passRate}%</div>
                <div className="text-xs text-fg-3">Judge Pass Rate</div>
              </div>
            </Card>

            <Card className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-amber-500/10 text-amber-400">
                <Award size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-fg-2">
                  <span className="font-semibold text-emerald-400">{stats?.easy ?? 0}E</span> •
                  <span className="font-semibold text-amber-400">{stats?.medium ?? 0}M</span> •
                  <span className="font-semibold text-rose-400">{stats?.hard ?? 0}H</span>
                </div>
                <div className="mt-1 text-xs text-fg-3">Difficulty Breakdown</div>
              </div>
            </Card>

            <Card className="flex items-center gap-3.5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-purple-500/10 text-purple-400">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{stats?.userXp ?? 0} XP</div>
                <div className="text-xs text-fg-3">Total Earned XP</div>
              </div>
            </Card>
          </div>

          {/* Difficulty Tracks Section */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-fg">Interview Difficulty Tracks</h2>
                <p className="text-xs text-fg-3">Pick a track and launch a fresh problem directly into the workspace.</p>
              </div>

              <div role="group" aria-label="Track category" className="flex rounded-control border border-line p-0.5">
                {(['all', 'dsa', 'sql'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTrackCategory(cat)}
                    className={cn(
                      'rounded-[6px] px-3 py-1 text-xs font-medium transition-colors',
                      trackCategory === cat ? 'bg-signal text-[var(--text-on-accent)]' : 'text-fg-2 hover:text-fg'
                    )}
                  >
                    {cat === 'all' ? 'All Tracks' : cat === 'dsa' ? 'Algorithms (DSA)' : 'SQL Analytics'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTracks.map(track => {
                const Icon = track.category === 'sql' ? Database : Braces;
                return (
                  <Card key={track.id} className="flex flex-col justify-between p-4 transition-colors hover:border-line-strong">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-control bg-raised text-signal">
                            <Icon size={14} />
                          </div>
                          <h3 className="text-sm font-semibold text-fg">{track.name}</h3>
                        </div>
                        <Badge>{track.category.toUpperCase()}</Badge>
                      </div>

                      <p className="text-xs leading-relaxed text-fg-3">{track.description}</p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {track.topics.slice(0, 3).map(topic => (
                          <span key={topic} className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-fg-2">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-line/60 pt-3">
                      <div className="mb-1.5 text-[11px] font-medium text-fg-3">Practice level:</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['easy', 'medium', 'hard'] as const).map(diff => {
                          const conf = DIFFICULTY_CONFIG[diff];
                          const key = `${track.id}-${diff}`;
                          const isSpinning = startingProblem === key;
                          return (
                            <button
                              key={diff}
                              type="button"
                              disabled={!!startingProblem}
                              onClick={() => startTrackProblem(track, diff)}
                              className={cn(
                                'rounded-control border px-2 py-1 text-center text-xs font-medium transition-all hover:scale-[1.02] disabled:opacity-50',
                                conf.badgeColor
                              )}
                            >
                              {isSpinning ? '...' : conf.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Solved Problems History */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-fg">Solved Problems & History</h2>
                <p className="text-xs text-fg-3">Review past solutions, judge feedback, and time complexity evaluations.</p>
              </div>

              <div role="group" aria-label="History filter" className="flex rounded-control border border-line p-0.5">
                {(['all', 'passed', 'failed'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setHistoryFilter(f)}
                    className={cn(
                      'rounded-[6px] px-2.5 py-1 text-xs font-medium transition-colors',
                      historyFilter === f ? 'bg-signal text-[var(--text-on-accent)]' : 'text-fg-2 hover:text-fg'
                    )}
                  >
                    {f === 'all' ? 'All' : f === 'passed' ? 'Passed' : 'Needs Work'}
                  </button>
                ))}
              </div>
            </div>

            {practiceLoading && <Skeleton className="h-40" />}

            {!practiceLoading && filteredSubmissions.length === 0 && (
              <EmptyState
                icon={<Award size={20} aria-hidden />}
                title="No submission history yet"
                description="Pick a track above, write your solution in the workspace, and run AI Judge to test and record your solution!"
              />
            )}

            {!practiceLoading && filteredSubmissions.length > 0 && (
              <div className="overflow-hidden rounded-panel border border-line bg-panel">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-raised/40 text-fg-3">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Problem / Track</th>
                      <th className="px-3 py-2.5 font-medium">Difficulty</th>
                      <th className="px-3 py-2.5 font-medium">Verdict</th>
                      <th className="px-3 py-2.5 font-medium">Complexity</th>
                      <th className="px-3 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredSubmissions.map(sub => {
                      const diffConf = DIFFICULTY_CONFIG[sub.difficulty] ?? DIFFICULTY_CONFIG.medium;
                      const isPassed = sub.status === 'passed';
                      const isPartial = sub.status === 'partial';

                      return (
                        <tr key={sub.id} className="transition-colors hover:bg-raised/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-fg">{sub.title}</div>
                            <div className="text-[11px] text-fg-3">{sub.track} • {langLabel(sub.language)}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold border', diffConf.badgeColor)}>
                              {diffConf.label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border',
                                isPassed
                                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                  : isPartial
                                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                              )}
                            >
                              {isPassed ? <CheckCircle2 size={12} /> : isPartial ? <AlertCircle size={12} /> : <XCircle size={12} />}
                              {isPassed ? 'Passed' : isPartial ? 'Partial' : 'Failed'} ({sub.score}/100)
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-fg-2">
                            {sub.time_complexity || '—'} / {sub.space_complexity || '—'}
                          </td>
                          <td className="px-3 py-3 text-fg-3">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {sub.workspace_doc_id ? (
                              <Link
                                href={`/workspace/${sub.workspace_doc_id}`}
                                className="inline-flex items-center gap-1 rounded-control bg-raised px-2.5 py-1 text-xs font-medium text-fg hover:bg-raised/80"
                              >
                                Review <ArrowUpRight size={12} />
                              </Link>
                            ) : (
                              <span className="text-fg-3">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

