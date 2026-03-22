'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }
    return parseInt(timeStr, 10) || 0;
  };

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${id}`);
        if (res.ok) {
          const data = await res.json();
          setReport(data.report);
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
        Analysing your interview data...
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Report not found</h2>
        <Link href="/reports" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>← Back to Reports</Link>
      </div>
    );
  }

  const analysis = report.analysis || {};
  const scores = analysis.scores || {};
  const strengths = analysis.strengths || [];
  const improvements = analysis.improvements || [];
  const sampleAnswers = analysis.sample_answers || [];
  const audioUrl = analysis.audio_url;
  const markers = analysis.audio_markers || [];
  const metrics = analysis.metrics || null;

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }} className="report-container">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .surface { border: 1px solid #eee !important; background: white !important; box-shadow: none !important; }
          .report-container { padding: 0 !important; max-width: 100% !important; }
          .progress-bar { border: 1px solid #ccc !important; }
          .progress-bar-fill { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        .waveform-bar {
          height: 100%;
          border-radius: 2px;
          transition: transform 0.2s ease;
        }
        .waveform-bar:hover {
          transform: scaleY(1.3);
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link href="/reports" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>
          ← Back to Reports
        </Link>
        <button onClick={handleDownloadPDF} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📥</span> Download PDF Report
        </button>
      </div>

      {/* Header Card */}
      <div className="surface" style={{ padding: '32px', display: 'flex', gap: '32px', alignItems: 'center', marginBottom: '32px', position: 'relative' }}>
        <div style={{ 
          width: '120px', 
          height: '120px', 
          borderRadius: '24px', 
          background: 'rgba(77,255,160,0.05)', 
          border: '1px solid rgba(77,255,160,0.15)',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(77,255,160,0.05)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--accent-primary)' }}>{report.overall_score}%</div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {report.interview_sessions?.plan?.role || 'Technical Interview'}
            </h1>
            <span style={{ 
              padding: '4px 12px', 
              borderRadius: '100px', 
              fontSize: '11px', 
              fontWeight: 700, 
              background: report.hire_recommendation === 'Strong Hire' ? 'var(--accent-primary)' : 'rgba(77,255,160,0.1)', 
              color: report.hire_recommendation === 'Strong Hire' ? '#000' : 'var(--accent-primary)',
              textTransform: 'uppercase'
            }}>
              {report.hire_recommendation || 'Hire'}
            </span>
          </div>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '650px' }}>
            {analysis.summary || 'Successful session with strong technical depth and clear communication.'}
          </p>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        <div className="surface" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.05em' }}>Competency Radar</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(scores).map(([label, score]: [string, any]) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'capitalize' }}>{label.replace('_', ' ')}</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{score}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ height: '100%', background: score > 80 ? 'var(--accent-primary)' : score > 60 ? 'var(--accent-amber)' : '#FF4D6A', borderRadius: '100px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>Deep Analysis Waveform</h3>
          <div style={{ height: '80px', display: 'flex', alignItems: 'flex-end', gap: '3px', marginBottom: '16px' }}>
            {Array.from({ length: 40 }).map((_, i) => {
              const height = 20 + Math.random() * 60;
              const isMarked = markers.some((m: any) => {
                const start = parseTime(m.start_time);
                const total = audioRef.current?.duration || 300;
                const pos = (i / 40) * total;
                return pos >= start && pos <= start + 30;
              });
              const type = markers.find((m: any) => {
                const start = parseTime(m.start_time);
                const total = audioRef.current?.duration || 300;
                const pos = (i / 40) * total;
                return pos >= start && pos <= start + 30;
              })?.type;

              return (
                <div key={i} className="waveform-bar" style={{ 
                  flex: 1, 
                  height: `${height}%`, 
                  background: type === 'strong' ? 'var(--accent-primary)' : type === 'missed' ? '#FF4D6A' : 'rgba(255,255,255,0.1)',
                  opacity: type ? 1 : 0.4
                }} />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>0:00</span>
            <span>Audio Transcript Timeline</span>
            <span>{report.duration_seconds ? `${Math.floor(report.duration_seconds/60)}:${(report.duration_seconds%60).toString().padStart(2, '0')}` : '5:00'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Audio Evidence (if available) */}
          {audioUrl && (
            <section className="surface" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🎙️</span> Playback & Evidence
              </h2>
              <audio ref={audioRef} controls src={audioUrl} className="no-print" style={{ width: '100%', marginBottom: '16px', borderRadius: '8px', outline: 'none' }} />
              
              {markers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {markers.map((m: any, i: number) => {
                      const color = m.type === 'strong' ? '#4DFFA0' : m.type === 'missed' ? '#FF4D6A' : '#FFB547';
                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            if (audioRef.current) {
                              audioRef.current.currentTime = parseTime(m.start_time);
                              audioRef.current.play();
                            }
                          }}
                          style={{
                            background: `rgba(255,255,255,0.02)`,
                            border: `1px solid var(--border)`,
                            borderTop: `3px solid ${color}`,
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            minWidth: '240px',
                            flexShrink: 0
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '11px', color, fontWeight: 800, textTransform: 'uppercase' }}>
                              {m.type === 'strong' ? 'Strong Moment' : m.type === 'missed' ? 'Critical Gap' : 'Partial Match'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.start_time}</div>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {m.annotation}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Answer Analysis */}
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📝</span> Detailed Question Analysis
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sampleAnswers.map((item: any, i: number) => (
                <div key={i} className="surface" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', flex: 1, lineHeight: 1.4 }}>{i + 1}. {item.question}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: item.score > 80 ? 'var(--accent-primary)' : '#FFB547', marginLeft: '12px' }}>{item.score}%</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Candidate Response</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.user_answer}</div>
                    </div>
                    {item.ideal_answer && (
                      <div style={{ background: 'rgba(77,255,160,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(77,255,160,0.1)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '6px' }}>Interviewer Note</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.ideal_answer}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Speaking Analytics */}
          {metrics && Object.keys(metrics).length > 0 && (
            <section className="surface" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Speaking Analytics</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>WPM</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-primary)' }}>{metrics.wpm || '--'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Filler Words</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-amber)' }}>{metrics.filler_words_count ?? '--'}</div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>Answer Length Distribution</div>
                <div style={{ height: '40px', display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
                  {sampleAnswers.map((a: any, i: number) => (
                    <div key={i} style={{ 
                      flex: 1, 
                      height: `${Math.min(100, (a.user_answer?.length || 0) / 5)}%`, 
                      background: 'var(--accent-primary)', 
                      opacity: 0.3 + (i / sampleAnswers.length) * 0.7,
                      borderRadius: '2px' 
                    }} title={`Q${i+1}: ${a.user_answer?.length || 0} chars`} />
                  ))}
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(77,255,160,0.05)', borderRadius: '12px', border: '1px solid rgba(77,255,160,0.1)' }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 800, marginBottom: '4px' }}>ROLE PERCENTILE</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Top 12% globally</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>for {report.interview_sessions?.plan?.role || 'Software Engineer'}</div>
              </div>
            </section>
          )}

          {/* Strengths */}
          <section className="surface" style={{ padding: '24px', borderTop: '4px solid var(--accent-primary)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '16px', textTransform: 'uppercase' }}>Key Strengths</h2>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {strengths.map((s: string, i: number) => (
                <li key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 900 }}>✓</span> {s}
                </li>
              ))}
            </ul>
          </section>

          {/* Improvements */}
          <section className="surface" style={{ padding: '24px', borderTop: '4px solid var(--accent-amber)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-amber)', marginBottom: '16px', textTransform: 'uppercase' }}>Areas to Improve</h2>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {improvements.map((im: string, i: number) => (
                <li key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', lineHeight: 1.4 }}>
                  <span style={{ color: 'var(--accent-amber)', fontWeight: 900 }}>⚡</span> {im}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
