'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Module {
  id: string;
  title: string;
  description: string;
  sequence_order: number;
  status: string;
  topics?: string[];
  interview_topics?: string[];
  estimated_minutes?: number;
}

interface Roadmap {
  id: string;
  title: string;
  status: string;
  created_at: string;
  target_role?: string;
  modules: Module[];
}

export default function RoadmapDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editComments, setEditComments] = useState('');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [completingModule, setCompletingModule] = useState<string | null>(null);

  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await fetch(`/api/roadmaps/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRoadmap(data.roadmap);
      } else {
        console.error('Failed to fetch roadmap:', res.status);
      }
    } catch (err) {
      console.error('Error fetching roadmap:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchRoadmap();
  }, [id, fetchRoadmap]);

  const handleMarkComplete = async (moduleId: string) => {
    setCompletingModule(moduleId);
    try {
      const res = await fetch(`/api/roadmaps/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!res.ok) throw new Error('Failed to mark complete');
      toast.success('Module marked as complete! ');
      await fetchRoadmap();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setCompletingModule(null);
    }
  };

  const handleEditSubmit = async () => {
    if (!editComments.trim()) {
      toast.error('Please add comments about how to update the roadmap');
      return;
    }
    setIsEditing(true);
    try {
      const res = await fetch(`/api/roadmaps/${id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: editComments,
          selected_module_ids: selectedModuleIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to edit roadmap');
      setRoadmap(data.roadmap);
      setShowEditModal(false);
      setEditComments('');
      setSelectedModuleIds([]);
      toast.success('Roadmap updated successfully!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsEditing(false);
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

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
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>️</div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Roadmap not found</h2>
        <Link href="/roadmap" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>← Back to Roadmaps</Link>
      </div>
    );
  }

  const sortedModules = [...(roadmap.modules || [])].sort((a, b) => a.sequence_order - b.sequence_order);
  const completedCount = sortedModules.filter(m => m.status === 'completed').length;
  const progressPct = sortedModules.length > 0 ? Math.round((completedCount / sortedModules.length) * 100) : 0;

  const statusColor = (status: string) => {
    if (status === 'completed') return { bg: 'rgba(77,255,160,0.1)', color: 'var(--accent-primary)', border: 'rgba(77,255,160,0.3)' };
    if (status === 'in_progress') return { bg: 'rgba(123,97,255,0.1)', color: '#7B61FF', border: 'rgba(123,97,255,0.3)' };
    return { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: 'var(--border)' };
  };

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Edit Plan Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
            onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto' }}
            >
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Edit Roadmap Plan</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Describe how you want to update this roadmap. Optionally select specific modules to update.
              </p>

              {/* Module Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>
                  Select Modules to Update (optional — leave empty for full roadmap)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {sortedModules.map((mod, i) => (
                    <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: selectedModuleIds.includes(mod.id) ? 'rgba(77,255,160,0.06)' : 'var(--bg-elevated)', border: `1px solid ${selectedModuleIds.includes(mod.id) ? 'rgba(77,255,160,0.3)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                      <input
                        type="checkbox"
                        checked={selectedModuleIds.includes(mod.id)}
                        onChange={() => toggleModuleSelection(mod.id)}
                        style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', flex: 1 }}>
                        {i + 1}. {mod.title}
                      </span>
                      {mod.status === 'completed' && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 700 }}> DONE</span>}
                    </label>
                  ))}
                </div>
                {selectedModuleIds.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {selectedModuleIds.length} module{selectedModuleIds.length > 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              {/* Comments */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                  Your Comments *
                </label>
                <textarea
                  value={editComments}
                  onChange={e => setEditComments(e.target.value)}
                  placeholder="e.g., Add more focus on system design patterns, include microservices and event-driven architecture. Make the DSA module cover more graph algorithms..."
                  rows={5}
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowEditModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isEditing || !editComments.trim()}
                  className="btn-primary"
                  style={{ flex: 2, justifyContent: 'center', opacity: isEditing || !editComments.trim() ? 0.7 : 1 }}
                >
                  {isEditing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#080C14', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                      Updating with AI…
                    </span>
                  ) : ' Update Roadmap'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header style={{ marginBottom: '40px' }}>
        <Link href="/roadmap" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px', marginBottom: '20px', fontWeight: 600 }}>
          ← Back to Roadmaps
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '8px' }}>{roadmap.title}</h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {sortedModules.length} modules
              </span>
            </div>
          </div>
          <button onClick={() => setShowEditModal(true)} className="btn-secondary" style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
            ️ Edit Plan
          </button>
        </div>

        {/* Progress Bar */}
        {sortedModules.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
              <span>{completedCount} of {sortedModules.length} modules completed</span>
              <span style={{ color: progressPct >= 80 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{progressPct}%</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ height: '100%', background: progressPct >= 80 ? 'var(--accent-primary)' : 'linear-gradient(90deg, #7B61FF, var(--accent-primary))', borderRadius: '100px', boxShadow: '0 0 8px rgba(77,255,160,0.4)' }}
              />
            </div>
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Path Modules</h2>
        {sortedModules.map((module, index) => {
          const colors = statusColor(module.status);
          const isCompleted = module.status === 'completed';
          const topics = module.topics || module.interview_topics || [];

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={module.id}
              className="surface"
              style={{
                padding: '24px',
                position: 'relative',
                border: `1px solid ${isCompleted ? 'rgba(77,255,160,0.2)' : 'var(--border)'}`,
                background: isCompleted ? 'rgba(77,255,160,0.02)' : undefined,
                transition: 'all 0.3s'
              }}
            >
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isCompleted ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                  border: `2px solid ${isCompleted ? 'var(--accent-primary)' : 'var(--border)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: isCompleted ? '#080C14' : 'var(--text-muted)',
                  flexShrink: 0,
                  transition: 'all 0.3s'
                }}>
                  {isCompleted ? '' : index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isCompleted ? 'line-through' : 'none', transition: 'all 0.3s' }}>
                      {module.title}
                    </h3>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: colors.bg,
                      color: colors.color,
                      border: `1px solid ${colors.border}`,
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      {module.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: topics.length > 0 ? '12px' : '0' }}>
                    {module.description}
                  </p>

                  {/* Interview Topics */}
                  {topics.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                      {topics.slice(0, 6).map((t: string) => (
                        <span key={t} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: 'rgba(123,97,255,0.1)', color: '#7B61FF', border: '1px solid rgba(123,97,255,0.2)', fontWeight: 600 }}>
                          {t}
                        </span>
                      ))}
                      {topics.length > 6 && (
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 600 }}>
                          +{topics.length - 6} more
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {!isCompleted && (
                      <Link
                        href={`/interview/new?topic=conceptual&role=${encodeURIComponent(module.title)}&module_topics=${encodeURIComponent(JSON.stringify(topics))}&direct=true`}
                        className="btn-primary"
                        style={{ padding: '7px 20px', fontSize: '12px', textDecoration: 'none', fontWeight: 700 }}
                      >
                         Start Interview
                      </Link>
                    )}
                    {!isCompleted ? (
                      <button
                        onClick={() => handleMarkComplete(module.id)}
                        disabled={completingModule === module.id}
                        className="btn-secondary"
                        style={{ padding: '7px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {completingModule === module.id ? (
                          <>
                            <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                            Marking…
                          </>
                        ) : ' Mark Complete'}
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setCompletingModule(module.id);
                          const res = await fetch(`/api/roadmaps/modules/${module.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'available' }),
                          });
                          if (res.ok) { toast.success('Module marked as available'); await fetchRoadmap(); }
                          setCompletingModule(null);
                        }}
                        className="btn-secondary"
                        style={{ padding: '7px 16px', fontSize: '12px', opacity: 0.6 }}
                      >
                        ↩ Undo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {completedCount === sortedModules.length && sortedModules.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: '32px', padding: '32px', background: 'rgba(77,255,160,0.05)', border: '1px solid rgba(77,255,160,0.2)', borderRadius: '16px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}></div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Roadmap Complete!</h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '20px' }}>You&apos;ve mastered all modules. Time to ace that interview.</p>
          <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none', fontSize: '15px', padding: '12px 28px' }}>
             Take Full Mock Interview →
          </Link>
        </motion.div>
      )}
    </div>
  );
}
