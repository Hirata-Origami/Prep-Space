'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, LinkIcon } from 'lucide-react';
import { Badge, Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

interface ReportAnalysis {
  summary?: string;
  scores?: Record<string, number>;
  strengths?: string[];
  improvements?: string[];
  sample_answers?: { question?: string; score?: number; ideal_answer?: string }[];
  video?: { scores?: Record<string, number>; summary?: string };
}

interface SharedReport {
  overall_score?: number;
  hire_recommendation?: string;
  analysis?: ReportAnalysis;
  generated_at?: string;
  interview_sessions?: { plan?: { role?: string; company?: string } };
}

interface Meta {
  expires_at?: string | null;
  view_count?: number;
}

const tone = (n: number) => (n >= 80 ? 'text-good' : n >= 60 ? 'text-live' : 'text-bad');
const bar = (n: number) => (n >= 80 ? 'bg-good' : n >= 60 ? 'bg-live' : 'bg-bad');
const label = (k: string) => k.replace(/_/g, ' ');

function Bars({ scores }: { scores: Record<string, number> }) {
  return (
    <ul className="space-y-3">
      {Object.entries(scores).map(([key, val]) => (
        <li key={key} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-[13px]">
          <span className="truncate capitalize text-fg-2">{label(key)}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-raised" role="presentation">
            <span className={cn('block h-full rounded-full', bar(val))} style={{ width: `${Math.min(100, val)}%` }} />
          </span>
          <span className={cn('text-right font-mono font-semibold', tone(val))}>{val}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch(`/api/shared/${token}`)
      .then(async res => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'This link is not available.');
        if (alive) {
          setReport(json.report);
          setMeta(json.meta);
        }
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'This link is not available.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-control border border-line bg-raised text-fg-2"><LinkIcon size={20} aria-hidden /></div>
        <h1 className="font-display text-xl font-bold text-fg">This link is not available</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-3">{error || 'The report could not be found.'} Ask the person who sent it for a new link.</p>
        <Link href="/" className="mt-6 text-sm text-signal hover:underline">Go to PrepSpace</Link>
      </main>
    );
  }

  const a = report.analysis ?? {};
  const overall = report.overall_score ?? 0;
  const plan = report.interview_sessions?.plan;
  const title = plan?.role ? `${plan.role}${plan.company ? ` at ${plan.company}` : ''}` : 'Interview';
  const questions = (a.sample_answers ?? []).slice(0, 5);

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="font-display text-[15px] font-bold">PrepSpace</Link>
          <span className="flex items-center gap-3 text-xs text-fg-3">
            Shared report
            {typeof meta?.view_count === 'number' && <span className="flex items-center gap-1"><Eye size={12} aria-hidden /> {meta.view_count}</span>}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight">{title} interview</h1>
          {report.generated_at && <p className="mt-1 text-sm text-fg-3">{new Date(report.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
        </div>

        <Card className="flex flex-wrap items-center gap-6 p-5 sm:p-7">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-hero border border-line bg-raised">
            <div className={cn('font-mono text-3xl font-semibold leading-none', tone(overall))}>{overall}<span className="text-lg">%</span></div>
            <div className="mt-1 text-xs text-fg-3">Overall</div>
          </div>
          <div className="min-w-0 flex-1 basis-56">
            {report.hire_recommendation && (
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="signal">Recommendation</Badge>
                <span className="font-semibold capitalize">{report.hire_recommendation.replace(/_/g, ' ')}</span>
              </div>
            )}
            {a.summary && <p className="text-[15px] leading-relaxed text-fg-2">{a.summary}</p>}
          </div>
        </Card>

        {a.scores && Object.keys(a.scores).length > 0 && (
          <section aria-labelledby="skills">
            <h2 id="skills" className="mb-3 text-base font-semibold">Skills</h2>
            <Card><Bars scores={a.scores} /></Card>
          </section>
        )}

        {a.video?.scores && Object.keys(a.video.scores).length > 0 && (
          <section aria-labelledby="camera">
            <h2 id="camera" className="mb-3 text-base font-semibold">On camera</h2>
            <Card className="space-y-4">
              {a.video.summary && <p className="text-sm leading-relaxed text-fg-2">{a.video.summary}</p>}
              <Bars scores={a.video.scores} />
            </Card>
          </section>
        )}

        {((a.strengths?.length ?? 0) > 0 || (a.improvements?.length ?? 0) > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(a.strengths?.length ?? 0) > 0 && (
              <Card className="border-t-4 border-t-good">
                <h2 className="mb-3 text-sm font-semibold text-good">Strengths</h2>
                <ul className="space-y-2.5">
                  {a.strengths!.map((s, i) => <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-fg-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" aria-hidden />{s}</li>)}
                </ul>
              </Card>
            )}
            {(a.improvements?.length ?? 0) > 0 && (
              <Card className="border-t-4 border-t-live">
                <h2 className="mb-3 text-sm font-semibold text-live">Working on</h2>
                <ul className="space-y-2.5">
                  {a.improvements!.map((s, i) => <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-fg-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />{s}</li>)}
                </ul>
              </Card>
            )}
          </div>
        )}

        {questions.length > 0 && (
          <section aria-labelledby="questions">
            <h2 id="questions" className="mb-3 text-base font-semibold">Questions</h2>
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li key={i}>
                  <Card className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-semibold">{q.question}</h3>
                      {typeof q.score === 'number' && <span className={cn('font-mono text-sm font-semibold', tone(q.score))}>{q.score}%</span>}
                    </div>
                    {q.ideal_answer && (
                      <div className="rounded-control border border-signal/20 bg-signal/5 p-3">
                        <div className="mb-1 text-xs font-medium text-signal">What a strong answer covers</div>
                        <p className="text-[13px] leading-relaxed text-fg-2">{q.ideal_answer}</p>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="border-t border-line pt-6 text-center text-xs text-fg-3">
          Shared from <Link href="/" className="text-signal hover:underline">PrepSpace</Link>.
          {meta?.expires_at && <> This link expires on {new Date(meta.expires_at).toLocaleDateString()}.</>}
        </footer>
      </main>
    </div>
  );
}
