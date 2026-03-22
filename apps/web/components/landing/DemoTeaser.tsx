'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const DEMO_PANELS = [
  {
    title: 'Adaptive Roadmap Engine',
    desc: 'AI calibrates your roadmap in real-time based on your skill graph',
    content: (
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Roadmap — Frontend Engineer</div>
        {[ 
          { name: 'JavaScript Fundamentals', score: 88, status: 'COMPLETE', color: 'var(--accent-primary)' },
          { name: 'React & Component Design', score: 72, status: 'IN_PROGRESS', color: '#7B61FF' },
          { name: 'System Design Fundamentals', score: 41, status: 'TO_LEARN', color: '#FFB547' },
          { name: 'TypeScript', score: 35, status: 'TO_LEARN', color: '#FFB547' },
          { name: 'Performance Optimization', score: 0, status: 'LOCKED', color: 'var(--text-muted)' },
        ].map((m, i) => (
          <div key={m.name} style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px 16px', border: `1px solid ${m.status === 'LOCKED' ? 'var(--border)' : m.color + '33'}`, opacity: m.status === 'LOCKED' ? 0.5 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
              <span style={{ fontSize: '12px', color: m.color, fontWeight: 600 }}>{m.status === 'LOCKED' ? '🔒' : `${m.score}%`}</span>
            </div>
            {m.status !== 'LOCKED' && (
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${m.score}%`, background: m.color }} />
              </div>
            )}
          </div>
        ))}
        <div style={{ marginTop: 'auto', background: 'rgba(77,255,160,0.08)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(77,255,160,0.2)' }}>
          <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>🎯 AI Recommendation</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Focus on System Design this week — 37% gap vs. target role requirements</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Gemini Live Interview',
    desc: 'Real-time voice interview with sub-100ms AI response latency',
    content: (
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>A</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Alex · AI Interviewer</div>
            <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>● Speaking…</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className="badge badge-mint" style={{ fontSize: '11px' }}>🛡 Verified</span>
          </div>
        </div>
        {/* AI waveform */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '3px', alignItems: 'center', height: '60px' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{ flex: 1, background: 'var(--accent-primary)', borderRadius: '2px', height: `${Math.max(4, 10 + Math.sin(i * 0.8) * 18 + Math.cos(i * 1.3) * 9).toFixed(1)}px`, opacity: Number((0.4 + Math.abs(Math.sin(i * 0.7)) * 0.6).toFixed(2)) }} />
          ))}
        </div>
        {/* Transcript */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '16px', flex: 1 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Live Transcript</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <span style={{ color: '#7B61FF', fontWeight: 600 }}>Alex: </span>
            Can you explain React&apos;s reconciliation algorithm and when you would prefer using a key prop to force remounting?
          </div>
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>You: </span>
            <span style={{ borderRight: '2px solid var(--accent-primary)' }}> React&apos;s reconciliation uses a diffing algorithm on the Virtual DOM…</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1, height: '44px', background: 'var(--accent-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#080C14', cursor: 'pointer' }}>🎙 Recording…</div>
          <div style={{ width: '44px', height: '44px', background: 'var(--bg-elevated)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}>⏸</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Deep Analysis Report',
    desc: 'Evidence-backed scores with timestamped audio playback',
    content: (
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Overall Score</div>
            <div style={{ fontSize: '52px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', lineHeight: 1 }}>84<span style={{ fontSize: '22px', color: 'var(--text-muted)' }}>/100</span></div>
            <span className="badge badge-mint" style={{ marginTop: '8px', display: 'inline-flex' }}>Strong Hire ✓</span>
          </div>
          {/* Mini radar */}
          <svg width="100" height="100" viewBox="0 0 100 100">
            <polygon points="50,10 82,30 82,70 50,90 18,70 18,30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <polygon points="50,22 70,36 70,64 50,78 30,64 30,36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <polygon points="50,28 63,40 63,60 50,72 37,60 37,40" fill="rgba(77,255,160,0.15)" stroke="var(--accent-primary)" strokeWidth="1.5" />
          </svg>
        </div>
        {/* Topic scores */}
        {[
          { name: 'Technical Depth', score: 88 },
          { name: 'Communication', score: 79 },
          { name: 'Problem Solving', score: 82 },
          { name: 'Conciseness', score: 71 },
        ].map(({ name, score }) => (
          <div key={name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{name}</span>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: score >= 80 ? 'var(--accent-primary)' : 'var(--accent-amber)' }}>{score}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${score}%` }} />
            </div>
          </div>
        ))}
        {/* Audio waveform mini */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px', display: 'flex', gap: '2px', alignItems: 'center', height: '44px', position: 'relative' }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{ flex: 1, background: i > 15 && i < 25 ? '#4DFFA0' : i > 36 && i < 44 ? '#FF4D6A' : 'rgba(255,255,255,0.15)', borderRadius: '1px', height: `${(8 + Math.abs(Math.sin(i * 0.5)) * 18).toFixed(1)}px` }} />
          ))}
        </div>
      </div>
    ),
  },
];

export function DemoTeaser() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} id="demo" style={{ padding: '120px 24px', background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-surface) 100%)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <span className="badge badge-violet" style={{ marginBottom: '20px', display: 'inline-flex' }}>Platform Preview</span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '16px' }}>
            See the full loop in action
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>From personalized roadmap → live AI interview → evidence-backed report</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {DEMO_PANELS.map((panel, i) => (
            <motion.div
              key={panel.title}
              initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="card"
              style={{ padding: '0', overflow: 'hidden', minHeight: '480px' }}
            >
              <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Step {i + 1}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{panel.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{panel.desc}</div>
              </div>
              <div style={{ flex: 1 }}>{panel.content}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
