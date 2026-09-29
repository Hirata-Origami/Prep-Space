'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  Award,
  Bug,
  CheckCircle2,
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
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Textarea } from '@/components/ui';
import { Markdownish } from './Markdownish';
import type { Diagram, LanguageId } from '@/lib/workspace/types';
import type { JudgeVerdict } from '@/lib/workspace/practice';
import { cn } from '@/lib/cn';
import useSWR from 'swr';

const statusFetcher = (url: string) => fetch(url).then(r => r.json());

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
  { id: 'judge', label: 'AI Judge', icon: Scale },
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
  const { data: geminiStatus } = useSWR<{
    activeModel?: string;
    activeLabel?: string;
    allExhausted?: boolean;
    models?: Array<{ name: string; label: string; rpm: number; rpd: number; status: string; retryAfterSec?: number }>;
  }>('/api/gemini/status', statusFetcher, { refreshInterval: 15000 });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries, busy]);

  const push = (e: Omit<Entry, 'id'>) => setEntries(list => [...list, { ...e, id: idRef.current++ }]);

  const call = async (action: string, instruction: string, label: string) => {
    if (busy) return;
    const sentText = text;
    // Clear textbox immediately when sending message
    setText('');
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
            toast.success(`Passed! +${json.judge.xpAwarded} XP earned.`);
          } else if (json.judge.status === 'partial') {
            toast('Partial pass. Check test cases.', { icon: '⚠️' });
          } else {
            toast.error('Test cases failed. Review feedback.');
          }
        }
      }
    } catch (e: unknown) {
      // If request fails, restore message back to the textbox so user never loses it
      if (sentText) {
        setText(sentText);
      }
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
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <Sparkles size={15} className="text-signal" aria-hidden />
        <h2 className="text-sm font-semibold text-fg">{target === 'code' ? 'Coach & Judge' : 'Diagram assistant'}</h2>
        <div className="ml-auto flex items-center gap-1.5">
          {geminiStatus?.activeLabel && (
            <span
              title={`Cascade active: requests automatically fail over if rate limited. Primary: Gemini 3.8 Flash`}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 text-[11px] font-medium text-fg-2"
            >
              <span className="live-dot" />
              {geminiStatus.activeLabel.replace('Gemini ', '')}
            </span>
          )}
          {target === 'diagram' && canUndoAi && (
            <Button size="sm" variant="ghost" onClick={undoDiagram}>Undo AI</Button>
          )}
        </div>
      </div>

      {geminiStatus?.allExhausted && (
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-500">
          <AlertCircle size={14} className="shrink-0" />
          <span>Gemini RPM/RPD limit reached. Requests will resume as quota replenishes.</span>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {entries.length === 0 && (
          <div className="space-y-3 text-[13px] leading-relaxed text-fg-3">
            {target === 'code' ? (
              <p>Write code or SQL, then click <span className="font-semibold text-fg">AI Judge</span> to test your solution across edge cases and score your complexity, or use <span className="text-fg-2">Review</span> and <span className="text-fg-2">Solve it</span> for coaching.</p>
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

  const statusConfig = {
    passed: {
      badge: 'Passed',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: CheckCircle2,
    },
    partial: {
      badge: 'Partial',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: AlertCircle,
    },
    failed: {
      badge: 'Failed',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      icon: XCircle,
    },
  }[judge.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-3">
      {/* Header Verdict */}
      <div className={cn('flex items-center justify-between rounded-control border p-2.5', statusConfig.color)}>
        <div className="flex items-center gap-2">
          <StatusIcon size={16} />
          <span className="text-sm font-semibold">{statusConfig.badge}</span>
          <span className="text-xs opacity-80">• Score {judge.score}/100</span>
        </div>
        {judge.xpAwarded > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-black/20 px-2 py-0.5 text-xs font-medium">
            <Award size={12} /> +{judge.xpAwarded} XP
          </span>
        )}
      </div>

      {/* Complexity stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-control border border-line bg-raised/50 p-2">
          <div className="text-fg-3">Time Complexity</div>
          <div className="font-mono font-medium text-fg">{judge.timeComplexity}</div>
        </div>
        <div className="rounded-control border border-line bg-raised/50 p-2">
          <div className="text-fg-3">Space Complexity</div>
          <div className="font-mono font-medium text-fg">{judge.spaceComplexity}</div>
        </div>
      </div>
      {judge.optimalComplexity && (
        <div className="text-[11px] text-fg-3">
          Target: <span className="font-mono text-fg-2">{judge.optimalComplexity}</span>
        </div>
      )}

      {/* Test cases */}
      {judge.testResults && judge.testResults.length > 0 && (
        <div className="space-y-1.5 border-t border-line/60 pt-2">
          <button
            type="button"
            onClick={() => setShowTests(!showTests)}
            className="flex w-full items-center justify-between text-xs font-medium text-fg-2 hover:text-fg"
          >
            <span>Test Cases ({judge.testResults.filter(t => t.passed).length}/{judge.testResults.length} passed)</span>
            {showTests ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {showTests && (
            <div className="space-y-1.5 pt-1">
              {judge.testResults.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className={cn(
                    'rounded-control border p-2 text-xs font-mono',
                    t.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'
                  )}
                >
                  <div className="flex items-center justify-between text-[11px] font-sans font-medium">
                    <span className={t.passed ? 'text-emerald-400' : 'text-rose-400'}>
                      Test {idx + 1}: {t.passed ? 'Passed' : 'Failed'}
                    </span>
                    {t.note && <span className="text-fg-3 font-normal">{t.note}</span>}
                  </div>
                  <div className="mt-1 text-fg-3">Input: <span className="text-fg-2">{t.input}</span></div>
                  <div className="text-fg-3">Expected: <span className="text-emerald-400/90">{t.expected}</span></div>
                  {!t.passed && (
                    <div className="text-fg-3">Actual: <span className="text-rose-400/90">{t.actual}</span></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback markdown */}
      {judge.feedback && (
        <div className="border-t border-line/60 pt-2 text-xs">
          <Markdownish text={judge.feedback} />
        </div>
      )}
    </div>
  );
}

