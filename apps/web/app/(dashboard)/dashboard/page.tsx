'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';
import { useRoadmaps, useSessions } from '@/lib/hooks/useRoadmaps';

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div style={{
      padding: '24px',
      background: 'rgba(214, 115, 115, 0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', borderRadius: '50%', background: color, opacity: 0.06, transform: 'translate(20px,-20px)' }} />
      <div style={{ fontSize: '26px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'var(--font-mono)', color, marginBottom: '4px', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

function GeminiKeyBanner({ hasKey }: { hasKey: boolean }) {
  if (hasKey) return null;
  return (
    <div style={{
      padding: '16px 20px',
      background: 'linear-gradient(135deg, rgba(123,97,255,0.1), rgba(77,255,160,0.06))',
      border: '1px solid rgba(123,97,255,0.25)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '24px',
    }}>
      <div style={{ fontSize: '24px', flexShrink: 0 }}>🔑</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>Add your Gemini API key to unlock AI features</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>PrepSpace uses your personal Gemini key for roadmap generation, AI interviews, and report analysis.</div>
      </div>
      <Link href="/settings" style={{ flexShrink: 0, padding: '8px 18px', background: 'rgba(123,97,255,0.2)', border: '1px solid rgba(123,97,255,0.4)', borderRadius: '8px', color: '#7B61FF', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        Add Key →
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser();
  const { roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { sessions, isLoading: sessionsLoading } = useSessions();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && user && (!user.target_role || !user.target_company)) {
      router.push('/onboarding');
    }
  }, [user, userLoading, router]);

  if (userLoading || (!userLoading && user && (!user.target_role || !user.target_company))) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '24px', height: '24px', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /></div>;
  }

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.overall_score ?? 0), 0) / completedSessions.length)
    : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div style={{ padding: '32px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.2 }}>
            {greeting} {userLoading ? '👋' : `${firstName} 👋`}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            {user?.target_role ? `Preparing for ${user.target_role}` : 'Ready for today\'s prep session?'}
          </p>
        </div>
        <Link href="/interview/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 22px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎙</span> Start Interview
        </Link>
      </div>

      {/* Gemini Key Prompt */}
      <GeminiKeyBanner hasKey={user?.has_gemini_key ?? true} />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Sessions Completed" value={completedSessions.length} icon="🎙" color="var(--accent-primary)" />
        <StatCard label="Avg Score" value={avgScore !== null ? avgScore : '—'} icon="📈" color="#7B61FF" />
        <StatCard label="Day Streak" value={user?.streak_days ?? 0} icon="🔥" color="#FFB547" />
        <StatCard label="Total XP" value={user?.xp ? `${(user.xp).toLocaleString()}` : '0'} icon="⚡" color="var(--accent-primary)" />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Today's Focus Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(77,255,160,0.08) 0%, rgba(123,97,255,0.05) 100%)', borderColor: 'rgba(77,255,160,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Today&apos;s Focus</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {roadmaps.length > 0 ? roadmaps[0].title : 'Start with a Roadmap'}
              </h2>
            </div>
            <span className="badge badge-mint">Recommended</span>
          </div>

          {roadmaps.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Progress</span>
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>{roadmaps[0].progress_pct ?? 0}%</span>
              </div>
              <div className="progress-bar" style={{ marginBottom: '20px' }}>
                <div className="progress-bar-fill" style={{ width: `${roadmaps[0].progress_pct ?? 0}%` }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link href="/interview/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>Practice Session</Link>
                <Link href="/roadmap" className="btn-secondary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>View Roadmap</Link>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
                Create a personalized roadmap — paste a job description or pick a career track. The AI will build a prep plan calibrated to your skills.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link href="/roadmap/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>Create Roadmap →</Link>
                <Link href="/mock-company" className="btn-secondary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>Browse Companies</Link>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Streak */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Daily Streak</div>
              <span style={{ fontSize: '24px' }}>🔥</span>
            </div>
            <div style={{ fontSize: '42px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#FFB547', marginBottom: '6px', lineHeight: 1 }}>
              {userLoading ? '—' : user?.streak_days ?? 0}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {(user?.streak_days ?? 0) > 0 ? 'Keep going! Come back tomorrow.' : 'Complete a session today to start your streak!'}
            </p>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i < (user?.streak_days ?? 0) % 7 ? 'var(--accent-primary)' : 'var(--bg-elevated)' }} />
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="card">
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>Quick Access</div>
            {[
              { label: '🏢 Mock Company Interview', href: '/mock-company' },
              { label: '👥 Find Peer Practice', href: '/peer-practice' },
              { label: '📝 Build Resume', href: '/resume' },
              { label: '🏆 View Leaderboard', href: '/leaderboard' },
            ].map(({ label, href }) => (
              <Link key={href} href={href} style={{ display: 'block', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.15s' }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* My Roadmaps */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>My Roadmaps</h2>
          <Link href="/roadmap/new" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>+ New Roadmap</Link>
        </div>
        {roadmapsLoading ? (
          <div className="surface" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : roadmaps.length === 0 ? (
          <div className="surface" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No roadmaps yet</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Create your first personalized roadmap to get started</p>
            <Link href="/roadmap/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', textDecoration: 'none' }}>Create Your First Roadmap</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {roadmaps.map(r => (
              <Link key={r.id} href={`/roadmap/${r.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s', borderColor: r.status === 'active' ? 'rgba(77,255,160,0.2)' : 'var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px', marginBottom: '6px' }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>{r.role}</div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${r.progress_pct ?? 0}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.progress_pct ?? 0}% complete</span>
                    <span style={{ fontSize: '11px', color: r.status === 'active' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{r.status}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Sessions</h2>
          <Link href="/reports" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>View all</Link>
        </div>
        {sessionsLoading ? (
          <div className="surface" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="surface" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No sessions yet</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Your interview history will appear here</p>
            <Link href="/interview/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', textDecoration: 'none' }}>Start Your First Session</Link>
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {sessions.slice(0, 5).map((s, idx) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderBottom: idx < sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.overall_score && s.overall_score >= 80 ? 'rgba(77,255,160,0.15)' : 'rgba(123,97,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🎙</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.role || s.interview_type || 'Interview Session'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
                {s.overall_score != null && (
                  <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: s.overall_score >= 80 ? 'var(--accent-primary)' : s.overall_score >= 60 ? '#FFB547' : '#FF4D6A' }}>{s.overall_score}</div>
                )}
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '100px', fontWeight: 600, background: s.status === 'completed' ? 'rgba(77,255,160,0.1)' : 'rgba(255,181,71,0.1)', color: s.status === 'completed' ? 'var(--accent-primary)' : '#FFB547' }}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
