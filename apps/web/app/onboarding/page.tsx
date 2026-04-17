'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';
import { useRouter } from 'next/navigation';
import { Zap, ChevronRight, Check } from 'lucide-react';

export default function OnboardingPage() {
  const { user, mutate, isLoading } = useUser();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    target_role: '',
    target_company: '',
    gemini_api_key: ''
  });
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If they already have all mandatory fields, redirect them
    if (!isLoading && user && user.target_role && user.target_company && user.has_gemini_key) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.target_role || !formData.target_company || !formData.gemini_api_key) {
      toast.error('All fields are required to secure your PrepSpace experience.');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_role: formData.target_role,
          target_company: formData.target_company,
          gemini_api_key: formData.gemini_api_key,
        }),
      });

      if (!res.ok) throw new Error('Failed to save profile');
      await mutate();
      toast.success('Profile created successfully! Welcome to PrepSpace.');
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '24px' }}>
      <div style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
        {/* Background Decor */}
        <div style={{ position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, var(--accent-primary-dim), transparent 70%)', opacity: 0.15, zIndex: 0 }} />

        <div className="card" style={{ padding: '40px', position: 'relative', zIndex: 1, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(10px)' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, var(--accent-primary), #00D4FF)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 30px rgba(77, 255, 160, 0.2)' }}>
              <Zap size={24} color="#080C14" strokeWidth={3} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Finalize Your Edge</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Help PrepSpace calibrate your training environment.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="step1">
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Target Role</label>
                    <input className="input" value={formData.target_role} onChange={e => setFormData(p => ({ ...p, target_role: e.target.value }))} placeholder="e.g. Senior Software Engineer" style={{ width: '100%' }} />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Dream Company</label>
                    <input className="input" value={formData.target_company} onChange={e => setFormData(p => ({ ...p, target_company: e.target.value }))} placeholder="e.g. Google, Stripe, Meta" style={{ width: '100%' }} />
                  </div>
                  <button onClick={() => setStep(2)} disabled={!formData.target_role || !formData.target_company} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                    Next Step <ChevronRight size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="step2">
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>AI Provider API Key (Gemini)</label>
                    <input className="input" type="password" value={formData.gemini_api_key} onChange={e => setFormData(p => ({ ...p, gemini_api_key: e.target.value }))} placeholder="Enter your Gemini/AI API key" style={{ width: '100%' }} />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                    Your key is required for live AI interaction. It is stored securely and never shared. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Get a free key here →</a>
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setStep(1)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
                    <button onClick={() => handleSave()} disabled={!formData.gemini_api_key || saving} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                      {saving ? 'Finalizing...' : 'Complete Setup'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {[1, 2].map(s => (
              <div key={s} style={{ width: '24px', height: '4px', background: step === s ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', borderRadius: '2px', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>

        {/* Security badge */}
        <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: 0.6 }}>
          <Check size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>END-TO-END ENCRYPTED CONFIGURATION</span>
        </div>
      </div>
    </div>
  );
}
