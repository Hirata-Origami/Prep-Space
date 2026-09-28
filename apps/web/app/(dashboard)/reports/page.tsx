'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';

interface SessionItem {
  id: string;
  created_at: string;
  state: string;
  duration_seconds?: number;
  interview_type?: string;
  plan?: { role?: string; topic?: string };
  interview_reports?: Array<{
    id: string;
    overall_score?: number;
    hire_recommendation?: string;
    generated_at?: string;
  }>;
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, error, isLoading } = useSWR<{ sessions: SessionItem[] }>(
    '/api/sessions',
    (url: string) => fetch(url).then(r => r.json()),
    { revalidateOnFocus: false }
  );

  const sessions = data?.sessions || [];
  const showLoading = !mounted || (isLoading && sessions.length === 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'behavioral': return '🤝';
      case 'system_design': return '🏛️';
      case 'coding_walkthrough': return '💻';
      default: return '🧠';
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Interview Reports</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Evidence-backed analysis with timestamped audio playback</p>
        </div>
        <Link href="/interview" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>
          + New Session
        </Link>
      </div>

      {showLoading ? (
        <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(var(--accent-primary-rgb), 0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
          Loading your reports...
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>📊</div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>No reports found</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.7, marginBottom: '24px' }}>
            Complete your first AI interview session and your detailed report and scoring analysis will appear here.
          </p>
          <Link href="/interview" className="btn-primary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 28px' }}>
            Start First Interview →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
          {sessions.map((session) => {
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
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  cursor: report ? 'pointer' : 'default',
                  opacity: report ? 1 : 0.75,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  flexWrap: 'wrap',
                }}
                onMouseEnter={e => report && (e.currentTarget.style.borderColor = 'rgba(var(--accent-primary-rgb), 0.3)')}
                onMouseLeave={e => report && (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(var(--accent-primary-rgb), 0.08)',
                    border: '1px solid rgba(var(--accent-primary-rgb), 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0,
                  }}>
                    {getTypeIcon(session.interview_type)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.plan?.role || 'Technical Interview'}
                      <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600, marginLeft: '8px', textTransform: 'capitalize' }}>
                        • {session.interview_type?.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(session.created_at)}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  {session.state === 'COMPLETE' && report ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent-primary)' }}>{report.overall_score}%</div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--accent-amber)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {session.state === 'IN_PROGRESS' ? '● In Progress' : '● Processing...'}
                    </div>
                  )}
                  <div style={{ color: 'var(--text-muted)', fontSize: '18px' }}>→</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* What reports include */}
      <div style={{ marginTop: '56px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>What each report includes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {[
            { icon: '🎯', title: 'Competency Radar', desc: '8-dimension chart with performance breakdown across key signals.' },
            { icon: '📝', title: 'Answer Analysis', desc: 'Question-by-question breakdown of your answers vs. ideal responses.' },
            { icon: '⚡', title: 'Actionable Insights', desc: 'Specific strengths and improvement areas distilled by Gemini.' },
            { icon: '📈', title: 'Score Tracking', desc: 'Monitor your progress across multiple sessions to see improvement.' },
            { icon: '🗣️', title: 'Communication Skills', desc: 'Evaluation of clarity, confidence, and conciseness.' },
            { icon: '💼', title: 'Role Specifics', desc: 'Tailored feedback based on your target role and interview type.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ padding: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
