'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-control border border-line-strong bg-canvas px-3 text-sm text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-3 hover:border-[var(--border-strong)] focus:border-signal focus:shadow-[0_0_0_3px_var(--accent-primary-dim)] disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:border-bad';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (a11y: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}

/** Label above, hint or error below. Wires ids so screen readers announce both. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const noteId = hint || error ? `${id}-note` : undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-fg">
        {label}
      </label>
      {children({ id, 'aria-describedby': noteId, 'aria-invalid': error ? true : undefined })}
      {(error || hint) && (
        <p id={noteId} role={error ? 'alert' : undefined} className={cn('text-xs', error ? 'text-bad' : 'text-fg-3')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
