import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="page-container" aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2.5 h-9 w-[min(260px,70%)]" />
      <Skeleton className="mb-8 h-4 w-[min(400px,90%)]" />

      <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-panel" />
        ))}
      </div>

      <Skeleton className="mb-5 h-72 w-full rounded-panel" />

      <div className="flex flex-col gap-2.5">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-panel" />
        ))}
      </div>
    </div>
  );
}
