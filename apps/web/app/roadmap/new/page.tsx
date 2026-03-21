'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PREDEFINED_ROLES = [
  { icon: '⚛️', name: 'Frontend Engineer', modules: 12 },
  { icon: '⚙️', name: 'Backend Engineer', modules: 11 },
  { icon: '🔄', name: 'Full Stack Engineer', modules: 14 },
  { icon: '☁️', name: 'Cloud Architect / DevOps', modules: 10 },
  { icon: '🤖', name: 'ML Engineer', modules: 13 },
  { icon: '📊', name: 'Data Scientist', modules: 11 },
  { icon: '📱', name: 'Android Engineer', modules: 9 },
  { icon: '🍎', name: 'iOS Engineer', modules: 9 },
  { icon: '📋', name: 'Product Manager', modules: 8 },
  { icon: '🛡️', name: 'Security Engineer', modules: 10 },
  { icon: '🧪', name: 'QA Engineer', modules: 8 },
  { icon: '⛓️', name: 'Blockchain Developer', modules: 9 },
];

export default function NewRoadmapPage() {
  const [mode, setMode] = useState<'predefined' | 'jd' | 'custom'>('predefined');
  const [selected, setSelected] = useState('');
  const [jdText, setJdText] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const roleText = mode === 'predefined' ? selected : mode === 'jd' ? jdText : customRole;
    if (!roleText.trim()) { toast.error('Please select or enter a role'); return; }
    setCreating(true);
    toast.info('Creating your personalized roadmap with AI…');
    setTimeout(() => {
      toast.success('Roadmap created! Redirecting…');
      window.location.href = '/dashboard';
    }, 2500);
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Create New Roadmap</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
          AI will build a personalized prep plan calibrated to your current skills
        </p>
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', background: 'var(--bg-elevated)', padding: '6px', borderRadius: '10px', width: 'fit-content' }}>
        {([['predefined', '🎯 Pick a Role'], ['jd', '📄 Upload JD'], ['custom', '✏️ Custom']] as const).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            style={{ padding: '9px 20px', borderRadius: '7px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s', background: mode === m ? 'var(--accent-primary)' : 'transparent', color: mode === m ? '#080C14' : 'var(--text-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Predefined roles */}
      {mode === 'predefined' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' }}>
            {PREDEFINED_ROLES.map((role) => (
              <div key={role.name} onClick={() => setSelected(role.name)}
                className={`card card-interactive ${selected === role.name ? 'module-card-in-progress' : ''}`}
                style={{ padding: '18px', borderColor: selected === role.name ? 'rgba(77,255,160,0.4)' : undefined, background: selected === role.name ? 'rgba(77,255,160,0.04)' : undefined }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{role.icon}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{role.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{role.modules} modules</div>
                {selected === role.name && <div style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--accent-primary)', fontSize: '16px' }}>✓</div>}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* JD upload */}
      {mode === 'jd' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Paste Job Description
            </label>
            <textarea
              value={jdText} onChange={e => setJdText(e.target.value)}
              placeholder="Paste the full job description here… (We'll use Gemini Flash-Lite to extract skills, experience level, and keywords)"
              style={{ width: '100%', minHeight: '240px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.6 }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>
          {jdText.length > 50 && (
            <div className="surface" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ color: 'var(--accent-primary)' }}>✓</span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Gemini will parse this JD to extract required skills, tech stack, and seniority level — then build your roadmap accordingly
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Custom role */}
      {mode === 'custom' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Role Title</label>
          <input type="text" value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="e.g. Site Reliability Engineer at Netflix" className="input" style={{ fontSize: '16px', padding: '14px 16px', marginBottom: '12px' }} />
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Target Company (optional)</label>
          <input type="text" placeholder="e.g. Netflix, Stripe, your startup…" className="input" />
        </motion.div>
      )}

      {/* Create button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={handleCreate} disabled={creating}
          className="btn-primary"
          style={{ fontSize: '15px', padding: '12px 28px', opacity: creating ? 0.7 : 1, cursor: creating ? 'not-allowed' : 'pointer' }}>
          {creating ? '🔄 Building roadmap…' : '🚀 Create Roadmap with AI'}
        </button>
        <a href="/dashboard" className="btn-secondary" style={{ fontSize: '15px', padding: '12px 24px', textDecoration: 'none' }}>Cancel</a>
      </motion.div>

      {/* Info */}
      <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(77,255,160,0.05)', borderRadius: '8px', border: '1px solid rgba(77,255,160,0.15)' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          ✨ <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong> After creation, you&apos;ll take a 15-minute assessment interview. The AI uses your scores to reorder modules by gap priority, so you always practice what matters most for your target role.
        </div>
      </div>
    </div>
  );
}
