'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function PeerPracticePage() {
  const [topic, setTopic] = useState('System Design');
  const [level, setLevel] = useState('Intermediate');
  const [searching, setSearching] = useState(false);
  const [match, setMatch] = useState<any>(null);

  const startMatching = async () => {
    setSearching(true);
    setMatch(null);
    try {
      // 1. Post availability
      const availRes = await fetch('/api/peer-match/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, skill_level: level }),
      });
      if (!availRes.ok) throw new Error('Failed to set availability');

      // 2. Poll for match (simplified for demo/mvp, usually we'd use WebSockets or Supabase Realtime)
      // We'll try finding a match immediately, then once more after 3 seconds.
      const findMatch = async () => {
        const res = await fetch(`/api/peer-match/find?topic=${encodeURIComponent(topic)}&skill_level=${encodeURIComponent(level)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.match) {
            setMatch(data.match);
            setSearching(false);
            toast.success('Match Found!');
            return true;
          }
        }
        return false;
      };

      const found = await findMatch();
      if (!found) {
        setTimeout(async () => {
          const foundLate = await findMatch();
          if (!foundLate) {
            // Keep searching or timeout
            // For this version, we'll just say "Searching..."
          }
        }, 3000);
      }
    } catch (e: any) {
      toast.error(e.message);
      setSearching(false);
    }
  };
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Peer Practice Network</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Practice with real engineers — the AI does volume, peers do calibration</p>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { step: '1', title: 'Set Your Availability', desc: 'Choose time slots that work for you. We find your best match.', icon: '📅' },
          { step: '2', title: 'AI Matches You', desc: 'Matched by role, skill level, module focus, and language preference.', icon: '🤖' },
          { step: '3', title: 'Practice Together', desc: 'Live P2P session: video, shared code editor, and whiteboard. Both score each other.', icon: '🤝' },
        ].map(({ step, title, desc, icon }) => (
          <div key={step} className="card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '6px' }}>STEP {step}</div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Find a partner */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>Find a Practice Partner</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>I want to practice</label>
              <select className="input" style={{ cursor: 'pointer' }} value={topic} onChange={e => setTopic(e.target.value)}>
                <option>System Design</option>
                <option>Behavioral (STAR)</option>
                <option>Data Structures & Algorithms</option>
                <option>Live Coding</option>
                <option>Full Mock Interview</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>My skill level</label>
              <select className="input" style={{ cursor: 'pointer' }} value={level} onChange={e => setLevel(e.target.value)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
            </div>
            <button 
              onClick={startMatching}
              disabled={searching}
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '4px', opacity: searching ? 0.7 : 1 }}>
              {searching ? '🛰️ Finding My Match…' : '🔍 Find My Match'}
            </button>
          </div>

          <AnimatePresence>
            {searching && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, textAlign: 'center', padding: '20px' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--accent-primary-dim)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Finding Partner…</h3>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Matching based on topic and skill level</p>
                <button onClick={() => setSearching(false)} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Cancel Search</button>
              </motion.div>
            )}

            {match && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ position: 'absolute', inset: 0, background: 'var(--bg-elevated)', border: '2px solid var(--accent-primary)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20, textAlign: 'center', padding: '20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤝</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Match Found!</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>You are matched with <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{match.users?.full_name || 'a Peer Candidate'}</span></p>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Enter Session</button>
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
              Build your interviewer reputation by giving quality feedback. High-reputation interviewers get priority matching and earn the <span style={{ color: 'var(--accent-primary)' }}>Helpful Interviewer</span> badge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
