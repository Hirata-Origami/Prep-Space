'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';
import { getSupabaseClient } from '@/lib/supabase/client';
import { CheckCircle2, AlertCircle, Sparkles, KeyRound, Palette, Shield, User as UserIcon, Loader2 } from 'lucide-react';

const TABS = ['Profile', 'AI API Key', 'Appearance', 'Privacy'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [saving, setSaving] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('dark');
  const { user, mutate } = useUser();

  const [formData, setFormData] = useState({
    target_role: '',
    target_company: '',
  });

  // Gemini key state
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        target_role: user.target_role ?? '',
        target_company: user.target_company ?? '',
      });
      // Do not populate input with masked key string; placeholder & badge indicate active status
      setGeminiKey('');
    }
    // Read theme
    try {
      const saved = localStorage.getItem('prepspace_theme') || 'light';
      setCurrentTheme(saved);
    } catch {}
  }, [user]);

  const handleThemeChange = (theme: 'dark' | 'light') => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem('prepspace_theme', theme);
      document.documentElement.dataset.theme = theme;
      toast.success(`Theme switched to ${theme === 'dark' ? 'Dark' : 'Light'}`);
    } catch {}
  };

  const handleValidateKey = async () => {
    const keyToTest = geminiKey.trim();
    if (!keyToTest && !user?.has_gemini_key) {
      toast.error('Enter an API key first to validate.');
      return;
    }

    if (keyToTest && (keyToTest.includes('•') || /[^\x00-\x7F]/.test(keyToTest))) {
      toast.error('Please enter a fresh, unmasked API key starting with AIza...');
      return;
    }

    setValidatingKey(true);
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToTest || undefined }),
      });
      const data = await res.json();

      if (data.valid) {
        toast.success(data.message || 'Gemini API key is valid and working!');
      } else {
        toast.error(`Key validation failed: ${data.error || 'Invalid key'}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Validation request failed');
    } finally {
      setValidatingKey(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = { ...formData };
      if (activeTab === 'AI API Key' && geminiKey) {
        payload.gemini_api_key = geminiKey;
      }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save');
      await mutate();
      toast.success('Settings saved!');
      if (activeTab === 'AI API Key') setGeminiKey('');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'Profile': return <UserIcon size={16} />;
      case 'AI API Key': return <KeyRound size={16} />;
      case 'Appearance': return <Palette size={16} />;
      case 'Privacy': return <Shield size={16} />;
      default: return null;
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '880px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Settings</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Manage your account, preferences, and AI configuration</p>
      </div>

      <div className="grid-settings-layout">
        {/* Sidebar Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                textAlign: 'left',
                transition: 'all 0.15s',
                background: activeTab === tab ? 'var(--accent-primary-dim)' : 'transparent',
                color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              {getTabIcon(tab)}
              <span>{tab}</span>
              {tab === 'AI API Key' && !user?.has_gemini_key && (
                <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#FFB547', flexShrink: 0 }} />
              )}
            </button>
          ))}
          <div style={{ margin: '12px 0', height: '1px', background: 'var(--border)' }} />
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              textAlign: 'left',
              background: 'transparent',
              color: '#FF4D6A',
            }}
          >
            Sign Out
          </button>
        </div>

        {/* Content Panel */}
        <div className="card" style={{ padding: '28px' }}>
          {activeTab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Profile</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Update your personal information and career targets</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 900, color: '#080C14' }} suppressHydrationWarning>
                  {mounted ? (user?.full_name?.[0]?.toUpperCase() ?? 'U') : 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }} suppressHydrationWarning>{mounted ? (user?.full_name ?? 'User') : 'User'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }} suppressHydrationWarning>{mounted ? (user?.xp ?? 0).toLocaleString() : 0} XP · Level {mounted ? (user?.level || 'Novice') : 'Novice'}</div>
                </div>
              </div>
              <div className="grid-responsive-2" style={{ gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Role</label>
                  <input className="input" value={formData.target_role} onChange={e => setFormData(p => ({ ...p, target_role: e.target.value }))} placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Company</label>
                  <input className="input" value={formData.target_company} onChange={e => setFormData(p => ({ ...p, target_company: e.target.value }))} placeholder="e.g. Google, Stripe" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AI API Key' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Gemini AI API Key</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Used for personalized roadmap generation, interactive voice interviews, and feedback scoring.</p>
              </div>

              <div style={{
                padding: '16px',
                background: user?.has_gemini_key ? 'rgba(77,255,160,0.06)' : 'rgba(255,181,71,0.06)',
                border: `1px solid ${user?.has_gemini_key ? 'rgba(77,255,160,0.2)' : 'rgba(255,181,71,0.2)'}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                {user?.has_gemini_key ? <CheckCircle2 size={24} color="#4DFFA0" /> : <AlertCircle size={24} color="#FFB547" />}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: user?.has_gemini_key ? 'var(--accent-primary)' : 'var(--accent-amber)' }}>
                    {user?.has_gemini_key ? 'AI API key is active' : 'No personal API key saved'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {user?.has_gemini_key ? 'Your key is securely stored and used for AI requests.' : 'Add your Gemini API key to enable instant custom roadmaps and live mock interviews.'}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  {user?.has_gemini_key ? 'Update API Key' : 'Add API Key'}
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    type="password"
                    placeholder={user?.has_gemini_key ? 'Key is saved · enter new key to replace' : 'Paste AIzaSy... key here'}
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleValidateKey}
                    disabled={validatingKey || (!geminiKey.trim() && !user?.has_gemini_key)}
                    className="btn-secondary"
                    style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {validatingKey ? <Loader2 size={14} className="animate-spin" /> : null}
                    <span>{geminiKey.trim() ? 'Validate Key' : 'Test Saved Key'}</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !geminiKey.trim() || geminiKey.includes('•')}
                    className="btn-primary"
                    style={{ padding: '10px 20px', fontSize: '13px' }}
                  >
                    {saving ? 'Saving...' : 'Save Key'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Get a free Gemini API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>aistudio.google.com/app/apikey</a>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                🔒 <strong style={{ color: 'var(--text-secondary)' }}>Secure storage:</strong> Your key is stored in your private user profile row with strict Row Level Security and never exposed to other clients.
              </div>
            </div>
          )}

          {activeTab === 'Appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Appearance & Theme</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Customize your PrepSpace visual environment</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'light', label: 'Light', desc: 'Clean, modern light palette for bright environments', color: '#F8FAFC', border: '#CBD5E1' },
                  { id: 'dark', label: 'Dark', desc: 'High-contrast midnight theme tailored for code and diagrams', color: '#080C14', border: '#131D2E' },
                ].map((t) => {
                  const isSelected = currentTheme === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleThemeChange(t.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px',
                        borderRadius: '12px',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
                        background: isSelected ? 'rgba(77,255,160,0.04)' : 'var(--bg-elevated)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: t.color, border: `1px solid ${t.border}`, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {t.label}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</div>
                      </div>
                      {isSelected && <span style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '16px' }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'Privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Privacy & Data</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage visibility and data retention</p>
              </div>
              {[
                { label: 'Appear on global leaderboard', desc: 'Allow your username and XP to be visible to others', on: true },
                { label: 'Share roadmap activity in groups', desc: 'Let group members see your module completion milestones', on: true },
              ].map(({ label, desc, on }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-elevated)', borderRadius: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                  <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: on ? 'var(--accent-primary)' : 'var(--bg-elevated)', border: on ? 'none' : '1px solid var(--border)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: '3px', left: on ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: on ? '#080C14' : 'var(--text-muted)', transition: 'left 0.2s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save button footer */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {activeTab === 'AI API Key' && geminiKey && (
              <button onClick={() => setGeminiKey('')} className="btn-secondary" style={{ fontSize: '14px', padding: '10px 20px' }}>Cancel</button>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
