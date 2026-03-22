'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const RESUME_TEMPLATES = [
  { id: 'engineer', name: 'Software Engineer', color: 'var(--accent-primary)' },
  { id: 'pm', name: 'Product Manager', color: '#7B61FF' },
  { id: 'data', name: 'Data Scientist', color: '#FFB547' },
  { id: 'minimal', name: 'Minimal (ATS)', color: 'var(--text-muted)' },
];

export default function ResumeBuilderPage() {
  const [tab, setTab] = useState<'profile' | 'experience' | 'skills' | 'preview'>('profile');
  const [generating, setGenerating] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('engineer');
  const [resumeData, setResumeData] = useState<{ summary?: string; skills?: string[]; experience_bullets?: string[] } | null>(null);

  const handleGenerate = async () => {
    if (!targetRole) { toast.error('Please enter a target role'); return; }
    setGenerating(true);
    toast.info('Gemini 3.1 Flash-Lite is crafting your resume…');
    
    try {
      const res = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, targetCompany }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      
      setResumeData(data.resume);
      toast.success('Resume generated! Switching to preview.');
      setTab('preview');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Resume Builder</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>AI generates your resume from your profile + interview performance data</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 18px' }}>💾 Save Draft</button>
          <button onClick={handleGenerate} disabled={generating} className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
            {generating ? '🔄 Generating…' : '✨ Generate with AI'}
          </button>
        </div>
      </div>

      {/* ATS Score Banner */}
      <div style={{ padding: '14px 20px', background: 'rgba(255,181,71,0.08)', border: '1px solid rgba(255,181,71,0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <span style={{ fontSize: '20px' }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-amber)' }}>ATS Score will appear after generation</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Add a target role and JD to maximize keyword match %</div>
        </div>
        <button style={{ padding: '6px 14px', background: 'var(--accent-amber)', color: '#080C14', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Add JD</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Left panel */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
            {(['profile', 'experience', 'skills', 'preview'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-body)', color: tab === t ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: `2px solid ${tab === t ? 'var(--accent-primary)' : 'transparent'}`, transition: 'all 0.2s', textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Full Name</label><input className="input" placeholder="Jane Smith" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Email</label><input className="input" placeholder="jane@email.com" type="email" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Role</label><input className="input" placeholder="Senior Frontend Engineer" value={targetRole} onChange={e => setTargetRole(e.target.value)} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Target Company</label><input className="input" placeholder="Stripe, Google, etc." value={targetCompany} onChange={e => setTargetCompany(e.target.value)} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>LinkedIn</label><input className="input" placeholder="linkedin.com/in/janesmith" /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>GitHub</label><input className="input" placeholder="github.com/janesmith" /></div>
              </div>
              <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Location</label><input className="input" placeholder="San Francisco, CA (or Remote)" /></div>
            </div>
          )}

          {tab === 'experience' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Experience #1</h3>
                  <button style={{ fontSize: '12px', color: '#FF4D6A', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <input className="input" placeholder="Job Title" style={{ fontSize: '13px', padding: '9px 12px' }} />
                  <input className="input" placeholder="Company" style={{ fontSize: '13px', padding: '9px 12px' }} />
                  <input className="input" placeholder="Start Date (Jan 2022)" style={{ fontSize: '13px', padding: '9px 12px' }} />
                  <input className="input" placeholder="End Date (Present)" style={{ fontSize: '13px', padding: '9px 12px' }} />
                </div>
                <textarea placeholder="Key bullet points — AI will transform these into: [Action verb] + [What done] + [Measurable outcome]" style={{ width: '100%', height: '90px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text-primary)', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-body)' }} />
              </div>
              <button style={{ padding: '12px', background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                + Add Experience
              </button>
            </div>
          )}

          {tab === 'skills' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '14px' }}>AI will auto-populate from your interview performance data and sort by JD relevance.</p>
              <textarea placeholder="Additional skills (comma-separated): TypeScript, React, Node.js, PostgreSQL…" style={{ width: '100%', height: '100px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-body)' }} />
            </div>
          )}

          {tab === 'preview' && (
            <div style={{ padding: '32px', background: 'white', borderRadius: '8px', minHeight: '400px' }}>
              <div style={{ color: '#111', fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>{targetRole || 'Your Name'}</div>
              <div style={{ color: '#555', fontSize: '14px', marginBottom: '16px' }}>{targetRole || 'Target Role'} {targetCompany ? `· targeting ${targetCompany}` : ''}</div>
              
              {resumeData ? (
                <div style={{ color: '#333' }}>
                  <p style={{ fontSize: '13px', marginBottom: '16px', lineHeight: 1.6 }}>{resumeData.summary}</p>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>Core Competencies</h4>
                    <p style={{ fontSize: '13px' }}>{resumeData.skills?.join(' • ')}</p>
                  </div>
                  
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>Experience Highlights</h4>
                    <ul style={{ paddingLeft: '20px', fontSize: '13px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {resumeData.experience_bullets?.map((b: string, i: number) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '4px', color: '#555', fontSize: '13px', textAlign: 'center' }}>
                  ✨ Click "Generate with AI" to populate your resume
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Template</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {RESUME_TEMPLATES.map(t => (
                <div key={t.id} onClick={() => setSelectedTemplate(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', background: selectedTemplate === t.id ? 'var(--bg-elevated)' : 'transparent', border: `1px solid ${selectedTemplate === t.id ? t.color + '44' : 'transparent'}` }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                  {selectedTemplate === t.id && <span style={{ marginLeft: 'auto', color: t.color, fontSize: '14px' }}>✓</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>Export Options</div>
            {[['📄', 'PDF (A4)'], ['📋', 'DOCX (editable)'], ['📝', 'ATS Plain Text'], ['{ }', 'JSON Resume']].map(([icon, label]) => (
              <button key={label as string} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', marginBottom: '8px', transition: 'all 0.2s' }}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
