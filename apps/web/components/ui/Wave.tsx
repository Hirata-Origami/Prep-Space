import { cn } from '@/lib/cn';

interface WaveProps {
  bars?: number;
  live?: boolean;
  className?: string;
}

/**
 * The PrepSpace signature: a voice waveform. Static when idle, animated
 * only while `live` (and never when the user prefers reduced motion).
 */
export function Wave({ bars = 32, live = false, className }: WaveProps) {
  return (
    <div aria-hidden className={cn('flex h-12 items-center gap-[3px]', className)}>
      {Array.from({ length: bars }, (_, i) => {
        const base = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
        return (
          <span
            key={i}
            className={cn('h-full w-[3px] rounded-full', live ? 'bg-live' : 'bg-fg-3/50')}
            style={{
              transform: `scaleY(${base})`,
              animation: live ? `wave ${0.9 + (i % 7) * 0.13}s ease-in-out ${(i % 5) * -0.2}s infinite` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
