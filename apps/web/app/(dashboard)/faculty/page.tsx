'use client';

import { useFaculty, Cohort } from '@/lib/hooks/useFaculty';

export default function FacultyPortal() {
  const { cohorts, isLoading: loading } = useFaculty();

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
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <div style={{ width: '30px', height: '30px', border: '3px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                Loading cohorts...
              </div>
            ) : cohorts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                No active cohorts found. Create student groups in the Network tab to track them here.
              </div>
            ) : cohorts.map((c: Cohort, i: number) => (
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
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{c.students - c.ready} Students</div>
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
