'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';

type Mode = 'generate' | 'jd' | 'custom';

export default function NewRoadmapPage() {
  const router = useRouter();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>('generate');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);

  const handleGenerate = async () => {
    if (!user?.has_gemini_key && !process.env.NEXT_PUBLIC_HAS_GLOBAL_KEY) {
      toast.error('Please add your Gemini API key in Settings first');
      router.push('/settings');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/roadmaps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: mode === 'generate' ? role : undefined,
          jobDescription: mode === 'jd' ? jd : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedRoadmap(data.roadmap);
      toast.success('Roadmap generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedRoadmap) return;
    setLoading(true);
    try {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedRoadmap),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Roadmap saved!');
      router.push('/roadmap');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (generatedRoadmap) {
    return (
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              ✅ Roadmap Generated
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Review your personalized prep plan below</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setGeneratedRoadmap(null)} className="btn-secondary" style={{ fontSize: '14px', padding: '10px 20px' }}>← Regenerate</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px' }}>
              {loading ? 'Saving…' : 'Save Roadmap →'}
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '20px', border: '1px solid rgba(77,255,160,0.25)' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>{generatedRoadmap.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{generatedRoadmap.description}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(generatedRoadmap.modules ?? []).map((m: any, i: number) => (
            <div key={i} className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(77,255,160,0.1)', border: '1px solid rgba(77,255,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'var(--accent-primary)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{m.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>{m.description}</div>
                  {m.skills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {m.skills.map((s: string) => (
                        <span key={s} className="badge badge-mint" style={{ fontSize: '11px' }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {m.estimated_hours && `⏱ ~${m.estimated_hours}h`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Create a Roadmap</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Let Gemini AI build a personalized prep plan for your target role</p>
      </div>

      {/* Mode selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {([
          { id: 'generate', icon: '🎯', label: 'By Role', desc: 'Pick a role name' },
          { id: 'jd', icon: '📋', label: 'From JD', desc: 'Paste a job description' },
          { id: 'custom', icon: '✏️', label: 'Manual', desc: 'Build it yourself' },
        ] as { id: Mode; icon: string; label: string; desc: string }[]).map(({ id, icon, label, desc }) => (
          <button key={id} onClick={() => setMode(id)}
            style={{ padding: '16px', borderRadius: '12px', border: `1px solid ${mode === id ? 'var(--accent-primary)' : 'var(--border)'}`, background: mode === id ? 'rgba(77,255,160,0.06)' : 'var(--bg-elevated)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: mode === id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="card" style={{ padding: '24px' }}>
        {mode === 'generate' && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Target Role</label>
            <input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer at Google" style={{ width: '100%', marginBottom: '16px' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {['Frontend Engineer', 'ML Engineer', 'Product Manager', 'Backend Engineer', 'Data Scientist', 'DevOps Engineer'].map(r => (
                <button key={r} onClick={() => setRole(r)} style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {mode === 'jd' && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Paste Job Description</label>
            <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full job description here…" rows={8}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
          </div>
        )}

        {mode === 'custom' && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚧</div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Manual builder coming soon</div>
            <p style={{ fontSize: '13px' }}>For now, use the AI-powered modes above. Manual editing will be available after generation.</p>
          </div>
        )}

        {mode !== 'custom' && (
          <button onClick={handleGenerate} disabled={loading || (mode === 'generate' && !role) || (mode === 'jd' && !jd)} className="btn-primary" style={{ width: '100%', fontSize: '15px', padding: '14px', opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#080C14', display: 'inline-block', animation: 'spin-slow 1s linear infinite' }} />
                Generating with Gemini…
              </span>
            ) : '✨ Generate Roadmap with AI'}
          </button>
        )}
      </div>

      {!user?.has_gemini_key && (
        <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(255,181,71,0.06)', border: '1px solid rgba(255,181,71,0.25)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>⚠️</span>
          <span>You need a Gemini API key to generate roadmaps. <a href="/settings" style={{ color: '#FFB547', fontWeight: 600 }}>Add one in Settings →</a></span>
        </div>
      )}
    </div>
  );
}
