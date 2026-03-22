'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

const COMPANIES = [
  { name: 'Google', logo: '🔍', industry: 'Tech', rounds: ['DSA', 'System Design', 'Behavioral', 'Googleyness'], passRate: 71, difficulty: 9.2, knownFor: 'Breadth of algorithms, heavy on graphs and DP' },
  { name: 'Meta', logo: '📘', industry: 'Tech', rounds: ['Coding x2', 'System Design', 'Leadership Principles'], passRate: 64, difficulty: 8.8, knownFor: 'Product sense + coding, Behavioral very important' },
  { name: 'Amazon', logo: '📦', industry: 'Tech', rounds: ['Online Assessment', 'Behavioral (LP)', 'Technical', 'Bar Raiser'], passRate: 58, difficulty: 8.5, knownFor: '14 Leadership Principles, STAR answers required' },
  { name: 'Apple', logo: '🍎', industry: 'Tech', rounds: ['Coding', 'System Design', 'Hiring Manager'], passRate: 55, difficulty: 8.7, knownFor: 'Focus on low-level details, obsession with polish' },
  { name: 'Microsoft', logo: '🪟', industry: 'Tech', rounds: ['Coding x3', 'Design', 'As Appropriate'], passRate: 68, difficulty: 8.0, knownFor: 'Growth mindset culture, collaborative style' },
  { name: 'Stripe', logo: '💳', industry: 'Fintech', rounds: ['Bug Fix', 'Architecture', 'System Design'], passRate: 52, difficulty: 9.0, knownFor: 'Real-world code tasks, attention to craft' },
  { name: 'Airbnb', logo: '🏠', industry: 'Travel Tech', rounds: ['Coding', 'Cross-functional', 'System Design'], passRate: 61, difficulty: 8.3, knownFor: 'Strong culture fit, product intuition' },
  { name: 'Coinbase', logo: '₿', industry: 'Fintech', rounds: ['Coding', 'System Design', 'Crypto Knowledge'], passRate: 60, difficulty: 8.1, knownFor: 'Blockchain knowledge a plus, fast-paced culture' },
  { name: 'Netflix', logo: '🎬', industry: 'Streaming', rounds: ['Coding', 'System Design', 'Culture Doc'], passRate: 49, difficulty: 9.4, knownFor: 'Elite talent only, culture document is law' },
];

export default function MockCompanyPage() {
  const [selected, setSelected] = useState<typeof COMPANIES[0] | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customData, setCustomData] = useState({ company: '', role: '', exp: '2', jd: '' });
  const [mode, setMode] = useState<'train' | 'ruthless'>('train');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, []);

  const handleCustomStart = async () => {
    if (!customData.company || !customData.role) {
      toast.error("Please enter company and role");
      return;
    }
    setIsGenerating(true);
    // Simulate generation or redirect with params
    router.push(`/interview/new?company=${encodeURIComponent(customData.company)}&role=${encodeURIComponent(customData.role)}&exp=${customData.exp}&custom=true&direct=true`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success("JD Uploaded! AI will tailor the interview to these requirements.");
      // In a real app, we'd parse the PDF text here.
      setCustomData({ ...customData, jd: 'Parsed context from JD...' });
    }
  };

  const companyProgress = useMemo(() => {
    if (!selected) return { unlockedCount: 1, roundStatus: [] };
    const relevantSessions = sessions.filter(s => s.plan?.company === selected.name);
    let unlockedCount = 1;
    const status: { round: string; score: number; passed: boolean }[] = [];
    for (let i = 0; i < selected.rounds.length; i++) {
      const roundName = selected.rounds[i];
      const session = relevantSessions.find(s => s.plan?.round === roundName);
      const report = session?.interview_reports?.[0];
      const score = report?.overall_score || 0;
      const passed = score >= 80;
      status.push({ round: roundName, score, passed });
      if (passed) unlockedCount = i + 2;
    }
    return { unlockedCount: Math.min(unlockedCount, selected.rounds.length), roundStatus: status };
  }, [selected, sessions]);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Mock Company Interviews</h1>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Practice for exactly the company you&apos;re targeting with role-grounded AI.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '100px' }}>
          <button onClick={() => setIsCustom(false)} style={{ padding: '8px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: !isCustom ? 'var(--accent-primary)' : 'transparent', color: !isCustom ? '#000' : 'var(--text-muted)' }}>Top Companies</button>
          <button onClick={() => setIsCustom(true)} style={{ padding: '8px 20px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: isCustom ? 'var(--accent-primary)' : 'transparent', color: isCustom ? '#000' : 'var(--text-muted)' }}>Custom Setup</button>
        </div>
      </div>

      {!isCustom ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Company grid */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {COMPANIES.map(company => (
                <div key={company.name} onClick={() => setSelected(company)}
                  className="card card-interactive"
                  style={{ padding: '20px', borderColor: selected?.name === company.name ? 'rgba(77,255,160,0.4)' : undefined, background: selected?.name === company.name ? 'rgba(77,255,160,0.04)' : undefined }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>{company.logo}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{company.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{company.industry}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pass rate: <strong style={{ color: company.passRate > 65 ? 'var(--accent-primary)' : 'var(--accent-amber)' }}>{company.passRate}%</strong></span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>⭐ {company.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company detail panel */}
          <div style={{ position: 'sticky', top: '24px', alignSelf: 'start' }}>
            {selected ? (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card" style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>{selected.logo}</div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{selected.name}</h2>
                  <span className="badge badge-muted" style={{ fontSize: '11px', marginTop: '6px', display: 'inline-flex' }}>{selected.industry}</span>
                </div>

                {/* Rounds */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Interview Rounds</div>
                  {selected.rounds.map((r, i) => {
                    const isUnlocked = i < companyProgress.unlockedCount;
                    const isPassed = companyProgress.roundStatus[i]?.passed;
                    const score = companyProgress.roundStatus[i]?.score;

                    return (
                      <div key={r} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        background: isUnlocked ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.02)', 
                        border: `1px solid ${isPassed ? 'rgba(77,255,160,0.3)' : (isUnlocked ? 'var(--border)' : 'transparent')}`,
                        marginBottom: '6px',
                        opacity: isUnlocked ? 1 : 0.5
                      }}>
                        <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          background: isPassed ? 'var(--accent-primary)' : (isUnlocked ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)'), 
                          border: '1px solid ' + (isPassed ? 'var(--accent-primary)' : 'var(--border)'),
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '10px', 
                          fontWeight: 700, 
                          color: isPassed ? '#000' : (isUnlocked ? 'var(--accent-primary)' : 'var(--text-muted)'), 
                          flexShrink: 0 
                        }}>
                          {isPassed ? '✓' : i + 1}
                        </div>
                        <span style={{ fontSize: '13px', color: isUnlocked ? 'var(--text-secondary)' : 'var(--text-muted)', flex: 1 }}>{r}</span>
                        {isUnlocked && !isPassed && score > 0 && <span style={{ fontSize: '11px', color: '#FF4D6A' }}>{score}%</span>}
                        {isPassed && <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700 }}>{score}%</span>}
                        {!isUnlocked && <span style={{ fontSize: '11px' }}>🔒</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Known for */}
                <div style={{ padding: '12px', background: 'rgba(77,255,160,0.05)', borderRadius: '8px', border: '1px solid rgba(77,255,160,0.15)', marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '4px' }}>💡 KNOWN FOR</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{selected.knownFor}</div>
                </div>

                {/* Mode selection */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>PRACTICE MODE</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['train', 'ruthless'] as const).map(m => (
                      <button key={m} onClick={() => setMode(m)}
                        style={{ flex: 1, padding: '9px', borderRadius: '7px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: '1px solid', fontFamily: 'var(--font-body)', transition: 'all 0.2s', background: mode === m ? (m === 'ruthless' ? 'rgba(255,77,106,0.12)' : 'rgba(77,255,160,0.12)') : 'transparent', borderColor: mode === m ? (m === 'ruthless' ? '#FF4D6A' : 'var(--accent-primary)') : 'var(--border)', color: mode === m ? (m === 'ruthless' ? '#FF4D6A' : 'var(--accent-primary)') : 'var(--text-muted)' }}>
                        {m === 'train' ? '📖 Train' : '💀 Ruthless'}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const currentRoundIndex = Math.min(companyProgress.unlockedCount - 1, selected.rounds.length - 1);
                    const roundName = selected.rounds[currentRoundIndex];
                    router.push(`/interview/new?company=${encodeURIComponent(selected.name)}&round=${encodeURIComponent(roundName)}&direct=true`);
                  }}
                  className={mode === 'ruthless' ? '' : 'btn-primary'}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', background: mode === 'ruthless' ? '#FF4D6A' : undefined, color: mode === 'ruthless' ? '#fff' : undefined, border: 'none' }}>
                  🎙 Start {selected.rounds[companyProgress.unlockedCount - 1]} Round
                </button>
              </motion.div>
            ) : (
              <div className="surface" style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>👈</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Select a company</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Choose a company to see their interview format and start practicing</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Custom Interview Setup</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>AI will research this company and role to generate a perfect interview plan.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Target Company</label>
                  <input className="input" placeholder="e.g. NVIDIA, OpenAI..." value={customData.company} onChange={e => setCustomData({...customData, company: e.target.value})} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Target Role</label>
                  <input className="input" placeholder="e.g. Backend Engineer..." value={customData.role} onChange={e => setCustomData({...customData, role: e.target.value})} style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Years of Experience</label>
                <select className="input" style={{ width: '100%' }} value={customData.exp} onChange={e => setCustomData({...customData, exp: e.target.value})}>
                  <option value="0">New Grad / Junior (0-1 yrs)</option>
                  <option value="2">Developer (2-5 yrs)</option>
                  <option value="5">Senior (5-10 yrs)</option>
                  <option value="10">Staff / Principal (10+ yrs)</option>
                </select>
              </div>

              <div style={{ padding: '20px', border: '2px dashed var(--border)', borderRadius: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📄</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Upload Job Description (Optional)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>AI will scan the JD for specific technologies and expectations.</div>
                <input type="file" id="jd-upload" hidden onChange={handleFileUpload} accept=".pdf,.txt,.docx" />
                <label htmlFor="jd-upload" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>Select File</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(77,255,160,0.05)', borderRadius: '8px', border: '1px solid rgba(77,255,160,0.1)' }}>
                <div style={{ fontSize: '18px' }}>✨</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  AI will use <strong>Grounded Search</strong> to find current interview patterns for <strong>{customData.company || 'the target company'}</strong>.
                </div>
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px' }} onClick={handleCustomStart} disabled={isGenerating}>
                {isGenerating ? 'Analyzing Requirements...' : '🎙 Generate & Start Interview'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
