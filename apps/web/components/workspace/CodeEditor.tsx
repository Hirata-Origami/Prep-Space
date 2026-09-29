'use client';

import { useMemo, useRef } from 'react';
import { tokenize, type TokenKind } from '@/lib/workspace/highlight';
import type { LanguageId } from '@/lib/workspace/types';
import { cn } from '@/lib/cn';

interface CodeEditorProps {
  value: string;
  language: LanguageId;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  /** Called on Ctrl or Cmd + Enter. */
  onRun?: () => void;
}

const KIND_CLASS: Record<TokenKind, string> = {
  kw: 'text-violet font-medium',
  str: 'text-good',
  com: 'text-fg-3 italic',
  num: 'text-live',
  fn: 'text-signal',
  plain: '',
};

const INDENT = '  ';

/**
 * A plain textarea with a highlighted copy painted behind it. Keeping the real textarea means
 * selection, undo, IME and accessibility all work natively.
 */
export function CodeEditor({ value, language, onChange, readOnly, placeholder, onRun }: CodeEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const tokens = useMemo(() => tokenize(value, language), [value, language]);
  const lineCount = useMemo(() => value.split('\n').length, [value]);

  const syncScroll = () => {
    const ta = taRef.current;
    if (!ta) return;
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const edit = (next: string, caret: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      taRef.current?.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = ta;

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onRun) {
      e.preventDefault();
      onRun();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (a === b && !e.shiftKey) {
        edit(value.slice(0, a) + INDENT + value.slice(b), a + INDENT.length);
        return;
      }
      // indent or outdent every selected line
      const start = value.lastIndexOf('\n', a - 1) + 1;
      const block = value.slice(start, b);
      const lines = block.split('\n');
      const changed = lines.map(l => (e.shiftKey ? l.replace(new RegExp(`^ {1,${INDENT.length}}`), '') : INDENT + l));
      const next = value.slice(0, start) + changed.join('\n') + value.slice(b);
      const delta = changed.join('\n').length - block.length;
      onChange(next);
      requestAnimationFrame(() => ta.setSelectionRange(a + (e.shiftKey ? 0 : INDENT.length), b + delta));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', a - 1) + 1;
      const indent = /^\s*/.exec(value.slice(lineStart, a))![0];
      const prev = value.slice(lineStart, a).trimEnd();
      const extra = /[{([:]$/.test(prev) && language !== 'markdown' && language !== 'sql' ? INDENT : '';
      const insert = '\n' + indent + extra;
      edit(value.slice(0, a) + insert + value.slice(b), a + insert.length);
    } else {
      const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
      if (language !== 'markdown' && pairs[e.key] && a === b && !e.ctrlKey && !e.metaKey) {
        const next = value[a];
        // skip typing a quote right before a matching closer, and only auto-close before whitespace or a closer
        if (!next || /[\s)\]}.,;]/.test(next)) {
          if ((e.key === '"' || e.key === "'") && /\w/.test(value[a - 1] ?? '')) return;
          e.preventDefault();
          edit(value.slice(0, a) + e.key + pairs[e.key] + value.slice(b), a + 1);
        }
      }
    }
  };

  const metrics = 'font-mono text-[13px] leading-[21px] p-3 whitespace-pre tab-size-2';

  return (
    <div className="relative flex h-full min-h-[240px] overflow-hidden rounded-panel border border-line bg-panel">
      <div ref={gutterRef} aria-hidden className="w-11 shrink-0 select-none overflow-hidden border-r border-line bg-raised/40 py-3 text-right font-mono text-[12px] leading-[21px] text-fg-3">
        {Array.from({ length: lineCount }, (_, i) => <div key={i} className="pr-2">{i + 1}</div>)}
      </div>
      <div className="relative min-w-0 flex-1">
        <pre ref={preRef} aria-hidden className={cn(metrics, 'pointer-events-none absolute inset-0 m-0 overflow-hidden text-fg')} style={{ tabSize: 2 }}>
          {tokens.map((t, i) => <span key={i} className={KIND_CLASS[t.kind]}>{t.text}</span>)}
          {'\n'}
        </pre>
        <textarea
          ref={taRef}
          value={value}
          readOnly={readOnly}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          placeholder={placeholder}
          aria-label="Editor"
          className={cn(metrics, 'absolute inset-0 h-full w-full resize-none overflow-auto border-0 bg-transparent text-transparent caret-[var(--text-primary)] outline-none placeholder:text-fg-3 selection:bg-signal/30')}
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}
