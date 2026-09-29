'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Mic, MicOff, PhoneOff, Send, Shapes } from 'lucide-react';
import { Button } from '@/components/ui';
import type { LiveEntry, LiveStatus } from '@/lib/workspace/useLive';
import { cn } from '@/lib/cn';

interface LiveDockProps {
  status: LiveStatus;
  error: string | null;
  entries: LiveEntry[];
  speaking: boolean;
  muted: boolean;
  micLevel: number;
  view: 'code' | 'diagram' | 'split';
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  onSend: (text: string) => boolean;
}

const SUGGESTIONS: Record<LiveDockProps['view'], string[]> = {
  diagram: ['Draw a URL shortener for 100 million links', 'Add a cache in front of the database', 'Where is the single point of failure?'],
  code: ['Walk me through what this code does', 'Write a solution and put it in the editor', 'What is the time complexity here?'],
  split: ['Draw the architecture for a chat app', 'Add a message queue between the services', 'Write the API notes for this design'],
};

/**
 * The bottom strip of the workspace: talk to Alex, read the transcript, or type. Alex can draw on
 * the canvas and write into the editor while you talk.
 */
export function LiveDock({ status, error, entries, speaking, muted, micLevel, view, onStart, onStop, onToggleMute, onSend }: LiveDockProps) {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const live = status === 'live';

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries, open]);

  const submit = (value = text) => {
    if (onSend(value)) setText('');
  };

  const state =
    status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Not connected' : !live ? 'Not connected' : speaking ? 'Alex is speaking' : muted ? 'Mic muted' : 'Listening';

  return (
    <section aria-label="Talk to Alex" className="flex shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-panel">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', speaking ? 'live-dot' : live ? 'bg-good' : 'bg-fg-3/60')} aria-hidden />
        <h2 className="text-sm font-semibold text-fg">Alex</h2>
        <span className="text-xs text-fg-3" role="status" aria-live="polite">{state}</span>

        {live && (
          <span className="ml-1 hidden items-end gap-[2px] sm:flex" aria-hidden>
            {[0.35, 0.6, 1, 0.6, 0.35].map((k, i) => (
              <span key={i} className="w-[3px] rounded-full bg-signal transition-[height] duration-100" style={{ height: `${4 + Math.round(micLevel * 14 * k)}px` }} />
            ))}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {live ? (
            <>
              <Button size="sm" variant={muted ? 'danger' : 'secondary'} onClick={onToggleMute} aria-pressed={muted} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>
                {muted ? <MicOff size={14} aria-hidden /> : <Mic size={14} aria-hidden />} {muted ? 'Unmute' : 'Mute'}
              </Button>
              <Button size="sm" variant="ghost" onClick={onStop}><PhoneOff size={14} aria-hidden /> End</Button>
            </>
          ) : (
            <Button size="sm" onClick={onStart} loading={status === 'connecting'}><Mic size={14} aria-hidden /> Talk to Alex</Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? 'Collapse transcript' : 'Expand transcript'}>
            {open ? <ChevronDown size={16} aria-hidden /> : <ChevronUp size={16} aria-hidden />}
          </Button>
        </div>
      </div>

      {open && (
        <>
          <div className="h-[168px] overflow-y-auto border-t border-line px-4 py-3" aria-live="polite" aria-label="Transcript">
            {error && <p role="alert" className="mb-3 rounded-control border border-bad/30 bg-bad/5 px-3 py-2 text-[13px] text-bad">{error}</p>}

            {entries.length === 0 && (
              <div className="text-[13px] leading-relaxed text-fg-3">
                {live ? (
                  <p>Alex is listening. Speak, or type below.</p>
                ) : (
                  <p>Start a live session to think out loud with Alex. Ask for a diagram and Alex draws it on the canvas; ask for code and it goes into the editor. You can also just type.</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS[view].map(s => (
                    <button
                      key={s}
                      type="button"
                      disabled={!live}
                      onClick={() => submit(s)}
                      className="rounded-full border border-line px-2.5 py-1 text-xs text-fg-2 transition-colors hover:border-line-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="space-y-2">
              {entries.map(e =>
                e.role === 'action' ? (
                  <li key={e.id} className="flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/25 bg-signal/10 px-3 py-1 text-xs text-signal">
                      <Shapes size={12} aria-hidden /> {e.text}
                    </span>
                  </li>
                ) : (
                  <li key={e.id} className={cn('flex', e.role === 'user' && 'justify-end')}>
                    <div className={cn('max-w-[85%] rounded-panel px-3 py-2 text-[13px] leading-relaxed', e.role === 'user' ? 'bg-signal/15 text-fg' : 'bg-raised text-fg-2')}>
                      <span className="sr-only">{e.role === 'user' ? 'You: ' : 'Alex: '}</span>
                      {e.text}
                    </div>
                  </li>
                )
              )}
            </ul>
            <div ref={endRef} />
          </div>

          <form
            onSubmit={ev => {
              ev.preventDefault();
              submit();
            }}
            className="flex items-center gap-2 border-t border-line p-2.5"
          >
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={!live}
              aria-label="Message to Alex"
              placeholder={live ? 'Type a message, or just speak' : 'Start the session to message Alex'}
              className="h-10 min-w-0 flex-1 rounded-control border border-line-strong bg-canvas px-3 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-3 focus:border-signal focus:shadow-[0_0_0_3px_var(--accent-primary-dim)] disabled:cursor-not-allowed disabled:opacity-55"
            />
            <Button type="submit" size="icon" disabled={!live || !text.trim()} aria-label="Send message"><Send size={15} aria-hidden /></Button>
          </form>
        </>
      )}
    </section>
  );
}
