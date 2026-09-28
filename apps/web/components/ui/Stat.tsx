import { cn } from '@/lib/cn';

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
}

/** Plain number, quiet label. Numbers are data, so they use the mono face. */
export function Stat({ label, value, hint, className }: StatProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[13px] text-fg-3">{label}</div>
      <div className="font-mono text-[28px] font-semibold leading-tight text-fg">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-fg-3">{hint}</div>}
    </div>
  );
}
