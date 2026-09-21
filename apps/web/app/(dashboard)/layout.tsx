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
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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
    <div className="dashboard-shell">
      {/* Theme-Adaptive Desktop Sidebar */}
      <aside className="dashboard-sidebar-desktop">
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

          {/* Daily Prep & Progress Widget in Sidebar */}
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

      {/* Main Container (Header + Content + Bottom Nav on mobile) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden', position: 'relative' }}>
        {/* Mobile Top Header (< 1024px) */}
        <header
          style={{
            height: '56px',
            flexShrink: 0,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 40,
          }}
          className="mobile-header"
        >
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <Image src="/prepspace-logo.png" alt="PrepSpace" width={26} height={26} style={{ borderRadius: '6px' }} />
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>PrepSpace</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Mobile streak badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '100px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent-amber)',
              }}
            >
              <Flame size={12} fill="#FFB547" />
              <span>{mounted ? `${user?.streak_days ?? 1}d` : '1d'}</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={cycleTheme}
              aria-label="Toggle theme"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {(() => { const ThemeIcon = THEME_ICON_MAP[currentTheme]; return <ThemeIcon size={15} />; })()}
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileNavOpen(prev => !prev)}
              aria-label="Toggle navigation"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: mobileNavOpen ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
                border: `1px solid ${mobileNavOpen ? 'var(--accent-primary)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: mobileNavOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileNavOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 90,
                }}
                className="lg:hidden"
              />

              {/* Drawer Content */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: '280px',
                  maxWidth: '85vw',
                  background: 'var(--bg-surface)',
                  borderRight: '1px solid var(--border)',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
                }}
                className="lg:hidden"
              >
                {/* Header with logo & close */}
                <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
                  <Link href="/dashboard" onClick={() => setMobileNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                    <Image src="/prepspace-logo.png" alt="PrepSpace" width={28} height={28} style={{ borderRadius: '7px' }} />
                    <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>PrepSpace</span>
                  </Link>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Nav links scroll area */}
                <nav style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                  {NAV_GROUPS.map(group => (
                    <div key={group.id} style={{ marginBottom: '12px' }}>
                      <div style={{ padding: '6px 10px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {group.label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {group.items.map(item => {
                          const active = isActive(item.href);
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileNavOpen(false)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: active ? 700 : 500,
                                background: active ? 'var(--accent-primary-dim)' : 'transparent',
                                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                border: active ? '1px solid rgba(77, 255, 160, 0.2)' : '1px solid transparent',
                              }}
                            >
                              <Icon size={17} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Streak & XP Widget in drawer */}
                  <div style={{ margin: '8px 4px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                        <Flame size={14} fill="#FFB547" />
                        <span>{mounted ? `${user?.streak_days ?? 1} Day Streak` : '1 Day Streak'}</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {mounted ? `${(user?.xp ?? 0).toLocaleString()} XP` : '0 XP'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Target: <strong style={{ color: 'var(--text-secondary)' }}>{mounted ? (user?.target_role || 'Software Engineer') : 'Software Engineer'}</strong>
                    </div>
                  </div>
                </nav>

                {/* Bottom User Info & Actions */}
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                      {mounted ? (user?.full_name?.[0]?.toUpperCase() ?? 'U') : 'U'}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mounted ? (user?.full_name ?? 'Candidate') : 'Candidate'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>
                        {mounted ? (user?.level?.toUpperCase() ?? 'NOVICE') : 'NOVICE'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link
                      href="/settings"
                      onClick={() => setMobileNavOpen(false)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '8px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <Settings size={13} />
                      <span>Settings</span>
                    </Link>

                    <button
                      onClick={handleSignOut}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 77, 106, 0.1)',
                        border: '1px solid rgba(255, 77, 106, 0.25)',
                        color: 'var(--accent-red)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <LogOut size={13} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="dashboard-main-content">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (< 1024px) */}
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border)',
            alignItems: 'center',
            justifyContent: 'space-around',
            zIndex: 40,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          className="mobile-nav-bar"
        >
          {[
            { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
            { label: 'Roadmap', icon: Map, href: '/roadmap' },
            { label: 'AI Interview', icon: Mic, href: '/interview' },
            { label: 'Reports', icon: BarChart3, href: '/reports' },
            { label: 'Resume', icon: FileUser, href: '/resume' },
          ].map(tab => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  textDecoration: 'none',
                  flex: 1,
                  height: '100%',
                  color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                  transition: 'color 0.15s',
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
                  {active && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-6px',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        boxShadow: '0 0 6px var(--accent-primary)',
                      }}
                    />
                  )}
                </div>
                <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500 }}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
