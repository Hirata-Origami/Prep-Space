'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Bug,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Gauge,
  Lightbulb,
  MessageSquareWarning,
  PenLine,
  Scale,
  Send,
  Shapes,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Badge, Button, Card, Textarea } from '@/components/ui';
import { Markdownish } from './Markdownish';
import type { Diagram, LanguageId } from '@/lib/workspace/types';
import type { JudgeVerdict } from '@/lib/workspace/practice';
import { cn } from '@/lib/cn';

type Target = 'code' | 'diagram';

interface Entry {
  id: number;
  who: 'you' | 'ai';
  text: string;
  /** Code or write-up the reply offers to apply. */
  code?: string;
  writeup?: string;
  applied?: boolean;
  judge?: JudgeVerdict;
}

interface AiPanelProps {
  target: Target;
  language: LanguageId;
  code: string;
  notes: string;
  diagram: Diagram;
  docId?: string;
  docTitle?: string;
  onApplyCode: (code: string) => void;
  onDiagram: (next: Diagram) => void;
  onInsertNotes: (markdown: string) => void;
}

const CODE_ACTIONS = [
  { id: 'judge', label: 'Judge', icon: Scale },
  { id: 'problem', label: 'Give me a problem', icon: Shapes },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
  { id: 'explain', label: 'Explain', icon: Lightbulb },
  { id: 'fix', label: 'Fix bugs', icon: Bug },
  { id: 'optimize', label: 'Optimize', icon: Gauge },
  { id: 'tests', label: 'Write tests', icon: FlaskConical },
  { id: 'solve', label: 'Solve it', icon: Wand2 },
] as const;

const DIAGRAM_ACTIONS = [
  { id: 'critique', label: 'Critique', icon: MessageSquareWarning },
  { id: 'writeup', label: 'Write it up', icon: FileText },
] as const;

const DRAW_EXAMPLES = [
  'Design a URL shortener that handles 100M links',
  'Chat app with presence and message history',
  'Video upload and streaming pipeline',
];

export function AiPanel({
  target,
  language,
  code,
  notes,
  diagram,
  docId,
  docTitle,
  onApplyCode,
  onDiagram,
  onInsertNotes,
}: AiPanelProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const prevDiagram = useRef<Diagram | null>(null);
  const [canUndoAi, setCanUndoAi] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries, busy]);

  const push = (e: Omit<Entry, 'id'>) => setEntries(list => [...list, { ...e, id: idRef.current++ }]);

  const call = async (action: string, instruction: string, label: string) => {
    if (busy) return;
    setBusy(action);
    if (instruction) push({ who: 'you', text: instruction });
    else push({ who: 'you', text: label });
    try {
      const res = await fetch('/api/workspace/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          action,
          instruction,
          language,
          code,
          notes,
          diagram,
          docId,
          problemTitle: docTitle,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'The AI request failed');

      if (target === 'diagram' && json.diagram) {
        prevDiagram.current = diagram;
        setCanUndoAi(true);
        onDiagram(json.diagram as Diagram);
        push({ who: 'ai', text: json.message });
      } else {
        push({
          who: 'ai',
          text: json.message || 'Done.',
          code: json.code || undefined,
          writeup: json.writeup || undefined,
          judge: json.judge || undefined,
        });

        if (json.judge) {
          if (json.judge.status === 'passed') {
            toast.success(json.judge.xpAwarded > 0 ? `Passed. +${json.judge.xpAwarded} XP.` : 'Passed.');
          } else if (json.judge.status === 'partial') {
            toast.message('Partly right. Check the cases below.');
          } else {
            toast.error('Not there yet. See the cases below.');
          }
        }
      }
      setText('');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'The AI request failed';
      toast.error(message);
      push({ who: 'ai', text: message });
    } finally {
      setBusy(null);
    }
  };

  const undoDiagram = () => {
    if (!prevDiagram.current) return;
    onDiagram(prevDiagram.current);
    prevDiagram.current = null;
    setCanUndoAi(false);
    toast.success('Diagram change undone');
  };

  const applyCode = (e: Entry) => {
    onApplyCode(e.code!);
    setEntries(list => list.map(x => (x.id === e.id ? { ...x, applied: true } : x)));
    toast.success('Code replaced. Ctrl+Z in the editor brings your version back.');
  };

  const submit = () => {
    const instruction = text.trim();
    if (target === 'diagram') {
      if (!instruction) return;
      call(diagram.nodes.length ? 'edit' : 'draw', instruction, instruction);
    } else {
      call(code.trim() ? 'review' : 'solve', instruction, instruction || 'Review');
    }
  };

  const actions = target === 'code' ? CODE_ACTIONS : DIAGRAM_ACTIONS;

  return (
    <div className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-panel border border-line bg-panel">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Sparkles size={15} className="text-signal" aria-hidden />
        <h2 className="text-sm font-semibold text-fg">{target === 'code' ? 'Coach' : 'Diagram assistant'}</h2>
        {target === 'diagram' && canUndoAi && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={undoDiagram}>Undo last AI change</Button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {entries.length === 0 && (
          <div className="space-y-3 text-[13px] leading-relaxed text-fg-3">
            {target === 'code' ? (
              <p>Write code or SQL, then press <span className="font-semibold text-fg">Judge</span> to have the AI walk your solution through test cases and estimate its complexity, or use <span className="text-fg-2">Review</span> and <span className="text-fg-2">Solve it</span> for coaching.</p>
            ) : (
              <>
                <p>Describe a system and the AI draws it. Then ask for changes such as <span className="text-fg-2">&ldquo;add a cache before the database&rdquo;</span> and it edits the same diagram, keeping your layout.</p>
                <div className="flex flex-col items-start gap-1.5">
                  {DRAW_EXAMPLES.map(x => (
                    <button key={x} type="button" onClick={() => setText(x)} className="rounded-control border border-line px-2.5 py-1.5 text-left text-xs text-fg-2 transition-colors hover:border-line-strong hover:text-fg">
                      {x}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {entries.map(e => (
          <div key={e.id} className={cn(e.who === 'you' && 'flex justify-end')}>
            {e.who === 'you' ? (
              <div className="max-w-[90%] rounded-panel bg-signal/15 px-3 py-2 text-[13px] text-fg">{e.text}</div>
            ) : (
              <Card padded={false} className="space-y-3 p-3.5">
                {e.judge ? (
                  <JudgeView judge={e.judge} />
                ) : (
                  <Markdownish text={e.text} />
                )}
                {e.code && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => applyCode(e)} disabled={e.applied}><PenLine size={13} aria-hidden /> {e.applied ? 'Applied' : 'Replace my code'}</Button>
                    <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(e.code!); toast.success('Copied'); }}>Copy code</Button>
                  </div>
                )}
                {e.writeup && (
                  <Button size="sm" onClick={() => { onInsertNotes(e.writeup!); setEntries(list => list.map(x => (x.id === e.id ? { ...x, writeup: undefined } : x))); toast.success('Added to your notes'); }}>
                    <FileText size={13} aria-hidden /> Add to notes
                  </Button>
                )}
              </Card>
            )}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-fg-3"><span className="live-dot" aria-hidden /> Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="space-y-2.5 border-t border-line p-3">
        <div className="flex flex-wrap gap-1.5">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <Button key={a.id} size="sm" variant="secondary" disabled={!!busy} onClick={() => call(a.id, text.trim(), a.label)}>
                <Icon size={13} aria-hidden /> {a.label}
              </Button>
            );
          })}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            aria-label={target === 'diagram' ? 'Describe the system or a change' : 'Ask the coach'}
            value={text}
            rows={2}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={target === 'diagram' ? (diagram.nodes.length ? 'Change something: add a cache, split the API…' : 'Describe the system to draw…') : 'Ask about your code, or describe the problem…'}
            className="min-h-0 resize-none"
          />
          <Button onClick={submit} loading={!!busy && (busy === 'draw' || busy === 'edit' || busy === 'review' || busy === 'solve' || busy === 'judge')} disabled={!!busy || (target === 'diagram' && !text.trim())} aria-label="Send">
            <Send size={15} aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function JudgeView({ judge }: { judge: JudgeVerdict }) {
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
        The AI reads your code and predicts how it behaves. Nothing was executed, so run it yourself before you rely on the result.
      </p>
    </div>
  );
}
