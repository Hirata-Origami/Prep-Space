'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const TOPICS = ['System Design', 'Behavioral (STAR)', 'Data Structures & Algorithms', 'Live Coding', 'Full Mock Interview'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

export default function PeerPracticePage() {
  const router = useRouter();
  const [topic, setTopic] = useState('System Design');
  const [level, setLevel] = useState('Intermediate');
  const [searching, setSearching] = useState(false);
  const [match, setMatch] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const supabase = getSupabaseClient();

  // Get current user ID for realtime filter
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  // Subscribe to peer matches via Supabase Realtime
  useEffect(() => {
    if (!userId || !searching) return;

    const channel = supabase
      .channel(`peer-match-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'peer_matches',
        filter: `matched_user_id=eq.${userId}`,
      }, (payload: { new: Record<string, unknown> }) => {
        const matchData = payload.new;
        setMatch(matchData);
        setSearching(false);
        clearInterval(searchTimerRef.current);
        toast.success('🤝 Match Found!');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, searching]);

  // Search timer
  useEffect(() => {
    if (searching) {
      setSearchTime(0);
      searchTimerRef.current = setInterval(() => setSearchTime(t => t + 1), 1000);
    } else {
      clearInterval(searchTimerRef.current);
    }
    return () => clearInterval(searchTimerRef.current);
  }, [searching]);

  const startMatching = async () => {
    setSearching(true);
    setMatch(null);
    setSearchTime(0);
    try {
      const availRes = await fetch('/api/peer-match/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, skill_level: level }),
      });
      if (!availRes.ok) throw new Error('Failed to set availability');

      // Try immediate match
      const matchRes = await fetch(`/api/peer-match/find?topic=${encodeURIComponent(topic)}&skill_level=${encodeURIComponent(level)}`);
      if (matchRes.ok) {
        const data = await matchRes.json();
        if (data.match) {
          setMatch(data.match);
          setSearching(false);
          toast.success('🤝 Match Found!');
          return;
        }
      }
      // Keep searching via Realtime subscription above
      // Will auto-timeout after 60 seconds if no match
    } catch (e: any) {
      toast.error(e.message);
      setSearching(false);
    }
  };

  const cancelSearch = async () => {
    setSearching(false);
    // Mark availability as inactive
    try {
      await fetch('/api/peer-match/availability', {
        method: 'DELETE',
      }).catch(() => {});
    } catch {}
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Peer Practice Network</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Practice with real engineers — the AI does volume, peers do calibration</p>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { step: '1', title: 'Set Your Preferences', desc: 'Choose topic and skill level. We match you with the best available partner.', icon: '📅' },
          { step: '2', title: 'AI Matches You', desc: 'Matched by role, skill level, topic, and availability window in real-time.', icon: '🤖' },
          { step: '3', title: 'Practice Together', desc: 'Live P2P session: take turns interviewing each other. Both provide AI-backed scores.', icon: '🤝' },
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
              {searching ? `⏱ ${formatTime(searchTime)} — Cancel Search` : '🔍 Find My Match'}
            </button>
          </div>

          <AnimatePresence>
            {searching && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,20,0.85)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, textAlign: 'center', padding: '20px' }}>
                <div style={{ width: '52px', height: '52px', border: '3px solid var(--accent-primary-dim)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Searching for a partner…</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{topic} · {level}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Using Supabase Realtime for instant matching</p>
                <button onClick={cancelSearch} style={{ marginTop: '20px', background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', borderRadius: '8px', padding: '8px 16px', fontFamily: 'var(--font-body)' }}>Cancel Search</button>
              </motion.div>
            )}

            {match && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ position: 'absolute', inset: 0, background: 'var(--bg-elevated)', border: '2px solid var(--accent-primary)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, textAlign: 'center', padding: '24px' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤝</div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Match Found!</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  You&apos;re paired with{' '}
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {match.partner_name || match.users?.full_name || 'a Peer Candidate'}
                  </span>
                </p>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    onClick={() => router.push(`/peer-practice/session/${match.id || match.session_id}`)}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Enter Session →
                  </button>
                  <button onClick={() => setMatch(null)} className="btn-secondary" style={{ padding: '10px' }}>✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>Session Features</h3>
            {[
              ['💻', 'Shared Code Editor (Monaco + Y.js CRDT)'],
              ['🖼️', 'Shared Whiteboard (Excalidraw)'],
              ['📹', 'P2P Video (WebRTC — no server)'],
              ['🔄', 'Auto role swap at midpoint'],
              ['🤖', 'AI question cards for the interviewer'],
              ['⭐', 'Dual scoring + AI supplemental analysis'],
            ].map(([icon, text]) => (
              <div key={text as string} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '16px' }}>{icon}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{text as string}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>Reputation System</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Build your interviewer reputation by giving quality feedback. High-reputation interviewers get priority matching and earn the{' '}
              <span style={{ color: 'var(--accent-primary)' }}>Helpful Interviewer</span> badge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
