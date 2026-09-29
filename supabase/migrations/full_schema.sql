-- ============================================================
-- PrepSpace Platform: Consolidated Clean Database Schema
-- Complete from-scratch setup script for all tables, indexes,
-- triggers, functions, and Row-Level Security (RLS) policies.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 001 — TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(20) NOT NULL DEFAULT 'platform' CHECK (type IN ('individual','group','company','education','platform')),
  plan        VARCHAR(20) NOT NULL DEFAULT 'free',
  branding    JSONB NOT NULL DEFAULT '{}',
  features    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO tenants (slug, name, type, plan) 
VALUES ('prepspace', 'PrepSpace', 'platform', 'platform')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 002 — USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_uid        UUID UNIQUE NOT NULL,
  email               VARCHAR(255) NOT NULL,
  full_name           VARCHAR(255),
  avatar_url          TEXT,
  role                VARCHAR(30) NOT NULL DEFAULT 'candidate'
                        CHECK (role IN ('candidate','group_admin','tenant_admin','platform_admin')),
  xp                  INT DEFAULT 0,
  level               VARCHAR(30) DEFAULT 'novice',
  streak_days         INT DEFAULT 0,
  streak_last_at      DATE,
  fcm_token           TEXT,
  gemini_api_key      TEXT,
  target_role         VARCHAR(255),
  target_company      VARCHAR(255),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_read" ON users FOR SELECT USING (supabase_uid = auth.uid());
CREATE POLICY "users_own_update" ON users FOR UPDATE USING (supabase_uid = auth.uid());
CREATE POLICY "users_own_insert" ON users FOR INSERT WITH CHECK (supabase_uid = auth.uid());

-- Function to safely increment XP
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET xp = COALESCE(xp, 0) + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 003 — ROADMAPS & MODULES
-- ============================================================
CREATE TABLE IF NOT EXISTS roadmaps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  source_type     VARCHAR(20) DEFAULT 'custom' CHECK (source_type IN ('predefined','jd','custom')),
  raw_jd          TEXT,
  parsed_skills   JSONB,
  target_role     VARCHAR(255),
  target_company  VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);

ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roadmap_owner" ON roadmaps
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

CREATE TABLE IF NOT EXISTS modules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id),
  roadmap_id          UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  topics              JSONB NOT NULL DEFAULT '[]',
  prerequisites       UUID[] DEFAULT '{}',
  sequence_order      INT NOT NULL,
  difficulty          VARCHAR(20) DEFAULT 'intermediate',
  estimated_minutes   INT DEFAULT 25,
  status              VARCHAR(30) DEFAULT 'available',
  current_score       FLOAT DEFAULT 0,
  session_count       INT DEFAULT 0,
  last_session_at     TIMESTAMPTZ,
  icon                TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modules_roadmap_id ON modules(roadmap_id);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_owner" ON modules
  FOR ALL USING (roadmap_id IN (SELECT id FROM roadmaps WHERE user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())));

-- ============================================================
-- 004 — STUDY GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  access_type VARCHAR(20) DEFAULT 'public' CHECK (access_type IN ('public','private')),
  roadmap_id  UUID REFERENCES roadmaps(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_roadmaps (
  group_id    UUID REFERENCES groups(id) ON DELETE CASCADE,
  roadmap_id  UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, roadmap_id)
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_read" ON groups FOR SELECT USING (true);
CREATE POLICY "groups_manage" ON groups FOR ALL USING (created_by IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_members_read" ON group_members FOR SELECT USING (true);
CREATE POLICY "group_members_manage" ON group_members FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

ALTER TABLE group_roadmaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_roadmaps_read" ON group_roadmaps FOR SELECT USING (true);
CREATE POLICY "group_roadmaps_manage" ON group_roadmaps FOR ALL USING (
  group_id IN (SELECT id FROM groups WHERE created_by IN (SELECT id FROM users WHERE supabase_uid = auth.uid()))
);

-- ============================================================
-- 005 — RESUMES & JD VERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  profile_sections  JSONB NOT NULL DEFAULT '{}',
  raw_profile       JSONB DEFAULT '{}',
  target_role       VARCHAR(255),
  target_company    VARCHAR(255),
  version           INT DEFAULT 1,
  latex_code        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resumes_owner" ON resumes
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

CREATE TABLE IF NOT EXISTS resume_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  version_name  VARCHAR(255) NOT NULL,
  company       VARCHAR(255),
  role          VARCHAR(255),
  jd_text       TEXT,
  latex_code    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_versions_user_id ON resume_versions(user_id);

ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resume_versions_owner" ON resume_versions
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 006 — INTERVIEW SESSIONS & REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  module_id         UUID REFERENCES modules(id) ON DELETE SET NULL,
  session_type      VARCHAR(30) NOT NULL DEFAULT 'training',
  interview_type    VARCHAR(30) NOT NULL DEFAULT 'conceptual',
  state             VARCHAR(30) NOT NULL DEFAULT 'INITIALIZING',
  plan              JSONB NOT NULL DEFAULT '{}',
  question_log      JSONB DEFAULT '[]',
  proctor_events    JSONB DEFAULT '[]',
  transcript_key    VARCHAR(500),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  duration_seconds  INT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON interview_sessions(created_at DESC);

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_owner" ON interview_sessions
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

CREATE TABLE IF NOT EXISTS interview_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  tenant_id           UUID REFERENCES tenants(id),
  overall_score       FLOAT,
  letter_grade        VARCHAR(3),
  hire_recommendation VARCHAR(20),
  report_storage_key  VARCHAR(500),
  analysis            JSONB DEFAULT '{}',
  duration_seconds    INT,
  generated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_session_id ON interview_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON interview_reports(user_id);

ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_owner" ON interview_reports
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 007 — COMPANY PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS company_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  logo_emoji          VARCHAR(10),
  industry            VARCHAR(100),
  size                VARCHAR(20),
  interview_culture   TEXT,
  rounds              JSONB NOT NULL DEFAULT '[]',
  round_topics        JSONB DEFAULT '{}',
  known_patterns      JSONB DEFAULT '[]',
  community_pass_rate INT DEFAULT 60,
  difficulty_rating   FLOAT DEFAULT 8.0,
  tech_stack          JSONB DEFAULT '[]',
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_profiles_public_read" ON company_profiles FOR SELECT USING (true);

-- Seed initial top companies if not exists
INSERT INTO company_profiles (name, industry, size, logo_emoji, difficulty_rating, community_pass_rate, interview_culture, rounds, round_topics, known_patterns, is_active)
VALUES 
(
  'Zepto',
  'Hyper-local Delivery',
  'hypergrowth',
  '⚡',
  8.5,
  42,
  'Extremely fast-paced. High focus on low-latency systems, concurrency, and shipping features under tight deadlines.',
  '["Machine Coding", "DSA & Problem Solving", "System Design (LLD/HLD)", "Hiring Manager"]',
  '{"Machine Coding": ["Concurrency", "Redis", "WebSockets", "Rate Limiting"], "DSA & Problem Solving": ["Graphs", "Dynamic Programming", "Heaps"], "System Design (LLD/HLD)": ["Microservices", "Database Sharding", "Message Queues", "Caching"], "Hiring Manager": ["Past Impact", "Conflict Resolution", "Ownership", "Ambiguity"]}',
  '["Heavy focus on Redis and caching strategies", "Expect live coding of a mini-project in 90 mins", "HLD usually involves designing a delivery routing system"]',
  true
),
(
  'Stripe',
  'FinTech / Infrastructure',
  'enterprise',
  '💳',
  9.0,
  38,
  'World-class bar for API design, idempotency, distributed transactions, clean readable code, and testing.',
  '["Coding & Bug Squashing", "System Design", "Integration / API Design", "Manager & Values"]',
  '{"Coding & Bug Squashing": ["Live Debugging", "Refactoring", "Unit Testing"], "System Design": ["Idempotent Ledger", "Webhooks at Scale", "Payment Routing"]}',
  '["Always tests idempotency in distributed workflows", "Code must be production-quality with tests"]',
  true
),
(
  'Google',
  'Big Tech',
  'enterprise',
  '🌐',
  9.2,
  32,
  'Algorithm optimization, complexity trade-offs, global distributed systems scalability, and Googleyness.',
  '["Coding (DSA) 1", "Coding (DSA) 2", "System Design", "Googleyness & Leadership"]',
  '{"Coding (DSA) 1": ["Graphs", "Trees", "Dynamic Programming"], "System Design": ["Global Storage", "CDN Architecture", "Consistent Hashing"]}',
  '["Expect optimal time and space bounds", "Thorough edge-case and boundary testing"]',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 008 — STORAGE & BUCKETS (RESERVED)
-- ============================================================
-- Real-time audio streaming via Gemini Live requires no permanent storage bucket.

-- ============================================================
-- 010 — APPLICATION TRACKER
-- ============================================================
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

-- ============================================================
-- 011 — WORKSPACE DOCUMENTS
-- ============================================================
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
-- 017 — AUTOMATION & CRONS
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_quota_tracker (
  model               VARCHAR(100) PRIMARY KEY,
  requests_today      INT DEFAULT 0,
  daily_limit         INT NOT NULL,
  last_reset_at       TIMESTAMPTZ DEFAULT now()
);

INSERT INTO gemini_quota_tracker (model, requests_today, daily_limit) VALUES
  ('gemini-3.1-flash-lite-preview',       0, 1500)
ON CONFLICT (model) DO NOTHING;

SELECT cron.schedule('reset-gemini-quotas', '0 8 * * *', $$UPDATE gemini_quota_tracker SET requests_today = 0, last_reset_at = now()$$);
SELECT cron.schedule('keep-alive-ping', '0 0 */6 * *', $$SELECT 1$$);
SELECT cron.schedule('daily-insights', '0 7 * * *', $$SELECT net.http_get(url := current_setting('app.site_url') || '/api/cron/daily-insights', headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret')))$$);
SELECT cron.schedule('weekly-digest', '0 8 * * 1', $$SELECT net.http_get(url := current_setting('app.site_url') || '/api/cron/weekly-digest', headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret')))$$);