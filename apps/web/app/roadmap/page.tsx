import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Roadmaps — PrepSpace' };

// Reuse dashboard layout via parent
export default function RoadmapPage() {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>My Roadmaps</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Personalized learning paths powered by your skill graph</p>
        </div>
        <Link href="/roadmap/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>+ New Roadmap</Link>
      </div>

      {/* Empty state */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗺️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>No roadmaps yet</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.7, marginBottom: '28px' }}>
          Create your first roadmap by picking a career track or uploading a job description. The AI will build a calibrated prep plan for you.
        </p>
        <Link href="/roadmap/new" className="btn-primary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 28px' }}>
          Create Your First Roadmap →
        </Link>
        <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Choose from 15 predefined tracks or paste any job description
        </p>
      </div>
    </div>
  );
}
