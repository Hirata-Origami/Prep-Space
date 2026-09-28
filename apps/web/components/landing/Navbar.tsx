'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/cn';
import { ButtonLink } from '@/components/ui/Button';

const NAV_LINKS = [
  { label: 'How it works', href: '#how' },
  { label: 'Features', href: '#features' },
  { label: 'Newsletter', href: '#newsletter' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[100] transition-[background-color,border-color] duration-200',
        scrolled || open ? 'border-b border-line bg-canvas/85 backdrop-blur-xl' : 'border-b border-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-control" aria-label="PrepSpace home">
          <Image src="/prepspace-logo.png" alt="" width={30} height={30} className="rounded-lg" priority />
          <span className="font-display text-[19px] font-bold tracking-tight text-fg">PrepSpace</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className="rounded-control px-3 py-2 text-sm font-medium text-fg-2 transition-colors hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex h-10 w-10 items-center justify-center rounded-control text-fg-2 transition-colors hover:bg-raised hover:text-fg"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <ButtonLink href="/auth/login" variant="ghost" className="hidden sm:inline-flex">
            Log in
          </ButtonLink>
          <ButtonLink href="/auth/signup" size="md" className="hidden sm:inline-flex">
            Get started
          </ButtonLink>
          <button
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-control text-fg-2 transition-colors hover:bg-raised hover:text-fg md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line px-4 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-control px-2 py-3 text-base font-medium text-fg-2 hover:text-fg">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex gap-2">
            <ButtonLink href="/auth/login" variant="secondary" className="flex-1">
              Log in
            </ButtonLink>
            <ButtonLink href="/auth/signup" className="flex-1">
              Get started
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
