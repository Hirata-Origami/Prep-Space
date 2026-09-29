'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useTheme } from 'next-themes';
import { CornerDownLeft, FilePlus, Github, LogOut, Map, Mic, Moon, Search, Sun, type LucideIcon } from 'lucide-react';
import { NAV_GROUPS } from './nav';
import { cn } from '@/lib/cn';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
}

/** Ctrl or Cmd + K: jump anywhere or start a common task without touching the mouse. */
export function CommandPalette({ open, onOpenChange, onSignOut }: CommandPaletteProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const pages: Command[] = NAV_GROUPS.flatMap(g => g.items.map(i => ({ id: i.href, label: i.label, hint: g.label, icon: i.icon, run: go(i.href) })));
    return [
      ...pages,
      { id: 'act-interview', label: 'Start a mock interview', hint: 'Action', icon: Mic, run: go('/interview'), keywords: 'practice voice alex' },
      { id: 'act-roadmap', label: 'Create a roadmap', hint: 'Action', icon: Map, run: go('/roadmap/new'), keywords: 'study plan jd' },
      { id: 'act-tailor', label: 'Tailor my resume to a job', hint: 'Action', icon: FilePlus, run: go('/resume'), keywords: 'jd cover letter ats' },
      { id: 'act-github', label: 'Index my GitHub projects', hint: 'Action', icon: Github, run: go('/resume'), keywords: 'repos private token' },
      { id: 'act-theme', label: resolvedTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme', hint: 'Action', icon: resolvedTheme === 'light' ? Moon : Sun, run: () => setTheme(resolvedTheme === 'light' ? 'dark' : 'light') },
      { id: 'act-signout', label: 'Sign out', hint: 'Action', icon: LogOut, run: onSignOut },
    ];
  }, [router, resolvedTheme, setTheme, onSignOut]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(c => `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) return;
    // reset after the close animation would have finished
    const t = setTimeout(() => { setQuery(''); setActive(0); }, 150);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (c?: Command) => {
    if (!c) return;
    onOpenChange(false);
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[250] bg-[var(--bg-overlay)] backdrop-blur-sm" />
        <Dialog.Content
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-[14vh] z-[251] w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-hero border border-line-strong bg-panel shadow-[var(--shadow-float)] outline-none"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">Search pages and actions. Use the arrow keys and Enter.</Dialog.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search size={16} className="shrink-0 text-fg-3" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setActive(0); }}
              placeholder="Search pages and actions"
              aria-label="Search pages and actions"
              className="h-12 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-3"
            />
            <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[11px] text-fg-3 sm:block">Esc</kbd>
          </div>
          <ul ref={listRef} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
            {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-3">Nothing matches “{query}”.</li>}
            {results.map((c, i) => {
              const Icon = c.icon;
              return (
                <li key={c.id} role="option" aria-selected={i === active} data-active={i === active}>
                  <button
                    type="button"
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(c)}
                    className={cn('flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm', i === active ? 'bg-raised text-fg' : 'text-fg-2')}
                  >
                    <Icon size={16} className={i === active ? 'text-signal' : 'text-fg-3'} aria-hidden />
                    <span className="flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="text-xs text-fg-3">{c.hint}</span>}
                    {i === active && <CornerDownLeft size={13} className="text-fg-3" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
