'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';
import { useRoadmaps, useSessions } from '@/lib/hooks/useRoadmaps';
import {
  Sparkles,
  Play,
  Flame,
  Trophy,
  Target,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Building2,
  FileUser,
  Users,
  CheckCircle2,
  Zap,
  RotateCcw,
  Compass,
} from 'lucide-react';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  color: string;
  subtitle?: string;
  trend?: string;
}) {
  return (
    <div
      style={{
        padding: '20px 22px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: color,
          opacity: 0.08,
          transform: 'translate(15px,-15px)',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={color} />
        </div>
        {trend && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '100px',
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
            }}
          >
            {trend}
          </span>
        )}
        {!trend && subtitle && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
            {subtitle}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: '30px',
          fontWeight: 900,
          fontFamily: 'var(--font-mono)',
          color,
          marginBottom: '4px',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
        {label}
      </div>
    </div>
  );
}

function GeminiKeyBanner({ hasKey }: { hasKey: boolean }) {
  if (hasKey) return null;
  return (
    <div
      style={{
        padding: '16px 22px',
        background: 'linear-gradient(135deg, rgba(var(--accent-violet-rgb), 0.12), rgba(var(--accent-primary-rgb), 0.08))',
        border: '1px solid rgba(var(--accent-violet-rgb), 0.3)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '28px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--accent-violet)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
            Configure your Gemini API Key
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            To conduct real-time voice interviews and tutoring sessions with Alex, connect your personal Gemini API key.
          </div>
        </div>
      </div>
      <Link
        href="/settings"
        style={{
          padding: '8px 18px',
          background: 'var(--accent-violet)',
          color: '#FFFFFF',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          flexShrink: 0,
        }}
      >
        <span>Open Settings</span>
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: userLoading } = useUser();
  const { roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { sessions, isLoading: sessionsLoading } = useSessions();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && user && (!user.target_role || !user.target_company)) {
      router.push('/onboarding');
    }
  }, [user, userLoading, router]);

  if (userLoading || (!userLoading && user && (!user.target_role || !user.target_company))) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '3px solid var(--accent-primary)',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    );
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

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';
  const targetRole = user?.target_role || 'Software Engineer';
  const targetCompany = user?.target_company || 'Top Tech';

  return (
    <div className="page-container">
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}
        className="p-5 sm:p-7"
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: '100px',
                fontSize: '11px',
                fontWeight: 700,
                background: 'var(--accent-primary-dim)',
                color: 'var(--accent-primary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={12} />
              AI Studio Command
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Calibrated for <strong style={{ color: 'var(--text-primary)' }}>{targetCompany}</strong>
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '8px',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: '14.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Your interview prep track for <strong style={{ color: 'var(--accent-primary)' }}>{targetRole}</strong> is active. Launch a real-time session with Alex below.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/interview?mode=interview"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'var(--accent-primary)',
              color: 'var(--text-on-accent)',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 16px var(--accent-primary-glow)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Play size={16} fill="currentColor" color="currentColor" />
            <span>Mock Interview</span>
          </Link>

          <Link
            href="/interview?mode=teach"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 22px',
              borderRadius: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
          >
            <BookOpen size={16} color="var(--accent-primary)" />
            <span>Teach Me a Topic</span>
          </Link>
        </div>
      </div>

      {/* Gemini Key Prompt */}
      <GeminiKeyBanner hasKey={user?.has_gemini_key ?? true} />

      {/* Stats Row — 2 cols on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          label="Interviews Completed"
          value={completedSessions.length}
          icon={Target}
          color="var(--accent-primary)"
          trend={completedSessions.length > 0 ? `${completedSessions.length} sessions` : undefined}
          subtitle="Total Completed"
        />
        <StatCard
          label="Average Score"
          value={avgScore !== null ? `${avgScore}%` : '—'}
          icon={TrendingUp}
          color="var(--accent-violet)"
          trend={avgScore && avgScore >= 75 ? 'Ready' : undefined}
          subtitle={avgScore ? 'Performance' : 'Awaiting 1st Score'}
        />
        <StatCard
          label="Active Day Streak"
          value={user?.streak_days ?? 0}
          icon={Flame}
          color="var(--accent-amber)"
          trend={(user?.streak_days ?? 0) > 0 ? `${user?.streak_days}d fire` : undefined}
          subtitle="Daily Habit"
        />
        <StatCard
          label="Total XP Earned"
          value={user?.xp ? user.xp.toLocaleString() : '0'}
          icon={Trophy}
          color="var(--accent-primary)"
          subtitle={user?.level ? user.level.toUpperCase() : 'NOVICE'}
        />
      </div>

      {/* High-Interest Practice Drills & Roadmap Section */}
      <div className="grid-dashboard-focus mb-7">
        {/* Left Column: AI Recommended Focus & High Yield Drills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Today's Focus Card */}
          <div
            style={{
              padding: '24px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--accent-primary)',
                    letterSpacing: '0.08em',
                  }}
                >
                  Today&apos;s Focus Roadmap
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary-dim)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  Recommended
                </span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                {roadmaps.length > 0 ? roadmaps[0].title : `${targetRole} Comprehensive Track`}
              </h2>

              <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
                {roadmaps.length > 0
                  ? 'Follow structured interactive milestones tailored to your target company standards and interview patterns.'
                  : `Structured curriculum curated for ${targetCompany} technical and architecture rounds.`}
              </p>
            </div>

            {roadmaps.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Track Progress</span>
                  <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {roadmaps[0].progress_pct ?? 0}%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '100px',
                    background: 'var(--bg-elevated)',
                    overflow: 'hidden',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${roadmaps[0].progress_pct ?? 0}%`,
                      background: 'var(--accent-primary)',
                      borderRadius: '100px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link
                    href={`/roadmap/${roadmaps[0].id}`}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--accent-primary)',
                      color: 'var(--text-on-accent)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Continue Roadmap</span>
                    <ArrowRight size={14} />
                  </Link>

                  <Link
                    href="/interview"
                    style={{
                      padding: '10px 18px',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Start Practice
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link
                  href="/roadmap/new"
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent-primary)',
                    color: 'var(--text-on-accent)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Create Custom Roadmap</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/mock-company"
                  style={{
                    padding: '10px 18px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Browse Companies
                </Link>
              </div>
            )}
          </div>

          {/* High-Yield Practice Drills (High-Interest Widget) */}
          <div
            style={{
              padding: '22px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  High-Yield Practice Drills
                </h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>1-Click Launch</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                {
                  title: 'Distributed Caching & Redis',
                  type: 'teach',
                  topic: 'Distributed Caching & Redis Patterns',
                  badge: 'Architecture',
                  icon: BookOpen,
                },
                {
                  title: 'System Design Interview',
                  type: 'interview',
                  topic: 'System Design & Scalability',
                  badge: 'Mock Round',
                  icon: Target,
                },
                {
                  title: 'React 19 & Next.js Internals',
                  type: 'teach',
                  topic: 'React 19 Server Components & Fiber',
                  badge: 'Deep Dive',
                  icon: BookOpen,
                },
              ].map((drill) => (
                <Link
                  key={drill.title}
                  href={`/interview?mode=${drill.type}&topic=${encodeURIComponent(drill.topic)}`}
                  style={{
                    padding: '14px 16px',
                    background: 'var(--bg-elevated)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'border-color 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'var(--accent-primary-dim)',
                        color: 'var(--accent-primary)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {drill.badge}
                    </span>
                    <drill.icon size={15} color="var(--accent-primary)" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {drill.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Practice Now</span>
                    <ArrowRight size={11} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Streak & Quick Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Streak Card */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={16} color="var(--accent-amber)" />
                <span>Daily Practice Streak</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                {user?.streak_days ?? 0} Days
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              {(user?.streak_days ?? 0) > 0
                ? 'Terrific momentum! Keep it going with a quick 5-minute session today.'
                : 'Complete an interview or tutoring drill today to start your streak!'}
            </p>

            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const active = i < (user?.streak_days ?? 0) % 7;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '7px',
                      borderRadius: '4px',
                      background: active ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      transition: 'background 0.2s',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Quick Access Shortcuts */}
          <div
            style={{
              padding: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Career Studio Shortcuts
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'AI Voice Studio', href: '/interview', icon: Target },
                { label: 'Mock Companies', href: '/mock-company', icon: Building2 },
                { label: 'Resume Optimizer', href: '/resume', icon: FileUser },
                { label: 'Global Leaderboard', href: '/leaderboard', icon: Trophy },
                { label: 'Study Groups', href: '/groups', icon: Users },
              ].map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                    e.currentTarget.style.color = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={15} />
                    <span>{label}</span>
                  </div>
                  <ArrowRight size={12} style={{ opacity: 0.5 }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Recent AI Sessions</h2>
          <Link
            href="/reports"
            style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}
          >
            View all reports →
          </Link>
        </div>

        {sessionsLoading ? (
          <div
            style={{
              padding: '36px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
            }}
          >
            Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Target size={24} color="var(--accent-primary)" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              No practice sessions completed yet
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>
              Launch your first technical interview or tutoring session with Alex to receive live feedback and instant scoring.
            </p>
            <Link
              href="/interview"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 22px',
                borderRadius: '8px',
                background: 'var(--accent-primary)',
                color: 'var(--text-on-accent)',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              <Play size={14} fill="currentColor" color="currentColor" />
              <span>Start First Session</span>
            </Link>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            {sessions.slice(0, 5).map((s, idx) => {
              const report = s.interview_reports?.[0] || s.reports?.[0];
              const score = report?.overall_score ?? s.overall_score;
              const isHigh = typeof score === 'number' && score >= 80;
              const isMid = typeof score === 'number' && score >= 60;
              const scoreColor = isHigh ? 'var(--accent-primary)' : isMid ? 'var(--accent-amber)' : 'var(--accent-red)';
              const sessionTitle = s.plan?.topic || s.plan?.role || s.role || (s.interview_type === 'teach' ? 'Topic Tutoring' : 'Technical Interview');

              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px 22px',
                    borderBottom: idx < Math.min(sessions.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {s.interview_type === 'teach' || s.plan?.mode === 'teach' ? (
                        <BookOpen size={18} color="var(--accent-primary)" />
                      ) : (
                        <Target size={18} color="var(--accent-primary)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                        {sessionTitle}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(s.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {typeof score === 'number' && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: scoreColor }}>
                          {score}%
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>SCORE</div>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {report?.id && (
                        <Link
                          href={`/reports/${report.id}`}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Report →
                        </Link>
                      )}

                      <Link
                        href={`/interview?resumeSessionId=${s.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'var(--accent-primary-dim)',
                          border: '1px solid var(--accent-primary)',
                          color: 'var(--accent-primary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Continue</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
