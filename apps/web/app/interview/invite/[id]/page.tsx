'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

interface Pipeline {
  id: string;
  role_name: string;
  rounds: string[];
  pass_threshold: number;
  status: string;
}

interface Candidate {
  id: string;
  name?: string;
  email: string;
  stage: string;
  composite_score?: number;
  round_scores?: Record<string, number>;
  invited_at?: string;
  completed_at?: string;
  pipeline_id: string;
  hiring_pipelines: Pipeline | Pipeline[];
}

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/recruiter/candidate/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setCandidate(data.candidate);
        }
      })
      .catch(() => setError('Failed to load invite details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}></div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Invite Not Found</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>
            This interview invitation link is invalid, expired, or has already been used. Please contact your recruiter if you believe this is an error.
          </p>
          <Link href="/" style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: '#080C14', borderRadius: '8px', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}>
            Go to PrepSpace
          </Link>
        </div>
      </div>
    );
  }

  const pipeline = Array.isArray(candidate.hiring_pipelines)
    ? candidate.hiring_pipelines[0]
    : candidate.hiring_pipelines;

  const rounds = pipeline?.rounds || [];
  const roundScores = candidate.round_scores || {};
  const isCompleted = candidate.stage === 'completed';
  const isInProgress = candidate.stage === 'in_progress';

  const handleStartRound = (round: string, roundIndex: number) => {
    // Build query for the interview session with round context
    const params = new URLSearchParams({
      topic: 'conceptual',
      role: pipeline?.role_name || 'Candidate',
      round: round,
      company: '',
      direct: 'true',
      invite_candidate_id: candidate.id,
      round_index: roundIndex.toString(),
    });
    router.push(`/interview/new?${params.toString()}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '24px' }}>
      {/* Nav */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 900, color: '#080C14' }}>P</div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>PrepSpace</span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>· Interview Assessment</span>
        </div>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(135deg, rgba(77,255,160,0.08), rgba(123,97,255,0.06))', border: '1px solid rgba(77,255,160,0.2)', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Interview Invitation</div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {pipeline?.role_name || 'Technical Assessment'}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {rounds.length} round{rounds.length !== 1 ? 's' : ''} · AI-evaluated · {pipeline?.pass_threshold || 70}% pass threshold
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {candidate.composite_score != null ? (
                <div>
                  <div style={{ fontSize: '40px', fontWeight: 900, color: candidate.composite_score >= (pipeline?.pass_threshold || 70) ? 'var(--accent-primary)' : '#FFB547', lineHeight: 1 }}>
                    {candidate.composite_score}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Final Score</div>
                </div>
              ) : (
                <span style={{ padding: '6px 14px', background: isInProgress ? 'rgba(123,97,255,0.12)' : 'rgba(255,181,71,0.12)', color: isInProgress ? '#7B61FF' : '#FFB547', borderRadius: '100px', fontSize: '12px', fontWeight: 700, textTransform: 'capitalize' }}>
                  {candidate.stage.replace('_', ' ')}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Rounds */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Interview Rounds</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rounds.map((round, i) => {
              const score = roundScores[round] ?? roundScores[i.toString()];
              const isPassed = score != null && score >= (pipeline?.pass_threshold || 70);
              const isAvailable = i === 0 || (rounds.slice(0, i).every(r => roundScores[r] != null || roundScores[(rounds.indexOf(r)).toString()] != null));
              const hasScore = score != null;

              return (
                <motion.div
                  key={round}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '20px',
                    background: hasScore ? (isPassed ? 'rgba(77,255,160,0.06)' : 'rgba(255,181,71,0.06)') : 'var(--bg-surface)',
                    border: `1px solid ${hasScore ? (isPassed ? 'rgba(77,255,160,0.2)' : 'rgba(255,181,71,0.2)') : 'var(--border)'}`,
                    borderRadius: '12px',
                    opacity: !isAvailable && !hasScore && !isCompleted ? 0.5 : 1,
                  }}
                >
                  {/* Round number */}
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', background: hasScore ? (isPassed ? 'rgba(77,255,160,0.2)' : 'rgba(255,181,71,0.2)') : 'var(--bg-elevated)', color: hasScore ? (isPassed ? 'var(--accent-primary)' : '#FFB547') : 'var(--text-muted)', border: `1px solid ${hasScore ? (isPassed ? 'rgba(77,255,160,0.3)' : 'rgba(255,181,71,0.3)') : 'var(--border)'}` }}>
                    {hasScore ? (isPassed ? '' : '—') : i + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>{round}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {hasScore ? `Score: ${score}% — ${isPassed ? 'Passed' : 'Below threshold'}` : isAvailable ? 'Ready to attempt' : 'Complete previous rounds first'}
                    </div>
                  </div>

                  {hasScore ? (
                    <div style={{ fontSize: '22px', fontWeight: 900, color: isPassed ? 'var(--accent-primary)' : '#FFB547' }}>{score}%</div>
                  ) : (
                    <button
                      onClick={() => {
                        if (!isAvailable && !isCompleted) {
                          toast.error('Complete the previous round first');
                          return;
                        }
                        toast.loading('Starting interview session...', { id: 'start-round' });
                        handleStartRound(round, i);
                      }}
                      style={{ padding: '8px 20px', background: 'var(--accent-primary)', color: '#080C14', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Start Round
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Overall Status / Report */}
        {isCompleted && candidate.composite_score != null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: '24px', background: candidate.composite_score >= (pipeline?.pass_threshold || 70) ? 'rgba(77,255,160,0.08)' : 'rgba(255,77,106,0.06)', border: `1px solid ${candidate.composite_score >= (pipeline?.pass_threshold || 70) ? 'rgba(77,255,160,0.25)' : 'rgba(255,77,106,0.2)'}`, borderRadius: '12px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>{candidate.composite_score >= (pipeline?.pass_threshold || 70) ? '' : ''}</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              {candidate.composite_score >= (pipeline?.pass_threshold || 70) ? 'Assessment Passed!' : 'Assessment Complete'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Your recruiter has been notified. You scored {candidate.composite_score}%.</p>
          </motion.div>
        )}

        {/* CTA for unregistered users */}
        <div style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Create a free PrepSpace account to track your progress, view detailed reports, and practice for future interviews.
          </p>
          <Link href="/auth/signup" style={{ padding: '8px 20px', background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            Create Free Account →
          </Link>
        </div>
      </div>
    </div>
  );
}
