'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRecruiter, Pipeline, Candidate } from '@/lib/hooks/useRecruiter';

const STAGE_COLORS: Record<string, string> = {
  invited: 'rgba(255,181,71,0.12)',
  in_progress: 'rgba(123,97,255,0.12)',
  completed: 'rgba(77,255,160,0.12)',
  shortlisted: 'rgba(0,212,255,0.12)',
  rejected: 'rgba(255,77,106,0.1)',
};
const STAGE_TEXT: Record<string, string> = {
  invited: '#FFB547',
  in_progress: '#7B61FF',
  completed: 'var(--accent-primary)',
  shortlisted: '#00D4FF',
  rejected: '#FF4D6A',
};

export default function RecruiterDashboard() {
  const { pipelines, isLoading, mutate: loadPipelines } = useRecruiter();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newRounds, setNewRounds] = useState('DSA Round, System Design, Behavioral, Hiring Manager');
  const [newThreshold, setNewThreshold] = useState(70);
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [roundModal, setRoundModal] = useState<{ candidate: Candidate; round: string; roundIndex: number } | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ id: string; email: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first pipeline
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  // Always derive selectedPipeline from live data (so invite updates appear immediately)
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId) ?? null;

  const handleCreatePipeline = async () => {
    setCreating(true);
    try {
      const rounds = newRounds.split(',').map(r => r.trim()).filter(Boolean);
      const res = await fetch('/api/recruiter/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_name: newRole, rounds, pass_threshold: newThreshold }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');

      await loadPipelines();
      setSelectedPipelineId(data.pipeline.id);
      setShowNewPipeline(false);
      setNewRole('');
      toast.success('Pipeline created!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create pipeline');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !selectedPipeline) return;
    setInviting(true);
    let parsedEmails: string[] = [];

    toast.loading('Parsing invite list...', { id: 'invite' });
    try {
      const parseRes = await fetch('/api/recruiter/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', text: inviteEmail })
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error || 'Failed to parse');

      parsedEmails = parseData.emails;
      toast.loading(`Found ${parsedEmails.length} emails. Sending invites...`, { id: 'invite' });

      // Send invites
      const sendRes = await fetch('/api/recruiter/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          emails: parsedEmails,
          pipeline_id: selectedPipeline.id,
          pipeline_role: selectedPipeline.role_name
        })
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || 'Failed to send');

      toast.success(`Successfully added ${sendData.count} candidate(s) to pipeline!`, { id: 'invite' });
      setInviteEmail('');
      // Refresh pipelines — selected pipeline will auto-update via derived state
      await loadPipelines();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Invite failed', { id: 'invite' });
    } finally {
      setInviting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInviteEmail(prev => prev ? prev + '\n' + text : text);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveCandidate = async (c: Candidate) => {
    if (!confirm(`Remove ${c.users?.full_name || c.name || c.email} from this pipeline?`)) return;
    toast.loading('Removing candidate...', { id: `remove-${c.id}` });
    try {
      const res = await fetch(`/api/recruiter/candidate/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove');
      toast.success('Candidate removed', { id: `remove-${c.id}` });
      await loadPipelines();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Remove failed', { id: `remove-${c.id}` });
    }
  };

  const handleStageChange = async (candidate: Candidate, newStage: string) => {
    const displayName = candidate.users?.full_name || candidate.name || candidate.email;
    toast.loading(`Updating ${displayName}…`, { id: `status-${candidate.id}` });
    try {
      const res = await fetch('/api/recruiter/pipelines/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate.id,
          stage: newStage,
          pipeline_name: selectedPipeline?.role_name,
          candidate_name: displayName,
          candidate_email: candidate.email,
        }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
      toast.success(`Moved to ${newStage.replace('_', ' ')}`, { id: `status-${candidate.id}` });
      await loadPipelines();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed', { id: `status-${candidate.id}` });
    }
  };

  const totalCandidates = pipelines.reduce((s: number, p: Pipeline) => s + (p.pipeline_candidates?.length || 0), 0);
  const shortlisted = pipelines.flatMap((p: Pipeline) => p.pipeline_candidates || []).filter((c: Candidate) => c.stage === 'shortlisted').length;
  const avgScore = (() => {
    const scored = pipelines.flatMap((p: Pipeline) => p.pipeline_candidates || []).filter((c: Candidate) => c.composite_score != null);
    return scored.length ? Math.round(scored.reduce((s: number, c: Candidate) => s + (c.composite_score || 0), 0) / scored.length) : null;
  })();

  const currentCandidates = (selectedPipeline?.pipeline_candidates || []).slice().sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0));

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Recruiter Panel</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Manage AI-evaluated hiring pipelines and ranked shortlists.</p>
        </div>
        <button onClick={() => setShowNewPipeline(v => !v)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}>
          {showNewPipeline ? 'Cancel' : 'Create Pipeline'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Active Pipelines', value: pipelines.filter((p: Pipeline) => p.status === 'active').length.toString(), trend: `${pipelines.length} total` },
          { label: 'Total Candidates', value: totalCandidates.toString(), trend: 'Across all pipelines' },
          { label: 'Avg. AI Score', value: avgScore != null ? `${avgScore}%` : '—', trend: 'Composite score' },
          { label: 'Shortlisted', value: shortlisted.toString(), trend: shortlisted > 0 ? 'Ready to review' : 'None yet' },
        ].map((stat, i) => (
          <div key={i} className="surface" style={{ padding: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-primary)' }}>{stat.trend}</div>
          </div>
        ))}
      </div>

      {/* New Pipeline Panel */}
      <AnimatePresence>
        {showNewPipeline && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '24px', border: '1px solid rgba(77,255,160,0.25)', background: 'rgba(77,255,160,0.02)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>New Hiring Pipeline</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Role Name</label>
                  <input className="input" value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Senior Frontend Engineer" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Pass Threshold %</label>
                  <input className="input" type="number" value={newThreshold} onChange={e => setNewThreshold(Number(e.target.value))} min={0} max={100} style={{ width: '100%' }} />
                </div>
                <button onClick={handleCreatePipeline} disabled={creating || !newRole} className="btn-primary" style={{ padding: '10px 16px', opacity: creating || !newRole ? 0.7 : 1 }}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
              <div style={{ marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Interview Rounds (comma-separated)</label>
                <input className="input" value={newRounds} onChange={e => setNewRounds(e.target.value)} style={{ width: '100%' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          Loading pipelines…
        </div>
      ) : pipelines.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>No pipelines yet</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Create your first hiring pipeline to start evaluating candidates</p>
          <button onClick={() => setShowNewPipeline(true)} className="btn-primary">Create First Pipeline</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
          {/* Sidebar: Pipeline list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.08em' }}>Pipelines</div>
            {pipelines.map((p: Pipeline) => (
              <button
                key={p.id}
                onClick={() => setSelectedPipelineId(p.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${selectedPipelineId === p.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  background: selectedPipelineId === p.id ? 'rgba(77,255,160,0.06)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: selectedPipelineId === p.id ? 'var(--accent-primary)' : 'var(--text-primary)', marginBottom: '4px' }}>{p.role_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.pipeline_candidates?.length || 0} candidates</div>
              </button>
            ))}
          </div>

          {/* Main: Candidates */}
          {selectedPipeline && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedPipeline.role_name}</h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Pass threshold: {selectedPipeline.pass_threshold}%
                  </div>
                  {/* Rounds display */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedPipeline.rounds?.map((r, i) => (
                      <span key={i} style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '100px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {i + 1}. {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bulk Invite */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      className="input"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="Emails, ranges (user01 to user40), or CSV..."
                      rows={2}
                      style={{ width: '300px', resize: 'vertical', minHeight: '40px', fontSize: '12px' }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      CSV
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="btn-primary" style={{ fontSize: '12px', padding: '8px 14px', height: '40px', opacity: inviting || !inviteEmail.trim() ? 0.7 : 1 }}>
                    {inviting ? '…' : 'Invite'}
                  </button>
                </div>
              </div>

              {currentCandidates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}></div>
                  <p style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>No candidates yet</p>
                  <p style={{ fontSize: '13px' }}>Paste emails above and click Invite to send assessment links.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentCandidates.map((c, i) => {
                    const displayName = c.users?.full_name || c.name || c.email;
                    const score = c.composite_score;
                    const stageColor = STAGE_COLORS[c.stage] || STAGE_COLORS.invited;
                    const stageText = STAGE_TEXT[c.stage] || '#FFB547';
                    const roundScores = c.round_scores || {};
                    const isExpanded = expandedCandidate === c.id;

                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}
                      >
                        {/* Main row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-elevated)', gap: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: score && score > 80 ? 'rgba(77,255,160,0.15)' : 'var(--bg-surface)', border: `2px solid ${score && score > 80 ? 'var(--accent-primary)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: 'var(--accent-primary)', flexShrink: 0 }}>
                              {displayName[0]?.toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            {/* Score */}
                            {score != null && (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: score > selectedPipeline.pass_threshold ? 'var(--accent-primary)' : '#FFB547' }}>{score}%</div>
                                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Score</div>
                              </div>
                            )}

                            {/* Stage selector — manual only */}
                            <select
                              value={c.stage || 'invited'}
                              onChange={async (e) => handleStageChange(c, e.target.value)}
                              style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, background: stageColor, color: stageText, textTransform: 'capitalize', border: `1px solid ${stageText}33`, cursor: 'pointer', outline: 'none', appearance: 'none', textAlign: 'center' }}
                            >
                              <option value="invited" style={{ color: '#000' }}>Invited</option>
                              <option value="in_progress" style={{ color: '#000' }}>In Progress</option>
                              <option value="completed" style={{ color: '#000' }}>Completed</option>
                              <option value="shortlisted" style={{ color: '#000' }}>Shortlist (Email)</option>
                              <option value="rejected" style={{ color: '#000' }}>Reject (Email)</option>
                            </select>

                            {/* Expand button or rounds indicator */}
                            {Object.keys(roundScores).length > 0 ? (
                              <button
                                onClick={() => setExpandedCandidate(isExpanded ? null : c.id)}
                                style={{ padding: '5px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}
                              >
                                {isExpanded ? '▲ Hide' : '▼ Rounds'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No scores yet</span>
                            )}

                            {/* View Report button */}
                            {(() => {
                              const firstReportId = c.interview_sessions?.[0]?.interview_reports?.[0]?.id;
                              if (firstReportId) {
                                return (
                                  <Link
                                    href={`/reports/${firstReportId}`}
                                    style={{ padding: '6px 14px', fontSize: '12px', background: 'rgba(77,255,160,0.1)', border: '1px solid rgba(77,255,160,0.2)', borderRadius: '8px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                                  >
                                    View Analytic
                                  </Link>
                                );
                              }
                              return (
                                <span style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', whiteSpace: 'nowrap', opacity: 0.5 }}>
                                  {c.stage === 'completed' ? 'Processing...' : 'No Report'}
                                </span>
                              );
                            })()}

                            {/* Edit email button */}
                            <button
                              onClick={() => setEditingEmail({ id: c.id, email: c.email })}
                              style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Edit candidate email"
                            >
                              ✎
                            </button>

                            {/* Remove candidate */}
                            <button
                              onClick={() => handleRemoveCandidate(c)}
                              title="Remove candidate"
                              style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', color: '#FF4D6A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Round breakdown */}
                        <AnimatePresence>
                          {isExpanded && Object.keys(roundScores).length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', background: 'var(--bg-base)' }}
                            >
                              <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '100%', marginBottom: '4px' }}>Round Scores (click for details)</div>
                                {selectedPipeline.rounds?.map((round, idx) => {
                                  const roundScore = roundScores[round] ?? roundScores[idx.toString()];
                                  const passed = roundScore != null && roundScore >= selectedPipeline.pass_threshold;
                                  return (
                                    <div
                                      key={round}
                                      onClick={() => setRoundModal({ candidate: c, round, roundIndex: idx })}
                                      style={{ padding: '8px 14px', background: roundScore != null ? (passed ? 'rgba(77,255,160,0.08)' : 'rgba(255,181,71,0.08)') : 'var(--bg-elevated)', border: `1px solid ${roundScore != null ? (passed ? 'rgba(77,255,160,0.2)' : 'rgba(255,181,71,0.2)') : 'var(--border)'}`, borderRadius: '8px', minWidth: '120px', cursor: 'pointer', transition: 'opacity 0.15s' }}
                                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                    >
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{round}</div>
                                      <div style={{ fontSize: '18px', fontWeight: 800, color: roundScore != null ? (passed ? 'var(--accent-primary)' : '#FFB547') : 'var(--text-muted)' }}>
                                        {roundScore != null ? `${roundScore}%` : '—'}
                                      </div>
                                      {roundScore != null && <div style={{ fontSize: '10px', color: passed ? 'var(--accent-primary)' : '#FFB547' }}>{passed ? 'Passed' : 'Below threshold'}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Round Detail Modal */}
      <AnimatePresence>
        {roundModal && (() => {
          const { candidate: mc, round, roundIndex } = roundModal;
          const rs = mc.round_scores || {};
          const roundScore = rs[round] ?? rs[roundIndex.toString()];
          const passed = roundScore != null && roundScore >= (selectedPipeline?.pass_threshold ?? 70);
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRoundModal(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Round Report</div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{round}</h2>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{mc.users?.full_name || mc.name || mc.email}</div>
                  </div>
                  {roundScore != null ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '42px', fontWeight: 900, color: passed ? 'var(--accent-primary)' : '#FFB547', lineHeight: 1 }}>{roundScore}%</div>
                      <div style={{ fontSize: '12px', color: passed ? 'var(--accent-primary)' : '#FFB547', fontWeight: 700 }}>{passed ? 'PASSED' : 'BELOW THRESHOLD'}</div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>Not attempted</div>
                  )}
                </div>
                <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pass threshold</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedPipeline?.pass_threshold ?? 70}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Candidate email</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{mc.email}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Overall stage</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{mc.stage.replace('_', ' ')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Link href="/reports" style={{ flex: 1, padding: '10px', textAlign: 'center', background: 'var(--accent-primary)', color: '#080C14', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>View Full Reports</Link>
                  <button onClick={() => setRoundModal(null)} style={{ padding: '10px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Close</button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
      {/* Edit Email Modal */}
      <AnimatePresence>
        {editingEmail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingEmail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Edit Candidate Email</h3>
              <input 
                className="input" 
                value={editingEmail.email} 
                onChange={e => setEditingEmail({ ...editingEmail, email: e.target.value })}
                style={{ width: '100%', marginBottom: '20px' }}
                placeholder="candidate@email.com"
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={async () => {
                    const tid = toast.loading('Updating email...');
                    try {
                      const res = await fetch(`/api/recruiter/candidate/${editingEmail.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: editingEmail.email })
                      });
                      if (!res.ok) throw new Error('Failed to update');
                      toast.success('Email updated', { id: tid });
                      await loadPipelines();
                      setEditingEmail(null);
                    } catch (err: any) {
                      toast.error(err.message, { id: tid });
                    }
                  }}
                  className="btn-primary" 
                  style={{ flex: 1, padding: '10px' }}
                >
                  Save Changes
                </button>
                <button onClick={() => setEditingEmail(null)} className="btn-secondary" style={{ padding: '10px 16px' }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
