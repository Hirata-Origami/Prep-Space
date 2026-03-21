import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — PrepSpace',
  description: 'Your AI interview preparation dashboard',
};

export default function DashboardPage() {
  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Good evening 👋
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Ready for today&apos;s prep session?</p>
        </div>
        <a href="/interview/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>
          🎙 Start Interview
        </a>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Sessions Completed', value: '0', icon: '🎙', color: 'var(--accent-primary)' },
          { label: 'Avg Score', value: '—', icon: '📈', color: '#7B61FF' },
          { label: 'Day Streak', value: '0', icon: '🔥', color: '#FFB547' },
          { label: 'Readiness', value: '0%', icon: '🎯', color: 'var(--accent-primary)' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="surface" style={{ padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', color, marginBottom: '4px' }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Today's Focus Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(77,255,160,0.08) 0%, rgba(123,97,255,0.05) 100%)', borderColor: 'rgba(77,255,160,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Today&apos;s Focus</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Start with a Roadmap</h2>
            </div>
            <span className="badge badge-mint">Recommended</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
            You haven&apos;t created a roadmap yet. Start by uploading a job description or picking a career track — the AI will build a personalized prep plan calibrated to your current skills.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="/roadmap/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>Create Roadmap →</a>
            <a href="/mock-company" className="btn-secondary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>Browse Companies</a>
          </div>
        </div>

        {/* Streak / XP sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Streak Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Daily Streak</div>
              <span style={{ fontSize: '24px' }}>🔥</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#FFB547', marginBottom: '8px' }}>0</div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete a session today to start your streak!</p>
            <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i < 0 ? 'var(--accent-primary)' : 'var(--bg-elevated)' }} />
              ))}
            </div>
          </div>

          {/* Achievements preview */}
          <div className="card">
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>Next Achievement</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🌟</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>First Session</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete your first AI interview</div>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="card">
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>Quick Access</div>
            {[
              { label: '🏢 Mock Company Interview', href: '/mock-company' },
              { label: '👥 Find Peer Practice', href: '/peer-practice' },
              { label: '📝 Build Resume', href: '/resume' },
            ].map(({ label, href }) => (
              <a key={href} href={href} style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Roadmaps section */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>My Roadmaps</h2>
          <a href="/roadmap/new" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>+ New Roadmap</a>
        </div>
        {/* Empty state */}
        <div className="surface" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No roadmaps yet</div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Create your first personalized roadmap to get started</p>
          <a href="/roadmap/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', textDecoration: 'none' }}>Create Your First Roadmap</a>
        </div>
      </div>

      {/* Recent Sessions */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Sessions</h2>
          <a href="/reports" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>View all</a>
        </div>
        <div className="surface" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No sessions yet</div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Your interview history will appear here</p>
          <a href="/interview/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', textDecoration: 'none' }}>Start Your First Session</a>
        </div>
      </div>
    </div>
  );
}
