'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Roadmap {
  id: string;
  title: string;
  status: string;
  created_at: string;
  modules: {
    id: string;
    title: string;
    description: string;
    sequence_order: number;
    status: string;
  }[];
}

export default function RoadmapDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRoadmap() {
      try {
        const res = await fetch(`/api/roadmaps/${id}`);
        if (res.ok) {
          const data = await res.json();
          setRoadmap(data.roadmap);
        } else {
          console.error("Failed to fetch roadmap:", res.status);
        }
      } catch (err) {
        console.error("Error fetching roadmap:", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchRoadmap();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(77,255,160,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
        Calibrating your learning path...
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Roadmap not found</h2>
        <Link href="/roadmap" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>← Back to Roadmaps</Link>
      </div>
    );
  }

  // Sort modules by sequence_order
  const sortedModules = [...(roadmap.modules || [])].sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <Link href="/roadmap" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginBottom: '20px', fontWeight: 600 }}>
          ← Back to Roadmaps
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>{roadmap.title}</h1>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ 
                padding: '4px 12px', 
                borderRadius: '100px', 
                fontSize: '11px', 
                fontWeight: 700, 
                background: roadmap.status === 'completed' ? 'rgba(77,255,160,0.1)' : 'rgba(123,97,255,0.1)', 
                color: roadmap.status === 'completed' ? 'var(--accent-primary)' : '#7B61FF',
                textTransform: 'uppercase'
              }}>
                {roadmap.status}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Created {new Date(roadmap.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <button className="btn-secondary" style={{ fontSize: '13px' }}>Edit Plan</button>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Path Modules</h2>
        {sortedModules.map((module, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={module.id} 
            className="surface" 
            style={{ padding: '24px', position: 'relative' }}
          >
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'var(--bg-elevated)', 
                border: '2px solid var(--border)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--text-muted)',
                flexShrink: 0
              }}>
                {index + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{module.title}</h3>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {module.status}
                  </span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {module.description}
                </p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                  <Link 
                    href={`/interview/new?topic=conceptual&role=${encodeURIComponent(module.title)}&direct=true`}
                    className="btn-primary" 
                    style={{ padding: '6px 20px', fontSize: '12px', textDecoration: 'none', fontWeight: 700 }}
                  >
                    Start
                  </Link>
                  <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: '12px', opacity: 0.6 }}>Mark Complete</button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
