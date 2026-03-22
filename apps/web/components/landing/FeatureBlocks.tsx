'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const FEATURES = [
  {
    tag: 'Module 1',
    tagColor: 'badge-mint',
    title: 'Adaptive Roadmap Engine',
    description: 'Upload a job description or pick a role. The AI builds a personalized roadmap, calibrates it with an assessment, then reorders modules based on your gaps vs. JD requirements.',
    bullets: ['15 predefined career tracks', 'JD → skills parsing via Gemini Flash-Lite', 'Dynamic module reordering (gap × relevance algorithm)', 'Prerequisite unlocking with smart continue logic'],
    visual: (
      <div style={{ padding: '28px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Backend Engineer — Meta</div>
        {[
          { name: 'Data Structures & Algorithms', pct: 91, status: '✅ Mastered' },
          { name: 'System Design at Scale', pct: 52, status: '📖 In Progress', active: true },
          { name: 'Distributed Databases', pct: 28, status: '🎯 Priority Gap' },
          { name: 'API Design & REST', pct: 0, status: '🔒 Locked' },
        ].map((m) => (
          <div key={m.name} style={{ marginBottom: '14px', opacity: m.status.includes('🔒') ? 0.45 : 1, border: m.active ? '1px solid rgba(77,255,160,0.3)' : '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', background: m.active ? 'rgba(77,255,160,0.04)' : 'var(--bg-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.status}</span>
            </div>
            {m.pct > 0 && <div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${m.pct}%` }} /></div>}
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: 'Module 2',
    tagColor: 'badge-violet',
    title: 'Gemini 2.5 Flash Live Interview',
    description: 'The most realistic AI interview available. Real voice-to-voice conversation with sub-100ms latency. No push-to-talk. No turn-based awkwardness. Interrupt the AI naturally — just like a real interview.',
    bullets: ['Direct WebSocket to Gemini (no proxy latency)', 'Native Voice Activity Detection — automatic turn management', '7 interview types: coding, system design, behavioral, SQL, and more', 'Adaptive difficulty adjusts question-by-question'],
    visual: (
      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #C961FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff' }}>A</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Alex · Gemini 2.5 Flash</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>● Live — 42ms latency</div>
            </div>
          </div>
          <span className="badge badge-mint" style={{ fontSize: '11px' }}>🛡 Verified</span>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, borderLeft: '2px solid #7B61FF' }}>
          &quot;Design a URL shortener that handles 100M redirects per day. Walk me through your approach.&quot;
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, borderLeft: `2px solid var(--accent-primary)` }}>
          You: &quot;I'd start with the API layer — a simple REST endpoint POST /shorten. For storage I'd use Redis for hot URLs and PostgreSQL for the full dataset…&quot;
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {['Difficulty', 'Topic', 'Time'].map((l, i) => (
            <div key={l} style={{ background: 'var(--bg-elevated)', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {l}: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{['7/10', 'System Design', '4:23'][i]}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tag: 'Module 3',
    tagColor: 'badge-amber',
    title: 'Mock Company Interviews',
    description: 'Practice for exactly the company you\'re targeting. 50+ companies seeded with real interview formats, known patterns, and culture context. Ruthless mode simulates real interview-day pressure with no hints.',
    bullets: ['50+ companies: FAANG, unicorns, consulting firms', 'Train mode (hints on) vs. Ruthless mode (zero hints, strict time limits)', 'AI interrupts if you run over time — just like a real interviewer', '"What the interviewer was thinking" section post-session'],
    visual: (
      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[{ name: 'Google', rounds: ['DSA Round', 'System Design', 'Behavioral'], pass: 71 },
        { name: 'Meta', rounds: ['Coding (x2)', 'System Design', 'Leadership'], pass: 64 },
        { name: 'Stripe', rounds: ['Bug Fix', 'System Design', 'Architecture'], pass: 58 }].map(({ name, rounds, pass }) => (
          <div key={name} style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Community pass: <span style={{ color: pass > 65 ? 'var(--accent-primary)' : 'var(--accent-amber)', fontWeight: 600 }}>{pass}%</span></span>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {rounds.map(r => <span key={r} className="badge badge-muted" style={{ fontSize: '11px' }}>{r}</span>)}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: 'Reports',
    tagColor: 'badge-mint',
    title: 'Timestamped Audio Evidence',
    description: 'Every score is backed by a replayable audio moment. Click any weakness on your report and hear exactly what you said — and what you should have said instead. First platform to do this.',
    bullets: ['Colored waveform markers: 🟢 strong · 🟡 partial · 🔴 missed', 'Click any marker → seek + AI annotation overlay', 'Speaking analytics: WPM, filler words, answer length distribution', 'D3.js radar chart vs. previous session + role percentile'],
    visual: (
      <div style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '40px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', lineHeight: 1 }}>84<span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/100</span></div>
            <span className="badge badge-mint" style={{ fontSize: '11px', marginTop: '6px', display: 'inline-flex' }}>Strong Hire</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            {[['Tech Depth', '88'], ['Communication', '79'], ['Problem Solving', '83']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Waveform */}
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px', position: 'relative', height: '52px', display: 'flex', gap: '2px', alignItems: 'center' }}>
          {Array.from({ length: 70 }).map((_, i) => {
            const isGreen = (i >= 8 && i <= 18) || (i >= 45 && i <= 55);
            const isRed = i >= 28 && i <= 36;
            return <div key={i} style={{ flex: 1, background: isGreen ? '#4DFFA0' : isRed ? '#FF4D6A' : 'rgba(255,255,255,0.12)', borderRadius: '1px', height: `${8 + Math.abs(Math.sin(i * 0.7)) * 22}px` }} />;
          })}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: '#4DFFA0', borderRadius: '2px' }} />Strong</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: '#FF4D6A', borderRadius: '2px' }} />Missed concept</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: 'rgba(255,255,255,0.12)', borderRadius: '2px' }} />Neutral</div>
        </div>
      </div>
    ),
  },
  {
    tag: 'B2B',
    tagColor: 'badge-violet',
    title: 'Smart Hire for Recruiters',
    description: 'Build AI-evaluated hiring pipelines. Candidates complete AI interviews; you get ranked shortlists with full audio evidence, proctoring reports, and bias mitigation — no resume sifting required.',
    bullets: ['Kanban pipeline: Invited → Completed → Shortlisted → Offer', 'Composite score = Σ(competency × weight) × integrity multiplier', 'Anonymization toggle for bias mitigation', 'ATS webhooks (Greenhouse, Lever) on status change'],
    visual: (
      <div style={{ padding: '20px', display: 'flex', gap: '10px', overflowX: 'auto' }}>
        {[
          { stage: 'Invited', count: 48, color: 'var(--text-muted)' },
          { stage: 'Completed', count: 31, color: '#7B61FF' },
          { stage: 'Shortlisted', count: 12, color: 'var(--accent-primary)' },
          { stage: 'Offer', count: 3, color: '#FFB547' },
        ].map(({ stage, count, color }) => (
          <div key={stage} style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px', minWidth: '110px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{stage}</div>
            <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{count}</div>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                <div key={i} style={{ background: `${color}22`, borderRadius: '4px', height: '24px', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontSize: '11px', color }}>
                  Candidate {count - i}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    tag: 'Education',
    tagColor: 'badge-amber',
    title: 'Edu Bundle for Institutions',
    description: 'Universities and bootcamps get full placement readiness infrastructure. Track cohort progress, identify at-risk students, and export placement reports for visiting companies.',
    bullets: ['Faculty dashboard with cohort heatmaps', 'LTI 1.3 grade sync (Moodle, Canvas, Blackboard)', 'Filter top students by tech stack + readiness score', 'Year-over-year batch comparison analytics'],
    visual: (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Batch 2026 — CS Engineering</div>
        {[['Batch Health Score', '74%', 'var(--accent-amber)'], ['Placement Ready', '42 / 180', 'var(--accent-primary)'], ['At-Risk Students', '23', 'var(--accent-red)'], ['Avg. Readiness', '61%', 'var(--text-secondary)']].map(([l, v, c]) => (
          <div key={l as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{l as string}</span>
            <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: c as string }}>{v as string}</span>
          </div>
        ))}
      </div>
    ),
  },
];

function FeatureBlock({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const isEven = index % 2 === 0;

  return (
    <div key={feature.title} ref={ref} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -30 : 30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7 }}
        style={{ order: isEven ? 0 : 1 }}
      >
        <span className={`badge ${feature.tagColor}`} style={{ marginBottom: '16px', display: 'inline-flex' }}>{feature.tag}</span>
        <h3 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '16px' }}>{feature.title}</h3>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '24px' }}>{feature.description}</p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {feature.bullets.map(b => (
            <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent-primary)', marginTop: '1px', flexShrink: 0 }}>✓</span>
              {b}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Visual */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? 30 : -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.15 }}
        style={{ order: isEven ? 1 : 0, padding: 0, overflow: 'hidden', minHeight: '320px', background: 'var(--bg-surface)' }}
        className="card"
      >
        {feature.visual}
      </motion.div>
    </div>
  );
}

export function FeatureBlocks() {
  return (
    <section style={{ padding: '80px 24px', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '80px' }}>
        {FEATURES.map((feature, i) => (
          <FeatureBlock key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
