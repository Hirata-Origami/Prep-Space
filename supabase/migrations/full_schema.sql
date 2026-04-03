-- ============================================================
-- PrepSpace Platform: Consolidated Database Schema
-- Last Updated: 2026-04-03
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
  type        VARCHAR(20) NOT NULL CHECK (type IN ('individual','group','company','education','platform')),
  plan        VARCHAR(20) NOT NULL DEFAULT 'free',
  branding    JSONB NOT NULL DEFAULT '{}',
  features    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

INSERT INTO tenants (slug, name, type, plan) VALUES ('prepspace', 'PrepSpace', 'platform', 'platform')
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
                        CHECK (role IN ('candidate','recruiter','educator','group_admin','tenant_admin','platform_admin')),
  xp                  INT DEFAULT 0,
  level               VARCHAR(30) DEFAULT 'novice',
  streak_days         INT DEFAULT 0,
  streak_last_at      DATE,
  fcm_token           TEXT,
  gemini_api_key      TEXT,
  target_role         VARCHAR(255),
  target_company      VARCHAR(255),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  is_recruiter        BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_read" ON users FOR SELECT USING (supabase_uid = auth.uid());
CREATE POLICY "users_own_gemini_key" ON users FOR SELECT USING (supabase_uid = auth.uid());

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
  source_type     VARCHAR(20) CHECK (source_type IN ('predefined','jd','custom')),
  raw_jd          TEXT,
  parsed_skills   JSONB,
  target_role     VARCHAR(255),
  target_company  VARCHAR(255),
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now()
);

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

-- ============================================================
-- 004 — INTERVIEW SESSIONS & REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  module_id       UUID REFERENCES modules(id),
  pipeline_id     UUID,
  session_type    VARCHAR(30) NOT NULL DEFAULT 'training',
  interview_type  VARCHAR(30) NOT NULL DEFAULT 'conceptual',
  state           VARCHAR(30) NOT NULL DEFAULT 'INITIALIZING',
  plan            JSONB NOT NULL DEFAULT '{}',
  question_log    JSONB DEFAULT '[]',
  proctor_events  JSONB DEFAULT '[]',
  audio_key       VARCHAR(500),
  transcript_key  VARCHAR(500),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  duration_seconds INT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 2026 Partitions
CREATE TABLE IF NOT EXISTS interview_sessions_2026_01 PARTITION OF interview_sessions FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_02 PARTITION OF interview_sessions FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_03 PARTITION OF interview_sessions FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_04 PARTITION OF interview_sessions FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_05 PARTITION OF interview_sessions FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
-- ... Additional months can be added here

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_owner" ON interview_sessions
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

CREATE TABLE IF NOT EXISTS interview_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID UNIQUE,
  user_id             UUID REFERENCES users(id),
  tenant_id           UUID REFERENCES tenants(id),
  overall_score       FLOAT,
  letter_grade        VARCHAR(3),
  hire_recommendation VARCHAR(20),
  report_storage_key  VARCHAR(500),
  analysis            JSONB DEFAULT '{}',
  duration_seconds    INT,
  generated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_owner" ON interview_reports
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 005 — NETWORKING & PEER MATCHING
-- ============================================================
CREATE TABLE IF NOT EXISTS peer_availability (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  topic           VARCHAR(100) NOT NULL,
  skill_level     VARCHAR(50) NOT NULL,
  available_until TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peer_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id        UUID REFERENCES users(id),
  user2_id        UUID REFERENCES users(id),
  topic           VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'connecting',
  room_id         TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE peer_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage_own_availability" ON peer_availability FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

-- ============================================================
-- 006 — HIRING & PIPELINES
-- ============================================================
CREATE TABLE IF NOT EXISTS hiring_pipelines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id),
  role_name               VARCHAR(255) NOT NULL,
  rounds                  JSONB NOT NULL DEFAULT '[]',
  pass_threshold          FLOAT DEFAULT 70,
  deadline                TIMESTAMPTZ,
  status                  VARCHAR(20) DEFAULT 'active',
  created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     UUID REFERENCES hiring_pipelines(id),
  user_id         UUID REFERENCES users(id),
  email           VARCHAR(255) NOT NULL,
  name            VARCHAR(255),
  stage           VARCHAR(20) DEFAULT 'invited',
  composite_score FLOAT,
  round_scores    JSONB DEFAULT '{}',
  invited_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

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

-- ============================================================
-- 008 — STORAGE & BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('interview_audio', 'interview_audio', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING ( bucket_id = 'interview_audio' );
CREATE POLICY "Authenticated Upload Access" ON storage.objects FOR INSERT TO authenticated WITH CHECK ( bucket_id = 'interview_audio' );

-- ============================================================
-- 009 — AUTOMATION & CRONS
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_quota_tracker (
  model               VARCHAR(100) PRIMARY KEY,
  requests_today      INT DEFAULT 0,
  daily_limit         INT NOT NULL,
  last_reset_at       TIMESTAMPTZ DEFAULT now()
);

INSERT INTO gemini_quota_tracker (model, requests_today, daily_limit) VALUES
  ('gemini-3.1-flash-lite-preview',       0, 250)
ON CONFLICT (model) DO NOTHING;

SELECT cron.schedule('reset-gemini-quotas', '0 8 * * *', $$UPDATE gemini_quota_tracker SET requests_today = 0, last_reset_at = now()$$);
SELECT cron.schedule('keep-alive-ping', '0 0 */6 * *', $$SELECT 1$$);
