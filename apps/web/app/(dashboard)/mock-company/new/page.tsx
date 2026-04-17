'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRef } from 'react';

interface GeneratedCompany {
  name: string;
  logo_emoji: string;
  industry: string;
  size: string;
  difficulty_rating: number;
  interview_culture: string;
  rounds: string[];
  round_topics?: Record<string, string[]>;
  known_patterns: string[];
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'preview' | 'saved'>('form');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Software Engineer');
  const [jd, setJd] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-level');
  const [comments, setComments] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsingJd, setParsingJd] = useState(false);
  const [generatedCompany, setGeneratedCompany] = useState<GeneratedCompany | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingJd(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/roadmaps/parse', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse file');
      
      setJd(data.text);
      toast.success('Job description extracted!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setParsingJd(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/mock-companies/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          role,
          jd,
          experience_level: experienceLevel,
          comments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedCompany(data.company);
      setStep('preview');
      toast.success('Company profile generated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedCompany) return;
    setSaving(true);
    try {
      const res = await fetch('/api/mock-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedCompany),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Company added to the platform!');
      router.push('/mock-company');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '700px' }}>
      <Link href="/mock-company" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginBottom: '20px', fontWeight: 600 }}>
        ← Back to Companies
      </Link>

      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Add Company Interview</h1>
      <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px' }}>
        AI researches real interview patterns for any company and makes them available to all users
      </p>

      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Company Name *
                </label>
                <input
                  className="input"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Figma, Notion, Stripe, Zepto..."
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['Zepto', 'Zomato', 'Razorpay', 'Figma', 'Linear', 'Notion', 'Vercel', 'Anthropic'].map(c => (
                    <button key={c} onClick={() => setCompanyName(c)} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--border)', background: companyName === c ? 'rgba(77,255,160,0.1)' : 'var(--bg-elevated)', color: companyName === c ? 'var(--accent-primary)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{c}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Role</label>
                  <input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Software Engineer" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Experience Level</label>
                  <select className="input" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} style={{ width: '100%', cursor: 'pointer' }}>
                    <option>New Grad</option>
                    <option>Junior</option>
                    <option>Mid-level</option>
                    <option>Senior</option>
                    <option>Staff / Principal</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Job Description (optional)
                  </label>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={parsingJd}
                    style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', cursor: 'pointer', opacity: parsingJd ? 0.7 : 1 }}
                  >
                    {parsingJd ? 'Extracting...' : ' Upload PDF/DOCX'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt"
                    style={{ display: 'none' }} 
                  />
                </div>
                <textarea
                  value={jd}
                  onChange={e => setJd(e.target.value)}
                  placeholder="Paste the job description for more accurate round generation..."
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontFamily: 'var(--font-body)', fontSize: '14px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                  Special Focus Areas (optional)
                </label>
                <input
                  className="input"
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="e.g. focus on distributed systems, emphasize frontend performance..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(77,255,160,0.04)', border: '1px solid rgba(77,255,160,0.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                 AI will research known interview patterns at <strong style={{ color: 'var(--accent-primary)' }}>{companyName || 'this company'}</strong> and create a realistic interview format with per-round topic coverage.
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !companyName.trim()}
                className="btn-primary"
                style={{ padding: '14px', fontSize: '15px', opacity: generating || !companyName.trim() ? 0.7 : 1 }}
              >
                {generating ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span style={{ width: '18px', height: '18px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#080C14', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                    Researching interview patterns…
                  </span>
                ) : ' Generate Company Profile'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'preview' && generatedCompany && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep('form')} className="btn-secondary">← Regenerate</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ padding: '10px 24px' }}>
                  {saving ? 'Saving…' : ' Add to Platform'}
                </button>
              </div>
            </div>

            <div className="card" style={{ padding: '28px', border: '1px solid rgba(77,255,160,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <span style={{ fontSize: '48px' }}>{generatedCompany.logo_emoji}</span>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>{generatedCompany.name}</h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {generatedCompany.industry} • {generatedCompany.size} • Difficulty: <strong style={{ color: generatedCompany.difficulty_rating >= 9 ? '#FF4D6A' : '#FFB547' }}>{generatedCompany.difficulty_rating}/10</strong>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>{generatedCompany.interview_culture}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(generatedCompany.rounds || []).map((roundName: string) => {
                  const topics = generatedCompany.round_topics?.[roundName] || [];
                  return (
                    <div key={roundName} style={{ padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontSize: '15px' }}> {roundName}</div>
                      {topics.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                          {topics.map((t: string) => (
                            <span key={t} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: 'rgba(123,97,255,0.1)', color: '#7B61FF', border: '1px solid rgba(123,97,255,0.2)', fontWeight: 600 }}>{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {generatedCompany.known_patterns?.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Known Patterns</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {generatedCompany.known_patterns.map((p: string, i: number) => (
                      <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>→</span> {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
