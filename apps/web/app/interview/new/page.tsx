'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type InterviewType = 'conceptual' | 'behavioral' | 'system_design' | 'coding_walkthrough' | 'live_coding';
type InterviewState = 'setup' | 'connected' | 'question_asking' | 'listening' | 'processing' | 'complete';

const INTERVIEW_TYPES = [
  { id: 'conceptual', label: 'Conceptual', icon: '🧠', desc: 'Knowledge-based Q&A' },
  { id: 'behavioral', label: 'Behavioral (STAR)', icon: '🌟', desc: 'Situation/Task/Action/Result' },
  { id: 'system_design', label: 'System Design', icon: '🏗️', desc: 'Design distributed systems' },
  { id: 'coding_walkthrough', label: 'Coding Walkthrough', icon: '💻', desc: 'Explain your approach verbally' },
  { id: 'live_coding', label: 'Live Coding', icon: '⚡', desc: 'Code with AI observing' },
];

export default function NewInterviewPage() {
  const [interviewType, setInterviewType] = useState<InterviewType>('conceptual');
  const [state, setState] = useState<InterviewState>('setup');
  const [transcript, setTranscript] = useState<Array<{ role: 'ai' | 'user'; text: string; ts: number }>>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (state === 'connected' || state === 'question_asking' || state === 'listening') {
      timerRef.current = setInterval(() => setSessionTime(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [state]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const startInterview = () => {
    setState('connected');
    setTimeout(() => {
      setState('question_asking');
      setTranscript([{ role: 'ai', text: "Hi! I'm Alex, your AI interviewer today. We'll be focusing on conceptual questions for a Frontend Engineer role. Let's start with something foundational — can you explain the difference between JavaScript's call stack and the event loop, and why that distinction matters for writing performant web apps?", ts: Date.now() }]);
      setQuestionCount(1);
    }, 1500);
  };

  const simulateAnswer = () => {
    if (state !== 'listening') return;
    setState('processing');
    setTimeout(() => {
      setTranscript(prev => [...prev,
        { role: 'user', text: "The call stack is a synchronous data structure that tracks function execution — when you call a function it gets pushed onto the stack and popped when it returns. The event loop monitors the call stack and the callback queue; when the stack is empty, it pushes queued callbacks onto the stack. This matters because any long-running synchronous code blocks the stack and freezes the UI — so we offload heavy work to async APIs or Web Workers.", ts: Date.now() },
      ]);
      setScore(82);
      setTimeout(() => {
        setState('question_asking');
        setTranscript(prev => [...prev,
          { role: 'ai', text: "Great explanation! You correctly described both mechanisms and the performance implication. Let me push a bit further — given that understanding, what strategies would you use to prevent layout thrashing in a complex animation loop?", ts: Date.now() }
        ]);
        setQuestionCount(q => q + 1);
      }, 1200);
    }, 1800);
  };

  const endSession = () => {
    clearInterval(timerRef.current);
    setState('complete');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
      {/* Setup Screen */}
      <AnimatePresence>
        {state === 'setup' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            <div style={{ maxWidth: '680px', width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Start AI Interview</h1>
                <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Choose your interview type and hit Start. Alex will guide the session.</p>
              </div>

              {/* Interview type selection */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {INTERVIEW_TYPES.map(t => (
                  <div key={t.id} onClick={() => setInterviewType(t.id as InterviewType)}
                    className="card card-interactive"
                    style={{ padding: '16px', textAlign: 'center', borderColor: interviewType === t.id ? 'rgba(77,255,160,0.4)' : undefined, background: interviewType === t.id ? 'rgba(77,255,160,0.04)' : undefined }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{t.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{t.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                ))}
              </div>

              {/* Mic check */}
              <div className="surface" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(77,255,160,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎙</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Microphone ready</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>We&apos;ll request mic access when you start. Audio is processed locally.</div>
                </div>
                <span className="badge badge-mint" style={{ fontSize: '11px' }}>Proctoring ON</span>
              </div>

              <button onClick={startInterview} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '16px', padding: '14px' }}>
                🎙 Start Interview with Alex
              </button>
              <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
                ~25 min session · 8–10 questions · Report ready in 2 min
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interview Room */}
      {state !== 'setup' && state !== 'complete' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ height: '56px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse-mint 2s infinite' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)' }}>LIVE</span>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Q {questionCount} · {formatTime(sessionTime)}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-mint" style={{ fontSize: '11px' }}>🛡 Verified</span>
              <button onClick={endSession} style={{ padding: '6px 16px', background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: '6px', color: '#FF4D6A', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>End Session</button>
            </div>
          </div>

          {/* Interview area */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', overflow: 'hidden' }}>
            {/* Main area */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '16px' }}>
              {/* Alex avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: '#fff', flexShrink: 0, animation: state === 'question_asking' ? 'pulse-mint 2s infinite' : 'none' }}>A</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Alex · Gemini 2.5 Flash Live</div>
                  <div style={{ fontSize: '12px', color: state === 'question_asking' ? 'var(--accent-primary)' : state === 'listening' ? '#7B61FF' : 'var(--text-muted)' }}>
                    {state === 'connected' ? '● Connecting…' : state === 'question_asking' ? '● Speaking' : state === 'listening' ? '● Listening' : '● Processing…'}
                  </div>
                </div>
              </div>

              {/* Waveform bars */}
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '48px', padding: '0 4px' }}>
                {Array.from({ length: 50 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: '3px', transition: 'height 0.1s', background: state === 'question_asking' ? 'var(--accent-primary)' : state === 'listening' ? '#7B61FF' : 'var(--bg-elevated)', height: state === 'question_asking' || state === 'listening' ? `${10 + Math.abs(Math.sin(i * 0.7 + Date.now() * 0.005)) * 28}px` : '4px', opacity: 0.7 }} />
                ))}
              </div>

              {/* Mic button */}
              {state === 'question_asking' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setState('listening')} className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: '15px', padding: '14px' }}>
                    🎙 Start Answering
                  </button>
                </div>
              )}
              {state === 'listening' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={simulateAnswer} style={{ flex: 1, padding: '14px', background: '#FF4D6A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    ⏹ Done Answering
                  </button>
                </div>
              )}
            </div>

            {/* Transcript sidebar */}
            <div style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', overflow: 'y', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Transcript</div>
              {transcript.map((msg, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: '8px', background: msg.role === 'ai' ? 'rgba(123,97,255,0.08)' : 'rgba(77,255,160,0.06)', borderLeft: `2px solid ${msg.role === 'ai' ? '#7B61FF' : 'var(--accent-primary)'}` }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: msg.role === 'ai' ? '#7B61FF' : 'var(--accent-primary)', marginBottom: '6px', textTransform: 'uppercase' }}>{msg.role === 'ai' ? 'Alex' : 'You'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{msg.text}</div>
                </div>
              ))}
              {score && (
                <div style={{ padding: '10px', borderRadius: '6px', background: 'rgba(77,255,160,0.08)', border: '1px solid rgba(77,255,160,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Q{questionCount-1} score:</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{score}/100</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete state */}
      {state === 'complete' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Session Complete!</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px' }}>
              Great work! Your report is being generated by Gemini 2.5 Flash and will be ready in about 2 minutes.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a href="/reports" className="btn-primary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 24px' }}>View Reports</a>
              <a href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 24px' }}>Back to Dashboard</a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
