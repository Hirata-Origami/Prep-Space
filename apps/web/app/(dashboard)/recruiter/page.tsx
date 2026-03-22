'use client';

import { motion } from 'framer-motion';

const CANDIDATES = [
  { name: 'Sarah Chen', role: 'Senior Frontend', score: 92, stage: 'Shortlisted', tech: 'React, TypeScript' },
  { name: 'Marcus Miller', role: 'Backend Engineer', score: 84, stage: 'Completed', tech: 'Go, Kubernetes' },
  { name: 'Elena Rodriguez', role: 'Fullstack Dev', score: 78, stage: 'Completed', tech: 'Node, Next.js' },
  { name: 'David Kim', role: 'Senior Frontend', score: 45, stage: 'Rejected', tech: 'Vue, CSS' },
];

export default function RecruiterDashboard() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Recruiter Panel</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Manage your AI-evaluated hiring pipelines and ranked shortlists.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Active Pipelines', value: '4', trend: '+1 this week' },
          { label: 'Total Candidates', value: '1,280', trend: '↑ 12%' },
          { label: 'Avg. Readiness', value: '72%', trend: 'Stable' },
          { label: 'Time to Shortlist', value: '2.4 days', trend: '↓ 40%' },
        ].map((stat, i) => (
          <div key={i} className="surface" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{stat.trend}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Active Candidates</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" style={{ fontSize: '12px' }}>Filter</button>
            <button className="btn-primary" style={{ fontSize: '12px' }}>Create Pipeline</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CANDIDATES.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{c.name[0]}</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.role} • {c.tech}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: c.score > 80 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{c.score}%</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>AI Score</div>
                </div>
                <span className={`badge ${c.stage === 'Shortlisted' ? 'badge-mint' : 'badge-muted'}`} style={{ minWidth: '100px', textAlign: 'center' }}>{c.stage}</span>
                <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>View Report</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
