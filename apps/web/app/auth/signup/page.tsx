'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const ROLES = [
  { id: 'candidate', label: 'Job Seeker', desc: 'I want to prep for interviews', icon: '🎯' },
  { id: 'recruiter', label: 'Recruiter', desc: 'I want to screen candidates with AI', icon: '🏢' },
  { id: 'educator', label: 'Educator', desc: 'I manage a class or bootcamp', icon: '🎓' },
];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('candidate');
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name, role } },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('Account created! Redirecting to your dashboard…');
    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '24px' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(77,255,160,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: '#080C14' }}>P</div>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>PrepSpace</span>
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            {step === 1 ? 'Create your account' : 'Tell us about yourself'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {step === 1 ? 'Free forever. No credit card required.' : 'We\'ll personalize your experience'}
          </p>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
            {[1, 2].map(s => (
              <div key={s} style={{ width: s === step ? '20px' : '6px', height: '6px', borderRadius: '3px', background: s <= step ? 'var(--accent-primary)' : 'var(--bg-elevated)', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          {step === 1 ? (
            <>
              <button onClick={handleGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', marginBottom: '20px' }}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"/><path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26a5.43 5.43 0 0 1-8.07-2.85H.96v2.34A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.34z"/><path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.34A5.36 5.36 0 0 1 9 3.58z"/></svg>
                Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or email</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required className="input" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required className="input" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ characters)" minLength={8} required className="input" />
                <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Continue →</button>
              </form>
            </>
          ) : (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>I am a…</div>
              {ROLES.map(r => (
                <div key={r.id} onClick={() => setRole(r.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', border: `1px solid ${role === r.id ? 'var(--accent-primary)' : 'var(--border)'}`, background: role === r.id ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: '24px' }}>{r.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: role === r.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{r.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.desc}</div>
                  </div>
                  {role === r.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>✓</span>}
                </div>
              ))}
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                {loading ? 'Creating account…' : 'Create Account — It\'s Free'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
          By continuing, you agree to our <a href="#" style={{ color: 'var(--accent-primary)' }}>Terms</a> and <a href="#" style={{ color: 'var(--accent-primary)' }}>Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}
