'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

const ROLE_DURATION_MINUTES = 25;
const TOTAL_SECONDS = ROLE_DURATION_MINUTES * 60;
const SILENCE_TRIGGER_MS = 3000;

interface SessionMeta {
  id: string;
  topic: string;
  status: string;
  room_id: string;
  created_at: string;
  myRole: 'interviewer' | 'interviewee';
  myUserId: string;
  partner: {
    id: string;
    full_name: string;
    avatar_url?: string;
    level?: string;
    target_role?: string;
  } | null;
}

interface TranscriptEntry {
  speaker: 'me' | 'partner';
  text: string;
  final: boolean;
  ts: number;
}

interface CopilotMessage {
  role: 'user' | 'ai' | 'auto';
  text: string;
  label?: string;
}

export default function PeerSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = params.id as string;
  // HARDCODED room — guarantees both users always join the SAME Jitsi meeting
  // regardless of race conditions or different session IDs.
  // Change this string to rotate the room (e.g. after a session ends).
  const FIXED_ROOM = 'prepspace-dev-room-2026';
  const jitsiRoom = FIXED_ROOM;

  const supabase = getSupabaseClient();

  // Session metadata
  const [session, setSession] = useState<SessionMeta | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [mounted, setMounted] = useState(false); // hydration guard

  useEffect(() => { setMounted(true); }, []);

  // Role-swap timer
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [currentRole, setCurrentRole] = useState<'interviewer' | 'interviewee'>('interviewer');
  const [phase, setPhase] = useState<'first-half' | 'second-half' | 'done'>('first-half');
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Scoring
  const [showScoring, setShowScoring] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // Transcript
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [interimText, setInterimText] = useState('');
  const [micStatus, setMicStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoStartMic, setAutoStartMic] = useState(false); // set when session loads with permission granted

  // CoPilot
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLabel, setAnalysisLabel] = useState('');

  // All refs — no stale closures
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef(false);
  const micGenRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptPanelRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastFinalRef = useRef('');
  const broadcastChannelRef = useRef<any>(null);
  const currentRoleRef = useRef<'interviewer' | 'interviewee'>('interviewer');
  const sessionTopicRef = useRef('');
  const entriesRef = useRef<TranscriptEntry[]>([]);
  // Audio level meter — reads mic PCM via AudioContext, independent of Web Speech API
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meterFrameRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);        // 0–100 RMS
  const [noSpeechCount, setNoSpeechCount] = useState(0);


  // Keep refs in sync
  useEffect(() => { currentRoleRef.current = currentRole; }, [currentRole]);
  useEffect(() => { sessionTopicRef.current = session?.topic ?? ''; }, [session?.topic]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  // ── Load session metadata + auto-start mic if already permitted ──
  useEffect(() => {
    let cancelled = false;
    const loadSession = async (attempt = 1) => {
      try {
        const res = await fetch(`/api/peer-match/session/${sessionId}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 404 && attempt < 5) {
            console.log(`[Session] 404 attempt ${attempt}/5, retrying in 1s…`);
            setTimeout(() => loadSession(attempt + 1), 1000);
            return;
          }
          // After 5 retries (or non-404 error): gracefully degrade.
          // Show the Jitsi room anyway — metadata panel just shows placeholders.
          console.warn('[Session] Could not load metadata, entering room without it:', data.error);
          // Don't toast an error — user is already in the room via Jitsi iframe
        } else {
          setSession(data.session);
          setCurrentRole(data.session.myRole);
          currentRoleRef.current = data.session.myRole;
          console.log('[Session] Loaded. Role:', data.session.myRole);
        }

        // Attempt auto-start mic regardless of session load success
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (perm.state === 'granted') {
            console.log('[Mic] Already granted — auto-starting recognition');
            setAutoStartMic(true);
          }
        } catch { /* permissions API not supported — show overlay */ }
      } catch {
        if (!cancelled) console.warn('[Session] Network error loading metadata, continuing anyway');
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    };
    loadSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);



  // ── Supabase Broadcast for partner transcript ──
  useEffect(() => {
    const channel = supabase
      .channel(`transcript:${sessionId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'transcript' }, ({ payload }: { payload: { text: string; final: boolean } }) => {
        if (!payload.text?.trim()) return;
        setEntries(prev => {
          if (!payload.final) {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'partner' && !last.final) {
              return [...prev.slice(0, -1), { speaker: 'partner', text: payload.text, final: false, ts: Date.now() }];
            }
            return [...prev, { speaker: 'partner', text: payload.text, final: false, ts: Date.now() }];
          }
          const last = prev[prev.length - 1];
          if (last && last.speaker === 'partner' && !last.final) {
            return [...prev.slice(0, -1), { speaker: 'partner', text: payload.text, final: true, ts: Date.now() }];
          }
          return [...prev, { speaker: 'partner', text: payload.text, final: true, ts: Date.now() }];
        });
      })
      .subscribe((status: string) => {
        console.log('[Broadcast] Transcript channel status:', status);
      });
    broadcastChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // ── Auto-scroll transcript panel ──
  useEffect(() => {
    if (transcriptPanelRef.current) {
      transcriptPanelRef.current.scrollTop = transcriptPanelRef.current.scrollHeight;
    }
  }, [entries, interimText]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isAnalyzing]);

  // ── Helper: build combined transcript from refs (no stale closure) ──
  const buildTranscript = () =>
    entriesRef.current
      .filter(e => e.final)
      .slice(-20)
      .map(e => `[${e.speaker === 'me'
        ? (currentRoleRef.current === 'interviewer' ? 'Interviewer' : 'Candidate')
        : (currentRoleRef.current === 'interviewer' ? 'Candidate' : 'Interviewer')
      }]: ${e.text}`)
      .join('\n');

  // ── Auto-analysis after silence ──
  const triggerAnalysis = async (utterance: string) => {
    if (utterance === lastFinalRef.current) return;
    lastFinalRef.current = utterance;
    if (!utterance.trim() || utterance.trim().length < 15) return;

    const role = currentRoleRef.current;
    const label = role === 'interviewer' ? '🎙 After your question' : '💼 After your answer';
    setAnalysisLabel(label);
    setIsAnalyzing(true);
    setDrawerOpen(true);

    try {
      const res = await fetch('/api/coach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: buildTranscript(),
          role,
          topic: sessionTopicRef.current,
          autoAnalysis: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'auto', text: data.reply, label }]);
    } catch (err: any) {
      console.warn('[Analysis] Failed:', err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Audio level meter ────────────────────────────────────────────────────
  // IMPORTANT: We do NOT open a getUserMedia stream here.
  // Opening our own stream alongside Chrome's Web Speech API creates two
  // competing audio contexts. When we used echoCancellation:false the mic
  // was locked in raw mode — Jitsi noise dominated the signal and Chrome's
  // speech engine couldn't detect any speech ("no-speech" timeout loop).
  //
  // Solution: the VU bar is driven by speech API events (onspeechstart /
  // onspeechend / onresult) instead of real PCM levels. Chrome's speech
  // engine owns the mic exclusively → it gets clean, processed audio.
  const startAudioMeter = () => { /* no-op — VU driven by speech events */ };

  const stopAudioMeter = () => {
    cancelAnimationFrame(meterFrameRef.current);
    audioCtxRef.current?.close();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current = null;
    analyserRef.current = null;
    micStreamRef.current = null;
    setMicLevel(0);
  };

  // ── Web Speech API ────────────────────────────────────────────────────────
  //
  // ROOT CAUSE of the rapid-cycling bug:
  //   continuous:true + Jitsi iframe = Chrome's speech engine gets its audio
  //   interrupted by Jitsi's WebRTC audio processing and fires onend ~300ms
  //   after every start, producing no results — an infinite loop.
  //
  // FIX STRATEGY:
  //   1. continuous:false  — one utterance at a time.  Chrome explicitly
  //      requests then releases the mic per utterance, which cooperates with
  //      Jitsi far better than holding a continuous lock.
  //   2. Exponential backoff — when onend fires fast with no result (conflict),
  //      wait 1 s → 2 s → 4 s → 8 s before retrying.  Resets after real speech.
  //   3. Share the ONE open getUserMedia stream from the meter, so Chrome's
  //      speech engine doesn't open a second competing stream.
  //
  const startMic = async () => {
    console.log('[Mic] startMic called. Status:', micStatus);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStatus('unsupported');
      toast.error('Speech recognition requires Chrome or Edge.');
      return;
    }

    setMicStatus('requesting');

    // ── Permission check ──
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('[Mic] Permission state:', perm.state);
      if (perm.state === 'denied') {
        setMicStatus('denied');
        toast.error('Microphone blocked. Click the 🔒 lock icon → allow → refresh.');
        return;
      }
      if (perm.state === 'prompt') {
        // Trigger the browser dialog; stop immediately after — the speech engine
        // will re-open the stream itself
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        s.getTracks().forEach(t => t.stop());
        console.log('[Mic] Permission granted ✅');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicStatus('denied');
        toast.error('Microphone blocked. Click the 🔒 lock → allow → refresh.');
        return;
      }
      if (err.name === 'NotFoundError') {
        setMicStatus('denied');
        toast.error('No microphone found. Plug one in and try again.');
        return;
      }
      console.log('[Mic] permissions.query not supported, continuing');
    }

    // NOTE: Do NOT call startAudioMeter() here — no competing getUserMedia.
    // Chrome's Web Speech API will open the mic by itself with proper
    // echo cancellation + noise suppression. Our VU bar runs off speech events.
    const myGeneration = ++micGenRef.current;
    recordingRef.current = true;
    console.log('[STT] Starting gen', myGeneration);

    // ── spawnRecognition ──────────────────────────────────────────────────
    // backoff: number of consecutive fast-end cycles with no result.
    // Resets to 0 after any real speech is captured.
    const spawnRecognition = (backoff = 0) => {
      if (!recordingRef.current || micGenRef.current !== myGeneration) return;

      const rec = new SpeechRecognition();
      // continuous:false — one utterance per session.
      // Chrome releases mic ownership between utterances → Jitsi coexistence.
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = 'en-US';
      recognitionRef.current = rec;

      let gotResult = false;
      let startedAt = 0;
      let interim = '';

      rec.onstart = () => {
        if (micGenRef.current !== myGeneration) return;
        startedAt = Date.now();
        gotResult = false;
        interim = '';
        console.log('[STT] Listening (gen', myGeneration, 'backoff', backoff, ')');
        setMicStatus('active');
      };

      rec.onspeechstart = () => {
        setIsSpeaking(true);
        setMicLevel(80); // pulse VU bar when voice detected
        interim = '';
      };
      rec.onspeechend = () => {
        setIsSpeaking(false);
        setMicLevel(20);
        if (interim.trim()) setInterimText(interim); // show while waiting for final
      };

      rec.onresult = (event: any) => {
        if (micGenRef.current !== myGeneration) return;
        let newInterim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else newInterim += t;
        }

        if (newInterim) {
          interim = newInterim;
          setInterimText(newInterim);
          // Animate level based on interim text length (feels responsive)
          setMicLevel(Math.min(95, 40 + newInterim.length * 2));
          broadcastChannelRef.current?.send({
            type: 'broadcast', event: 'transcript',
            payload: { text: newInterim, final: false },
          });
        }

        if (final) {
          gotResult = true;
          const chunk = final.trim();
          if (!chunk) return;
          console.log('[STT] Final:', chunk);
          interim = '';
          setInterimText('');
          setMicLevel(0);

          setEntries(prev => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'me' && last.final && Date.now() - last.ts < 2000) {
              const merged = { ...last, text: last.text + ' ' + chunk, ts: Date.now() };
              broadcastChannelRef.current?.send({
                type: 'broadcast', event: 'transcript',
                payload: { text: merged.text, final: true },
              });
              return [...prev.slice(0, -1), merged];
            }
            broadcastChannelRef.current?.send({
              type: 'broadcast', event: 'transcript',
              payload: { text: chunk, final: true },
            });
            return [...prev, { speaker: 'me', text: chunk, final: true, ts: Date.now() }];
          });

          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => triggerAnalysis(chunk), SILENCE_TRIGGER_MS);
        }
      };

      rec.onerror = (event: any) => {
        const err = event.error as string;
        if (err === 'no-speech' || err === 'aborted') return; // onend will handle restart
        console.warn('[STT] Error:', err, '(gen', myGeneration, ')');
        if (err === 'not-allowed') {
          setMicStatus('denied');
          recordingRef.current = false;
          micGenRef.current++;
          toast.error('Microphone permission denied. Allow it in browser settings.');
        }
      };

      rec.onend = () => {
        if (micGenRef.current !== myGeneration) return;
        setIsSpeaking(false);
        if (!recordingRef.current) return;

        const livedMs = Date.now() - startedAt;

        if (gotResult) {
          // Real speech captured — restart immediately, reset backoff
          console.log('[STT] Utterance done, restarting');
          setTimeout(() => spawnRecognition(0), 150);
          return;
        }

        // No result — decide delay based on how quickly it died
        if (livedMs < 300) {
          // Jitsi conflict: fast abort. Exponential back-off ← the core fix
          const delay = Math.min(1000 * Math.pow(2, backoff), 8000);
          console.warn(
            '[STT] Fast end (', livedMs, 'ms) no result — Jitsi conflict.',
            'Backoff', backoff, '→ retry in', delay, 'ms',
          );
          setTimeout(() => spawnRecognition(Math.min(backoff + 1, 6)), delay);
        } else {
          // Normal no-speech timeout (~5-7 s) — restart promptly, keep backoff
          console.log('[STT] No-speech timeout, restarting in 300ms');
          setTimeout(() => spawnRecognition(Math.max(backoff - 1, 0)), 300);
        }
      };

      try {
        rec.start();
        console.log('[STT] New instance started (gen', myGeneration, ')');
      } catch (e: any) {
        const delay = Math.min(1000 * Math.pow(2, backoff), 8000);
        console.warn('[STT] start() threw:', e.message, '— retry in', delay, 'ms');
        setTimeout(() => spawnRecognition(backoff + 1), delay);
      }
    };

    spawnRecognition(0);
  };

  const stopMic = () => {
    console.log('[Mic] Stopping. Invalidating gen', micGenRef.current);
    recordingRef.current = false;
    micGenRef.current++;
    setMicStatus('idle');
    setIsSpeaking(false);
    setInterimText('');
    clearTimeout(silenceTimerRef.current);
    try { recognitionRef.current?.stop(); } catch {}
    stopAudioMeter();
  };


  // ── Auto-start mic when permission already granted (no button click needed) ──
  // 3s delay gives Jitsi time to fully initialize its audio context first.
  // Starting Web Speech API while Jitsi is mid-init causes instant aborts.
  useEffect(() => {
    if (!autoStartMic || micStatus !== 'idle') return;
    console.log('[Mic] Auto-start in 3s (letting Jitsi initialize first)…');
    const t = setTimeout(() => {
      if (micStatus === 'idle') { // still idle after 3s? start it
        console.log('[Mic] Auto-starting recognition now');
        startMic();
      }
    }, 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartMic]);


  // ── Role-swap timer ──
  useEffect(() => {
    if (sessionComplete || phase === 'done') return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          if (phase === 'first-half') {
            setPhase('second-half');
            setCurrentRole(r => {
              const next = r === 'interviewer' ? 'interviewee' : 'interviewer';
              currentRoleRef.current = next;
              toast.info(`⏱ Roles swapped! You are now the ${next}`, { duration: 6000 });
              return next;
            });
            setSecondsLeft(TOTAL_SECONDS);
            return TOTAL_SECONDS;
          } else {
            setPhase('done');
            setShowScoring(true);
            toast.success('🎉 Session complete! Please rate your partner.');
            return 0;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, sessionComplete]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopMic();
      clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const askCopilot = async () => {
    if (!query.trim()) return;
    const q = query.trim();
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setQuery('');
    setIsAnalyzing(true);
    setDrawerOpen(true);
    try {
      const res = await fetch('/api/coach-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          transcript: buildTranscript(),
          role: currentRole,
          topic: session?.topic ?? '',
          autoAnalysis: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get help');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitScore = async () => {
    if (rating === 0) { toast.error('Please select a rating.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/peer-match/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSessionComplete(true);
      setShowScoring(false);
      toast.success('✅ +25 XP earned!');
    } catch (err: any) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const timerPct = (secondsLeft / TOTAL_SECONDS) * 100;
  const timerColor = secondsLeft < 300 ? '#FF4D6A' : secondsLeft < 600 ? '#FFB347' : 'var(--accent-primary)';
  const myLabel = currentRole === 'interviewer' ? 'You (Interviewer)' : 'You (Candidate)';
  const partnerLabel = currentRole === 'interviewer' ? 'Partner (Candidate)' : 'Partner (Interviewer)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* Mic Permission Overlay — ONLY rendered client-side to avoid hydration mismatch */}
      <AnimatePresence>
        {mounted && (micStatus === 'idle' || micStatus === 'denied') && !autoStartMic && !sessionLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '40px', maxWidth: '400px', width: '100%',
                textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>
                {micStatus === 'denied' ? '🚫' : '🎙'}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
                {micStatus === 'denied' ? 'Microphone Blocked' : 'Enable Microphone'}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                {micStatus === 'denied'
                  ? 'Click the 🔒 lock icon in your address bar → allow microphone → refresh this page.'
                  : 'We need your microphone to transcribe the interview in real-time. Your partner will also transcribe their side — combined transcript powers the AI coaching.'}
              </p>

              {/* Debug info */}
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '8px 12px', marginBottom: '20px', textAlign: 'left' }}>
                <div>🎯 Session: <code style={{ color: 'var(--accent-primary)' }}>{sessionId?.slice(0, 8)}…</code></div>
                <div>🎬 Jitsi Room: <code style={{ color: 'var(--accent-primary)' }}>{jitsiRoom}</code></div>
                <div>👥 Role: <code style={{ color: '#7B61FF' }}>{session?.myRole ?? 'loading…'}</code></div>
                <div>🤝 Partner: <code style={{ color: '#7B61FF' }}>{session?.partner?.full_name ?? 'loading…'}</code></div>
              </div>

              {micStatus !== 'denied' && (
                <button
                  onClick={startMic}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '15px' }}
                >
                  🎙 Allow Mic &amp; Start Session
                </button>
              )}
              {micStatus === 'denied' && (
                <button onClick={startMic} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  Try Again
                </button>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '14px' }}>
                You can still see the Jitsi video call — the AI panel activates after mic is enabled.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Session Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '8px 16px',
        background: 'rgba(8,12,20,0.97)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0, zIndex: 30,
      }}>
        {/* Partner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'linear-gradient(135deg, #7B61FF, #4DFFA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {session?.partner?.full_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {sessionLoading ? 'Loading…' : (session?.partner?.full_name ?? 'Peer Partner')}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {session?.partner?.target_role ?? session?.partner?.level ?? 'Candidate'}
            </div>
          </div>
        </div>

        {/* Topic */}
        <span style={{ fontSize: '10px', background: 'rgba(77,255,160,0.1)', border: '1px solid rgba(77,255,160,0.2)', color: 'var(--accent-primary)', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {session?.topic ?? '…'}
        </span>

        {/* Role */}
        <div style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap', background: currentRole === 'interviewer' ? 'rgba(123,97,255,0.15)' : 'rgba(77,255,160,0.1)', border: `1px solid ${currentRole === 'interviewer' ? 'rgba(123,97,255,0.3)' : 'rgba(77,255,160,0.2)'}`, color: currentRole === 'interviewer' ? '#7B61FF' : 'var(--accent-primary)' }}>
          {phase === 'done' ? '✅ Done' : currentRole === 'interviewer' ? '🎙 Interviewer' : '💼 Interviewee'}
        </div>

        {/* Timer */}
        {phase !== 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ position: 'relative', width: '30px', height: '30px' }}>
              <svg width="30" height="30" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                <circle cx="15" cy="15" r="12" fill="none" stroke={timerColor} strokeWidth="2.5" strokeDasharray={`${2 * Math.PI * 12}`} strokeDashoffset={`${2 * Math.PI * 12 * (1 - timerPct / 100)}`} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', fontWeight: 800, color: timerColor }}>
                {Math.floor(secondsLeft / 60)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{formatTime(secondsLeft)}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{phase === 'first-half' ? 'role swap' : 'session end'}</div>
            </div>
          </div>
        )}

        {/* Mic status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: micStatus === 'active' ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: micStatus === 'active' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)', flexShrink: 0, animation: micStatus === 'active' && isSpeaking ? 'pulse 0.6s ease-in-out infinite' : 'none', boxShadow: micStatus === 'active' ? '0 0 8px rgba(77,255,160,0.6)' : 'none' }} />
          {micStatus === 'active' ? (isSpeaking ? 'Speaking' : 'Mic On') : micStatus === 'requesting' ? 'Connecting…' : micStatus === 'denied' ? 'Blocked' : 'Mic Off'}
        </div>

        {/* CoPilot toggle */}
        <button onClick={() => setDrawerOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', background: drawerOpen ? 'rgba(123,97,255,0.12)' : 'var(--bg-elevated)', border: `1px solid ${drawerOpen ? 'rgba(123,97,255,0.3)' : 'var(--border)'}`, color: drawerOpen ? '#7B61FF' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-body)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
          {isAnalyzing ? <span style={{ width: '8px', height: '8px', border: '1.5px solid #7B61FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : '🤖'}
          {isAnalyzing ? 'Analyzing…' : 'AI CoPilot'}
        </button>

        {/* Leave */}
        <button onClick={() => { stopMic(); router.push('/peer-practice'); }} style={{ padding: '5px 12px', borderRadius: '8px', background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', color: '#FF4D6A', cursor: 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
          Leave
        </button>
      </div>

      {/* ── Role Swap Banner ── */}
      <AnimatePresence>
        {phase === 'second-half' && secondsLeft === TOTAL_SECONDS && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
            style={{ position: 'absolute', top: '55px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, rgba(123,97,255,0.95), rgba(77,255,160,0.95))', color: '#fff', padding: '10px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 800, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            🔄 Roles swapped! You are now the {currentRole === 'interviewer' ? 'Interviewer 🎙' : 'Candidate 💼'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* LEFT: Jitsi + Transcript */}
        <motion.div
          animate={{ width: drawerOpen ? '60%' : '100%' }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ height: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, minWidth: 0 }}
        >
          {/* Jitsi video */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <iframe
              allow="camera; microphone; fullscreen; display-capture; autoplay"
              src={`https://meet.jit.si/${FIXED_ROOM}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
            {!drawerOpen && (
              <div onMouseEnter={() => setDrawerOpen(true)}
                style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '100%', cursor: 'e-resize', background: 'linear-gradient(to right, transparent, rgba(123,97,255,0.08))' }} />
            )}
          </div>

          {/* Live Transcript Panel */}
          <div ref={transcriptPanelRef} style={{
            height: '130px', flexShrink: 0, overflowY: 'auto',
            borderTop: '1px solid var(--border)',
            background: 'rgba(8,12,20,0.97)',
            padding: '8px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '10px' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', flexShrink: 0 }}>
                Live Transcript
              </span>

              {/* VU meter — confirms mic audio is flowing independently of Web Speech API */}
              {micStatus === 'active' && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '140px' }}>
                  <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      width: `${micLevel}%`,
                      background: micLevel > 30 ? 'var(--accent-primary)' : micLevel > 10 ? '#FFD166' : 'rgba(255,255,255,0.2)',
                      transition: 'width 80ms linear, background 200ms',
                    }} />
                  </div>
                  <span style={{ fontSize: '8px', color: micLevel > 10 ? 'var(--accent-primary)' : 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                    {micLevel > 10 ? '🎙' : '—'}
                  </span>
                </div>
              )}

              {micStatus === 'active' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: 'var(--accent-primary)', fontWeight: 700, flexShrink: 0 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse 1s ease-in-out infinite' }} />
                  LIVE
                </span>
              )}
            </div>

            {/* Diagnostic: if no-speech keeps firing but meter shows audio → Google servers issue */}
            {micStatus === 'active' && noSpeechCount > 2 && micLevel < 5 && (
              <div style={{ fontSize: '10px', color: '#FFD166', marginBottom: '4px' }}>
                ⚠️ Mic meter is silent — check Chrome mic permissions or try a different microphone.
              </div>
            )}
            {micStatus === 'active' && noSpeechCount > 2 && micLevel >= 5 && (
              <div style={{ fontSize: '10px', color: '#FFD166', marginBottom: '4px' }}>
                🎙 Mic has audio but Chrome speech engine isn't responding — try refreshing, or speak louder.
              </div>
            )}

            {entries.length === 0 && !interimText && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {micStatus === 'active'
                  ? 'Listening… speak to see transcript appear here in real-time.'
                  : 'Mic not active — click "Allow Mic & Start Session" to enable transcription.'}
              </div>
            )}


            {entries.slice(-10).map((e, i) => (
              <div key={i} style={{ fontSize: '11px', lineHeight: 1.5, display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, color: e.speaker === 'me' ? 'var(--accent-primary)' : '#7B61FF', paddingTop: '1px' }}>
                  {e.speaker === 'me' ? myLabel : partnerLabel}
                </span>
                <span style={{ color: e.final ? 'var(--text-secondary)' : 'var(--text-muted)', flex: 1 }}>{e.text}</span>
              </div>
            ))}

            {interimText && (
              <div style={{ fontSize: '11px', lineHeight: 1.5, display: 'flex', gap: '6px', opacity: 0.6, marginBottom: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--accent-primary)', paddingTop: '1px' }}>{myLabel}</span>
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimText}…</span>
              </div>
            )}
            {/* Connecting indicator while auto-start is pending */}
            {autoStartMic && micStatus === 'requesting' && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                ⏳ Connecting microphone…
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT: AI CoPilot */}
        <motion.div
          animate={{ width: drawerOpen ? '40%' : '0%' }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          style={{ borderLeft: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
        >
          {drawerOpen && (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <h2 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>🤖 AI CoPilot</h2>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0, marginTop: '1px' }}>
                    {currentRole === 'interviewer' ? 'Auto-shows ideal answers + follow-up questions after you speak' : 'Auto-compares your answers to expected — shows what you missed'}
                  </p>
                </div>
                <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.length === 0 && !isAnalyzing && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '24px', lineHeight: 1.7, padding: '0 8px' }}>
                    {currentRole === 'interviewer' ? (
                      <><div style={{ fontSize: '22px', marginBottom: '8px' }}>🎙</div><strong style={{ color: 'var(--text-secondary)' }}>You&apos;re Interviewing</strong><br />After you ask a question I&apos;ll show:<br /><span style={{ color: 'var(--accent-primary)' }}>• Ideal answer to expect</span><br /><span style={{ color: '#7B61FF' }}>• Follow-up probing questions</span><br /><span style={{ color: '#FFB347' }}>• How to sharpen the question</span></>
                    ) : (
                      <><div style={{ fontSize: '22px', marginBottom: '8px' }}>💼</div><strong style={{ color: 'var(--text-secondary)' }}>You&apos;re the Candidate</strong><br />After you answer I&apos;ll show:<br /><span style={{ color: 'var(--accent-primary)' }}>• Expected complete answer</span><br /><span style={{ color: '#4DFFA0' }}>• What you covered well</span><br /><span style={{ color: '#FF4D6A' }}>• Key gaps to strengthen</span></>
                    )}
                    <div style={{ marginTop: '12px', padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: '8px', fontSize: '10px' }}>
                      Analysis triggers automatically after 3s silence
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {m.role === 'auto' && m.label && (
                      <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '2px' }}>{m.label}</div>
                    )}
                    <div style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '96%',
                      background: m.role === 'user' ? 'rgba(77,255,160,0.1)' : m.role === 'auto' ? 'rgba(123,97,255,0.08)' : 'var(--bg-elevated)',
                      border: m.role === 'user' ? '1px solid rgba(77,255,160,0.2)' : m.role === 'auto' ? '1px solid rgba(123,97,255,0.2)' : '1px solid var(--border)',
                      padding: '8px 11px', borderRadius: '10px',
                      color: m.role === 'user' ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontSize: '11.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}

                {isAnalyzing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {analysisLabel && <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '2px' }}>{analysisLabel}</div>}
                    <div style={{ alignSelf: 'flex-start', padding: '8px 14px', background: 'rgba(123,97,255,0.08)', border: '1px solid rgba(123,97,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', border: '2px solid rgba(123,97,255,0.4)', borderTopColor: '#7B61FF', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Analyzing transcript…</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ask Manually</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && askCopilot()}
                    className="input" placeholder={currentRole === 'interviewer' ? 'What are good follow-ups?' : 'What should I have said?'}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '11px' }} />
                  <button onClick={askCopilot} disabled={isAnalyzing} className="btn-primary" style={{ padding: '8px 10px', minWidth: '32px', justifyContent: 'center', fontSize: '12px', opacity: isAnalyzing ? 0.6 : 1 }}>↗</button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Scoring Modal ── */}
      <AnimatePresence>
        {showScoring && !sessionComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(8,12,20,0.87)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Session Complete!</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Rate your experience with <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{session?.partner?.full_name ?? 'your partner'}</span></p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '10px', textAlign: 'center' }}>How was your partner as an interviewer?</label>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px', padding: '4px', filter: star <= rating ? 'none' : 'grayscale(1) opacity(0.3)', transform: star <= rating ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s' }}>⭐</button>
                  ))}
                </div>
                {rating > 0 && <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--accent-primary)', marginTop: '6px', fontWeight: 600 }}>{['', 'Needs work', 'Okay', 'Good', 'Great', 'Exceptional!'][rating]}</div>}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Feedback (optional)</label>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="What went well? What could they improve?" rows={3}
                  style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'var(--font-body)', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ background: 'rgba(77,255,160,0.06)', border: '1px solid rgba(77,255,160,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                <div><div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)' }}>+25 XP for completing this session</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awarded on submission</div></div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={submitScore} disabled={submitting || rating === 0} className="btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: (submitting || rating === 0) ? 0.6 : 1 }}>
                  {submitting ? 'Submitting…' : 'Submit & Earn XP'}
                </button>
                <button onClick={() => router.push('/peer-practice')} className="btn-secondary" style={{ padding: '10px 16px' }}>Skip</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {sessionComplete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(8,12,20,0.92)', backdropFilter: 'blur(10px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '72px', marginBottom: '16px' }}>🏆</div>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>Great Session!</h2>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '28px' }}>+25 XP added to your profile</p>
              <button onClick={() => router.push('/peer-practice')} className="btn-primary" style={{ padding: '12px 32px', justifyContent: 'center', fontSize: '15px' }}>Find Another Partner →</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
