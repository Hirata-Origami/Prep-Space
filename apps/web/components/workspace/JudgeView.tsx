'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui';
import { Markdownish } from './Markdownish';
import type { JudgeVerdict } from '@/lib/workspace/practice';
import { cn } from '@/lib/cn';

/** A judge verdict: score, complexity, and the cases the AI walked the code through. */
export function JudgeView({ judge }: { judge: JudgeVerdict }) {
  const [showTests, setShowTests] = useState(true);
  const tone = { passed: 'good', partial: 'live', failed: 'bad' } as const;
  const label = { passed: 'Passed', partial: 'Partly right', failed: 'Not yet' } as const;
  const passed = judge.testResults?.filter(t => t.passed).length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone[judge.status]}>{label[judge.status]}</Badge>
        <span className="font-mono text-sm font-semibold text-fg">{judge.score}/100</span>
        {judge.xpAwarded > 0 && <Badge tone="signal">+{judge.xpAwarded} XP</Badge>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-control bg-raised p-2.5">
          <div className="text-fg-3">Time</div>
          <div className="mt-0.5 font-mono font-medium text-fg">{judge.timeComplexity}</div>
        </div>
        <div className="rounded-control bg-raised p-2.5">
          <div className="text-fg-3">Space</div>
          <div className="mt-0.5 font-mono font-medium text-fg">{judge.spaceComplexity}</div>
        </div>
      </div>
      {judge.optimalComplexity && <p className="text-xs text-fg-3">Best known: <span className="font-mono text-fg-2">{judge.optimalComplexity}</span></p>}

      {judge.testResults?.length > 0 && (
        <div className="border-t border-line pt-2.5">
          <button type="button" onClick={() => setShowTests(v => !v)} aria-expanded={showTests} className="flex w-full items-center justify-between text-xs font-medium text-fg-2 hover:text-fg">
            <span>{passed} of {judge.testResults.length} cases passed</span>
            {showTests ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
          </button>
          {showTests && (
            <ul className="mt-2 space-y-1.5">
              {judge.testResults.map((t, i) => (
                <li key={t.id ?? i} className={cn('rounded-control border p-2 text-xs', t.passed ? 'border-good/25 bg-good/5' : 'border-bad/30 bg-bad/5')}>
                  <div className="flex items-center justify-between gap-2 font-medium">
                    <span className={t.passed ? 'text-good' : 'text-bad'}>Case {i + 1}: {t.passed ? 'passed' : 'failed'}</span>
                    {t.note && <span className="truncate font-normal text-fg-3">{t.note}</span>}
                  </div>
                  <dl className="mt-1 space-y-0.5 font-mono text-[11px]">
                    <div className="flex gap-1.5"><dt className="text-fg-3">in</dt><dd className="break-all text-fg-2">{t.input}</dd></div>
                    <div className="flex gap-1.5"><dt className="text-fg-3">expected</dt><dd className="break-all text-fg-2">{t.expected}</dd></div>
                    {!t.passed && <div className="flex gap-1.5"><dt className="text-fg-3">got</dt><dd className="break-all text-bad">{t.actual}</dd></div>}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {judge.feedback && <div className="border-t border-line pt-2.5"><Markdownish text={judge.feedback} /></div>}

      <p className="border-t border-line pt-2.5 text-[11px] leading-snug text-fg-3">
        {judge.usedExecution ? 'Checked against the real output from your last run.' : 'The AI reads your code and predicts how it behaves. Nothing was executed, so run it yourself before you rely on the result.'}
      </p>
    </div>
  );
}
