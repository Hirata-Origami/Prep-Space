'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Eye,
  Lightbulb,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Badge, Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

interface VideoAnalysis {
  scores?: Record<string, number>;
  summary?: string;
}

interface ReportAnalysis {
  summary?: string;
  scores?: Record<string, number>;
  strengths?: string[];
  improvements?: string[];
  sample_answers?: { question?: string; score?: number; user_answer?: string; ideal_answer?: string }[];
  video?: VideoAnalysis;
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

const scoreTone = (n: number) => (n >= 80 ? 'text-good' : n >= 60 ? 'text-live' : 'text-bad');
const scoreRing = (n: number) => (n >= 80 ? 'stroke-good' : n >= 60 ? 'stroke-live' : 'stroke-bad');

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shared/${token}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Not found');
        setReport(json.report);
        setMeta(json.meta);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg text-center px-4">
        <XCircle size={40} className="text-bad mb-4" />
        <h1 className="text-xl font-bold text-fg mb-2">Link unavailable</h1>
        <p className="text-fg-3 text-sm max-w-sm">{error}</p>
        <Link href="/" className="mt-6 text-xs text-signal hover:underline">← Back to PrepSpace</Link>
      </div>
    );
  }

  if (!report) return null;

  const analysis = report.analysis || {};
  const scores = analysis.scores || {};
  const overall = report.overall_score ?? 0;
  const plan = report.interview_sessions?.plan;
  const roleLabel = plan?.role ? `${plan.role}${plan.company ? ` at ${plan.company}` : ''}` : 'Interview';

  const circumference = 2 * Math.PI * 44;
  const strokeOffset = circumference - (overall / 100) * circumference;

  return (
    <div className="min-h-screen bg-bg">
      {/* Banner */}
      <div className="border-b border-line bg-panel/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Sparkles size={15} className="text-signal" />
            PrepSpace — Shared Interview Report
          </div>
          {meta?.view_count && (
            <div className="flex items-center gap-1 text-xs text-fg-3">
              <Eye size={12} /> {meta.view_count} view{meta.view_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-fg">{roleLabel} · Interview Report</h1>
          {report.generated_at && (
            <p className="mt-1 text-sm text-fg-3">
              Generated {new Date(report.generated_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Score + Recommendation */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex items-center gap-6 p-6">
            <div className="relative h-24 w-24 shrink-0">
              <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
                <circle
                  cx="50" cy="50" r="44"
                  strokeWidth="8" fill="none"
                  className={scoreRing(overall)}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className={cn('absolute inset-0 flex flex-col items-center justify-center', scoreTone(overall))}>
                <span className="text-2xl font-bold leading-none">{overall}</span>
                <span className="text-[10px] text-fg-3">/ 100</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-fg-3 mb-1">Overall Score</div>
              <div className={cn('text-3xl font-bold', scoreTone(overall))}>{overall}</div>
              <div className="text-sm text-fg-2 mt-1 font-medium">out of 100</div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between p-6">
            <div className="flex items-center gap-2 mb-3">
              <Award size={16} className="text-signal" />
              <span className="text-sm font-semibold text-fg">Hire Recommendation</span>
            </div>
            <div className={cn(
              'rounded-control px-3 py-2 text-center text-sm font-semibold',
              report.hire_recommendation?.toLowerCase().includes('strong hire')
                ? 'bg-good/10 text-good border border-good/20'
                : report.hire_recommendation?.toLowerCase().includes('hire')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : report.hire_recommendation?.toLowerCase().includes('no hire')
                    ? 'bg-bad/10 text-bad border border-bad/20'
                    : 'bg-raised text-fg-2 border border-line'
            )}>
              {report.hire_recommendation || 'Pending'}
            </div>
            {analysis.summary && (
              <p className="mt-3 text-xs leading-relaxed text-fg-3 line-clamp-3">{analysis.summary}</p>
            )}
          </Card>
        </div>

        {/* Competency Scores */}
        {Object.keys(scores).length > 0 && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={15} className="text-signal" />
              <h2 className="text-sm font-semibold text-fg">Competency Breakdown</h2>
            </div>
            <div className="space-y-2.5">
              {Object.entries(scores).map(([key, val]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-36 shrink-0 text-xs text-fg-2 capitalize">{key.replace(/_/g, ' ')}</div>
                  <div className="flex-1 h-2 rounded-full bg-raised overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', val >= 80 ? 'bg-good' : val >= 60 ? 'bg-live' : 'bg-bad')}
                      style={{ width: `${Math.min(100, val)}%` }}
                    />
                  </div>
                  <div className={cn('w-8 text-right text-xs font-semibold', scoreTone(val))}>{val}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Strengths & Improvements */}
        <div className="grid gap-4 sm:grid-cols-2">
          {(analysis.strengths ?? []).length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ThumbsUp size={14} className="text-good" />
                <h2 className="text-sm font-semibold text-fg">Strengths</h2>
              </div>
              <ul className="space-y-2">
                {(analysis.strengths ?? []).map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-fg-2">
                    <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-good" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {(analysis.improvements ?? []).length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-signal" />
                <h2 className="text-sm font-semibold text-fg">Areas for Growth</h2>
              </div>
              <ul className="space-y-2">
                {(analysis.improvements ?? []).map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-fg-2">
                    <Lightbulb size={13} className="mt-0.5 shrink-0 text-signal" />
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Q&A Highlights */}
        {(analysis.sample_answers ?? []).length > 0 && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-signal" />
              <h2 className="text-sm font-semibold text-fg">Question Highlights</h2>
            </div>
            <div className="space-y-4">
              {(analysis.sample_answers ?? []).slice(0, 4).map((qa, i) => (
                <div key={i} className="border-t border-line/60 pt-4 first:border-t-0 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-fg">{qa.question}</p>
                    {qa.score !== undefined && (
                      <Badge className={cn('text-[10px]', scoreTone(qa.score))}>
                        {qa.score}/10
                      </Badge>
                    )}
                  </div>
                  {qa.ideal_answer && (
                    <div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-signal">Model Answer</div>
                      <p className="text-xs leading-relaxed text-fg-2">{qa.ideal_answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="border-t border-line/60 pt-6 text-center">
          <p className="text-xs text-fg-3">
            This report was shared via{' '}
            <Link href="/" className="text-signal hover:underline">PrepSpace</Link>
            {' '}· AI-powered interview preparation platform.
          </p>
          {meta?.expires_at && (
            <p className="mt-1 text-xs text-fg-3">
              Link expires: {new Date(meta.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
