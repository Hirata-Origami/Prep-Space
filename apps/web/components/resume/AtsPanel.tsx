'use client';

import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { AtsReport, CheckStatus } from '@/lib/resume/ats';
import { cn } from '@/lib/cn';

const ICON: Record<CheckStatus, React.ReactNode> = {
  pass: <CheckCircle2 size={16} className="text-good" aria-label="Passed" />,
  warn: <AlertTriangle size={16} className="text-live" aria-label="Needs attention" />,
  fail: <XCircle size={16} className="text-bad" aria-label="Failed" />,
};

function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? 'var(--accent-green)' : score >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div className="relative h-[88px] w-[88px] shrink-0" role="img" aria-label={`ATS readiness ${score} out of 100`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-xl font-semibold text-fg">{score}</div>
    </div>
  );
}

export function AtsPanel({ report }: { report: AtsReport }) {
  const summary = report.score >= 80 ? 'Ready to send.' : report.score >= 60 ? 'Good, with a few fixes.' : 'Needs work before you apply.';
  const kw = report.keywordCoverage;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <ScoreRing score={report.score} />
        <div>
          <div className="text-base font-semibold text-fg">ATS readiness</div>
          <div className="text-sm text-fg-2">{summary}</div>
          <div className="mt-1 text-xs text-fg-3">Checked on structure and content. It does not replace a real ATS.</div>
        </div>
      </div>

      <ul className="divide-y divide-line rounded-panel border border-line">
        {report.checks.filter(c => c.weight > 0 || c.status !== 'pass').map(c => (
          <li key={c.id} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 shrink-0">{ICON[c.status]}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-fg">{c.label}</div>
              <div className={cn('text-[13px]', c.status === 'pass' ? 'text-fg-3' : 'text-fg-2')}>{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      {kw && (
        <div>
          <div className="mb-2 text-sm font-semibold text-fg">Job description keywords</div>
          <div className="flex flex-wrap gap-1.5">
            {kw.matched.map(k => <span key={k} className="rounded-full border border-good/25 bg-good/10 px-2 py-0.5 text-xs text-good">{k}</span>)}
            {kw.missing.map(k => <span key={k} className="rounded-full border border-line bg-raised px-2 py-0.5 text-xs text-fg-3">{k}</span>)}
          </div>
          <p className="mt-2 text-xs text-fg-3">Green words are in your resume. Grey ones are not; add them only where they are true.</p>
        </div>
      )}
    </div>
  );
}
