'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';
import { useRoadmaps, useSessions } from '@/lib/hooks/useRoadmaps';
import {
  Play,
  Flame,
  Target,
  ArrowRight,
  BookOpen,
  Building2,
  FileUser,
  Users,
  Trophy,
  RotateCcw,
  KeyRound,
  Mic,
  Map,
  BrainCircuit,
  PenTool,
} from 'lucide-react';
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Progress, SectionHeader, Skeleton, Stat } from '@/components/ui';
import { cn } from '@/lib/cn';

const DRILLS = [
  { title: 'Distributed caching and Redis', type: 'teach', topic: 'Distributed Caching & Redis Patterns', badge: 'Architecture' },
  { title: 'System design interview', type: 'interview', topic: 'System Design & Scalability', badge: 'Mock round' },
  { title: 'React 19 and Next.js internals', type: 'teach', topic: 'React 19 Server Components & Fiber', badge: 'Deep dive' },
];

const SHORTCUTS = [
  { label: 'AI voice studio', href: '/interview', icon: Mic },
  { label: 'Coding and design workspace', href: '/workspace', icon: PenTool },
  { label: 'Mock companies', href: '/mock-company', icon: Building2 },
  { label: 'Resume optimizer', href: '/resume', icon: FileUser },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'Study groups', href: '/groups', icon: Users },
];

interface NextStep {
  title: string;
  why: string;
  href: string;
  cta: string;
}

/**
 * One suggestion for what to do now, picked in a fixed order of urgency: an application step coming up,
 * flashcards due, no interview for a week, then a practice problem. It says why, so it is never a mystery.
 */
function NextAction({ lastInterviewAt }: { lastInterviewAt: number | null }) {
  // read the clock once, not on every render
  const [now] = useState(() => Date.now());
  const daysSinceInterview = lastInterviewAt ? Math.floor((now - lastInterviewAt) / 86_400_000) : null;
  const { data: apps } = useSWR<{ applications?: { company: string; role: string; next_step: string | null; next_step_at: string | null; status: string }[] }>('/api/applications');
  const { data: cards } = useSWR<{ stats?: { dueToday: number } }>('/api/flashcards');

  const soon = (apps?.applications ?? [])
    .filter(a => a.next_step_at && !['rejected', 'withdrawn', 'offer'].includes(a.status))
    .map(a => ({ a, days: Math.ceil((new Date(a.next_step_at as string).getTime() - now) / 86_400_000) }))
    .filter(x => x.days >= 0 && x.days <= 5)
    .sort((x, y) => x.days - y.days)[0];
  const due = cards?.stats?.dueToday ?? 0;

  let step: NextStep;
  if (soon) {
    const when = soon.days === 0 ? 'today' : soon.days === 1 ? 'tomorrow' : `in ${soon.days} days`;
    step = { title: `${soon.a.next_step || 'Next step'} at ${soon.a.company} is ${when}`, why: 'Practise the round while it is fresh. A mock interview for the role takes about fifteen minutes.', href: '/interview?mode=interview', cta: 'Practise for it' };
  } else if (due > 0) {
    step = { title: `${due} ${due === 1 ? 'flashcard is' : 'flashcards are'} due`, why: 'Cards come back when you are about to forget them. A few minutes now keeps the interval growing.', href: '/flashcards', cta: 'Review cards' };
  } else if (daysSinceInterview === null || daysSinceInterview >= 7) {
    step = { title: daysSinceInterview === null ? 'Do your first mock interview' : `No interview for ${daysSinceInterview} days`, why: 'Speaking out loud is the skill that fades fastest. One session also gives you a report to learn from.', href: '/interview?mode=interview', cta: 'Start one' };
  } else {
    step = { title: 'Solve one problem', why: 'You are up to date. A short coding or SQL problem keeps the edge, and the judge runs your code for real.', href: '/workspace', cta: 'Open the workspace' };
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-panel border border-signal/25 bg-signal/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <div className="text-xs font-medium text-signal">Do this next</div>
        <div className="mt-0.5 text-base font-semibold text-fg">{step.title}</div>
        <div className="mt-1 text-[13px] leading-snug text-fg-2">{step.why}</div>
      </div>
      <ButtonLink href={step.href} className="shrink-0">{step.cta}</ButtonLink>
    </div>
  );
}

/** Cards waiting for review. Renders nothing until there is something to say. */
function FlashcardsDue() {
  const { data } = useSWR<{ stats?: { dueToday: number; total: number } }>('/api/flashcards');
  const due = data?.stats?.dueToday ?? 0;
  if (!due) return null;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <BrainCircuit size={16} className="text-signal" aria-hidden /> Flashcards
        </div>
        <span className="font-mono text-sm text-signal">{due} due</span>
      </div>
      <p className="mt-2 text-[13px] text-fg-2">Recall cards from your last interviews are ready. A few minutes now saves relearning later.</p>
      <ButtonLink href="/flashcards" variant="secondary" size="sm" className="mt-4">Review now</ButtonLink>
    </Card>
  );
}

function GeminiKeyBanner({ hasKey }: { hasKey: boolean }) {
  if (hasKey) return null;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-panel border border-live/30 bg-live/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <KeyRound size={18} className="mt-0.5 shrink-0 text-live" aria-hidden />
        <div>
          <div className="text-sm font-semibold text-fg">Add your Gemini API key</div>
          <div className="text-[13px] text-fg-2">Voice interviews and tutoring with Alex need your own key. It takes a minute in Settings.</div>
        </div>
      </div>
      <ButtonLink href="/settings" variant="secondary" size="sm" className="shrink-0">
        Open Settings
      </ButtonLink>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-container" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="mb-2 h-9 w-64" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full" />
      <Skeleton className="mb-6 h-24 w-full rounded-panel" />
      <div className="grid-dashboard-focus">
        <Skeleton className="h-64 rounded-panel" />
        <Skeleton className="h-64 rounded-panel" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser();
  const { roadmaps } = useRoadmaps();
  const { sessions, isLoading: sessionsLoading } = useSessions();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && user && (!user.target_role || !user.target_company)) {
      router.push('/onboarding');
    }
  }, [user, userLoading, router]);

  if (userLoading || (!userLoading && user && (!user.target_role || !user.target_company))) {
    return <DashboardSkeleton />;
  }

  // Calculate actual completed sessions & scores
  const completedSessions = sessions.filter((s) => {
    const isCompleted = s.state === 'COMPLETE' || s.status === 'completed';
    const hasReport = s.interview_reports && s.interview_reports.length > 0;
    return isCompleted || hasReport;
  });

  const validScores = completedSessions
    .map((s) => s.interview_reports?.[0]?.overall_score ?? s.overall_score)
    .filter((score): score is number => typeof score === 'number' && !isNaN(score));

  const avgScore =
    validScores.length > 0
      ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length)
      : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const newest = completedSessions.map(s => new Date(s.created_at).getTime()).filter(t => !isNaN(t)).sort((a, b) => b - a)[0];

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const targetRole = user?.target_role || 'Software Engineer';
  const targetCompany = user?.target_company || 'Top Tech';
  const streak = user?.streak_days ?? 0;
  const activeRoadmap = roadmaps[0];

  return (
    <div className="page-container">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={`Your ${targetRole} prep for ${targetCompany} is on track. Pick up where you left off.`}
        action={
          <>
            <ButtonLink href="/interview?mode=teach" variant="secondary">
              <BookOpen size={16} aria-hidden /> Teach me a topic
            </ButtonLink>
            <ButtonLink href="/interview?mode=interview">
              <Play size={15} className="fill-current" aria-hidden /> Start mock interview
            </ButtonLink>
          </>
        }
      />

      <GeminiKeyBanner hasKey={user?.has_gemini_key ?? true} />

      <NextAction lastInterviewAt={newest ?? null} />

      {/* Numbers first: plain, quiet, comparable */}
      <Card className="mb-6 grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:p-6 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-line">
        <Stat label="Interviews completed" value={completedSessions.length} />
        <Stat
          label="Average score"
          value={avgScore !== null ? `${avgScore}%` : '—'}
          hint={avgScore === null ? 'Finish one session to see it' : avgScore >= 75 ? 'Interview-ready range' : 'Room to grow'}
          className="lg:pl-6"
        />
        <Stat
          label="Day streak"
          value={
            <span className="inline-flex items-center gap-2">
              {streak}
              {streak > 0 && <Flame size={20} className="fill-current text-live" aria-hidden />}
            </span>
          }
          hint={streak > 0 ? 'Keep it going today' : 'Practice today to start one'}
          className="lg:pl-6"
        />
        <Stat
          label="XP earned"
          value={user?.xp ? user.xp.toLocaleString() : '0'}
          hint={user?.level ? `Level: ${user.level}` : 'Level: novice'}
          className="lg:pl-6"
        />
      </Card>

      <div className="grid-dashboard-focus mb-8">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Next up */}
          <Card className="p-5 sm:p-6">
            <div className="mb-1 flex items-center gap-2">
              <Badge tone="signal">Next up</Badge>
            </div>
            <h2 className="mt-2 font-display text-xl font-semibold text-fg">
              {activeRoadmap ? activeRoadmap.title : `${targetRole} track`}
            </h2>
            <p className="mt-1 max-w-lg text-sm text-fg-2">
              {activeRoadmap
                ? 'Work through the next module, then test yourself out loud.'
                : `Build a study plan for ${targetCompany} from a job description or a role.`}
            </p>

            {activeRoadmap ? (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-[13px]">
                  <span className="text-fg-3">Progress</span>
                  <span className="font-mono font-medium text-fg">{activeRoadmap.progress_pct ?? 0}%</span>
                </div>
                <Progress value={activeRoadmap.progress_pct ?? 0} label="Roadmap progress" />
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink href={`/roadmap/${activeRoadmap.id}`}>
                    Continue roadmap <ArrowRight size={15} aria-hidden />
                  </ButtonLink>
                  <ButtonLink href="/interview" variant="secondary">
                    Start practice
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href="/roadmap/new">
                  <Map size={16} aria-hidden /> Create a roadmap
                </ButtonLink>
                <ButtonLink href="/mock-company" variant="secondary">
                  Browse companies
                </ButtonLink>
              </div>
            )}
          </Card>

          {/* Drills: a list, not a wall of cards */}
          <div>
            <SectionHeader title="Quick drills" description="One click starts a live session on the topic." />
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-line">
                {DRILLS.map((drill) => (
                  <li key={drill.title}>
                    <Link
                      href={`/interview?mode=${drill.type}&topic=${encodeURIComponent(drill.topic)}`}
                      className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-raised"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-line bg-raised text-signal">
                        {drill.type === 'teach' ? <BookOpen size={16} aria-hidden /> : <Target size={16} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{drill.title}</span>
                        <span className="block text-xs text-fg-3">{drill.badge}</span>
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Streak */}
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Flame size={16} className="text-live" aria-hidden /> Practice streak
              </div>
              <span className="font-mono text-sm text-live">{streak} {streak === 1 ? 'day' : 'days'}</span>
            </div>
            <p className="mt-2 text-[13px] text-fg-2">
              {streak > 0 ? 'A quick 5-minute session today keeps it alive.' : 'Finish an interview or a drill today to start your streak.'}
            </p>
            <div className="mt-4 flex gap-1.5" role="img" aria-label={`${streak % 7} of 7 days this week`}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={cn('h-1.5 flex-1 rounded-full', i < streak % 7 ? 'bg-live' : 'bg-raised')} />
              ))}
            </div>
          </Card>

          <FlashcardsDue />

          {/* Shortcuts */}
          <Card padded={false} className="overflow-hidden">
            <div className="px-5 pb-1 pt-4 text-sm font-semibold text-fg">Jump to</div>
            <ul className="p-2">
              {SHORTCUTS.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex items-center gap-3 rounded-control px-3 py-2 text-sm text-fg-2 transition-colors hover:bg-raised hover:text-fg"
                  >
                    <Icon size={16} className="text-fg-3 group-hover:text-signal" aria-hidden />
                    <span className="flex-1">{label}</span>
                    <ArrowRight size={13} className="opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Recent sessions */}
      <section>
        <SectionHeader
          title="Recent sessions"
          action={
            <Link href="/reports" className="text-sm font-medium text-signal hover:underline">
              View all reports
            </Link>
          }
        />

        {sessionsLoading ? (
          <Card padded={false} className="divide-y divide-line" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-10 w-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </Card>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<Mic size={20} aria-hidden />}
            title="No sessions yet"
            description="Start a mock interview or a tutoring session with Alex to get live feedback and a scored report."
            action={
              <ButtonLink href="/interview">
                <Play size={15} className="fill-current" aria-hidden /> Start your first session
              </ButtonLink>
            }
          />
        ) : (
          <Card padded={false} className="overflow-hidden">
            <ul className="divide-y divide-line">
              {sessions.slice(0, 5).map((s) => {
                const report = s.interview_reports?.[0] || s.reports?.[0];
                const score = report?.overall_score ?? s.overall_score;
                const hasScore = typeof score === 'number';
                const scoreTone = !hasScore ? '' : score >= 80 ? 'text-good' : score >= 60 ? 'text-live' : 'text-bad';
                const sessionTitle = s.plan?.topic || s.plan?.role || s.role || (s.interview_type === 'teach' ? 'Topic tutoring' : 'Technical interview');
                const isTeach = s.interview_type === 'teach' || s.plan?.mode === 'teach';

                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-raised text-signal">
                        {isTeach ? <BookOpen size={17} aria-hidden /> : <Target size={17} aria-hidden />}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-fg">{sessionTitle}</div>
                        <div className="text-xs text-fg-3">
                          {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {hasScore && (
                        <div className="text-right">
                          <div className={cn('font-mono text-lg font-semibold leading-none', scoreTone)}>{score}%</div>
                          <div className="mt-1 text-[11px] text-fg-3">Score</div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {report?.id && (
                          <ButtonLink href={`/reports/${report.id}`} variant="secondary" size="sm">
                            Report
                          </ButtonLink>
                        )}
                        <ButtonLink href={`/interview?resumeSessionId=${s.id}`} variant="ghost" size="sm">
                          <RotateCcw size={13} aria-hidden /> Continue
                        </ButtonLink>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
