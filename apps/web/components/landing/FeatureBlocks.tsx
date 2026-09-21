'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const FEATURES = [
  {
    tag: 'Module 1',
    tagColor: 'badge-mint',
    title: 'Adaptive Roadmap Engine',
    description: 'Upload a job description or pick a role. The AI builds a personalized roadmap, calibrates it with an assessment, then reorders modules based on your gaps vs. JD requirements.',
    bullets: ['15 predefined career tracks', 'JD → skills parsing via AI models', 'Dynamic module reordering (gap × relevance algorithm)', 'Prerequisite unlocking with smart continue logic'],
    visual: (
      <div style={{ padding: 'clamp(16px, 4vw, 28px)' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Backend Engineer — Meta</div>
        {[
          { name: 'Data Structures & Algorithms', pct: 91, status: 'Mastered' },
          { name: 'System Design at Scale', pct: 52, status: 'In Progress', active: true },
          { name: 'Distributed Databases', pct: 28, status: 'Priority Gap' },
          { name: 'API Design & REST', pct: 0, status: 'Locked' },
        ].map((m) => (
          <div key={m.name} style={{ marginBottom: '14px', opacity: m.status === 'Locked' ? 0.5 : 1, border: m.active ? '1.5px solid var(--accent-primary)' : '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', background: m.active ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
              <span style={{ fontSize: '12px', color: m.active ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 600 }}>{m.status}</span>
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
    title: 'Native AI Voice Interview',
    description: 'Practicing by typing isn&apos;t enough. Experience real-time voice interviews that feel like actual recruiter screens.',
    bullets: ['Direct WebSocket to AI (no proxy latency)', 'Native Voice Activity Detection — automatic turn management', '7 interview types: coding, system design, behavioral, SQL, and more', 'Adaptive difficulty adjusts question-by-question'],
    visual: (
      <div style={{ padding: 'clamp(16px, 4vw, 28px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-violet), var(--accent-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#fff' }}>A</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Alex · AI Interviewer</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>● Live — 42ms latency</div>
            </div>
          </div>
          <span className="badge badge-mint" style={{ fontSize: '11px' }}>Verified</span>
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, borderLeft: '3px solid var(--accent-violet)', border: '1px solid var(--border)' }}>
          &quot;Design a URL shortener that handles 100M redirects per day. Walk me through your approach.&quot;
        </div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7, borderLeft: '3px solid var(--accent-primary)', border: '1px solid var(--border)' }}>
          You: &quot;I&apos;d start with the API layer — a simple REST endpoint POST /shorten. For storage I&apos;d use Redis for hot URLs and PostgreSQL for the full dataset…&quot;
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
    description: 'Practice for exactly the company you&apos;re targeting. 50+ companies seeded with real interview formats, known patterns, and culture context. Ruthless mode simulates real interview-day pressure with no hints.',
    bullets: ['50+ companies: FAANG, unicorns, consulting firms', 'Train mode (hints on) vs. Ruthless mode (zero hints, strict time limits)', 'AI interrupts if you run over time — just like a real interviewer', '"What the interviewer was thinking" section post-session'],
    visual: (
      <div style={{ padding: 'clamp(16px, 4vw, 28px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
    description: 'Every score is backed by a replayable audio moment. Click any weakness on your report and hear exactly what you said — and what you should have said instead.',
    bullets: ['Colored waveform markers: strong · partial · missed', 'Click any marker → seek + AI annotation overlay', 'Speaking analytics: WPM, filler words, answer length distribution', 'D3.js radar chart vs. previous session + role percentile'],
    visual: (
      <div style={{ padding: 'clamp(16px, 4vw, 28px)' }}>
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
        <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px', position: 'relative', height: '52px', display: 'flex', gap: '2px', alignItems: 'center', border: '1px solid var(--border)' }}>
          {Array.from({ length: 70 }).map((_, i) => {
            const isGreen = (i >= 8 && i <= 18) || (i >= 45 && i <= 55);
            const isRed = i >= 28 && i <= 36;
            return <div key={i} style={{ flex: 1, background: isGreen ? 'var(--accent-primary)' : isRed ? 'var(--accent-red)' : 'var(--border-hover)', borderRadius: '1px', height: `${8 + Math.abs(Math.sin(i * 0.7)) * 22}px` }} />;
          })}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: 'var(--accent-primary)', borderRadius: '2px' }} />Strong</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: 'var(--accent-red)', borderRadius: '2px' }} />Missed concept</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}><div style={{ width: '8px', height: '8px', background: 'var(--border-hover)', borderRadius: '2px' }} />Neutral</div>
        </div>
      </div>
    ),
  },
];

function FeatureBlock({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const isEven = index % 2 === 0;

  return (
    <div key={feature.title} ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      {/* Text */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -30 : 30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7 }}
        className={isEven ? 'order-1 lg:order-1' : 'order-1 lg:order-2'}
      >
        <span className={`badge ${feature.tagColor}`} style={{ marginBottom: '14px', display: 'inline-flex' }}>{feature.tag}</span>
        <h3 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: '14px' }}>{feature.title}</h3>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '20px' }}>{feature.description}</p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {feature.bullets.map(b => (
            <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
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
        style={{ padding: 0, overflow: 'hidden', minHeight: '300px', background: 'var(--bg-surface)' }}
        className={`card ${isEven ? 'order-2 lg:order-2' : 'order-2 lg:order-1'}`}
      >
        {feature.visual}
      </motion.div>
    </div>
  );
}

export function FeatureBlocks() {
  return (
    <section id="features" style={{ padding: '60px 16px', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }} className="flex flex-col gap-12 lg:gap-20">
        {FEATURES.map((feature, i) => (
          <FeatureBlock key={feature.title} feature={feature} index={i} />
        ))}
      </div>
    </section>
  );
}
