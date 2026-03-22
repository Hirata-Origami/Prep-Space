import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Peer Practice — PrepSpace' };

export default function PeerPracticePage() {
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
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>Find a Practice Partner</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>I want to practice</label>
              <select className="input" style={{ cursor: 'pointer' }}>
                <option>System Design</option>
                <option>Behavioral (STAR)</option>
                <option>Data Structures & Algorithms</option>
                <option>Live Coding</option>
                <option>Full Mock Interview</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>My skill level</label>
              <select className="input" style={{ cursor: 'pointer' }}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Available</label>
              <select className="input" style={{ cursor: 'pointer' }}>
                <option>In the next hour</option>
                <option>Today</option>
                <option>This week</option>
                <option>Schedule for later</option>
              </select>
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '4px' }}>
              🔍 Find My Match
            </button>
          </div>
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
