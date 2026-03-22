'use client';

import { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface LeaderboardUser {
  rank: number;
  id: string;
  full_name: string;
  avatar_url?: string;
  xp: number;
  streak_days: number;
  target_role?: string;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const PERIODS = ['Weekly', 'Monthly', 'All Time'];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('Weekly');

  const { data, isLoading } = useSWR<{ users: LeaderboardUser[]; userRank: number | null }>(
    `/api/leaderboard?period=${period.toLowerCase().replace(' ', '_')}`,
    fetcher
  );

  const users = data?.users ?? [];
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>🏆 Global Leaderboard</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Top performers ranked by XP earned and consistency</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: '7px 18px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', background: period === p ? 'var(--accent-primary-dim)' : 'transparent', borderColor: period === p ? 'var(--accent-primary)' : 'var(--border)', color: period === p ? 'var(--accent-primary)' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {p}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="surface" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading leaderboard…</div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '16px', marginBottom: '24px', alignItems: 'end' }}>
              {/* 2nd */}
              <div className="card" style={{ padding: '20px', textAlign: 'center', borderColor: top3[1] ? 'rgba(192,192,192,0.3)' : 'var(--border)' }}>
                {top3[1] ? (
                  <>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥈</div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #B8C4E0, #6B7A99)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#080C14', margin: '0 auto 10px' }}>
                      {top3[1].full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{top3[1].full_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{top3[1].target_role ?? 'Candidate'}</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#B8C4E0' }}>{(top3[1].xp).toLocaleString()} XP</div>
                  </>
                ) : <div style={{ opacity: 0.3, fontSize: '32px' }}>—</div>}
              </div>

              {/* 1st */}
              <div className="card glow-mint" style={{ padding: '24px', textAlign: 'center', borderColor: 'rgba(77,255,160,0.4)', background: 'rgba(77,255,160,0.04)' }}>
                {top3[0] ? (
                  <>
                    <div style={{ fontSize: '44px', marginBottom: '8px' }}>🥇</div>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#080C14', margin: '0 auto 10px' }}>
                      {top3[0].full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{top3[0].full_name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{top3[0].target_role ?? 'Candidate'}</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{(top3[0].xp).toLocaleString()} XP</div>
                    {top3[0].streak_days > 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>🔥 {top3[0].streak_days}-day streak</div>}
                  </>
                ) : <div style={{ opacity: 0.3 }}>—</div>}
              </div>

              {/* 3rd */}
              <div className="card" style={{ padding: '20px', textAlign: 'center', borderColor: top3[2] ? 'rgba(205,127,50,0.3)' : 'var(--border)' }}>
                {top3[2] ? (
                  <>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🥉</div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #CD7F32, #8B5E3C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 auto 10px' }}>
                      {top3[2].full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{top3[2].full_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{top3[2].target_role ?? 'Candidate'}</div>
                    <div style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#CD7F32' }}>{(top3[2].xp).toLocaleString()} XP</div>
                  </>
                ) : <div style={{ opacity: 0.3 }}>—</div>}
              </div>
            </div>
          )}

          {/* Rest of table */}
          {rest.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    {['Rank', 'Candidate', 'XP', '🔥 Streak'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Rank' ? 'center' : 'left', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'default' }}>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>#{u.rank}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{u.full_name?.[0]?.toUpperCase() ?? '?'}</div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.full_name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.target_role ?? 'Candidate'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>{(u.xp ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: u.streak_days > 20 ? '#FFB547' : 'var(--text-secondary)' }}>🔥 {u.streak_days || 0}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {users.length === 0 && (
            <div className="surface" style={{ padding: '64px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Be the first on the leaderboard!</div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>Complete your first interview session to earn XP and appear here.</p>
              <a href="/interview/new" className="btn-primary" style={{ textDecoration: 'none', fontSize: '14px', padding: '10px 24px' }}>Start a Session</a>
            </div>
          )}

          {/* Your position */}
          {data?.userRank && (
            <div style={{ marginTop: '16px', padding: '16px 20px', background: 'rgba(77,255,160,0.06)', borderRadius: '10px', border: '1px solid rgba(77,255,160,0.2)', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>#{data.userRank}</div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #4DFFA0, #7B61FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#080C14' }}>Y</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>You</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your current global rank</div>
              </div>
              <a href="/interview/new" className="btn-primary" style={{ marginLeft: 'auto', fontSize: '13px', padding: '8px 18px', textDecoration: 'none' }}>Earn XP</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
