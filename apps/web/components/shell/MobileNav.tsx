'use client';

import Link from 'next/link';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Flame, LogOut, Menu, Moon, Settings, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Controls';
import { BOTTOM_TABS, isNavActive } from './nav';
import { Logo, NavList, ProgressChip, type ShellUser } from './Sidebar';

interface MobileNavProps {
  pathname: string;
  user?: ShellUser | null;
  mounted: boolean;
  onSignOut: () => void;
}

export function MobileHeader({ pathname, user, mounted, onSignOut }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = !mounted || resolvedTheme !== 'light';
  const close = () => setOpen(false);

  return (
    <header className="mobile-header h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-4">
      <Logo size={26} />
      <div className="flex items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 rounded-full border border-line bg-raised px-2.5 py-1 text-xs font-semibold text-live">
          <Flame size={13} className="fill-current" aria-hidden />
          <span className="font-mono">{mounted ? user?.streak_days || 1 : 1}d</span>
        </span>
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-10 w-10 items-center justify-center rounded-control text-fg-2 transition-colors hover:bg-raised hover:text-fg"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger
            aria-label="Open navigation"
            className="flex h-10 w-10 items-center justify-center rounded-control text-fg-2 transition-colors hover:bg-raised hover:text-fg"
          >
            <Menu size={20} />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[190] bg-[var(--bg-overlay)] backdrop-blur-sm lg:hidden" />
            <Dialog.Content className="fixed inset-y-0 left-0 z-[191] flex w-[288px] max-w-[86vw] flex-col border-r border-line-strong bg-panel shadow-[var(--shadow-float)] outline-none lg:hidden">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Dialog.Description className="sr-only">Move between PrepSpace sections</Dialog.Description>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <Logo />
                <Dialog.Close
                  aria-label="Close navigation"
                  className="flex h-10 w-10 items-center justify-center rounded-control text-fg-3 hover:bg-raised hover:text-fg"
                >
                  <X size={18} />
                </Dialog.Close>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <NavList pathname={pathname} onNavigate={close} dense />
              </div>
              <div className="space-y-3 border-t border-line p-3">
                <ProgressChip user={user} mounted={mounted} />
                <div className="flex items-center gap-2.5 px-1">
                  <Avatar name={user?.full_name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-fg">{mounted ? user?.full_name ?? 'Candidate' : 'Candidate'}</div>
                    <div className="truncate text-xs text-fg-3">{user?.email}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/settings"
                    onClick={close}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-control border border-line-strong bg-panel text-sm font-medium text-fg hover:bg-raised"
                  >
                    <Settings size={15} aria-hidden /> Settings
                  </Link>
                  <button
                    onClick={onSignOut}
                    className="flex h-10 items-center justify-center gap-2 rounded-control border border-bad/30 bg-bad/10 px-4 text-sm font-medium text-bad hover:bg-bad/20"
                  >
                    <LogOut size={15} aria-hidden /> Sign out
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}

export function BottomTabs({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Quick navigation"
      className="mobile-nav-bar fixed inset-x-0 bottom-0 z-40 h-16 items-stretch justify-around border-t border-line bg-panel/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl"
    >
      {BOTTOM_TABS.map(tab => {
        const active = isNavActive(pathname, tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', active ? 'text-signal' : 'text-fg-3')}
          >
            <Icon size={20} strokeWidth={active ? 2.25 : 1.8} aria-hidden />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
