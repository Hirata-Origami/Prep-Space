'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const COMPANIES = [
  { name: 'Google', logo: '🔍', industry: 'Tech', rounds: ['DSA', 'System Design', 'Behavioral', 'Googleyness'], passRate: 71, difficulty: 9.2, knownFor: 'Breadth of algorithms, heavy on graphs and DP' },
  { name: 'Meta', logo: '📘', industry: 'Tech', rounds: ['Coding x2', 'System Design', 'Leadership Principles'], passRate: 64, difficulty: 8.8, knownFor: 'Product sense + coding, Behavioral very important' },
  { name: 'Amazon', logo: '📦', industry: 'Tech', rounds: ['Online Assessment', 'Behavioral (LP)', 'Technical', 'Bar Raiser'], passRate: 58, difficulty: 8.5, knownFor: '14 Leadership Principles, STAR answers required' },
  { name: 'Apple', logo: '🍎', industry: 'Tech', rounds: ['Coding', 'System Design', 'Hiring Manager'], passRate: 55, difficulty: 8.7, knownFor: 'Focus on low-level details, obsession with polish' },
  { name: 'Microsoft', logo: '🪟', industry: 'Tech', rounds: ['Coding x3', 'Design', 'As Appropriate'], passRate: 68, difficulty: 8.0, knownFor: 'Growth mindset culture, collaborative style' },
  { name: 'Stripe', logo: '💳', industry: 'Fintech', rounds: ['Bug Fix', 'Architecture', 'System Design'], passRate: 52, difficulty: 9.0, knownFor: 'Real-world code tasks, attention to craft' },
  { name: 'Airbnb', logo: '🏠', industry: 'Travel Tech', rounds: ['Coding', 'Cross-functional', 'System Design'], passRate: 61, difficulty: 8.3, knownFor: 'Strong culture fit, product intuition' },
  { name: 'Coinbase', logo: '₿', industry: 'Fintech', rounds: ['Coding', 'System Design', 'Crypto Knowledge'], passRate: 60, difficulty: 8.1, knownFor: 'Blockchain knowledge a plus, fast-paced culture' },
  { name: 'Netflix', logo: '🎬', industry: 'Streaming', rounds: ['Coding', 'System Design', 'Culture Doc'], passRate: 49, difficulty: 9.4, knownFor: 'Elite talent only, culture document is law' },
];

export default function MockCompanyPage() {
  const [selected, setSelected] = useState<typeof COMPANIES[0] | null>(null);
  const [mode, setMode] = useState<'train' | 'ruthless'>('train');
  const router = useRouter();

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Mock Company Interviews</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Practice for exactly the company you&apos;re targeting. 50+ companies with real formats.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Company grid */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            {COMPANIES.map(company => (
              <div key={company.name} onClick={() => setSelected(company)}
                className="card card-interactive"
                style={{ padding: '18px', borderColor: selected?.name === company.name ? 'rgba(77,255,160,0.4)' : undefined, background: selected?.name === company.name ? 'rgba(77,255,160,0.04)' : undefined }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>{company.logo}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{company.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{company.industry}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pass rate: <strong style={{ color: company.passRate > 65 ? 'var(--accent-primary)' : 'var(--accent-amber)' }}>{company.passRate}%</strong></span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⭐ {company.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company detail panel */}
        <div style={{ position: 'sticky', top: '24px', alignSelf: 'start' }}>
          {selected ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>{selected.logo}</div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{selected.name}</h2>
                <span className="badge badge-muted" style={{ fontSize: '11px', marginTop: '6px', display: 'inline-flex' }}>{selected.industry}</span>
              </div>

              {/* Rounds */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Interview Rounds</div>
                {selected.rounds.map((r, i) => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '6px', background: 'var(--bg-elevated)', marginBottom: '6px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-primary-dim)', border: '1px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r}</span>
                  </div>
                ))}
              </div>

              {/* Known for */}
              <div style={{ padding: '12px', background: 'rgba(77,255,160,0.05)', borderRadius: '8px', border: '1px solid rgba(77,255,160,0.15)', marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '4px' }}>💡 KNOWN FOR</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{selected.knownFor}</div>
              </div>

              {/* Mode selection */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>PRACTICE MODE</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['train', 'ruthless'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      style={{ flex: 1, padding: '9px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1px solid', fontFamily: 'var(--font-body)', transition: 'all 0.2s', background: mode === m ? (m === 'ruthless' ? 'rgba(255,77,106,0.12)' : 'rgba(77,255,160,0.12)') : 'transparent', borderColor: mode === m ? (m === 'ruthless' ? '#FF4D6A' : 'var(--accent-primary)') : 'var(--border)', color: mode === m ? (m === 'ruthless' ? '#FF4D6A' : 'var(--accent-primary)') : 'var(--text-muted)' }}>
                      {m === 'train' ? '📖 Train' : '💀 Ruthless'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                  {mode === 'train' ? 'Hints available. Warm AI tone. Progress saved.' : 'Zero hints. Strict time limits. AI interrupts if you run over.'}
                </div>
              </div>

              <button 
                onClick={() => router.push(`/interview/new?company=${encodeURIComponent(selected.name)}`)}
                className={mode === 'ruthless' ? '' : 'btn-primary'}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', background: mode === 'ruthless' ? '#FF4D6A' : undefined, color: mode === 'ruthless' ? '#fff' : undefined, border: 'none' }}>
                🎙 Start {selected.name} Interview
              </button>
            </motion.div>
          ) : (
            <div className="surface" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>👈</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Select a company</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Choose a company to see their interview format and start practicing</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
