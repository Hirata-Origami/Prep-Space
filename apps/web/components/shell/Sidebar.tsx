'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronsUpDown, Flame, LogOut, Moon, Settings, Sun, Target } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Controls';
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from '@/components/ui/Dropdown';
import { NAV_GROUPS, isNavActive } from './nav';

export interface ShellUser {
  full_name?: string | null;
  email?: string | null;
  level?: string | null;
  streak_days?: number | null;
  xp?: number | null;
  target_role?: string | null;
  has_gemini_key?: boolean | null;
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 rounded-control px-1 py-0.5" aria-label="PrepSpace home">
      <Image src="/prepspace-logo.png" alt="" width={size} height={size} className="rounded-lg" priority />
      <span className="font-display text-[19px] font-bold tracking-tight text-fg">PrepSpace</span>
    </Link>
  );
}

export function NavList({ pathname, onNavigate, dense = false }: { pathname: string; onNavigate?: () => void; dense?: boolean }) {
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5">
      {NAV_GROUPS.map(group => (
        <div key={group.id}>
          <div className="px-3 pb-1.5 text-xs font-medium text-fg-3">{group.label}</div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map(item => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors',
                      dense ? 'h-11' : 'h-9',
                      active ? 'bg-raised text-fg' : 'text-fg-2 hover:bg-raised/60 hover:text-fg'
                    )}
                  >
                    {active && <span aria-hidden className="absolute -left-1 top-2 bottom-2 w-0.5 rounded-full bg-signal" />}
                    <Icon size={17} strokeWidth={active ? 2.25 : 1.85} className={cn('shrink-0', active ? 'text-signal' : 'text-fg-3 group-hover:text-fg-2')} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function ProgressChip({ user, mounted }: { user?: ShellUser | null; mounted: boolean }) {
  const streak = mounted ? user?.streak_days || 1 : 1;
  return (
    <div className="rounded-panel border border-line bg-raised/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-live">
          <Flame size={15} className="fill-current" aria-hidden />
          <span>{streak}-day streak</span>
        </div>
        <span className="font-mono text-xs font-medium text-fg-2">{mounted ? (user?.xp ?? 0).toLocaleString() : 0} XP</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-fg-3">
        <Target size={13} aria-hidden />
        <span className="truncate">{mounted ? user?.target_role || 'Software Engineer' : 'Software Engineer'}</span>
      </div>
    </div>
  );
}

export function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme !== 'light';
  return (
    <DropdownItem
      onSelect={e => {
        e.preventDefault();
        setTheme(isDark ? 'light' : 'dark');
      }}
    >
      {isDark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
      <span>{isDark ? 'Switch to light theme' : 'Switch to dark theme'}</span>
    </DropdownItem>
  );
}

export function UserMenu({ user, mounted, onSignOut }: { user?: ShellUser | null; mounted: boolean; onSignOut: () => void }) {
  const name = mounted ? user?.full_name ?? 'Candidate' : 'Candidate';
  return (
    <Dropdown>
      <DropdownTrigger className="flex w-full items-center gap-2.5 rounded-panel px-2 py-2 text-left transition-colors hover:bg-raised data-[state=open]:bg-raised">
        <Avatar name={name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-fg">{name}</div>
          <div className="truncate text-xs capitalize text-fg-3">{mounted ? user?.level ?? 'novice' : 'novice'}</div>
        </div>
        {mounted && !user?.has_gemini_key && <span title="Add your Gemini key in Settings" className="h-2 w-2 shrink-0 rounded-full bg-live" />}
        <ChevronsUpDown size={15} className="shrink-0 text-fg-3" aria-hidden />
      </DropdownTrigger>
      <DropdownContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
        <DropdownLabel>{user?.email ?? name}</DropdownLabel>
        <DropdownSeparator />
        <ThemeToggleItem />
        <DropdownItem asChild>
          <Link href="/settings">
            <Settings size={15} aria-hidden />
            <span>Settings</span>
          </Link>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem tone="danger" onSelect={onSignOut}>
          <LogOut size={15} aria-hidden />
          <span>Sign out</span>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

export function Sidebar({ pathname, user, mounted, onSignOut }: { pathname: string; user?: ShellUser | null; mounted: boolean; onSignOut: () => void }) {
  return (
    <aside className="dashboard-sidebar-desktop">
      <div className="shrink-0 px-4 pb-4 pt-5">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <NavList pathname={pathname} />
      </div>
      <div className="shrink-0 space-y-2 border-t border-line p-3">
        <ProgressChip user={user} mounted={mounted} />
        <UserMenu user={user} mounted={mounted} onSignOut={onSignOut} />
      </div>
    </aside>
  );
}
