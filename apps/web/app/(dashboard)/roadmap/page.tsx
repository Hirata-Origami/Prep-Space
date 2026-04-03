'use client';

import Link from 'next/link';
import { useRoadmaps } from '@/lib/hooks/useRoadmaps';
import { motion } from 'framer-motion';

export default function RoadmapPage() {
  const { roadmaps, isLoading } = useRoadmaps();

  if (isLoading && roadmaps.length === 0) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ width: '100%', height: '200px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)' }}>Loading roadmaps…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>My Roadmaps</h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Personalized learning paths powered by your skill graph</p>
        </div>
        <Link href="/roadmap/new" className="btn-primary" style={{ fontSize: '14px', padding: '10px 20px', textDecoration: 'none' }}>+ New Roadmap</Link>
      </div>

      {roadmaps.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', textAlign: 'center' }}>
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
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {roadmaps.map((rm) => (
            <Link key={rm.id} href={`/roadmap/${rm.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <motion.div 
                whileHover={{ y: -4 }}
                style={{ padding: '24px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)', transition: 'border-color 0.2s', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ fontSize: '24px' }}>🗺️</div>
                  <div style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '100px', fontWeight: 600, background: rm.status === 'completed' ? 'rgba(77,255,160,0.1)' : 'rgba(123,97,255,0.1)', color: rm.status === 'completed' ? 'var(--accent-primary)' : '#7B61FF', textTransform: 'capitalize' }}>
                    {rm.status}
                  </div>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4 }}>{rm.title}</h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span>{rm.modules?.[0]?.count || 0} Modules</span>
                  <span>{new Date(rm.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
