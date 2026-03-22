'use client';

export default function LeaderboardPage() {
  const mockUsers = [
    { rank: 1, name: 'Arjun P.', role: 'Frontend → Google', xp: 4820, streak: 42, score: 94, medal: '🥇', trend: '+2' },
    { rank: 2, name: 'Sarah M.', role: 'Full Stack → Meta', xp: 4510, streak: 35, score: 91, medal: '🥈', trend: '+1' },
    { rank: 3, name: 'Marcus T.', role: 'ML → Anthropic', xp: 4280, streak: 28, score: 89, medal: '🥉', trend: '-1' },
    { rank: 4, name: 'Priya K.', role: 'Backend → Stripe', xp: 3940, streak: 21, score: 87, medal: '', trend: '+3' },
    { rank: 5, name: 'James L.', role: 'PM → Netflix', xp: 3760, streak: 14, score: 85, medal: '', trend: '-2' },
    { rank: 6, name: 'Amara O.', role: 'System Design', xp: 3510, streak: 18, score: 83, medal: '', trend: '0' },
    { rank: 7, name: 'Wei C.', role: 'Data Scientist', xp: 3280, streak: 11, score: 81, medal: '', trend: '+4' },
    { rank: 8, name: 'Raj S.', role: 'Cloud Architect', xp: 3120, streak: 9, score: 80, medal: '', trend: '-1' },
    { rank: 9, name: 'Elena V.', role: 'iOS Engineer', xp: 2970, streak: 7, score: 78, medal: '', trend: '+2' },
    { rank: 10, name: 'Carlos M.', role: 'Security Eng.', xp: 2840, streak: 5, score: 77, medal: '', trend: '-3' },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>🏆 Global Leaderboard</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>This week's top performers ranked by XP, score, and consistency</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['Global', 'My Groups', 'Frontend Track', 'This Week', 'All Time'].map((f, i) => (
          <button key={f} style={{ padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', background: i === 0 ? 'var(--accent-primary-dim)' : 'transparent', borderColor: i === 0 ? 'var(--accent-primary)' : 'var(--border)', color: i === 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '16px', marginBottom: '28px', alignItems: 'end' }}>
        {/* 2nd */}
        <div className="card" style={{ padding: '20px', textAlign: 'center', borderColor: 'rgba(192,192,192,0.3)' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥈</div>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #B8C4E0, #6B7A99)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#080C14', margin: '0 auto 10px' }}>S</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Sarah M.</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Full Stack → Meta</div>
          <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#B8C4E0' }}>4,510 XP</div>
        </div>
        {/* 1st */}
        <div className="card glow-mint" style={{ padding: '24px', textAlign: 'center', borderColor: 'rgba(77,255,160,0.4)', background: 'rgba(77,255,160,0.04)' }}>
          <div style={{ fontSize: '44px', marginBottom: '8px' }}>🥇</div>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#080C14', margin: '0 auto 10px' }}>A</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Arjun P.</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Frontend → Google</div>
          <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>4,820 XP</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>🔥 42-day streak</div>
        </div>
        {/* 3rd */}
        <div className="card" style={{ padding: '20px', textAlign: 'center', borderColor: 'rgba(205,127,50,0.3)' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥉</div>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #CD7F32, #8B5E3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 auto 10px' }}>M</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Marcus T.</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>ML → Anthropic</div>
          <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#CD7F32' }}>4,280 XP</div>
        </div>
      </div>

      {/* Full table */}
      <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              {['Rank', 'Candidate', 'Weekly XP', '🔥 Streak', 'Avg Score', 'Trend'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Rank' ? 'center' : 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockUsers.slice(3).map((u) => (
              <tr key={u.rank} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>#{u.rank}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{u.name[0]}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.role}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>{u.xp.toLocaleString()}</td>
                <td style={{ padding: '14px 16px', fontSize: '14px', color: u.streak > 20 ? '#FFB547' : 'var(--text-secondary)' }}>🔥 {u.streak}d</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: u.score >= 85 ? 'var(--accent-primary)' : u.score >= 80 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>{u.score}</span>
                    <div className="progress-bar" style={{ width: '60px' }}>
                      <div className="progress-bar-fill" style={{ width: `${u.score}%` }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: u.trend.startsWith('+') ? 'var(--accent-primary)' : u.trend === '0' ? 'var(--text-muted)' : '#FF4D6A' }}>
                  {u.trend === '0' ? '—' : u.trend.startsWith('+') ? `↑${u.trend.slice(1)}` : `↓${u.trend.slice(1)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Your position */}
      <div style={{ marginTop: '16px', padding: '16px 20px', background: 'rgba(77,255,160,0.06)', borderRadius: '10px', border: '1px solid rgba(77,255,160,0.2)', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#—</div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #4DFFA0, #7B61FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#080C14' }}>Y</div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>You</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Complete your first session to appear on the leaderboard</div>
        </div>
        <a href="/interview/new" className="btn-primary" style={{ marginLeft: 'auto', fontSize: '13px', padding: '8px 18px', textDecoration: 'none' }}>Start Session</a>
      </div>
    </div>
  );
}
