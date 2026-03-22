'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { user, mutate, isLoading } = useUser();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    target_role: '',
    target_company: '',
    gemini_api_key: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If they already have a role and company, they don't need to be here
    if (!isLoading && user && user.target_role && user.target_company) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.target_role || !formData.target_company) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save profile');
      await mutate();
      toast.success('Profile created successfully! Welcome to PrepSpace.');
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '24px' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse, rgba(77,255,160,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: '460px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Welcome, {user.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            Let's personalize your interview preparation.
          </p>
        </div>

        <form onSubmit={handleSave} className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>What role are you targeting?</label>
            <input className="input" autoFocus required value={formData.target_role} onChange={e => setFormData(p => ({ ...p, target_role: e.target.value }))} placeholder="e.g. Senior Frontend Engineer" />
          </div>
          
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Dream Company <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Required)</span></label>
            <input className="input" required value={formData.target_company} onChange={e => setFormData(p => ({ ...p, target_company: e.target.value }))} placeholder="e.g. Google, Stripe, Meta" />
          </div>

          <div style={{ padding: '16px', background: 'rgba(77,255,160,0.04)', border: '1px solid rgba(77,255,160,0.15)', borderRadius: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Gemini API Key <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional, add later)</span></label>
            <input type="password" className="input" value={formData.gemini_api_key} onChange={e => setFormData(p => ({ ...p, gemini_api_key: e.target.value }))} placeholder="AIzaSy..." style={{ fontFamily: 'var(--font-mono)' }} />
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Used to run your AI mock interviews. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>Get it free</a>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '12px', fontSize: '15px' }}>
            {saving ? 'Saving...' : 'Go to Dashboard'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
