import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badge = cva('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold leading-relaxed', {
  variants: {
    tone: {
      neutral: 'border-line bg-raised text-fg-2',
      signal: 'border-signal/25 bg-signal/10 text-signal',
      good: 'border-good/25 bg-good/10 text-good',
      live: 'border-live/30 bg-live/10 text-live',
      bad: 'border-bad/30 bg-bad/10 text-bad',
      violet: 'border-violet/25 bg-violet/10 text-violet',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {}

export function Badge({ tone, className, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
