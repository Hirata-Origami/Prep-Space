'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';

const NAV_ITEMS = [
  { icon: '⬛', label: 'Dashboard', href: '/dashboard', group: 'main' },
  { icon: '🗺', label: 'Roadmaps', href: '/roadmap', group: 'main' },
  { icon: '🎙', label: 'AI Interview', href: '/interview/new', group: 'main' },
  { icon: '📊', label: 'Reports', href: '/reports', group: 'main' },
  { icon: '🏢', label: 'Mock Companies', href: '/mock-company', group: 'practice' },
  { icon: '👥', label: 'Peer Practice', href: '/peer-practice', group: 'practice' },
  { icon: '🤝', label: 'Groups', href: '/groups', group: 'practice' },
  { icon: '📝', label: 'Resume Builder', href: '/resume', group: 'tools' },
  { icon: '🏆', label: 'Leaderboard', href: '/leaderboard', group: 'tools' },
  { icon: '⚙', label: 'Settings', href: '/settings', group: 'settings' },
];

const GROUP_LABELS: Record<string, string> = {
  main: 'Menu',
  practice: 'Practice',
  tools: 'Tools',
  settings: '',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'rgba(14,20,33,0.95)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '8px', marginBottom: '24px' }}>
          <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, color: '#080C14', flexShrink: 0, boxShadow: '0 0 16px rgba(77,255,160,0.3)' }}>P</div>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>PrepSpace</span>
        </Link>

        {/* Nav groups */}
        <nav style={{ flex: 1 }}>
          {Object.entries(GROUP_LABELS).map(([group, groupLabel]) => {
            const items = NAV_ITEMS.filter(i => i.group === group);
            return (
              <div key={group} style={{ marginBottom: '24px' }}>
                {groupLabel && (
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '0 14px', marginBottom: '6px' }}>
                    {groupLabel}
                  </div>
                )}
                {items.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 14px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: active ? 700 : 500,
                        marginBottom: '2px',
                        transition: 'all 0.15s',
                        position: 'relative',
                        background: active ? 'rgba(77,255,160,0.1)' : 'transparent',
                        color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                        borderLeft: active ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: '15px', lineHeight: 1 }}>{item.icon}</span>
                      <span>{item.label}</span>
                      {item.href === '/settings' && !user?.has_gemini_key && (
                        <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#FFB547' }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.full_name ?? 'User'}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</div>
            </div>
          </div>
          {/* XP Progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ flex: 1 }} className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${Math.min(100, ((user?.xp ?? 0) % 1000) / 10)}%` }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontWeight: 700, flexShrink: 0 }}>
              {(user?.xp ?? 0).toLocaleString()} XP
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {user?.streak_days ? `🔥 ${user.streak_days} day streak` : '🎯 Start your first session'}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
