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
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>📬</div>
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

                            {/* Expand button to see round breakdown */}
                            {Object.keys(roundScores).length > 0 && (
                              <button
                                onClick={() => setExpandedCandidate(isExpanded ? null : c.id)}
                                style={{ padding: '5px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}
                              >
                                {isExpanded ? '▲ Hide' : '▼ Rounds'}
                              </button>
                            )}

                            {/* View Report button */}
                            {c.stage === 'completed' || score != null ? (
                              <Link
                                href={`/reports`}
                                style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                              >
                                View Reports
                              </Link>
                            ) : (
                              <span style={{ padding: '6px 14px', fontSize: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', whiteSpace: 'nowrap', opacity: 0.5 }}>
                                Pending
                              </span>
                            )}
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
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: '100%', marginBottom: '4px' }}>Round Scores</div>
                                {selectedPipeline.rounds?.map((round, idx) => {
                                  const roundScore = roundScores[round] ?? roundScores[idx.toString()];
                                  const passed = roundScore != null && roundScore >= selectedPipeline.pass_threshold;
                                  return (
                                    <div key={round} style={{ padding: '8px 14px', background: roundScore != null ? (passed ? 'rgba(77,255,160,0.08)' : 'rgba(255,181,71,0.08)') : 'var(--bg-elevated)', border: `1px solid ${roundScore != null ? (passed ? 'rgba(77,255,160,0.2)' : 'rgba(255,181,71,0.2)') : 'var(--border)'}`, borderRadius: '8px', minWidth: '120px' }}>
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{round}</div>
                                      <div style={{ fontSize: '18px', fontWeight: 800, color: roundScore != null ? (passed ? 'var(--accent-primary)' : '#FFB547') : 'var(--text-muted)' }}>
                                        {roundScore != null ? `${roundScore}%` : '—'}
                                      </div>
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
    </div>
  );
}
