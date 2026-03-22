import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Interview Reports — PrepSpace' };

export default function ReportsPage() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Interview Reports</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Evidence-backed analysis with timestamped audio playback</p>
        </div>
        <Link href="/interview/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>+ New Session</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['All', 'Conceptual', 'Behavioral', 'System Design', 'Live Coding'].map((f, i) => (
          <button key={f} style={{ padding: '7px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', background: i === 0 ? 'var(--accent-primary-dim)' : 'transparent', borderColor: i === 0 ? 'var(--accent-primary)' : 'var(--border)', color: i === 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>No reports yet</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.7, marginBottom: '24px' }}>
          Complete your first AI interview session and your detailed report with timestamped audio evidence will appear here.
        </p>
        <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 28px' }}>
          Start First Interview →
        </Link>
      </div>

      {/* What reports include */}
      <div style={{ marginTop: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>What each report includes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {[
            { icon: '📡', title: 'Competency Radar', desc: '8-dimension chart with previous session overlay and role percentile' },
            { icon: '🎵', title: 'Audio Evidence', desc: 'Waveform with colored markers — click to replay any moment' },
            { icon: '🗺', title: 'Topic Heatmap', desc: 'D3.js grid showing strength/weakness by subject area' },
            { icon: '📈', title: 'Answer Timeline', desc: 'Per-question score bar chart with AI remarks' },
            { icon: '🗣', title: 'Speaking Analytics', desc: 'WPM, filler words, answer length distribution' },
            { icon: '🛡', title: 'Integrity Score', desc: 'Proctoring summary with Verified/Caution/Flagged badge' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="surface" style={{ padding: '18px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '5px' }}>{title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
