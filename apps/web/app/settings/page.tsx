'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';

const TABS = ['Profile', 'Notifications', 'Appearance', 'Privacy', 'Account'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success('Settings saved!'); }, 900);
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
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Manage your account, preferences, and privacy</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '28px' }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', transition: 'all 0.15s', background: activeTab === tab ? 'var(--accent-primary-dim)' : 'transparent', color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              {tab}
            </button>
          ))}
          <div style={{ margin: '12px 0', height: '1px', background: 'var(--border)' }} />
          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', transition: 'all 0.15s', background: 'transparent', color: '#FF4D6A' }}>
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

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 900, color: '#080C14' }}>U</div>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>Change Photo</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Full Name</label><input className="input" placeholder="Your name" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email</label><input className="input" type="email" placeholder="you@email.com" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Role</label><input className="input" placeholder="e.g. Senior Frontend Engineer" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Company</label><input className="input" placeholder="e.g. Google" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>LinkedIn</label><input className="input" placeholder="linkedin.com/in/yourhandle" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>GitHub</label><input className="input" placeholder="github.com/yourhandle" /></div>
              </div>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</h2>
              {[
                { label: 'Daily streak reminders', desc: 'Push notifications to keep your streak alive', on: true },
                { label: 'Session report ready', desc: 'Notify when your AI report is generated', on: true },
                { label: 'Group activity', desc: 'When group members complete sessions or post updates', on: false },
                { label: 'Peer match found', desc: 'When the system finds a peer practice partner', on: true },
                { label: 'Weekly progress digest', desc: 'Email summary of your week in PrepSpace', on: true },
                { label: 'Platform updates', desc: 'New features, improvements, and announcements', on: false },
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>Accent Color</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[['#4DFFA0', 'Mint'], ['#7B61FF', 'Violet'], ['#FFB547', 'Amber'], ['#00D4FF', 'Cyan']].map(([color, name]) => (
                    <div key={name as string} title={name as string} style={{ width: '32px', height: '32px', borderRadius: '50%', background: color as string, cursor: 'pointer', outline: color === '#4DFFA0' ? '2px solid #fff' : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Privacy & Data</h2>
              {[
                { label: 'Appear on leaderboard', desc: 'Make your rank visible to other users', on: true },
                { label: 'Share roadmap activity with groups', desc: 'Let group members see your progress', on: true },
                { label: 'Analytics tracking', desc: 'Help us improve PrepSpace with anonymous usage data', on: false },
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
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Delete your account and all associated data permanently. This cannot be undone.</div>
                <button style={{ padding: '8px 16px', background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: '6px', color: '#FF4D6A', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Delete Account</button>
              </div>
            </div>
          )}

          {activeTab === 'Account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Account & Billing</h2>
              <div style={{ padding: '16px', background: 'rgba(77,255,160,0.06)', borderRadius: '10px', border: '1px solid rgba(77,255,160,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Free Plan</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>3 AI sessions/month · 1 roadmap</div>
                </div>
                <a href="#" className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px', textDecoration: 'none' }}>Upgrade to Pro →</a>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Change Password</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input className="input" type="password" placeholder="New password" />
                  <button className="btn-secondary" style={{ flexShrink: 0, fontSize: '13px', padding: '8px 16px' }}>Update</button>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: '14px', padding: '10px 24px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
