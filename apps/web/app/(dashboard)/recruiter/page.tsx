'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useRef } from 'react';
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
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newRounds, setNewRounds] = useState('DSA Round, System Design, Behavioral, Hiring Manager');
  const [newThreshold, setNewThreshold] = useState(70);
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      setSelectedPipeline(pipelines[0]);
    }
  }, [pipelines, selectedPipeline]);

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

      loadPipelines();
      setSelectedPipeline({ ...data.pipeline, pipeline_candidates: [] });
      setShowNewPipeline(false);
      setNewRole('');
      toast.success('Pipeline created!');
    } catch (e: any) {
      toast.error(e.message);
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

      toast.success(`Successfully added ${sendData.count} candidates to pipeline!`, { id: 'invite' });
      setInviteEmail('');
      loadPipelines();
    } catch (e: any) {
      toast.error(e.message, { id: 'invite' });
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
          Create Pipeline
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Active Pipelines', value: pipelines.filter((p: Pipeline) => p.status === 'active').length.toString(), trend: `${pipelines.length} total` },
          { label: 'Total Candidates', value: totalCandidates.toString(), trend: 'Across all pipelines' },
          { label: 'Avg. AI Score', value: avgScore != null ? `${avgScore}%` : '—', trend: 'Composite score' },
          { label: 'Shortlisted', value: shortlisted.toString(), trend: shortlisted > 0 ? '✓ Ready to review' : 'None yet' },
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
                onClick={() => setSelectedPipeline(p)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${selectedPipeline?.id === p.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  background: selectedPipeline?.id === p.id ? 'rgba(77,255,160,0.06)' : 'var(--bg-elevated)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: selectedPipeline?.id === p.id ? 'var(--accent-primary)' : 'var(--text-primary)', marginBottom: '4px' }}>{p.role_name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.pipeline_candidates?.length || 0} candidates</div>
              </button>
            ))}
          </div>

          {/* Main: Candidates */}
          {selectedPipeline && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedPipeline.role_name}</h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Rounds: {selectedPipeline.rounds?.join(' · ')} · Pass threshold: {selectedPipeline.pass_threshold}%
                  </div>
                </div>

                {/* Bulk Invite */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      className="input"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="Paste emails, ranges (user01 to user40), or CSV... "
                      rows={2}
                      style={{ width: '320px', resize: 'vertical', minHeight: '40px', fontSize: '12px' }}
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
                    {inviting ? '...' : 'Bulk Invite'}
                  </button>
                </div>
              </div>

              {currentCandidates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '14px' }}>No candidates yet. Invite candidates or share the pipeline link.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentCandidates.map((c, i) => {
                    const displayName = c.users?.full_name || c.name || c.email;
                    const score = c.composite_score;
                    const stageColor = STAGE_COLORS[c.stage] || STAGE_COLORS.invited;
                    const stageText = STAGE_TEXT[c.stage] || '#FFB547';

                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', gap: '16px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: score && score > 80 ? 'rgba(77,255,160,0.15)' : 'var(--bg-surface)', border: `2px solid ${score && score > 80 ? 'var(--accent-primary)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: 'var(--accent-primary)', flexShrink: 0 }}>
                            {displayName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.email}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexShrink: 0 }}>
                          {score != null && (
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: 900, color: score > selectedPipeline.pass_threshold ? 'var(--accent-primary)' : '#FFB547' }}>{score}%</div>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>AI Score</div>
                            </div>
                          )}
                          <select
                            value={c.stage || 'invited'}
                            onChange={async (e) => {
                              const newStage = e.target.value;
                              toast.loading(`Updating ${displayName} to ${newStage}...`, { id: `status-${c.id}` });
                              try {
                                const res = await fetch('/api/recruiter/pipelines/status', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    candidate_id: c.id,
                                    stage: newStage,
                                    pipeline_name: selectedPipeline.role_name,
                                    candidate_name: displayName,
                                    candidate_email: c.email
                                  })
                                });
                                if (!res.ok) throw new Error('Failed to update stage');
                                toast.success(`Moved to ${newStage.replace('_', ' ')}! Email deployed if applicable.`, { id: `status-${c.id}` });
                                loadPipelines(); // refresh
                              } catch(err: any) {
                                toast.error(err.message, { id: `status-${c.id}` });
                              }
                            }}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '100px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: stageColor,
                              color: stageText,
                              textTransform: 'capitalize',
                              border: `1px solid ${stageText}33`,
                              cursor: 'pointer',
                              outline: 'none',
                              appearance: 'none',
                              textAlign: 'center'
                            }}
                          >
                            <option value="invited" style={{color: '#000'}}>Invited</option>
                            <option value="in_progress" style={{color: '#000'}}>In Progress</option>
                            <option value="completed" style={{color: '#000'}}>Completed</option>
                            <option value="shortlisted" style={{color: '#000'}}>Shortlisted (Automated Email)</option>
                            <option value="rejected" style={{color: '#000'}}>Rejected (Automated Email)</option>
                          </select>
                          <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                            View Report
                          </button>
                        </div>
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
