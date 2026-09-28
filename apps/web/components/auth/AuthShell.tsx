import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Wave } from '@/components/ui/Wave';

interface AuthShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
}

/** Shared frame for login, signup and onboarding: form on the left, a quiet product panel on wide screens. */
export function AuthShell({ title, description, children, footer, showBack = true }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="relative flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 rounded-control" aria-label="PrepSpace home">
            <Image src="/prepspace-logo.png" alt="" width={30} height={30} className="rounded-lg" priority />
            <span className="font-display text-[19px] font-bold tracking-tight text-fg">PrepSpace</span>
          </Link>
          {showBack && (
            <Link href="/" className="flex items-center gap-1.5 rounded-control px-2 py-1 text-sm text-fg-3 transition-colors hover:text-fg">
              <ArrowLeft size={15} aria-hidden /> Home
            </Link>
          )}
        </div>

        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-2 text-[15px] text-fg-2">{description}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-fg-3">{footer}</div>}
        </main>
      </div>

      <aside aria-hidden className="relative hidden flex-col justify-end overflow-hidden border-l border-line bg-panel p-12 lg:flex">
        <div className="mb-auto flex items-center gap-2.5 text-sm font-medium text-fg-2">
          <span className="live-dot" /> Live with Alex
        </div>
        <Wave bars={48} live className="h-24 w-full justify-between" />
        <p className="mt-8 max-w-sm font-display text-3xl font-semibold leading-tight tracking-tight text-fg">
          Say it out loud. Get scored on it. Fix what cost you points.
        </p>
      </aside>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" />
      <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26a5.43 5.43 0 0 1-8.07-2.85H.96v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.34z" />
      <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.34A5.36 5.36 0 0 1 9 3.58z" />
    </svg>
  );
}
