'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { BarChart3, ChevronRight, Plus } from 'lucide-react';
import { Badge, ButtonLink, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

interface SessionItem {
  id: string;
  created_at: string;
  state: string;
  duration_seconds?: number;
  interview_type?: string;
  plan?: { role?: string; topic?: string };
  interview_reports?: Array<{
    id: string;
    overall_score?: number;
    hire_recommendation?: string;
    generated_at?: string;
  }>;
}

const REPORT_CONTENTS = [
  { title: 'Competency radar', desc: 'An 8-dimension chart showing where you are strong and where you slip.' },
  { title: 'Answer analysis', desc: 'Question-by-question comparison of your answer against an ideal one.' },
  { title: 'Actionable insights', desc: 'Specific strengths and the next thing to fix, distilled by Gemini.' },
  { title: 'Score tracking', desc: 'Compare sessions over time to see whether you are improving.' },
  { title: 'Communication', desc: 'Clarity, confidence and conciseness, measured on your own recordings.' },
  { title: 'Role-specific feedback', desc: 'Tailored to your target role and the interview type.' },
];

export default function ReportsPage() {
  const { data, error, isLoading, mutate } = useSWR<{ sessions: SessionItem[] }>(
    '/api/sessions',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  );

  const sessions = data?.sessions || [];
  const showLoading = isLoading && sessions.length === 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Interview reports"
        description="Evidence-backed analysis with timestamped audio playback."
        action={
          <ButtonLink href="/interview">
            <Plus size={16} aria-hidden /> New session
          </ButtonLink>
        }
      />

      {showLoading ? (
        <Card padded={false} className="divide-y divide-line" aria-busy="true" aria-label="Loading reports">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-10 w-10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </Card>
      ) : error ? (
        <ErrorState title="Could not load your reports" onRetry={() => mutate()} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<BarChart3 size={20} aria-hidden />}
          title="No reports yet"
          description="Finish an AI interview and your scored report will show up here."
          action={<ButtonLink href="/interview">Start your first interview</ButtonLink>}
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-line">
            {sessions.map(session => {
              const report = session.interview_reports?.[0];
              const done = session.state === 'COMPLETE' && report;
              const score = report?.overall_score;
              const scoreTone = typeof score !== 'number' ? '' : score >= 80 ? 'text-good' : score >= 60 ? 'text-live' : 'text-bad';
              const row = (
                <div className={cn('flex flex-wrap items-center justify-between gap-3 px-5 py-4', report && 'transition-colors hover:bg-raised')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-medium text-fg">{session.plan?.role || 'Technical interview'}</span>
                      {session.interview_type && <Badge tone="neutral" className="capitalize">{session.interview_type.replace('_', ' ')}</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-fg-3">{formatDate(session.created_at)}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    {done ? (
                      <div className="text-right">
                        <div className={cn('font-mono text-xl font-semibold leading-none', scoreTone)}>{score}%</div>
                        <div className="mt-1 text-[12px] text-fg-3">Score</div>
                      </div>
                    ) : (
                      <Badge tone="live">{session.state === 'IN_PROGRESS' ? 'In progress' : 'Processing'}</Badge>
                    )}
                    {report && <ChevronRight size={16} className="text-fg-3" aria-hidden />}
                  </div>
                </div>
              );
              return (
                <li key={session.id}>
                  {report ? (
                    <Link href={`/reports/${report.id}`} className="block">
                      {row}
                    </Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <section className="mt-14">
        <h2 className="mb-4 text-lg font-semibold text-fg">What each report includes</h2>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_CONTENTS.map(({ title, desc }) => (
            <div key={title}>
              <dt className="text-sm font-semibold text-fg">{title}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-fg-3">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
