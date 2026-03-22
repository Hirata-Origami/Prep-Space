'use client';

import { motion } from 'framer-motion';

const COHORTS = [
  { name: 'CS Batch 2026', students: 120, ready: 45, avgScore: 72 },
  { name: 'Fullstack Bootcamp Q1', students: 48, ready: 31, avgScore: 84 },
  { name: 'DSA Intensive', students: 85, ready: 12, avgScore: 56 },
];

export default function FacultyPortal() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Faculty Portal</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Track cohort placement readiness and identify at-risk students.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '24px' }}>Active Cohorts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {COHORTS.map((c, i) => (
              <div key={i} style={{ padding: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.students} total students</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-primary)' }}>{c.avgScore}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg. Readiness</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '10px', background: 'rgba(77,255,160,0.05)', borderRadius: '8px', border: '1px solid rgba(77,255,160,0.1)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 800 }}>PLACEMENT READY</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{c.ready} Students</div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(255,77,106,0.05)', borderRadius: '8px', border: '1px solid rgba(255,77,106,0.1)' }}>
                    <div style={{ fontSize: '10px', color: '#FF4D6A', fontWeight: 800 }}>AT RISK</div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{c.students - c.ready - 20/*simulated*/} Students</div>
                  </div>
                </div>
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>View Full Cohort Data</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Batch Trends</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { label: 'DSA Proficiency', value: 68 },
                { label: 'System Design', value: 42 },
                { label: 'Behavioral Skills', value: 81 },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontWeight: 700 }}>{s.value}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Placement Ready Heatmap</h3>
            <div style={{ height: '120px', background: 'rgba(77,255,160,0.02)', borderRadius: '8px', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
              Interactive Heatmap Visualization Coming Soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
