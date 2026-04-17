'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const PLATFORMS = ['Final Round AI', 'Pramp', 'HireVue', 'Big Interview'];

const ROWS = [
  { feature: 'Real-time voice AI interview', us: true, fr: true, pramp: false, hirevue: true, big: false },
  { feature: 'Sub-100ms response latency', us: true, fr: false, pramp: false, hirevue: false, big: false },
  { feature: 'Adaptive skill graph + roadmap', us: true, fr: false, pramp: false, hirevue: false, big: false },
  { feature: 'Timestamped audio evidence reports', us: true, fr: false, pramp: false, hirevue: false, big: false },
  { feature: 'Proctoring + integrity scoring', us: true, fr: false, pramp: false, hirevue: true, big: false },
  { feature: 'Mock company interview rounds', us: true, fr: false, pramp: true, hirevue: false, big: false },
  { feature: 'Resume builder from interview data', us: true, fr: false, pramp: false, hirevue: false, big: false },
  { feature: 'Peer-to-peer practice network', us: true, fr: false, pramp: true, hirevue: false, big: false },
  { feature: 'B2B recruiter pipeline (Smart Hire)', us: true, fr: false, pramp: false, hirevue: true, big: false },
  { feature: 'Institution / Edu Bundle', us: true, fr: false, pramp: false, hirevue: false, big: false },
  { feature: 'Free tier (no credit card)', us: true, fr: false, pramp: true, hirevue: false, big: true },
];

export function CompetitorTable() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  const colKeys: ('fr' | 'pramp' | 'hirevue' | 'big')[] = ['fr', 'pramp', 'hirevue', 'big'];

  return (
    <section ref={ref} style={{ padding: '100px 24px', background: 'var(--bg-surface)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <span className="badge badge-muted" style={{ marginBottom: '20px', display: 'inline-flex' }}>Why PrepSpace</span>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: '16px' }}>
            The only platform that does <span className="text-gradient-mint">all of it</span>
          </h2>
        </motion.div>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
          {PLATFORMS.map((p, i) => (
            <button key={p} onClick={() => setActive(i)}
              style={{ padding: '8px 20px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid', transition: 'all 0.2s', fontFamily: 'var(--font-body)',
                background: active === i ? 'var(--accent-primary-dim)' : 'transparent',
                borderColor: active === i ? 'var(--accent-primary)' : 'var(--border)',
                color: active === i ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              {p}
            </button>
          ))}
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.3 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>Feature</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 700, background: 'rgba(77,255,160,0.04)', borderLeft: '2px solid var(--accent-primary)', borderRight: '2px solid var(--accent-primary)' }}>PrepSpace </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{PLATFORMS[active]}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => {
                  const competitor = row[colKeys[active]];
                  return (
                    <motion.tr key={row.feature}
                      initial={{ opacity: 0, y: 10 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 0.04 * i }}
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '13px 16px', fontSize: '14px', color: 'var(--text-secondary)' }}>{row.feature}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', background: 'rgba(77,255,160,0.04)', borderLeft: '2px solid rgba(77,255,160,0.3)', borderRight: '2px solid rgba(77,255,160,0.3)' }}>
                        <span style={{ fontSize: '18px' }}>{row.us ? '' : ''}</span>
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: '18px', color: competitor ? 'var(--accent-primary)' : 'var(--accent-red)' }}>{competitor ? '' : ''}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
