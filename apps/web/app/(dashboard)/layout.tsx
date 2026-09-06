'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useUser } from '@/lib/hooks/useUser';

import {
  LayoutDashboard,
  Map,
  Mic,
  BarChart3,
  Building2,
  Users,
  FileUser,
  Trophy,
  Settings,
  ChevronDown,
  LogOut,
  Flame,
  Target,
  Sun,
  Moon,
} from 'lucide-react';

type AppTheme = 'light' | 'dark';
const THEME_LABELS: Record<AppTheme, string> = { light: 'Light', dark: 'Dark' };
const THEME_ICON_MAP: Record<AppTheme, React.ElementType> = { light: Sun, dark: Moon };

const NAV_GROUPS = [
  {
    id: 'main',
    label: 'Studio',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Map, label: 'Roadmaps', href: '/roadmap' },
      { icon: Mic, label: 'AI Interview', href: '/interview' },
      { icon: BarChart3, label: 'Reports', href: '/reports' },
    ],
  },
  {
    id: 'practice',
    label: 'Community',
    items: [
      { icon: Building2, label: 'Mock Companies', href: '/mock-company' },
      { icon: Users, label: 'Groups', href: '/groups' },
    ],
  },
  {
    id: 'tools',
    label: 'Career Tools',
    items: [
      { icon: FileUser, label: 'Resume Builder', href: '/resume' },
      { icon: Trophy, label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUser();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>('light');

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('prepspace_theme');
      const validTheme: AppTheme = saved === 'dark' ? 'dark' : 'light';
      setCurrentTheme(validTheme);
      document.documentElement.dataset.theme = validTheme;
    } catch {}
  }, []);

  const cycleTheme = useCallback(() => {
    const next: AppTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(next);
    try {
      localStorage.setItem('prepspace_theme', next);
      document.documentElement.dataset.theme = next;
    } catch {}
  }, [currentTheme]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const isIncomplete = !user.target_role || !user.target_company || !user.has_gemini_key;
    if (isIncomplete && pathname !== '/onboarding') {
      router.push('/onboarding');
    }
  }, [user, isLoading, pathname, router]);

  // Close user menu on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const toggleGroup = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSignOut = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Theme-Adaptive Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        zIndex: 50,
        overflow: 'hidden',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}>
        {/* Logo — fixed top */}
        <div style={{ padding: '20px 16px 16px', flexShrink: 0 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '4px 8px' }}>
            <Image src="/prepspace-logo.png" alt="PrepSpace" width={30} height={30} style={{ borderRadius: '8px', flexShrink: 0 }} />
            <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>PrepSpace</span>
          </Link>
        </div>

        {/* Scrollable nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 10px', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          {NAV_GROUPS.map(group => {
            const isCollapsed = collapsed[group.id];
            return (
              <div key={group.id} style={{ marginBottom: '6px' }}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    margin: '6px 0 2px',
                    borderRadius: '6px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    {group.label}
                  </span>
                  <ChevronDown
                    size={12}
                    style={{
                      color: 'var(--text-muted)',
                      transition: 'transform 0.2s',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Items */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.items.map(item => {
                      const active = isActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 10px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '13.5px',
                            fontWeight: active ? 700 : 500,
                            transition: 'all 0.15s ease',
                            background: active ? 'var(--accent-primary-dim)' : 'transparent',
                            color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: active ? '1px solid rgba(77, 255, 160, 0.2)' : '1px solid transparent',
                          }}
                        >
                          <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Daily Prep & Progress Widget in Sidebar (eliminates empty feeling) */}
          <div style={{
            margin: '16px 4px 8px',
            padding: '12px',
            background: 'var(--bg-elevated)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                <Flame size={14} fill="#FFB547" />
                <span>{mounted ? (user?.streak_days ? `${user.streak_days} Day Streak` : '1 Day Streak') : '1 Day Streak'}</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {mounted ? `${(user?.xp ?? 0).toLocaleString()} XP` : '0 XP'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Target size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mounted ? (user?.target_role || 'Software Engineer') : 'Software Engineer'}
              </span>
            </div>
          </div>
        </nav>

        {/* User avatar + dropdown — fixed bottom */}
        <div style={{ flexShrink: 0, padding: '12px 14px', borderTop: '1px solid var(--border)', position: 'relative' }} ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '10px',
              background: userMenuOpen ? 'var(--bg-elevated)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Avatar circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
              }}>
              {mounted ? (user?.full_name?.[0]?.toUpperCase() ?? 'U') : 'U'}
            </div>
            <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mounted ? (user?.full_name ?? 'Candidate') : 'Candidate'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {mounted ? `${user?.level?.toUpperCase() ?? 'NOVICE'} ${user?.streak_days ? `· ${user.streak_days}d` : ''}` : 'NOVICE'}
              </div>
            </div>
            {mounted && !user?.has_gemini_key && (
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-amber)', boxShadow: '0 0 8px var(--accent-amber)', flexShrink: 0 }} />
            )}
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0, transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
          </button>

          {/* Dropdown popover */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '12px',
              right: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.3)',
              zIndex: 100,
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name ?? 'Candidate'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>

              <div style={{ padding: '4px' }}>
                {/* Theme toggle */}
                <button
                  onClick={cycleTheme}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {(() => { const ThemeIcon = THEME_ICON_MAP[currentTheme]; return <ThemeIcon size={14} />; })()}
                  <span style={{ flex: 1 }}>Theme: {THEME_LABELS[currentTheme]}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>NEXT →</span>
                </button>

                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Settings size={14} />
                  <span>Settings</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    color: 'var(--accent-red)',
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)', position: 'relative' }}>
        {children}
      </main>
    </div>
  );
}
