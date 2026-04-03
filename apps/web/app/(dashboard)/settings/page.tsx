'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';
import { getSupabaseClient } from '@/lib/supabase/client';

const TABS = ['Profile', 'AI API Key', 'Notifications', 'Appearance', 'Privacy'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [saving, setSaving] = useState(false);
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
      setGeminiKey(user.gemini_api_key ?? '');
    }
  }, [user]);

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

  return (
    <div style={{ padding: '32px', maxWidth: '820px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Settings</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Manage your account, preferences, and AI configuration</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '28px' }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', transition: 'all 0.15s', background: activeTab === tab ? 'var(--accent-primary-dim)' : 'transparent', color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              {tab === 'AI API Key' && '🤖 '}{tab}
              {tab === 'AI API Key' && !user?.has_gemini_key && (
                <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#FFB547', flexShrink: 0 }} />
              )}
            </button>
          ))}
          <div style={{ margin: '12px 0', height: '1px', background: 'var(--border)' }} />
          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', background: 'transparent', color: '#FF4D6A' }}>
            Sign Out
          </button>
        </div>

        {/* Content */}
        <div className="card" style={{ padding: '28px' }}>
          {activeTab === 'Profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Profile</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Update your personal information and career details</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 900, color: '#080C14' }}>
                  {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.full_name ?? 'User'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{(user?.xp ?? 0).toLocaleString()} XP</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Role</label>
                  <input className="input" value={formData.target_role} onChange={e => setFormData(p => ({ ...p, target_role: e.target.value }))} placeholder="e.g. Senior Frontend Engineer" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Company</label>
                  <input className="input" value={formData.target_company} onChange={e => setFormData(p => ({ ...p, target_company: e.target.value }))} placeholder="e.g. Google" /></div>
              </div>
            </div>
          )}
          {activeTab === 'AI API Key' && (
            <div className="card" style={{ padding: '32px', animation: 'fadeIn 0.3s ease-in' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Your AI API Key</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Required for generating roadmaps and live interviews. Currently using Gemini.</p>
              </div>

              <div style={{ padding: '16px', background: user?.has_gemini_key ? 'rgba(77,255,160,0.06)' : 'rgba(255,181,71,0.06)', border: `1px solid ${user?.has_gemini_key ? 'rgba(77,255,160,0.2)' : 'rgba(255,181,71,0.2)'}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{user?.has_gemini_key ? '✅' : '⚠️'}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: user?.has_gemini_key ? 'var(--accent-primary)' : 'var(--accent-amber)' }}>
                    {user?.has_gemini_key ? 'AI API key is configured' : 'No AI API key set'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {user?.has_gemini_key ? 'AI features are active. Update below to change your key.' : 'Add a key to enable roadmap generation, AI interviews, and report analysis.'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Update API Key</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input className="input" type="password" placeholder={user?.has_gemini_key ? "••••••••••••••••" : "Paste your API key"} value={geminiKey} onChange={e => setGeminiKey(e.target.value)} style={{ flex: 1 }} />
                  <button onClick={handleSave} disabled={saving || !geminiKey} className="btn-primary" style={{ padding: '10px 24px' }}>
                    {saving ? 'Saving...' : 'Save Key'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Get your free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>aistudio.google.com/app/apikey</a>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-elevated)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                🔒 <strong style={{ color: 'var(--text-secondary)' }}>Your key is encrypted at rest</strong> and never exposed to the browser. It is only used server-side for AI calls.
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</h2>
              {[
                { label: 'Daily streak reminders', desc: 'Push to keep your streak alive', on: true },
                { label: 'Session report ready', desc: 'When your AI report is generated', on: true },
                { label: 'Group activity', desc: 'When group members post updates', on: false },
                { label: 'Peer match found', desc: 'When a practice partner is found', on: true },
                { label: 'Weekly progress digest', desc: 'Email summary of your week', on: true },
                { label: 'Platform updates', desc: 'New features and announcements', on: false },
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

          {activeTab === 'Appearance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Appearance</h2>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Theme</div>
                {['Dark (Default)', 'Darker (OLED)', 'Light (Beta)'].map((t, i) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: `1px solid ${i === 0 ? 'var(--accent-primary)' : 'var(--border)'}`, background: i === 0 ? 'rgba(77,255,160,0.04)' : 'var(--bg-elevated)', cursor: 'pointer', marginBottom: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: i === 0 ? '#080C14' : i === 1 ? '#000' : '#f5f5f5', border: '1px solid var(--border)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: i === 0 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{t}</span>
                    {i === 0 && <span style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Privacy & Data</h2>
              {[
                { label: 'Appear on leaderboard', desc: 'Make your rank visible to others', on: true },
                { label: 'Share roadmap activity', desc: 'Let group members see progress', on: true },
                { label: 'Anonymous analytics', desc: 'Help us improve with usage data', on: false },
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
              <div style={{ marginTop: '8px', padding: '16px', background: 'rgba(255,77,106,0.06)', borderRadius: '10px', border: '1px solid rgba(255,77,106,0.2)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#FF4D6A', marginBottom: '6px' }}>Danger Zone</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Delete your account and all data permanently.</div>
                <button style={{ padding: '8px 16px', background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: '6px', color: '#FF4D6A', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Delete Account</button>
              </div>
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            {activeTab === 'AI API Key' && geminiKey && (
              <button onClick={() => setGeminiKey('')} className="btn-secondary" style={{ fontSize: '14px', padding: '10px 20px' }}>Cancel</button>
            )}
            <button onClick={handleSave} disabled={saving || (activeTab === 'AI API Key' && !geminiKey && !user?.has_gemini_key)} className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : activeTab === 'AI API Key' && geminiKey ? 'Save API Key' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
