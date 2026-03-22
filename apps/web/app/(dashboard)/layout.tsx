'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
  Flame,
  Zap,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', group: 'main' },
  { icon: Map, label: 'Roadmaps', href: '/roadmap', group: 'main' },
  { icon: Mic, label: 'AI Interview', href: '/interview/new', group: 'main' },
  { icon: BarChart3, label: 'Reports', href: '/reports', group: 'main' },
  { icon: Building2, label: 'Mock Companies', href: '/mock-company', group: 'practice' },
  { icon: Users2, label: 'Peer Practice', href: '/peer-practice', group: 'practice' },
  { icon: Users, label: 'Groups', href: '/groups', group: 'practice' },
  { icon: FileUser, label: 'Resume Builder', href: '/resume', group: 'tools' },
  { icon: Trophy, label: 'Leaderboard', href: '/leaderboard', group: 'tools' },
  { icon: Building2, label: 'Recruiter Panel', href: '/recruiter', group: 'b2b' },
  { icon: Users2, label: 'Faculty Portal', href: '/faculty', group: 'b2b' },
  { icon: Settings, label: 'Settings', href: '/settings', group: 'settings' },
];

const GROUP_LABELS: Record<string, string> = {
  main: 'Menu',
  practice: 'Network',
  tools: 'Tools',
  b2b: 'Professional',
  settings: 'System',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (!isLoading && user) {
      const isIncomplete = !user.target_role || !user.target_company || !user.has_gemini_key;
      if (isIncomplete && pathname !== '/onboarding') {
        router.push('/onboarding');
      }
    }
  }, [user, isLoading, pathname, router]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        flexShrink: 0,
        background: 'rgba(8, 12, 20, 0.8)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        backdropFilter: 'blur(20px)',
        zIndex: 50,
      }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', padding: '0 12px', marginBottom: '32px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            background: 'linear-gradient(135deg, var(--accent-primary), #00D4FF)', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0,
            boxShadow: '0 0 20px rgba(77, 255, 160, 0.2)'
          }}>
            <Zap size={18} color="#080C14" strokeWidth={3} />
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>PrepSpace</span>
        </Link>

        {/* Nav groups */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {Object.entries(GROUP_LABELS).map(([group, groupLabel]) => {
            const items = NAV_ITEMS.filter(i => i.group === group);
            if (items.length === 0) return null;
            
            return (
              <div key={group}>
                {groupLabel && (
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0 12px', marginBottom: '12px', opacity: 0.6 }}>
                    {groupLabel}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {items.map(item => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: active ? 700 : 500,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: active ? 'rgba(77, 255, 160, 0.08)' : 'transparent',
                          color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          border: active ? '1px solid rgba(77, 255, 160, 0.15)' : '1px solid transparent',
                        }}
                      >
                        <Icon size={18} strokeWidth={active ? 2.5 : 2} style={{ opacity: active ? 1 : 0.7 }} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                        {item.href === '/settings' && !user?.has_gemini_key && (
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-amber)', boxShadow: '0 0 10px var(--accent-amber)' }} />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Status Card */}
        <div style={{ 
          marginTop: 'auto', 
          padding: '16px', 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '15px', 
              fontWeight: 800, 
              color: '#fff', 
              flexShrink: 0 
            }}>
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.full_name ?? 'Candidate'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {user?.level?.toUpperCase() ?? 'NOVICE'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
              <span>PROGRESS</span>
              <span>{(user?.xp ?? 0).toLocaleString()} XP</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                background: 'var(--accent-primary)', 
                width: `${Math.min(100, ((user?.xp ?? 0) % 1000) / 10)}%`,
                boxShadow: '0 0 10px var(--accent-primary-glow)' 
              }} />
            </div>
          </div>

          {user?.streak_days && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--accent-amber)' }}>
              <Flame size={12} fill="var(--accent-amber)" strokeWidth={0} />
              <span>{user.streak_days} DAY STREAK</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ 
        flex: 1, 
        height: '100vh', 
        overflowY: 'auto', 
        background: 'radial-gradient(circle at 50% -20%, rgba(77, 255, 160, 0.03), transparent 70%)',
        position: 'relative'
      }}>
        {children}
      </main>
    </div>
  );
}
