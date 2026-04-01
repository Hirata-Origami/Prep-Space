'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  const handleGoogle = async () => {
    setLoading(true);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/auth/callback` }
    });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '24px' }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(77,255,160,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '420px' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '24px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #4DFFA0, #00D4FF)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: '#080C14' }}>P</div>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>PrepSpace</span>
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sign in to continue your prep journey</p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          {/* Google OAuth */}
          <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', transition: 'all 0.2s', marginBottom: '24px', opacity: loading ? 0.7 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
            {loading ? (
              <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2a10.34 10.34 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"/><path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26a5.43 5.43 0 0 1-8.07-2.85H.96v2.34A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.34z"/><path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.95l3.01 2.34A5.36 5.36 0 0 1 9 3.58z"/></svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              By continuing, you confirm you have read our <a href="#" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Privacy Policy</a>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>Start free →</Link>
        </p>
      </motion.div>
    </div>
  );
}
