import Link from 'next/link';

const NAV_ITEMS = [
  { icon: '⬛', label: 'Dashboard', href: '/dashboard', group: 'main' },
  { icon: '🗺', label: 'Roadmaps', href: '/roadmap', group: 'main' },
  { icon: '🎙', label: 'AI Interview', href: '/interview', group: 'main' },
  { icon: '📊', label: 'Reports', href: '/reports', group: 'main' },
  { icon: '🏢', label: 'Mock Companies', href: '/mock-company', group: 'practice' },
  { icon: '👥', label: 'Peer Practice', href: '/peer-practice', group: 'practice' },
  { icon: '🤝', label: 'Groups', href: '/groups', group: 'practice' },
  { icon: '📝', label: 'Resume Builder', href: '/resume', group: 'tools' },
  { icon: '🏆', label: 'Leaderboard', href: '/leaderboard', group: 'tools' },
  { icon: '⚙', label: 'Settings', href: '/settings', group: 'settings' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const groups: Record<string, string> = { main: 'Menu', practice: 'Practice', tools: 'Tools', settings: '' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', flexShrink: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '8px', marginBottom: '24px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, color: '#080C14', flexShrink: 0 }}>P</div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>PrepSpace</span>
        </Link>

        {/* Nav groups */}
        <nav style={{ flex: 1 }}>
          {Object.entries(groups).map(([group, label]) => {
            const items = NAV_ITEMS.filter(i => i.group === group);
            return (
              <div key={group} style={{ marginBottom: '24px' }}>
                {label && <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 16px', marginBottom: '6px' }}>{label}</div>}
                {items.map(item => (
                  <Link key={item.href} href={item.href} className="sidebar-item">
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User card (placeholder) */}
        <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>U</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>User</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Free Plan</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <div style={{ flex: 1 }} className="progress-bar"><div className="progress-bar-fill" style={{ width: '35%' }} /></div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>350 XP</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trainee · 🔥 3 day streak</div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
