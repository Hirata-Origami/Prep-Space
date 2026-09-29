'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Flame, Medal, Trophy } from 'lucide-react';
import { Avatar, ButtonLink, Card, EmptyState, ErrorState, PageHeader, Skeleton, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { cn } from '@/lib/cn';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface LeaderboardUser {
  rank: number;
  id: string;
  full_name: string;
  avatar_url?: string;
  xp: number;
  streak_days: number;
  target_role?: string;
}

const PERIODS = ['Weekly', 'Monthly', 'All Time'];

const PODIUM = [
  { index: 0, label: 'First place', medal: 'text-live', ring: 'border-live/40', size: 56 },
  { index: 1, label: 'Second place', medal: 'text-fg-2', ring: 'border-line-strong', size: 48 },
  { index: 2, label: 'Third place', medal: 'text-[#C77B3D]', ring: 'border-[#C77B3D]/40', size: 48 },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('Weekly');
  const { data, error, isLoading, mutate } = useSWR<{ users: LeaderboardUser[]; userRank: number | null }>(
    `/api/leaderboard?period=${period.toLowerCase().replace(' ', '_')}`,
    fetcher
  );

  const users = data?.users ?? [];
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);
  const showSkeleton = isLoading && users.length === 0;

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      <PageHeader title="Leaderboard" description="Ranked by XP earned and how consistently you practise." />

      <Tabs value={period} onValueChange={setPeriod}>
        <TabsList aria-label="Time period" className="mb-6">
          {PERIODS.map(p => <TabsTrigger key={p} value={p}>{p}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {showSkeleton ? (
        <div aria-busy="true" aria-label="Loading leaderboard">
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-44 rounded-panel" />
            <Skeleton className="h-52 rounded-panel" />
            <Skeleton className="h-44 rounded-panel" />
          </div>
          <Skeleton className="h-60 rounded-panel" />
        </div>
      ) : error ? (
        <ErrorState title="Could not load the leaderboard" onRetry={() => mutate()} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Trophy size={20} aria-hidden />}
          title="Nobody is on the board yet"
          description="Finish an interview session to earn XP and take the first spot."
          action={<ButtonLink href="/interview">Start a session</ButtonLink>}
        />
      ) : (
        <>
          <ol className="mb-6 grid items-end gap-4 sm:grid-cols-3" aria-label="Top three">
            {[PODIUM[1], PODIUM[0], PODIUM[2]].map(slot => {
              const u = top3[slot.index];
              if (!u) return <li key={slot.index} className="hidden sm:block" aria-hidden />;
              const first = slot.index === 0;
              return (
                <li key={u.id} className={cn('order-none', first && 'sm:order-none')}>
                  <Card className={cn('flex flex-col items-center text-center', slot.ring, first ? 'py-7' : 'py-5')}>
                    <Medal size={first ? 34 : 28} aria-label={slot.label} className={slot.medal} />
                    <Avatar name={u.full_name} src={u.avatar_url} size={slot.size} className="mt-2" />
                    <div className="mt-3 max-w-full truncate text-sm font-semibold text-fg">{u.full_name}</div>
                    <div className="max-w-full truncate text-xs text-fg-3">{u.target_role ?? 'Candidate'}</div>
                    <div className={cn('mt-3 font-mono font-semibold text-fg', first ? 'text-2xl' : 'text-xl')}>{u.xp.toLocaleString()} <span className="text-xs font-normal text-fg-3">XP</span></div>
                    {u.streak_days > 0 && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-live"><Flame size={12} className="fill-current" aria-hidden /> {u.streak_days}-day streak</div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>

          {rest.length > 0 && (
            <Card padded={false} className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-sm">
                <caption className="sr-only">Leaderboard ranks 4 and below</caption>
                <thead>
                  <tr className="border-b border-line bg-raised text-left text-xs text-fg-3">
                    <th scope="col" className="w-16 px-4 py-3 text-center font-medium">Rank</th>
                    <th scope="col" className="px-4 py-3 font-medium">Candidate</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">XP</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rest.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-center font-mono text-fg-3">{u.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} src={u.avatar_url} size={32} />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-fg">{u.full_name}</div>
                            <div className="truncate text-xs text-fg-3">{u.target_role ?? 'Candidate'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-fg">{u.xp.toLocaleString()}</td>
                      <td className={cn('px-4 py-3 text-right', u.streak_days > 0 ? 'text-live' : 'text-fg-3')}>{u.streak_days > 0 ? `${u.streak_days}d` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {data?.userRank && (
            <Card tone="raised" className="mt-4 flex items-center gap-4">
              <div className="font-mono text-lg font-semibold text-signal">#{data.userRank}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg">Your rank</div>
                <div className="text-xs text-fg-3">Practise to move up.</div>
              </div>
              <ButtonLink href="/interview" size="sm">Earn XP</ButtonLink>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
