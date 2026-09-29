-- ============================================================
-- 004 — Everything added after the base schema, in one re-runnable script
-- Run once in the Supabase SQL editor. Safe to run again: every statement skips what already exists,
-- so it does not matter which earlier scripts you ran. Nothing here drops or rewrites your data.
-- Requires the base schema (users, resume_versions, interview_reports). It is the only
-- file you need on top of the base schema: it also creates applications and workspace_docs.
-- ============================================================

-- The application tracker (also created by 002 if you ran it separately)
CREATE TABLE IF NOT EXISTS applications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company            VARCHAR(255) NOT NULL,
  role               VARCHAR(255) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'saved'
                       CHECK (status IN ('saved','applied','screen','interview','offer','rejected','withdrawn')),
  url                TEXT,
  jd_text            TEXT,
  notes              TEXT,
  resume_version_id  UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
  applied_at         DATE,
  next_step          VARCHAR(255),
  next_step_at       DATE,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_user_status ON applications(user_id, status);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "applications_owner" ON applications;
CREATE POLICY "applications_owner" ON applications
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- The workspace table (also created by 003 if you ran it separately)
CREATE TABLE IF NOT EXISTS workspace_docs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL DEFAULT 'Untitled',
  language    VARCHAR(20) NOT NULL DEFAULT 'markdown',
  content     TEXT NOT NULL DEFAULT '',
  diagram     JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[],"strokes":[]}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workspace_docs_user ON workspace_docs(user_id, updated_at DESC);
ALTER TABLE workspace_docs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_docs_owner" ON workspace_docs;
CREATE POLICY "workspace_docs_owner" ON workspace_docs
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 012 — CODING PRACTICE SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coding_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_doc_id UUID REFERENCES workspace_docs(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  language         VARCHAR(20) NOT NULL,
  track            VARCHAR(100) NOT NULL,
  difficulty       VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  status           VARCHAR(20) NOT NULL CHECK (status IN ('passed', 'failed', 'partial')),
  score            INT DEFAULT 0,
  time_complexity  VARCHAR(50),
  space_complexity VARCHAR(50),
  feedback         TEXT,
  test_results     JSONB DEFAULT '[]',
  code             TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_user ON coding_submissions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_track ON coding_submissions(user_id, track, difficulty);

ALTER TABLE coding_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coding_submissions_owner" ON coding_submissions;
CREATE POLICY "coding_submissions_owner" ON coding_submissions
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 013 — FLASHCARDS (SPACED REPETITION SM-2)
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id         UUID REFERENCES interview_reports(id) ON DELETE SET NULL,
  question          TEXT NOT NULL,
  answer            TEXT NOT NULL,
  category          VARCHAR(100) NOT NULL DEFAULT 'General',
  difficulty        VARCHAR(20) DEFAULT 'medium',
  interval          INT DEFAULT 1,
  repetition        INT DEFAULT 0,
  ease_factor       FLOAT DEFAULT 2.5,
  due_date          DATE DEFAULT CURRENT_DATE,
  last_reviewed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_due ON flashcards(user_id, due_date);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flashcards_owner" ON flashcards;
CREATE POLICY "flashcards_owner" ON flashcards
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 014 — STAR STORIES BANK
-- ============================================================
CREATE TABLE IF NOT EXISTS star_stories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  theme       VARCHAR(100) NOT NULL,
  situation   TEXT NOT NULL,
  task        TEXT NOT NULL,
  action      TEXT NOT NULL,
  result      TEXT NOT NULL,
  metrics     VARCHAR(255),
  feedback    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_star_stories_user ON star_stories(user_id, updated_at DESC);

ALTER TABLE star_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "star_stories_owner" ON star_stories;
CREATE POLICY "star_stories_owner" ON star_stories
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 015 — SALARY & OFFER NEGOTIATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS negotiation_offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company           VARCHAR(255) NOT NULL,
  role              VARCHAR(255) NOT NULL,
  level             VARCHAR(50),
  base_salary       NUMERIC,
  equity            NUMERIC,
  bonus             NUMERIC,
  signing_bonus     NUMERIC,
  currency          VARCHAR(10) DEFAULT 'USD',
  location          VARCHAR(100),
  notes             TEXT,
  counter_script    TEXT,
  market_benchmark  JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_negotiation_offers_user ON negotiation_offers(user_id);

ALTER TABLE negotiation_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "negotiation_offers_owner" ON negotiation_offers;
CREATE POLICY "negotiation_offers_owner" ON negotiation_offers
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 016 — SHAREABLE REPORTS FOR MENTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS shared_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES interview_reports(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token       VARCHAR(64) UNIQUE NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  view_count        INT DEFAULT 0,
  mentor_notes      JSONB DEFAULT '[]',
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_reports_token ON shared_reports(share_token);

ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_reports_owner_manage" ON shared_reports;
CREATE POLICY "shared_reports_owner_manage" ON shared_reports
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- Hardening
-- ============================================================
-- Shared links are looked up by the server with the service role, so nobody needs
-- to list them. Remove the old public read policy if an earlier version created it.
DROP POLICY IF EXISTS "shared_reports_public_read" ON shared_reports;

-- increment_xp is SECURITY DEFINER and takes any user id, so it must not be callable
-- by signed-in users. Only the server (service role) awards XP.
REVOKE EXECUTE ON FUNCTION increment_xp(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_xp(UUID, INT) TO service_role;

-- ============================================================
-- Email preferences and scheduled-job bookkeeping
-- ============================================================
-- Lets people turn off the weekly digest and the daily tip. Report-ready emails are always sent.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_updates BOOLEAN NOT NULL DEFAULT TRUE;

-- One row per scheduled job, so a job that is triggered twice in a period only sends once.
CREATE TABLE IF NOT EXISTS cron_runs (
  job     VARCHAR(60) PRIMARY KEY,
  ran_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY; -- no policies: only the service role can read or write it

-- The GitHub token feature was removed (only public repositories are read), so this column is unused.
ALTER TABLE users DROP COLUMN IF EXISTS github_token_enc;
