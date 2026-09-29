'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Download, MessageCircle, Send, X } from 'lucide-react';
import { Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';

interface VideoAnalysis {
  scores: Record<string, number>;
  summary?: string;
  observations?: { time: string; type: 'good' | 'improve'; note: string }[];
  tips?: string[];
  frames_analyzed?: number;
  face_visible_pct?: number;
}
interface AudioMarker { type?: string; annotation?: string; start_time: string }
interface SampleAnswer { question?: string; score?: number; user_answer?: string; ideal_answer?: string }
interface ReportAnalysis {
  summary?: string;
  scores?: Record<string, number>;
  strengths?: string[];
  improvements?: string[];
  sample_answers?: SampleAnswer[];
  audio_url?: string;
  audio_markers?: AudioMarker[];
  metrics?: { wpm?: number; filler_words_count?: number } | null;
  video?: VideoAnalysis;
}
interface Report {
  overall_score?: number;
  hire_recommendation?: string;
  analysis?: ReportAnalysis;
  interview_sessions?: { plan?: { role?: string } };
}

interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
}

const scoreTone = (n: number) => (n >= 80 ? 'text-good' : n >= 60 ? 'text-live' : 'text-bad');

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState<Report | null>(null);
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
    } catch (e: unknown) {
      toast.error((e as Error).message);
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
      <div className="page-container" aria-busy="true" aria-label="Loading report">
        <Skeleton className="mb-3 h-9 w-72 max-w-full" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-panel" />
          <Skeleton className="h-48 rounded-panel" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="page-container">
        <EmptyState
          title="Report not found"
          description="It may still be processing, or the link is wrong."
          action={<ButtonLink href="/reports" variant="secondary">Back to reports</ButtonLink>}
        />
      </div>
    );
  }

  const analysis: ReportAnalysis = report.analysis || {};
  const scores = analysis.scores || {};
  const strengths = analysis.strengths || [];
  const improvements = analysis.improvements || [];
  const sampleAnswers = analysis.sample_answers || [];
  const audioUrl = analysis.audio_url;
  const markers = analysis.audio_markers || [];
  const metrics = analysis.metrics || null;
  const overall = report.overall_score ?? 0;

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="page-container report-container" style={{ maxWidth: 1040 }}>
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

          .surface, .card, .print-card {
            border: 1px solid #E2E8F0 !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            margin-bottom: 24px !important;
          }

          h2 { page-break-after: avoid !important; margin-bottom: 12px !important; }
        }
      `}</style>

      <div className="no-print">
        <Link href="/reports" className="mb-5 inline-flex items-center gap-1.5 rounded-control text-sm text-fg-3 transition-colors hover:text-fg">
          <ArrowLeft size={15} aria-hidden /> Reports
        </Link>
      </div>

      <PageHeader
        title="Performance report"
        description={report.interview_sessions?.plan?.role || 'Software Engineer'}
        action={<Button variant="secondary" onClick={handleDownloadPDF} className="no-print"><Download size={15} aria-hidden /> Export PDF</Button>}
      />

      {/* Overall */}
      <Card className="print-card mb-6 flex flex-wrap items-center gap-6 p-5 sm:p-8">
        <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-hero border border-line bg-raised">
          <div className={cn('font-mono text-4xl font-semibold leading-none', scoreTone(overall))}>{overall}<span className="text-xl">%</span></div>
          <div className="mt-1.5 text-xs text-fg-3">Overall</div>
        </div>
        <div className="min-w-0 flex-1 basis-60">
          {report.hire_recommendation && (
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <Badge tone="signal">Recommendation</Badge>
              <span className="text-base font-semibold capitalize text-fg">{report.hire_recommendation.replace(/_/g, ' ')}</span>
            </div>
          )}
          <p className="text-[15px] leading-relaxed text-fg-2">{analysis.summary}</p>
        </div>
      </Card>

      {/* Competency scores */}
      {Object.keys(scores).length > 0 && (
        <dl className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(scores).map(([key, val]: [string, number]) => (
            <Card key={key} className="print-card px-4 py-4 text-center">
              <dd className={cn('font-mono text-2xl font-semibold', scoreTone(val))}>{val}%</dd>
              <dt className="mt-1 text-[13px] capitalize text-fg-3">{key.replace(/_/g, ' ')}</dt>
            </Card>
          ))}
        </dl>
      )}

      <div className="grid-main-sidebar" style={{ alignItems: 'flex-start' }}>
        <div className="flex min-w-0 flex-col gap-10">
          {audioUrl && (
            <section aria-labelledby="evidence">
              <h2 id="evidence" className="mb-3 text-lg font-semibold text-fg">Audio evidence</h2>
              <Card className="print-card space-y-4">
                <audio ref={audioRef} controls src={audioUrl} className="no-print w-full" />
                {markers.length > 0 && (
                  <ul className="flex gap-3 overflow-x-auto pb-1">
                    {markers.map((m, i) => {
                      const tone = m.type === 'strong' ? 'good' : m.type === 'missed' ? 'bad' : 'live';
                      const border = m.type === 'strong' ? 'border-t-good' : m.type === 'missed' ? 'border-t-bad' : 'border-t-live';
                      return (
                        <li key={i} className="shrink-0">
                          <button
                            type="button"
                            onClick={() => { if (audioRef.current) { audioRef.current.currentTime = parseTime(m.start_time); audioRef.current.play(); } }}
                            aria-label={`Play from ${m.start_time}: ${m.annotation ?? m.type}`}
                            className={cn('w-56 rounded-panel border border-t-4 border-line bg-raised p-4 text-left transition-colors hover:border-line-strong', border)}
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <Badge tone={tone} className="capitalize">{m.type}</Badge>
                              <span className="font-mono text-xs text-fg-3">{m.start_time}</span>
                            </div>
                            <div className="text-[13px] leading-snug text-fg-2">{m.annotation}</div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            </section>
          )}

          {analysis.video && (
            <section aria-labelledby="oncamera">
              <h2 id="oncamera" className="mb-3 text-lg font-semibold text-fg">On camera</h2>
              <Card className="print-card space-y-5">
                {analysis.video.summary && <p className="text-[15px] leading-relaxed text-fg-2">{analysis.video.summary}</p>}
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {Object.entries(analysis.video.scores).map(([key, val]) => (
                    <div key={key} className="rounded-control bg-raised p-3 text-center">
                      <dd className={cn('font-mono text-xl font-semibold', scoreTone(val))}>{val}%</dd>
                      <dt className="mt-0.5 text-xs capitalize text-fg-3">{key.replace(/_/g, ' ')}</dt>
                    </div>
                  ))}
                </dl>
                {(analysis.video.observations?.length ?? 0) > 0 && (
                  <ul className="space-y-2">
                    {analysis.video.observations!.map((o, i) => (
                      <li key={i} className="flex gap-3 text-[13px] leading-snug text-fg-2">
                        <Badge tone={o.type === 'good' ? 'good' : 'live'} className="shrink-0">{o.time}</Badge>
                        <span>{o.note}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {(analysis.video.tips?.length ?? 0) > 0 && (
                  <div className="rounded-control border border-signal/20 bg-signal/5 p-4">
                    <div className="mb-1.5 text-xs font-medium text-signal">Try next time</div>
                    <ul className="list-disc space-y-1 pl-4 text-[13px] text-fg-2">{analysis.video.tips!.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  </div>
                )}
                <p className="text-xs text-fg-3">
                  Based on {analysis.video.frames_analyzed} snapshots{typeof analysis.video.face_visible_pct === 'number' ? `, face in frame ${analysis.video.face_visible_pct}% of the time` : ''}. Snapshots are analysed once and not stored.
                </p>
              </Card>
            </section>
          )}

          {sampleAnswers.length > 0 && (
            <section aria-labelledby="breakdown">
              <h2 id="breakdown" className="mb-3 text-lg font-semibold text-fg">Question by question</h2>
              <ol className="space-y-4">
                {sampleAnswers.map((item, i) => (
                  <li key={i}>
                    <Card className="print-card space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[15px] font-semibold text-fg">{i + 1}. {item.question}</h3>
                        {typeof item.score === 'number' && <span className={cn('font-mono text-sm font-semibold', scoreTone(item.score))}>{item.score}%</span>}
                      </div>
                      <div className="rounded-control border border-line bg-raised p-4">
                        <div className="mb-1.5 text-xs font-medium text-fg-3">Your answer</div>
                        <p className="text-sm leading-relaxed text-fg-2">{item.user_answer}</p>
                      </div>
                      {item.ideal_answer && (
                        <div className="rounded-control border border-signal/20 bg-signal/5 p-4">
                          <div className="mb-1.5 text-xs font-medium text-signal">What a strong answer covers</div>
                          <p className="text-sm leading-relaxed text-fg-2">{item.ideal_answer}</p>
                        </div>
                      )}
                    </Card>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Card className="print-card">
            <h3 className="mb-4 text-sm font-semibold text-fg">Communication</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-control bg-raised p-3.5 text-center">
                <div className="text-xs text-fg-3">Words per minute</div>
                <div className="mt-1 font-mono text-xl font-semibold text-fg">{metrics?.wpm || '—'}</div>
              </div>
              <div className="rounded-control bg-raised p-3.5 text-center">
                <div className="text-xs text-fg-3">Filler words</div>
                <div className="mt-1 font-mono text-xl font-semibold text-fg">{metrics?.filler_words_count ?? '—'}</div>
              </div>
            </div>
            <div className="mt-3 rounded-control bg-raised p-3.5">
              <div className="text-xs text-fg-3">Percentile</div>
              <div className="mt-1 text-lg font-semibold text-fg">
                {overall >= 90 ? 'Top 5%' : overall >= 80 ? 'Top 20%' : overall >= 70 ? 'Top 40%' : 'Standard'}
              </div>
              <div className="text-xs text-fg-3">Based on peer performance</div>
            </div>
          </Card>

          {strengths.length > 0 && (
            <Card className="print-card border-t-4 border-t-good">
              <h3 className="mb-3 text-sm font-semibold text-good">Strengths</h3>
              <ul className="space-y-2.5">
                {strengths.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-fg-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" aria-hidden />{s}</li>
                ))}
              </ul>
            </Card>
          )}

          {improvements.length > 0 && (
            <Card className="print-card border-t-4 border-t-live">
              <h3 className="mb-3 text-sm font-semibold text-live">Work on next</h3>
              <ul className="space-y-2.5">
                {improvements.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-fg-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />{s}</li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {/* Coach chat */}
      <button
        type="button"
        onClick={() => setChatOpen(v => !v)}
        aria-expanded={chatOpen}
        aria-label={chatOpen ? 'Close career coach' : 'Ask the career coach'}
        className="no-print chat-trigger fixed bottom-20 right-4 z-[100] flex h-12 w-12 items-center justify-center rounded-full bg-signal text-[var(--text-on-accent)] shadow-[var(--shadow-float)] transition-transform hover:scale-105 sm:right-8 lg:bottom-8"
      >
        {chatOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {chatOpen && (
        <div
          role="dialog"
          aria-label="Career coach"
          className="no-print chat-widget fixed bottom-36 right-3 z-[100] flex h-[min(480px,65vh)] w-[min(380px,calc(100vw-24px))] flex-col overflow-hidden rounded-hero border border-line-strong bg-panel shadow-[var(--shadow-float)] sm:right-8 lg:bottom-24"
        >
          <div className="flex items-center gap-2.5 border-b border-line bg-raised px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-signal text-sm font-semibold text-[var(--text-on-accent)]" aria-hidden>A</span>
            <div>
              <div className="text-sm font-semibold text-fg">Career coach</div>
              <div className="text-xs text-fg-3">Ask about this report</div>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
            {chatMessages.length === 0 && <p className="text-[13px] text-fg-3">Try: “How do I fix my weakest answer?” or “What should I practise this week?”</p>}
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={cn('max-w-[85%] rounded-panel px-3.5 py-2.5 text-[13px] leading-relaxed', m.role === 'user' ? 'self-end bg-signal text-[var(--text-on-accent)]' : 'self-start border border-line bg-raised text-fg')}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && <div className="text-xs text-fg-3">Thinking…</div>}
            <div ref={chatEndRef} />
          </div>
          <form className="flex gap-2 border-t border-line p-3" onSubmit={e => { e.preventDefault(); sendChat(); }}>
            <Input aria-label="Message" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask something" />
            <Button type="submit" size="icon" aria-label="Send" disabled={!chatInput.trim() || chatLoading}><Send size={15} /></Button>
          </form>
        </div>
      )}
    </div>
  );
}
