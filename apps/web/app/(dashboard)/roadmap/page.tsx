'use client';

import Link from 'next/link';
import { Map, Plus } from 'lucide-react';
import { useRoadmaps, type Roadmap } from '@/lib/hooks/useRoadmaps';
import { Badge, ButtonLink, Card, EmptyState, ErrorState, PageHeader, Progress, Skeleton } from '@/components/ui';

function moduleCount(rm: Roadmap): number {
  if (rm.module_count != null) return rm.module_count;
  if (Array.isArray(rm.modules)) return rm.modules[0]?.count ?? 0;
  return rm.modules?.count ?? 0;
}

export default function RoadmapPage() {
  const { roadmaps, isLoading, isError, mutate } = useRoadmaps();

  return (
    <div className="page-container">
      <PageHeader
        title="My roadmaps"
        description="Study plans built from your target role and the job descriptions you add."
        action={
          <ButtonLink href="/roadmap/new">
            <Plus size={16} aria-hidden /> New roadmap
          </ButtonLink>
        }
      />

      {isLoading && roadmaps.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading roadmaps">
          {[0, 1, 2].map(i => (
            <Skeleton key={i} className="h-36 rounded-panel" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Could not load your roadmaps" onRetry={() => mutate()} />
      ) : roadmaps.length === 0 ? (
        <EmptyState
          icon={<Map size={20} aria-hidden />}
          title="No roadmaps yet"
          description="Pick a career track or paste a job description. PrepSpace builds a calibrated plan around the gaps."
          action={<ButtonLink href="/roadmap/new">Create your first roadmap</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roadmaps.map(rm => (
            <li key={rm.id}>
              <Link href={`/roadmap/${rm.id}`} className="block h-full rounded-panel">
                <Card tone="interactive" className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-base font-semibold leading-snug text-fg">{rm.title}</h2>
                    <Badge tone={rm.status === 'completed' ? 'good' : rm.status === 'paused' ? 'neutral' : 'signal'} className="shrink-0 capitalize">
                      {rm.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-[13px] text-fg-3">
                    {moduleCount(rm)} modules · Created {new Date(rm.created_at).toLocaleDateString()}
                  </div>
                  {typeof rm.progress_pct === 'number' && (
                    <div className="mt-auto pt-5">
                      <div className="mb-1.5 flex justify-between text-xs text-fg-3">
                        <span>Progress</span>
                        <span className="font-mono text-fg-2">{rm.progress_pct}%</span>
                      </div>
                      <Progress value={rm.progress_pct} label={`${rm.title} progress`} tone={rm.status === 'completed' ? 'good' : 'signal'} />
                    </div>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
