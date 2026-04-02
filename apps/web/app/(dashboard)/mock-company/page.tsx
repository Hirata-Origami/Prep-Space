'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  logo_emoji: string;
  industry: string;
  size: string;
  interview_culture: string;
  rounds: string[];
  round_topics?: Record<string, string[]>;
  known_patterns: string[];
  community_pass_rate: number;
  difficulty_rating: number;
}

export default function MockCompanyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Company | null>(null);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/mock-companies')
      .then(r => r.json())
      .then(data => {
        if (data.companies) setCompanies(data.companies);
      })
      .catch(e => console.error('Failed to load companies:', e))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (company: Company) => {
    setSelected(company);
    setSelectedRound(company.rounds?.[0] || '');
  };

  const handleStartInterview = () => {
    if (!selected) return;
    const params = new URLSearchParams({
      topic: 'conceptual',
      role: targetRole,
      company: selected.name,
      round: selectedRound,
      direct: 'true',
    });
    // Pass round topics if available
    const roundTopics = selected.round_topics?.[selectedRound];
    if (roundTopics?.length) {
      params.set('module_topics', JSON.stringify(roundTopics));
    }
    router.push(`/interview/new?${params.toString()}`);
  };

  const difficultyColor = (d: number) => {
    if (d >= 9) return '#FF4D6A';
    if (d >= 8) return '#FFB547';
    return 'var(--accent-primary)';
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Mock Company Interviews</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Practice with real interview formats from top companies</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '200px' }}
          />
          <Link href="/mock-company/new" className="btn-primary" style={{ textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '13px' }}>
            ➕ Add Company
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ height: '180px', borderRadius: '16px', background: 'var(--bg-elevated)', animation: 'pulse 2s ease infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filteredCompanies.map((company, i) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleSelect(company)}
              className="card"
              style={{
                padding: '22px',
                cursor: 'pointer',
                border: selected?.id === company.id ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                background: selected?.id === company.id ? 'rgba(77,255,160,0.04)' : undefined,
                transition: 'all 0.15s',
              }}
              whileHover={{ y: -3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '32px', lineHeight: 1 }}>{company.logo_emoji}</div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>{company.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{company.industry} • {company.size}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: difficultyColor(company.difficulty_rating) }}>{company.difficulty_rating?.toFixed(1)}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Difficulty</div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {company.interview_culture}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                {(company.rounds || []).slice(0, 3).map(r => (
                  <span key={r} style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '100px', background: 'rgba(77,255,160,0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(77,255,160,0.15)' }}>
                    {r}
                  </span>
                ))}
                {(company.rounds || []).length > 3 && (
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                    +{company.rounds.length - 3}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>Pass rate: <strong style={{ color: company.community_pass_rate > 65 ? 'var(--accent-primary)' : company.community_pass_rate > 55 ? '#FFB547' : '#FF4D6A' }}>{company.community_pass_rate}%</strong></span>
                {selected?.id === company.id ? <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>✓ Selected</span> : <span style={{ color: 'var(--text-muted)' }}>Click to select</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Practice Panel - shows when company selected */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '28px' }}
        >
          <div className="card" style={{ padding: '28px', border: '1px solid rgba(77,255,160,0.25)', background: 'rgba(77,255,160,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '36px' }}>{selected.logo_emoji}</span>
                  <div>
                    <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{selected.name}</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selected.interview_culture}</p>
                  </div>
                </div>

                {/* Known Patterns */}
                {selected.known_patterns?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Known Patterns</div>
                    {selected.known_patterns.map((p: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }}>→</span> {p}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '240px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Your Role</label>
                  <input
                    className="input"
                    value={targetRole}
                    onChange={e => setTargetRole(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Select Round</label>
                  <select
                    className="input"
                    value={selectedRound}
                    onChange={e => setSelectedRound(e.target.value)}
                    style={{ cursor: 'pointer', width: '100%' }}
                  >
                    {(selected.rounds || []).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Show topics for selected round */}
                {((selected.round_topics?.[selectedRound]?.length) ?? 0) > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Topics Covered</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {(selected.round_topics?.[selectedRound] ?? []).map(t => (
                        <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(123,97,255,0.1)', color: '#7B61FF', border: '1px solid rgba(123,97,255,0.2)', fontWeight: 600 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleStartInterview} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px', fontWeight: 700 }}>
                  🎙 Start {selected.name} Interview
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
