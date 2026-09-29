'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { RunResult } from '@/lib/workspace/run';
import { cn } from '@/lib/cn';

interface RunPanelProps {
  running: boolean;
  result: RunResult | null;
  /** True when the code was edited after this output was produced. */
  stale: boolean;
  onClose: () => void;
}

/** What the last run printed. Real output from the user's own browser, not a prediction. */
export function RunPanel({ running, result, stale, onClose }: RunPanelProps) {
  return (
    <section aria-label="Output" className="flex h-[190px] shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <h2 className="text-xs font-semibold text-fg">Output</h2>
        {running && <span className="flex items-center gap-1.5 text-xs text-fg-3"><span className="live-dot" aria-hidden /> Running…</span>}
        {!running && result && (
          <span className={cn('text-xs', result.ok ? 'text-good' : 'text-bad')}>
            {result.ok ? 'Finished' : 'Failed'} in {result.ms >= 1000 ? `${(result.ms / 1000).toFixed(1)}s` : `${result.ms}ms`}
          </span>
        )}
        {stale && !running && <span className="text-xs text-live">Code changed since this run</span>}
        <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={onClose} aria-label="Close output"><X size={14} aria-hidden /></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-relaxed" role="log" aria-live="polite">
        {!running && !result && <p className="font-sans text-[13px] text-fg-3">Press Run, or Ctrl+Enter in the editor.</p>}
        {result?.tables?.map((t, i) => (
          <table key={i} className="mb-3 min-w-full border-collapse text-left">
            <thead>
              <tr>{t.columns.map(c => <th key={c} className="border-b border-line px-2 py-1 font-semibold text-fg">{c}</th>)}</tr>
            </thead>
            <tbody>
              {t.rows.map((r, ri) => (
                <tr key={ri} className="odd:bg-raised/40">
                  {r.map((v, ci) => <td key={ci} className={cn('px-2 py-1 text-fg-2', v === null && 'text-fg-3')}>{v === null ? 'NULL' : String(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
        {result && !result.tables?.length && result.output && <pre className="whitespace-pre-wrap text-fg-2">{result.output}</pre>}
        {result?.error && <pre className="whitespace-pre-wrap text-bad">{result.error}</pre>}
        {result && result.ok && !result.output.trim() && !result.tables?.length && <p className="font-sans text-fg-3">The code ran and printed nothing. Use console.log or print to see values.</p>}
        {result?.note && <p className="mt-2 font-sans text-[12px] text-fg-3">{result.note}</p>}
      </div>
    </section>
  );
}
