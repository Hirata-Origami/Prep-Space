'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bug, ClipboardCheck, FileText, FlaskConical, Gauge, Lightbulb, MessageSquareWarning, PenLine, Scale, Shapes, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { Button, Dropdown, DropdownContent, DropdownItem, DropdownTrigger, Modal, Textarea } from '@/components/ui';
import { JudgeView } from './JudgeView';
import { Markdownish } from './Markdownish';
import type { Diagram, LanguageId } from '@/lib/workspace/types';
import type { JudgeVerdict } from '@/lib/workspace/practice';

interface Action {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Needs a sentence from the user before it can run. */
  ask?: string;
}

const CODE_ACTIONS: Action[] = [
  { id: 'judge', label: 'Judge my solution', icon: Scale },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
  { id: 'explain', label: 'Explain', icon: Lightbulb },
  { id: 'fix', label: 'Fix bugs', icon: Bug },
  { id: 'optimize', label: 'Optimise', icon: Gauge },
  { id: 'tests', label: 'Write tests', icon: FlaskConical },
  { id: 'solve', label: 'Solve it', icon: Wand2, ask: 'Describe the problem, or leave this empty to solve what is in the editor.' },
  { id: 'problem', label: 'Give me a problem', icon: Shapes, ask: 'Any topic or difficulty in mind? Leave empty for a medium problem.' },
];

const DIAGRAM_ACTIONS: Action[] = [
  { id: 'critique', label: 'Critique the design', icon: MessageSquareWarning },
  { id: 'writeup', label: 'Write it up as notes', icon: FileText },
];

interface CoachMenuProps {
  target: 'code' | 'diagram';
  language: LanguageId;
  code: string;
  diagram: Diagram;
  docId: string;
  onApplyCode: (code: string) => void;
  onInsertNotes: (markdown: string) => void;
}

interface Result {
  message: string;
  code?: string;
  writeup?: string;
  judge?: JudgeVerdict;
}

/**
 * One-shot coaching that needs a written answer you can keep: a judge verdict, a review, a rewrite.
 * Talking things through happens in the live dock instead.
 */
export function CoachMenu({ target, language, code, diagram, docId, onApplyCode, onInsertNotes }: CoachMenuProps) {
  const [action, setAction] = useState<Action | null>(null);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const actions = target === 'code' ? CODE_ACTIONS : DIAGRAM_ACTIONS;

  const run = async (a: Action, text: string) => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/workspace/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, action: a.id, instruction: text, language, code, notes: code, diagram, docId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'The request failed');
      setResult({ message: json.message ?? '', code: json.code || undefined, writeup: json.writeup || undefined, judge: json.judge || undefined });
      if (json.judge?.status === 'passed' && json.judge.xpAwarded > 0) toast.success(`Passed. +${json.judge.xpAwarded} XP.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'The request failed');
    } finally {
      setBusy(false);
    }
  };

  const choose = (a: Action) => {
    setAction(a);
    setInstruction('');
    setResult(null);
    setError('');
    if (!a.ask) run(a, '');
  };

  const close = () => {
    setAction(null);
    setResult(null);
    setError('');
  };

  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button size="sm" variant="secondary"><Sparkles size={14} aria-hidden /> Coach</Button>
        </DropdownTrigger>
        <DropdownContent align="end">
          {actions.map(a => {
            const Icon = a.icon;
            return (
              <DropdownItem key={a.id} onSelect={() => choose(a)}>
                <Icon size={14} className="mr-2 text-fg-3" aria-hidden /> {a.label}
              </DropdownItem>
            );
          })}
        </DropdownContent>
      </Dropdown>

      {action && (
        <Modal
          open
          onOpenChange={o => !o && close()}
          title={action.label}
          description={action.id === 'judge' ? 'The AI reads your code and predicts how it behaves. Nothing is executed.' : undefined}
          className="max-w-2xl"
          footer={
            action.ask && !result ? (
              <>
                <Button variant="ghost" onClick={close}>Cancel</Button>
                <Button onClick={() => run(action, instruction)} loading={busy}>Run</Button>
              </>
            ) : undefined
          }
        >
          <div className="space-y-4">
            {action.ask && !result && !busy && (
              <div>
                <label htmlFor="coach-ask" className="mb-1.5 block text-[13px] font-medium text-fg">{action.ask}</label>
                <Textarea id="coach-ask" rows={3} value={instruction} onChange={e => setInstruction(e.target.value)} autoFocus />
              </div>
            )}
            {busy && <div className="flex items-center gap-2 py-6 text-sm text-fg-3"><span className="live-dot" aria-hidden /> Working on it…</div>}
            {error && <p role="alert" className="rounded-control border border-bad/30 bg-bad/5 p-3 text-sm text-bad">{error}</p>}
            {result && (
              <>
                {result.judge ? <JudgeView judge={result.judge} /> : <Markdownish text={result.message} />}
                <div className="flex flex-wrap gap-2">
                  {result.code && (
                    <>
                      <Button size="sm" onClick={() => { onApplyCode(result.code!); toast.success('Editor updated. Ctrl+Z in the editor brings your version back.'); close(); }}>
                        <PenLine size={13} aria-hidden /> Replace my code
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(result.code!); toast.success('Copied'); }}>Copy code</Button>
                    </>
                  )}
                  {result.writeup && (
                    <Button size="sm" onClick={() => { onInsertNotes(result.writeup!); toast.success('Added to your notes'); close(); }}>
                      <FileText size={13} aria-hidden /> Add to notes
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
