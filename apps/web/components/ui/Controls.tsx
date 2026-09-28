'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import * as RadixProgress from '@radix-ui/react-progress';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '@/lib/cn';

export function Switch({ className, ...props }: React.ComponentProps<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border border-line-strong bg-raised transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-signal disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block h-[18px] w-[18px] translate-x-[2px] rounded-full bg-fg shadow transition-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-[var(--text-on-accent)]" />
    </RadixSwitch.Root>
  );
}

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="z-[300] rounded-control border border-line-strong bg-raised px-2.5 py-1.5 text-xs text-fg shadow-[var(--shadow-float)]"
          >
            {label}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

interface ProgressProps {
  value: number;
  label?: string;
  tone?: 'signal' | 'good' | 'live';
  className?: string;
}

const fills = { signal: 'bg-signal', good: 'bg-good', live: 'bg-live' };

export function Progress({ value, label, tone = 'signal', className }: ProgressProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <RadixProgress.Root
      value={pct}
      aria-label={label}
      className={cn('relative h-1.5 w-full overflow-hidden rounded-full bg-raised', className)}
    >
      <RadixProgress.Indicator
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fills[tone])}
        style={{ width: `${pct}%` }}
      />
    </RadixProgress.Root>
  );
}

export function Avatar({ name, src, size = 32, className }: { name?: string | null; src?: string | null; size?: number; className?: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? 'U';
  return (
    <RadixAvatar.Root
      className={cn('inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-signal/15 font-semibold text-signal', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {src && <RadixAvatar.Image src={src} alt={name ?? 'User'} className="h-full w-full object-cover" />}
      <RadixAvatar.Fallback delayMs={src ? 300 : 0}>{initial}</RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
