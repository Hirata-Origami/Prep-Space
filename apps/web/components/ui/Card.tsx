import { cn } from '@/lib/cn';

type Tone = 'flat' | 'raised' | 'interactive';

const tones: Record<Tone, string> = {
  flat: 'border-line bg-panel',
  raised: 'border-line bg-raised',
  interactive:
    'border-line bg-panel transition-colors duration-150 hover:border-line-strong hover:bg-raised focus-visible:border-line-strong',
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padded?: boolean;
}

export function Card({ tone = 'flat', padded = true, className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-panel border shadow-[var(--shadow-panel)]', tones[tone], padded && 'p-5', className)}
      {...props}
    />
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-fg-3">{description}</p>}
      </div>
      {action}
    </div>
  );
}
