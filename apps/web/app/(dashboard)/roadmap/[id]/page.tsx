'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Check, Mic, PartyPopper, Pencil, Undo2 } from 'lucide-react';
import { Badge, Button, ButtonLink, Card, EmptyState, Field, Modal, PageHeader, Progress, Skeleton, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

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

  const setModuleStatus = async (moduleId: string, status: 'completed' | 'available') => {
    setCompletingModule(moduleId);
    try {
      const res = await fetch(`/api/roadmaps/modules/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(status === 'completed' ? 'Failed to mark complete' : 'Failed to undo');
      toast.success(status === 'completed' ? 'Module marked complete' : 'Module marked available');
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
      toast.success('Roadmap updated');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setIsEditing(false);
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds(prev =>
      prev.includes(moduleId) ? prev.filter(x => x !== moduleId) : [...prev, moduleId]
    );
  };

  if (isLoading) {
    return (
      <div className="page-container" aria-busy="true" aria-label="Loading roadmap">
        <Skeleton className="mb-3 h-9 w-72 max-w-full" />
        <Skeleton className="mb-8 h-4 w-96 max-w-full" />
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-panel" />
          <Skeleton className="h-36 rounded-panel" />
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="page-container">
        <EmptyState
          title="Roadmap not found"
          description="It may have been deleted, or the link is wrong."
          action={<ButtonLink href="/roadmap" variant="secondary">Back to roadmaps</ButtonLink>}
        />
      </div>
    );
  }

  const sortedModules = [...(roadmap.modules || [])].sort((a, b) => a.sequence_order - b.sequence_order);
  const completedCount = sortedModules.filter(m => m.status === 'completed').length;
  const progressPct = sortedModules.length > 0 ? Math.round((completedCount / sortedModules.length) * 100) : 0;

  return (
    <div className="page-container" style={{ maxWidth: 920 }}>
      <Link href="/roadmap" className="mb-5 inline-flex items-center gap-1.5 rounded-control text-sm text-fg-3 transition-colors hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> Roadmaps
      </Link>

      <PageHeader
        title={roadmap.title}
        description={`Created ${new Date(roadmap.created_at).toLocaleDateString()} · ${sortedModules.length} modules`}
        action={
          <>
            <Badge tone={roadmap.status === 'completed' ? 'good' : 'signal'} className="capitalize">{roadmap.status}</Badge>
            <Button variant="secondary" onClick={() => setShowEditModal(true)}><Pencil size={14} aria-hidden /> Edit plan</Button>
          </>
        }
        className="mb-6"
      />

      {sortedModules.length > 0 && (
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-[13px] text-fg-3">
            <span>{completedCount} of {sortedModules.length} modules complete</span>
            <span className="font-mono text-fg-2">{progressPct}%</span>
          </div>
          <Progress value={progressPct} label="Roadmap progress" tone={progressPct >= 80 ? 'good' : 'signal'} />
        </div>
      )}

      <h2 className="mb-4 text-lg font-semibold text-fg">Modules</h2>
      <ol className="space-y-3">
        {sortedModules.map((module, index) => {
          const isCompleted = module.status === 'completed';
          const topics = module.topics || module.interview_topics || [];
          const busy = completingModule === module.id;

          return (
            <li key={module.id}>
              <Card className={cn('flex gap-4 sm:gap-5', isCompleted && 'border-good/25')}>
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-sm',
                    isCompleted ? 'border-good bg-good text-[var(--text-on-accent)]' : 'border-line-strong bg-raised text-fg-3'
                  )}
                  aria-hidden
                >
                  {isCompleted ? <Check size={18} strokeWidth={3} /> : index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className={cn('text-base font-semibold', isCompleted ? 'text-fg-3 line-through' : 'text-fg')}>{module.title}</h3>
                    <Badge tone={isCompleted ? 'good' : module.status === 'in_progress' ? 'signal' : 'neutral'} className="capitalize">
                      {module.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{module.description}</p>

                  {topics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {topics.slice(0, 6).map((t: string) => <Badge key={t} tone="violet">{t}</Badge>)}
                      {topics.length > 6 && <Badge>+{topics.length - 6} more</Badge>}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isCompleted && (
                      <ButtonLink
                        size="sm"
                        href={`/interview?topic=conceptual&role=${encodeURIComponent(module.title)}&module_topics=${encodeURIComponent(JSON.stringify(topics))}&direct=true`}
                      >
                        <Mic size={13} aria-hidden /> Start interview
                      </ButtonLink>
                    )}
                    {!isCompleted ? (
                      <Button size="sm" variant="secondary" onClick={() => setModuleStatus(module.id, 'completed')} loading={busy}>
                        {busy ? 'Marking…' : 'Mark complete'}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setModuleStatus(module.id, 'available')} loading={busy}>
                        <Undo2 size={13} aria-hidden /> Undo
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      {completedCount === sortedModules.length && sortedModules.length > 0 && (
        <Card className="mt-8 border-good/30 py-10 text-center">
          <PartyPopper size={28} className="mx-auto mb-3 text-good" aria-hidden />
          <h2 className="font-display text-2xl font-semibold text-fg">Roadmap complete</h2>
          <p className="mx-auto mt-1 max-w-sm text-[15px] text-fg-2">Every module is done. Put it together in a full mock interview.</p>
          <ButtonLink href="/interview" size="lg" className="mt-5">Take a full mock interview</ButtonLink>
        </Card>
      )}

      <Modal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        title="Edit roadmap plan"
        description="Describe what should change. Optionally pick the modules to update."
        className="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} loading={isEditing} disabled={!editComments.trim()}>{isEditing ? 'Updating…' : 'Update roadmap'}</Button>
          </>
        }
      >
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-fg">Modules to update <span className="font-normal text-fg-3">(leave empty for the whole roadmap)</span></legend>
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {sortedModules.map((mod, i) => {
                const on = selectedModuleIds.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={cn('flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-sm transition-colors', on ? 'border-signal/40 bg-signal/10' : 'border-line bg-raised hover:border-line-strong')}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggleModuleSelection(mod.id)} className="h-4 w-4 accent-[var(--accent-primary)]" />
                    <span className="min-w-0 flex-1 truncate text-fg-2">{i + 1}. {mod.title}</span>
                    {mod.status === 'completed' && <Badge tone="good">Done</Badge>}
                  </label>
                );
              })}
            </div>
            {selectedModuleIds.length > 0 && <p className="mt-2 text-xs font-medium text-signal">{selectedModuleIds.length} module{selectedModuleIds.length > 1 ? 's' : ''} selected</p>}
          </fieldset>

          <Field label="What should change?">
            {a => (
              <Textarea
                {...a}
                rows={5}
                value={editComments}
                onChange={e => setEditComments(e.target.value)}
                placeholder="Add more on system design patterns, include microservices and event-driven architecture. Make the DSA module cover more graph algorithms."
              />
            )}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
