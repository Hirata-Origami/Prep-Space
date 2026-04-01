'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUser } from '@/lib/hooks/useUser';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'generate' | 'jd' | 'custom';

export default function NewRoadmapPage() {
  const router = useRouter();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>('generate');
  const [role, setRole] = useState('');
  const [jd, setJd] = useState('');
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);

  // Post-generate refinement state
  const [refineComments, setRefineComments] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [showRefine, setShowRefine] = useState(false);
  const [refining, setRefining] = useState(false);

  const handleGenerate = async () => {
    if (!user?.has_gemini_key && !process.env.NEXT_PUBLIC_HAS_GLOBAL_KEY) {
      toast.error('Please add your Gemini API key in Settings first');
      router.push('/settings');
      return;
    }
    setLoading(true);
    setSelectedModuleIds([]);
    setRefineComments('');
    setShowRefine(false);
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
      toast.success(`Roadmap with ${data.roadmap.modules?.length || 0} modules generated!`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refineComments.trim()) {
      toast.error('Please add comments about what to update');
      return;
    }
    setRefining(true);
    try {
      const res = await fetch('/api/roadmaps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: mode === 'generate' ? role : undefined,
          jobDescription: mode === 'jd' ? jd : undefined,
          refine: true,
          comments: refineComments,
          selected_module_ids: selectedModuleIds.map((_, i) => i.toString()),
          current_roadmap: generatedRoadmap,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refinement failed');
      setGeneratedRoadmap(data.roadmap);
      setShowRefine(false);
      setRefineComments('');
      setSelectedModuleIds([]);
      toast.success('Roadmap refined!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRefining(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/roadmaps/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parsing failed');
      setJd(data.text);
      toast.success('JD extracted successfully!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!generatedRoadmap) return;
    setSaving(true);
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
      setSaving(false);
    }
  };

  const toggleModule = (index: number) => {
    const key = index.toString();
    setSelectedModuleIds(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };

  if (generatedRoadmap) {
    return (
      <div style={{ padding: '32px', maxWidth: '860px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              ✅ Roadmap Generated
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {generatedRoadmap.modules?.length || 0} modules · Review, refine, then save
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setGeneratedRoadmap(null)} className="btn-secondary" style={{ fontSize: '13px', padding: '9px 18px' }}>
              ← Regenerate
            </button>
            <button onClick={() => setShowRefine(v => !v)} className="btn-secondary" style={{ fontSize: '13px', padding: '9px 18px', borderColor: showRefine ? 'var(--accent-primary)' : undefined, color: showRefine ? 'var(--accent-primary)' : undefined }}>
              ✏️ Refine
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ fontSize: '13px', padding: '9px 20px' }}>
              {saving ? 'Saving…' : 'Save Roadmap →'}
            </button>
          </div>
        </div>

        {/* Refine Panel */}
        <AnimatePresence>
          {showRefine && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: '24px' }}
            >
              <div className="card" style={{ padding: '24px', border: '1px solid rgba(77,255,160,0.25)', background: 'rgba(77,255,160,0.02)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Refine this Roadmap</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Select specific modules to update (or leave empty for full roadmap changes), then describe what to change.
                </p>

                {/* Module selection */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {(generatedRoadmap.modules || []).map((m: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => toggleModule(i)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '100px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                        transition: 'all 0.15s',
                        background: selectedModuleIds.includes(i.toString()) ? 'rgba(77,255,160,0.15)' : 'var(--bg-elevated)',
                        borderColor: selectedModuleIds.includes(i.toString()) ? 'var(--accent-primary)' : 'var(--border)',
                        color: selectedModuleIds.includes(i.toString()) ? 'var(--accent-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {i + 1}. {m.title.length > 24 ? m.title.slice(0, 24) + '…' : m.title}
                    </button>
                  ))}
                </div>

                <textarea
                  value={refineComments}
                  onChange={e => setRefineComments(e.target.value)}
                  placeholder="e.g., Add more depth to system design, include Kubernetes and distributed caching. For DSA, focus more on graph traversal and bit manipulation..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowRefine(false); setRefineComments(''); setSelectedModuleIds([]); }} className="btn-secondary" style={{ fontSize: '13px' }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleRefine}
                    disabled={refining || !refineComments.trim()}
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '9px 20px', opacity: refining || !refineComments.trim() ? 0.7 : 1 }}
                  >
                    {refining ? '✨ Refining…' : '✨ Apply Refinement'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="card" style={{ marginBottom: '20px', border: '1px solid rgba(77,255,160,0.25)' }}>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>{generatedRoadmap.title}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{generatedRoadmap.description}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(generatedRoadmap.modules ?? []).map((m: any, i: number) => (
            <div key={i} className="card" style={{ padding: '20px', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(77,255,160,0.1)', border: '1px solid rgba(77,255,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{m.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '10px' }}>{m.description}</div>
                  {m.interview_topics?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                      {m.interview_topics.slice(0, 5).map((t: string) => (
                        <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(123,97,255,0.1)', color: '#7B61FF', border: '1px solid rgba(123,97,255,0.2)', fontWeight: 600 }}>{t}</span>
                      ))}
                      {m.interview_topics.length > 5 && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 600 }}>+{m.interview_topics.length - 5}</span>}
                    </div>
                  )}
                  {m.skills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '8px' }}>
                      {m.skills.map((s: string) => (
                        <span key={s} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(77,255,160,0.08)', color: 'var(--accent-primary)', fontWeight: 600 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {m.estimated_hours && `⏱ ~${m.estimated_hours}h`}
                    {m.coverage_note && <span style={{ marginLeft: '12px' }}>📊 {m.coverage_note}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowRefine(true)} className="btn-secondary">✏️ Refine Roadmap</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: '12px 28px', fontSize: '15px' }}>
            {saving ? 'Saving…' : '💾 Save Roadmap →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Create a Roadmap</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Let AI build a personalized prep plan with 16-20 comprehensive modules</p>
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
              {['Frontend Engineer', 'ML Engineer', 'Product Manager', 'Backend Engineer', 'Data Scientist', 'DevOps Engineer', 'Systems Engineer', 'Mobile Engineer'].map(r => (
                <button key={r} onClick={() => setRole(r)} style={{ padding: '5px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border)', background: role === r ? 'rgba(77,255,160,0.1)' : 'var(--bg-elevated)', color: role === r ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {mode === 'jd' && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Job Description</label>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(77,255,160,0.03)', border: '1px dashed rgba(77,255,160,0.3)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', opacity: parsing ? 0.6 : 1 }}>
                <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} style={{ display: 'none' }} disabled={parsing} />
                <span style={{ fontSize: '24px', marginBottom: '8px' }}>{parsing ? '⌛' : '📄'}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{parsing ? 'Parsing File...' : 'Upload JD (PDF, DOCX, TXT)'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>or type/paste below</span>
              </label>
            </div>
            <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the job description or upload a file above…" rows={8}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }} />
          </div>
        )}

        {mode === 'custom' && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚧</div>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Manual builder coming soon</div>
            <p style={{ fontSize: '13px' }}>For now, use the AI-powered modes above. Manual editing is available after generation via the Refine option.</p>
          </div>
        )}

        {mode !== 'custom' && (
          <>
            <div style={{ padding: '10px 14px', background: 'rgba(77,255,160,0.04)', border: '1px solid rgba(77,255,160,0.15)', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              ✨ Will generate <strong style={{ color: 'var(--accent-primary)' }}>16-20 comprehensive modules</strong> covering 90%+ of knowledge needed to crack this role
            </div>
            <button onClick={handleGenerate} disabled={loading || (mode === 'generate' && !role) || (mode === 'jd' && !jd)} className="btn-primary" style={{ width: '100%', fontSize: '15px', padding: '14px', opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#080C14', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  Generating 16+ modules…
                </span>
              ) : '✨ Generate Roadmap with AI'}
            </button>
          </>
        )}
      </div>

      {!user?.has_gemini_key && (
        <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(255,181,71,0.06)', border: '1px solid rgba(255,181,71,0.25)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>⚠️</span>
          <span>You need an AI API key to generate roadmaps. <a href="/settings" style={{ color: '#FFB547', fontWeight: 600 }}>Add one in Settings →</a></span>
        </div>
      )}
    </div>
  );
}
