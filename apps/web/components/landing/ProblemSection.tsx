'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const BEFORE_ANSWER = `"Um, so basically... I think React uses, like, 
a virtual DOM? And it... compares things? 
I've used it a lot but it's hard to explain... 
we had a project at work and it was fast... 
um, reconciliation maybe is the word?"`;

const AFTER_ANSWER = `"React uses a Virtual DOM — a lightweight copy of the actual DOM. 
On state change, React diffs the new and old Virtual DOM trees 
using its reconciliation algorithm, then applies only the minimal 
set of real DOM mutations needed. This is significantly faster 
than full DOM rerenders because actual DOM operations are expensive."`;

export function ProblemSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section style={{ padding: '120px 24px', background: 'var(--bg-base)' }} ref={ref}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '80px' }}
        >
          <span className="badge badge-red" style={{ marginBottom: '20px', display: 'inline-flex' }}>
            The Problem
          </span>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '20px' }}>
            73% of qualified candidates fail<br />
            interviews <span className="text-gradient-mint">they should pass</span>
          </h2>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            Not because they lack skill — but because they've never practiced
            the way they'll actually be asked to perform.
          </p>
        </motion.div>

        {/* Before / After */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Before */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card"
            style={{ borderColor: 'rgba(255,77,106,0.3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF4D6A', display: 'inline-block' }} />
              <span style={{ fontSize: '13px', color: '#FF4D6A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Without PrepSpace</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.8, minHeight: '160px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Candidate: </span>
              <span>{BEFORE_ANSWER}</span>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Missing technical precision', 'No structured answer', 'Filler words: 5x "like", 4x "um"'].map(flag => (
                <div key={flag} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FF4D6A' }}>
                  <span>⚠</span> {flag}
                </div>
              ))}
            </div>
          </motion.div>

          {/* After */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="card"
            style={{ borderColor: 'rgba(77,255,160,0.3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block' }} />
              <span style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>After 3 PrepSpace sessions</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.8, minHeight: '160px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Candidate: </span>
              <span>{AFTER_ANSWER}</span>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['Clear technical explanation', 'Structured: concept → mechanism → benefit', 'Score: 9.2/10 — Ready to hire'].map(flag => (
                <div key={flag} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--accent-primary)' }}>
                  <span>✓</span> {flag}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          style={{ marginTop: '60px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}
        >
          {[
            { n: '8.4', label: 'Avg score improvement', suffix: ' pts' },
            { n: '3.2x', label: 'More likely to pass on first try' },
            { n: '18', label: 'Min to first improvement seen', suffix: 'min' },
            { n: '$0', label: 'Cost to get started today' },
          ].map(({ n, label, suffix }) => (
            <div key={label} className="surface" style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                {n}{suffix && <span style={{ fontSize: '16px' }}>{suffix}</span>}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
