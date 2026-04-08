'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFaculty, Cohort } from '@/lib/hooks/useFaculty';
import Link from 'next/link';

interface MemberDetail {
  id: string;
  full_name?: string;
  email: string;
  avgScore: number;
  sessionsCount: number;
  ready: boolean;
}

export default function FacultyPortal() {
  const { cohorts, isLoading: loading, mutate } = useFaculty();
  const [selectedCohort, setSelectedCohort] = useState<(Cohort & { members?: MemberDetail[] }) | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const handleViewCohort = async (cohort: Cohort) => {
    setSelectedCohort({ ...cohort });
    setMembersLoading(true);
    try {
      const res = await fetch(`/api/faculty/cohorts/${cohort.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCohort(prev => prev ? { ...prev, members: data.members } : null);
      }
    } catch {
      // fallback: no detailed member data
    } finally {
      setMembersLoading(false);
    }
  };

  const totalStudents = cohorts.reduce((s, c) => s + c.students, 0);
  const totalReady = cohorts.reduce((s, c) => s + c.ready, 0);
  const overallAvg = cohorts.length > 0
    ? Math.round(cohorts.filter(c => c.avgScore > 0).reduce((s, c) => s + c.avgScore, 0) / (cohorts.filter(c => c.avgScore > 0).length || 1))
    : 0;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Faculty Portal</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Track cohort placement readiness and identify at-risk students.</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Cohorts', value: cohorts.length, color: 'var(--accent-primary)' },
          { label: 'Total Students', value: totalStudents, color: '#7B61FF' },
          { label: 'Placement Ready', value: totalReady, color: 'var(--accent-primary)' },
          { label: 'Overall Avg Score', value: overallAvg > 0 ? `${overallAvg}%` : '—', color: '#FFB547' },
        ].map((s, i) => (
          <div key={i} className="surface" style={{ padding: '20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedCohort ? '1fr 1.2fr' : '1fr', gap: '24px' }}>
        {/* Cohorts List */}
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
                No cohorts found. Create student groups in the Network tab to track them here.
              </div>
            ) : cohorts.map((c: Cohort, i: number) => {
              const readyPct = c.students > 0 ? Math.round((c.ready / c.students) * 100) : 0;
              const isSelected = selectedCohort?.id === c.id;
              return (
                <motion.div
                  key={c.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{ padding: '20px', background: isSelected ? 'rgba(77,255,160,0.04)' : 'var(--bg-elevated)', border: `1px solid ${isSelected ? 'rgba(77,255,160,0.3)' : 'var(--border)'}`, borderRadius: '16px', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{c.name}</h3>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.students} students enrolled</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: c.avgScore >= 70 ? 'var(--accent-primary)' : '#FFB547' }}>{c.avgScore > 0 ? `${c.avgScore}%` : '—'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avg. Readiness</div>
                    </div>
                  </div>

                  {/* Readiness bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Placement readiness</span>
                      <span style={{ fontWeight: 700, color: readyPct >= 60 ? 'var(--accent-primary)' : '#FFB547' }}>{readyPct}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--bg-surface)', borderRadius: '100px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${readyPct}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ height: '100%', background: readyPct >= 60 ? 'var(--accent-primary)' : '#FFB547', borderRadius: '100px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ padding: '10px', background: 'rgba(77,255,160,0.05)', borderRadius: '8px', border: '1px solid rgba(77,255,160,0.1)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 800 }}>PLACEMENT READY</div>
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>{c.ready} / {c.students}</div>
                    </div>
                    <div style={{ padding: '10px', background: 'rgba(255,77,106,0.05)', borderRadius: '8px', border: '1px solid rgba(255,77,106,0.1)' }}>
                      <div style={{ fontSize: '10px', color: '#FF4D6A', fontWeight: 800 }}>AT RISK</div>
                      <div style={{ fontSize: '18px', fontWeight: 700 }}>{Math.max(0, c.students - c.ready)} students</div>
                    </div>
                  </div>

                  <button
                    onClick={() => isSelected ? setSelectedCohort(null) : handleViewCohort(c)}
                    className="btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
                  >
                    {isSelected ? 'Collapse Panel' : 'View Cohort Data'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Cohort Detail Panel */}
        <AnimatePresence>
          {selectedCohort && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedCohort.name}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Individual student breakdown</p>
                  </div>
                  <button onClick={() => setSelectedCohort(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>✕ Close</button>
                </div>

                {membersLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ width: '24px', height: '24px', border: '2px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    Loading student data...
                  </div>
                ) : !selectedCohort.members || selectedCohort.members.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    No student data available yet.
                    <br /><span style={{ fontSize: '12px' }}>Students need to complete at least one interview session.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedCohort.members.sort((a, b) => b.avgScore - a.avgScore).map((m, i) => (
                      <div key={m.id || i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: 'var(--bg-elevated)', borderRadius: '10px', border: `1px solid ${m.ready ? 'rgba(77,255,160,0.15)' : 'var(--border)'}` }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: m.ready ? 'rgba(77,255,160,0.15)' : 'var(--bg-surface)', border: `2px solid ${m.ready ? 'var(--accent-primary)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: 'var(--accent-primary)', flexShrink: 0 }}>
                          {(m.full_name?.[0] || m.email[0]).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name || m.email}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.sessionsCount} sessions completed</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: m.avgScore >= 70 ? 'var(--accent-primary)' : m.avgScore >= 50 ? '#FFB547' : '#FF4D6A' }}>
                            {m.avgScore > 0 ? `${m.avgScore}%` : '—'}
                          </div>
                          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, background: m.ready ? 'rgba(77,255,160,0.1)' : 'rgba(255,77,106,0.1)', color: m.ready ? 'var(--accent-primary)' : '#FF4D6A' }}>
                            {m.ready ? 'Ready' : 'At Risk'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Score distribution heatmap */}
              <div className="surface" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Score Distribution</h3>
                {selectedCohort.members && selectedCohort.members.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
                    {['0-30', '31-50', '51-60', '61-70', '71-80', '81-90', '91-100'].map((range, i) => {
                      const [min, max] = range.split('-').map(Number);
                      const count = (selectedCohort.members || []).filter(m => m.avgScore >= min && m.avgScore <= max).length;
                      const maxCount = Math.max(...['0-30', '31-50', '51-60', '61-70', '71-80', '81-90', '91-100'].map(r => {
                        const [mn, mx] = r.split('-').map(Number);
                        return (selectedCohort.members || []).filter(m => m.avgScore >= mn && m.avgScore <= mx).length;
                      }));
                      const heightPct = maxCount > 0 ? Math.max(8, (count / maxCount) * 100) : 8;
                      const color = i >= 5 ? 'var(--accent-primary)' : i >= 3 ? '#FFB547' : '#FF4D6A';
                      return (
                        <div key={range} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{count}</div>
                          <div style={{ width: '100%', height: `${heightPct}%`, background: color, borderRadius: '3px 3px 0 0', opacity: count > 0 ? 0.85 : 0.15 }} />
                          <div style={{ fontSize: '9px', color: 'var(--text-muted)', writingMode: 'horizontal-tb' }}>{min}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ height: '80px', background: 'rgba(77,255,160,0.02)', borderRadius: '8px', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Distribution chart loads after interviews are conducted
                  </div>
                )}
              </div>

              {/* Batch trends */}
              <div className="surface" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Cohort Metrics</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Average Score', value: selectedCohort.avgScore, max: 100 },
                    { label: 'Placement Rate', value: selectedCohort.students > 0 ? Math.round((selectedCohort.ready / selectedCohort.students) * 100) : 0, max: 100 },
                    { label: 'Sessions / Student', value: selectedCohort.members ? Math.round(selectedCohort.members.reduce((s, m) => s + m.sessionsCount, 0) / selectedCohort.members.length) : 0, max: 20 },
                  ].map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                        <span style={{ fontWeight: 700 }}>{s.value}{i < 2 ? '%' : ''}</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (s.value / s.max) * 100)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          style={{ height: '100%', background: 'var(--accent-primary)', borderRadius: '100px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
