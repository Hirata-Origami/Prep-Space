'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/reports/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, chat_history: chatMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get response');
      setChatMessages(prev => [...prev, { role: 'coach', content: data.reply }]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChatLoading(false);
    }
  };

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
        Analyzing your interview data...
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>!</div>
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
          html, body, main, 
          #__next, [data-nextjs-scroll-focus-boundary],
          .report-container {
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
            position: static !important;
            background: white !important;
            color: #000 !important;
          }

          .no-print, .chat-widget, #chat-widget-container, aside, nav, header button { 
             display: none !important; 
          }
          
          @page { margin: 15mm; size: A4; }

          * {
            color: #000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .surface, .card { 
            border: 1px solid #E2E8F0 !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            margin-bottom: 24px !important;
          }

          h2 { page-break-after: avoid !important; margin-bottom: 12px !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }} className="no-print">
        <div>
          <Link href="/reports" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
            ← Back to Reports
          </Link>
          <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Performance Report</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>{report.interview_sessions?.plan?.role || 'Software Engineer'}</p>
        </div>
        <button onClick={handleDownloadPDF} className="btn-secondary" style={{ padding: '10px 24px', fontWeight: 800 }}>
          Export PDF
        </button>
      </div>

      {/* Main Score Card */}
      <div className="surface" style={{ padding: '40px', display: 'flex', gap: '40px', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '30px', background: 'rgba(77,255,160,0.06)', border: '1px solid rgba(77,255,160,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '38px', fontWeight: 900, color: 'var(--accent-primary)' }}>{report.overall_score}%</div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
             <span style={{ padding: '4px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '100px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)' }}>Recommendation</span>
             <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{report.hire_recommendation}</span>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {analysis.summary}
          </p>
        </div>
      </div>

      {/* Competency Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {Object.entries(scores).map(([key, val]: [string, any]) => (
          <div key={key} className="surface" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>{val}%</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{key.replace('_', ' ')}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'flex-start' }}>
        {/* Left: Transcript & Answers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Audio Evidence */}
          {audioUrl && (
            <section className="surface" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>Technical Evidence</h2>
              <audio ref={audioRef} controls src={audioUrl} style={{ width: '100%', marginBottom: '20px' }} className="no-print" />
              
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {markers.map((m: any, i: number) => {
                  const color = m.type === 'strong' ? 'var(--accent-primary)' : m.type === 'missed' ? '#FF4D6A' : '#FFB547';
                  return (
                    <div key={i} onClick={() => { if(audioRef.current) { audioRef.current.currentTime = parseTime(m.start_time); audioRef.current.play(); } }} 
                      style={{ minWidth: '220px', padding: '16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderTop: `4px solid ${color}`, borderRadius: '12px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color, textTransform: 'uppercase' }}>{m.type}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.start_time}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{m.annotation}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Detailed Breakdown */}
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '24px' }}>Technical Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sampleAnswers.map((item: any, i: number) => (
                <div key={i} className="surface" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, flex: 1 }}>{i + 1}. {item.question}</div>
                    <div style={{ fontWeight: 800, color: item.score > 80 ? 'var(--accent-primary)' : '#FFB547' }}>{item.score}%</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Candidate Response</div>
                      <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{item.user_answer}</div>
                    </div>
                    {item.ideal_answer && (
                      <div style={{ padding: '16px', background: 'rgba(77,255,160,0.03)', borderRadius: '10px', border: '1px solid rgba(77,255,160,0.1)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Model Feedback</div>
                        <div style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{item.ideal_answer}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Insights */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Analytics */}
          <section className="surface" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '20px' }}>Communication</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Words/min</div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{metrics.wpm || '--'}</div>
              </div>
              <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Filler words</div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{metrics.filler_words_count ?? '--'}</div>
              </div>
            </div>
            
            <div style={{ padding: '16px', background: 'var(--bg-elevated)', borderRadius: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Global Percentile</div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>
                 {report.overall_score >= 90 ? 'Top 5%' : report.overall_score >= 80 ? 'Top 20%' : report.overall_score >= 70 ? 'Top 40%' : 'Standard'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Based on peer performance</div>
            </div>
          </section>

          {/* Lists */}
          <section className="surface" style={{ padding: '24px', borderTop: '4px solid var(--accent-primary)' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '16px' }}>Core Strengths</h3>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {strengths.map((s: string, i: number) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--accent-primary)' }}>●</span> {s}
                </li>
              ))}
            </ul>
          </section>

          <section className="surface" style={{ padding: '24px', borderTop: '4px solid #FFB547' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#FFB547', textTransform: 'uppercase', marginBottom: '16px' }}>Next Focus Areas</h3>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {improvements.map((s: string, i: number) => (
                <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#FFB547' }}>●</span> {s}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {/* Floating Chat */}
      <button onClick={() => setChatOpen(!chatOpen)} className="no-print chat-trigger" style={{ position: 'fixed', bottom: '32px', right: '32px', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-primary)', color: '#080C14', border: 'none', cursor: 'pointer', zIndex: 100, boxShadow: '0 4px 20px rgba(77,255,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 900 }}>?</button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="no-print chat-widget" style={{ position: 'fixed', bottom: '100px', right: '32px', width: '360px', height: '480px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', zIndex: 100 }}>
            <div style={{ padding: '16px 20px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', background: 'var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 900, color: '#080C14' }}>A</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Career Coach</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-elevated)', border: m.role === 'coach' ? '1px solid var(--border)' : 'none', color: m.role === 'user' ? '#080C14' : 'var(--text-primary)', padding: '10px 14px', borderRadius: '12px', maxWidth: '85%', fontSize: '13px' }}>{m.content}</div>
              ))}
              {chatLoading && <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Ask something..." style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }} />
              <button onClick={sendChat} style={{ padding: '8px 16px', background: 'var(--accent-primary)', borderRadius: '8px', border: 'none', fontWeight: 800 }}>Send</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
