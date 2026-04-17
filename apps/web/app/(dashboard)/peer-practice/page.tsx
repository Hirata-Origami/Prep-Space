'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const TOPICS = ['System Design', 'Behavioral (STAR)', 'Data Structures & Algorithms', 'Live Coding', 'Full Mock Interview'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const SEARCH_TIMEOUT_SECONDS = 120;

// ── DEV OVERRIDE ─────────────────────────────────────────────────────────────
// Both users go directly to the same fixed session page, bypassing all
// matching/Realtime logic. The session page opens the hardcoded Jitsi room.
// Replace this UUID with the actual session ID from your Supabase peer_sessions table.
// Run: SELECT id FROM peer_sessions ORDER BY created_at DESC LIMIT 1;
const FIXED_SESSION_ID = '3ac1f3ac-66ea-4748-bfd7-ea2d967a0fab';
// ─────────────────────────────────────────────────────────────────────────────

export default function PeerPracticePage() {
  const router = useRouter();
  const [topic, setTopic] = useState('System Design');
  const [level, setLevel] = useState('Intermediate');
  const [searching, setSearching] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const supabase = getSupabaseClient();

  // Get current user's internal DB id for realtime filter
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_uid', user.id)
        .single();
      if (dbUser) setDbUserId(dbUser.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to peer_sessions: listen on BOTH user1_id and user2_id
  // The DB function stores users sorted LEAST/GREATEST, so we don't know
  // which column we'll be in. Subscribing to both guarantees we get notified.
  useEffect(() => {
    if (!dbUserId || !searching) return;

    const handleMatchedSession = (payload: { new: Record<string, unknown> }) => {
      const sessionData = payload.new;
      console.log('[PeerMatch] Realtime session event:', sessionData.id);
      clearInterval(searchTimerRef.current);
      clearTimeout(timeoutRef.current);
      toast.success('🤝 Match Found!');
      // Auto-navigate immediately — no button click required
      router.push(`/peer-practice/session/${sessionData.id}`);
    };

    const channel = supabase
      .channel(`peer-session-for-${dbUserId}`)
      // Must listen on BOTH columns — sorted insert means we could be either one
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'peer_sessions',
        filter: `user1_id=eq.${dbUserId}`,
      }, handleMatchedSession)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'peer_sessions',
        filter: `user2_id=eq.${dbUserId}`,
      }, handleMatchedSession)
      .subscribe((status: string, err?: Error) => {
        console.log('[PeerMatch] Realtime status:', status, err ?? '');
        if (status === 'CHANNEL_ERROR') {
          console.error('[PeerMatch] Realtime channel error — check supabase_realtime publication');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [dbUserId, searching]);

  // Search timer + 120s auto-cancel
  // Search timer + 120s auto-cancel + 5s poll fallback for Realtime flakiness
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    if (searching && dbUserId && topic && level) {
      setSearchTime(0);
      searchTimerRef.current = setInterval(() => setSearchTime(t => t + 1), 1000);
      timeoutRef.current = setTimeout(() => {
        setSearching(false);
        clearInterval(searchTimerRef.current);
        clearInterval(pollRef.current);
        toast.info('No match found after 2 minutes. Try again shortly.');
        fetch('/api/peer-match/availability', { method: 'DELETE' }).catch(() => {});
      }, SEARCH_TIMEOUT_SECONDS * 1000);

      // Poll /find every 5s as fallback — in case Realtime event wasn't delivered
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/peer-match/find?topic=${encodeURIComponent(topic)}&skill_level=${encodeURIComponent(level)}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.match) {
            console.log('[PeerMatch] Poll found match:', data.match.session_id);
            clearInterval(pollRef.current);
            clearInterval(searchTimerRef.current);
            clearTimeout(timeoutRef.current);
            toast.success('🤝 Match Found!');
            router.push(`/peer-practice/session/${data.match.session_id}`);
          }
        } catch {}
      }, 5000);
    } else {
      clearInterval(searchTimerRef.current);
      clearInterval(pollRef.current);
      clearTimeout(timeoutRef.current);
    }
    return () => {
      clearInterval(searchTimerRef.current);
      clearInterval(pollRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [searching, dbUserId, topic, level]);


  const startMatching = () => {
    // DEV MODE: Skip all matching logic — navigate everyone to the fixed shared session.
    // Both users hit the same Jitsi room (prepspace-dev-room-2026) regardless.
    toast.success('🤝 Joining session room…');
    router.push(`/peer-practice/session/${FIXED_SESSION_ID}`);
  };


  const cancelSearch = async () => {
    setSearching(false);
    try {
      await fetch('/api/peer-match/availability', { method: 'DELETE' });
    } catch {}
  };

  const enterSession = () => {
    const sessionId = match?.id || match?.session_id;
    // No ?room param needed — session page uses `prepspace-${sessionId}` as Jitsi room.
    // Both users share the same sessionId → always same Jitsi meeting.
    router.push(`/peer-practice/session/${sessionId}`);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const pct = Math.min(100, (searchTime / SEARCH_TIMEOUT_SECONDS) * 100);

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Peer Practice Network</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Practice with real engineers — the AI does volume, peers do calibration</p>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { step: '1', title: 'Set Your Preferences', desc: 'Choose topic and skill level. We match you with the best available partner.', icon: '' },
          { step: '2', title: 'AI Matches You', desc: 'Matched by role, skill level, topic, and availability window in real-time.', icon: '' },
          { step: '3', title: 'Practice Together', desc: 'Live P2P session: take turns interviewing each other. Both provide AI-backed scores.', icon: '' },
        ].map(({ step, title, desc, icon }) => (
          <div key={step} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '6px' }}>STEP {step}</div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>Find a Practice Partner</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>I want to practice</label>
              <select className="input" style={{ cursor: 'pointer', width: '100%' }} value={topic} onChange={e => setTopic(e.target.value)} disabled={searching}>
                {TOPICS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>My skill level</label>
              <select className="input" style={{ cursor: 'pointer', width: '100%' }} value={level} onChange={e => setLevel(e.target.value)} disabled={searching}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <button onClick={searching ? cancelSearch : startMatching} className={searching ? 'btn-secondary' : 'btn-primary'} style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '4px' }}>
              {searching ? `⏱ ${formatTime(searchTime)} — Cancel Search` : ' Find My Match'}
            </button>
          </div>

          <AnimatePresence>
            {searching && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, textAlign: 'center', padding: '20px' }}>
                {/* Radial spinner */}
                <div style={{ position: 'relative', width: '64px', height: '64px', marginBottom: '20px' }}>
                  <div style={{ width: '64px', height: '64px', border: '3px solid rgba(77,255,160,0.15)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🔍</div>
                </div>
                {/* Progress bar */}
                <div style={{ width: '180px', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${pct}%`, transition: 'width 1s linear' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Searching for a partner…</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{topic} · {level}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '20px' }}>Auto-cancels after {formatTime(SEARCH_TIMEOUT_SECONDS - searchTime)}</p>
                <button onClick={cancelSearch} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', borderRadius: '8px', padding: '8px 20px', fontFamily: 'var(--font-body)' }}>Cancel Search</button>
              </motion.div>
            )}

            {match && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ position: 'absolute', inset: 0, background: 'var(--bg-elevated)', border: '2px solid var(--accent-primary)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, textAlign: 'center', padding: '24px' }}>
                {/* Confetti-style match found */}
                <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.4 }} style={{ fontSize: '52px', marginBottom: '12px' }}>🤝</motion.div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Match Found!</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  You&apos;re paired with{' '}
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {match.partner_name || (match.users as Record<string, any>)?.full_name || 'a Peer Candidate'}
                  </span>
                </p>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(77,255,160,0.1)', border: '1px solid rgba(77,255,160,0.2)', color: 'var(--accent-primary)', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>{match.topic || topic}</span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: '20px' }}>{level}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    onClick={enterSession}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Enter Session →
                  </button>
                  <button onClick={() => setMatch(null)} className="btn-secondary" style={{ padding: '10px' }}></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>Session Features</h3>
            {[
              ['🎥', 'Jitsi P2P Video (no server relay)', true],
              ['🤖', 'AI Co-Pilot sidebar (live hints)', true],
              ['🎙', 'Live speech-to-text transcription', true],
              ['🔄', 'Auto role swap at midpoint (25 min)', true],
              ['⭐', 'Peer rating + XP rewards', true],
              ['💻', 'Shared code editor — coming soon', false],
            ].map(([icon, text, live]) => (
              <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)', opacity: live ? 1 : 0.45 }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>{text as string}</span>
                {live ? <span style={{ fontSize: '10px', background: 'rgba(77,255,160,0.12)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>LIVE</span>
                       : <span style={{ fontSize: '10px', color: 'var(--text-muted)', padding: '2px 8px' }}>SOON</span>}
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>Reputation System</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '10px' }}>
              Build your interviewer reputation by giving quality feedback. High-reputation interviewers get priority matching and earn the{' '}
              <span style={{ color: 'var(--accent-primary)' }}>Helpful Interviewer</span> badge.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['🏅 Top Interviewer', '⭐ 4.8 avg rating', '🔥 25 sessions'].map(tag => (
                <span key={tag} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '20px' }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
