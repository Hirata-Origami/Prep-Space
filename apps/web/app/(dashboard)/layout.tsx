'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { Sidebar } from '@/components/shell/Sidebar';
import { BottomTabs, MobileHeader } from '@/components/shell/MobileNav';
import { CommandPalette } from '@/components/shell/CommandPalette';

import { GeminiKeyGateModal } from '@/components/auth/GeminiKeyGateModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, mutate } = useUser();
  const [mounted, setMounted] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const isIncomplete = !user.target_role || !user.target_company;
    if (isIncomplete && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [user, isLoading, pathname, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSignOut = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const isMissingKey = mounted && !!user && !user.has_gemini_key;

  return (
    <div className="dashboard-shell">
      <a
        href="#main"
        className="sr-only z-[300] rounded-control bg-signal px-4 py-2 text-sm font-semibold text-[var(--text-on-accent)] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <Sidebar pathname={pathname} user={user} mounted={mounted} onSignOut={handleSignOut} onOpenPalette={() => setPaletteOpen(true)} />

      <div className="relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
        <MobileHeader pathname={pathname} user={user} mounted={mounted} onSignOut={handleSignOut} />
        <main id="main" className="dashboard-main-content">
          {children}
        </main>
        <BottomTabs pathname={pathname} />
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onSignOut={handleSignOut} />

      {/* Force gate: user cannot use dashboard pages without a valid Gemini API key */}
      <GeminiKeyGateModal
        isOpen={isMissingKey}
        onKeySaved={() => {
          mutate();
        }}
      />
    </div>
  );
}
