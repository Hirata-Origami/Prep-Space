'use client';

import { useState } from 'react';
import { Network, Send, SquareCode } from 'lucide-react';
import { Button, Modal, Select } from '@/components/ui';
import { CodeEditor } from '@/components/workspace/CodeEditor';
import { DiagramCanvas } from '@/components/workspace/DiagramCanvas';
import { boardToText } from '@/lib/workspace/text';
import { EMPTY_DIAGRAM, LANGUAGES, type Diagram, type LanguageId } from '@/lib/workspace/types';
import { cn } from '@/lib/cn';

interface SharedBoardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sends the board to the interviewer as text. */
  onShare: (text: string) => void;
}

/**
 * A scratch board for the live interview. Its state lives here, so closing and reopening keeps
 * the work. "Share with Alex" sends the code and a description of the diagram into the conversation.
 */
export function SharedBoard({ open, onOpenChange, onShare }: SharedBoardProps) {
  const [tab, setTab] = useState<'code' | 'diagram'>('code');
  const [language, setLanguage] = useState<LanguageId>('python');
  const [code, setCode] = useState('');
  const [diagram, setDiagram] = useState<Diagram>(EMPTY_DIAGRAM);

  const empty = !code.trim() && diagram.nodes.length === 0;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Shared board"
      description="Write code or sketch a design, then share it so Alex can react to it."
      className="h-[88dvh] max-w-6xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Keep working</Button>
          <Button
            disabled={empty}
            onClick={() => {
              onShare(boardToText(language, code, diagram));
              onOpenChange(false);
            }}
          >
            <Send size={14} aria-hidden /> Share with Alex
          </Button>
        </>
      }
    >
      <div className="flex h-[58dvh] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Board view" className="flex rounded-control border border-line p-0.5">
            {([['code', 'Code', SquareCode], ['diagram', 'Diagram', Network]] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                aria-pressed={tab === v}
                onClick={() => setTab(v)}
                className={cn('flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm transition-colors', tab === v ? 'bg-signal text-[var(--text-on-accent)]' : 'text-fg-2 hover:text-fg')}
              >
                <Icon size={14} aria-hidden /> {label}
              </button>
            ))}
          </div>
          {tab === 'code' && (
            <Select aria-label="Language" value={language} onChange={e => setLanguage(e.target.value as LanguageId)} className="w-auto">
              {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select>
          )}
        </div>
        <div className="min-h-0 flex-1">
          {tab === 'code' ? (
            <CodeEditor value={code} language={language} onChange={setCode} placeholder="Write your solution here" />
          ) : (
            <DiagramCanvas diagram={diagram} onChange={setDiagram} />
          )}
        </div>
      </div>
    </Modal>
  );
}
