'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@/lib/hooks/useUser';

import {
  LayoutDashboard,
  Map,
  Mic,
  BarChart3,
  Building2,
  Users2,
  Users,
  FileUser,
  Trophy,
  Settings,
  Zap,
  ChevronDown,
  LogOut
} from 'lucide-react';

const NAV_GROUPS = [
  {
    id: 'main',
    label: 'Menu',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: Map, label: 'Roadmaps', href: '/roadmap' },
      { icon: Mic, label: 'AI Interview', href: '/interview/new' },
      { icon: BarChart3, label: 'Reports', href: '/reports' },
    ],
  },
  {
    id: 'practice',
    label: 'Network',
    items: [
      { icon: Building2, label: 'Mock Companies', href: '/mock-company' },
      { icon: Users2, label: 'Peer Practice', href: '/peer-practice' },
      { icon: Users, label: 'Groups', href: '/groups' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { icon: FileUser, label: 'Resume Builder', href: '/resume' },
      { icon: Trophy, label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
  {
    id: 'b2b',
    label: 'Professional',
    items: [
      { icon: Building2, label: 'Recruiter Panel', href: '/recruiter' },
      { icon: Users2, label: 'Faculty Portal', href: '/faculty' },
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only fire when loading is definitively complete (not just cache-miss loading)
    // to prevent blocking navigation for up to 60 seconds.
    if (isLoading) return;
    if (!user) {
      // No user at all — send to login
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
    router.push('/auth/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'rgba(8, 12, 20, 0.92)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backdropFilter: 'blur(20px)',
        zIndex: 50,
        overflow: 'hidden',
      }}>
        {/* Logo — fixed top */}
        <div style={{ padding: '20px 16px 16px', flexShrink: 0 }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '4px 8px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              background: 'linear-gradient(135deg, var(--accent-primary), #00D4FF)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(77, 255, 160, 0.25)',
            }}>
              <Zap size={16} color="#080C14" strokeWidth={3} />
            </div>
            <span style={{ fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>PrepSpace</span>
          </Link>
        </div>

        {/* Scrollable nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 10px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          {NAV_GROUPS.map(group => {
            const isCollapsed = collapsed[group.id];
            return (
              <div key={group.id} style={{ marginBottom: '4px' }}>
                {/* Group header — click to collapse */}
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
                    margin: '8px 0 4px',
                    borderRadius: '6px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6 }}>
                    {group.label}
                  </span>
                  <ChevronDown
                    size={12}
                    style={{
                      color: 'var(--text-muted)',
                      opacity: 0.5,
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
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '9px 10px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '13.5px',
                            fontWeight: active ? 700 : 500,
                            transition: 'all 0.15s',
                            background: active ? 'rgba(77, 255, 160, 0.09)' : 'transparent',
                            color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            border: active ? '1px solid rgba(77, 255, 160, 0.15)' : '1px solid transparent',
                          }}
                        >
                          <Icon size={16} strokeWidth={active ? 2.5 : 2} style={{ opacity: active ? 1 : 0.65, flexShrink: 0 }} />
                          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {/* Bottom padding for scroll */}
          <div style={{ height: '12px' }} />
        </nav>

        {/* User avatar + dropdown — fixed bottom, never scrolls */}
        <div style={{ flexShrink: 0, padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative' }} ref={userMenuRef}>
          {/* User Avatar Row */}
          <button
            onClick={() => setUserMenuOpen(v => !v)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '10px',
              background: userMenuOpen ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!userMenuOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
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
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

          {/* Dropdown popover — opens upward */}
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
              boxShadow: '0 -8px 30px rgba(0,0,0,0.4)',
              zIndex: 100,
            }}>
              {/* User info */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name ?? 'Candidate'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
                {/* XP bar */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>XP</span><span>{(user?.xp ?? 0).toLocaleString()}</span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${Math.min(100, ((user?.xp ?? 0) % 1000) / 10)}%` }} />
                  </div>
                </div>
              </div>

              {/* Menu items */}
              {[
                { icon: Settings, label: 'Settings', href: '/settings', badge: !user?.has_gemini_key },
              ].map(({ icon: Icon, label, href, badge }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setUserMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    textDecoration: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={14} style={{ opacity: 0.7, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-amber)' }} />}
                </Link>
              ))}

              <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />

              <button
                onClick={handleSignOut}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FF4D6A',
                  fontSize: '13px',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,77,106,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={14} style={{ flexShrink: 0 }} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content — independent scroll */}
      <main style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        background: 'radial-gradient(circle at 50% -20%, rgba(77, 255, 160, 0.03), transparent 70%)',
        position: 'relative',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}
