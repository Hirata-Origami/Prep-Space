'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReportsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    async function fetchSessions() {
      const cached = localStorage.getItem('prepspace_reports_cache');
      if (cached) {
        setSessions(JSON.parse(cached));
        setIsLoading(false);
      }

      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
          localStorage.setItem('prepspace_reports_cache', JSON.stringify(data.sessions || []));
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const filteredSessions = sessions.filter(s => {
    if (filter === 'All') return true;
    return s.interview_type?.toLowerCase() === filter.toLowerCase();
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Interview Reports</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Evidence-backed analysis with timestamped audio playback</p>
        </div>
        <Link href="/interview/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>+ New Session</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['All', 'Conceptual', 'Behavioral', 'System Design', 'Coding walkthrough'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px',
              borderRadius: '100px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              background: filter === f ? 'rgba(77,255,160,0.1)' : 'transparent',
              borderColor: filter === f ? 'var(--accent-primary)' : 'var(--border)',
              color: filter === f ? 'var(--accent-primary)' : 'var(--text-muted)'
            }}>
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
          Loading your reports...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>No reports found</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.7, marginBottom: '24px' }}>
            {filter === 'All'
              ? "Complete your first AI interview session and your detailed report will appear here."
              : `You haven't completed any ${filter} interviews yet.`}
          </p>
          <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 28px' }}>
            Start {filter === 'All' ? 'First' : 'New'} Interview →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
          {filteredSessions.map((session) => {
            const report = session.interview_reports?.[0];
            return (
              <Link
                key={session.id}
                href={report ? `/reports/${report.id}` : '#'}
                className="surface"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  textDecoration: 'none',
                  transition: 'transform 0.15s',
                  cursor: report ? 'pointer' : 'default',
                  opacity: report ? 1 : 0.7
                }}
                onMouseEnter={e => report && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => report && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(77,255,160,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {session.interview_type === 'behavioral' ? '🌟' : session.interview_type === 'system_design' ? '🏗️' : session.interview_type === 'coding_walkthrough' ? '💻' : '🧠'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {session.plan?.role || 'Technical Interview'}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '8px', textTransform: 'capitalize' }}>
                        • {session.interview_type?.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(session.created_at)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {session.state === 'COMPLETE' && report ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--accent-primary)' }}>{report.overall_score}%</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Score</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#FFB547', fontWeight: 600 }}>{session.state === 'IN_PROGRESS' ? '● In Progress' : '● Processing...'}</div>
                  )}
                  <div style={{ color: 'var(--text-muted)', fontSize: '18px' }}>→</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* What reports include */}
      <div style={{ marginTop: '48px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>What each report includes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {[
            { icon: '📡', title: 'Competency Radar', desc: '8-dimension chart with performance breakdown across key signals.' },
            { icon: '📝', title: 'Answer Analysis', desc: 'Question-by-question breakdown of your answers vs. ideal responses.' },
            { icon: '💡', title: 'Actionable Insights', desc: 'Specific strengths and improvement areas distilled by Gemini.' },
            { icon: '📈', title: 'Score Tracking', desc: 'Monitor your progress across multiple sessions to see improvement.' },
            { icon: '🗣', title: 'Communication Skills', desc: 'Evaluation of clarity, confidence, and conciseness.' },
            { icon: '🎯', title: 'Role Specifics', desc: 'Tailored feedback based on your target role and interview type.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="surface" style={{ padding: '18px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>{title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

