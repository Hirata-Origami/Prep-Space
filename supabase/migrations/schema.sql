-- ============================================================
-- PrepSpace Platform Database Schema
-- Apply using: supabase db push (or paste into SQL editor)
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

-- Default platform tenant
INSERT INTO tenants (slug, name, type, plan) VALUES ('prepspace', 'PrepSpace', 'platform', 'platform')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 002 — USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  supabase_uid    UUID UNIQUE NOT NULL,
  email           VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255),
  avatar_url      TEXT,
  role            VARCHAR(30) NOT NULL DEFAULT 'candidate'
                    CHECK (role IN ('candidate','recruiter','educator','group_admin','tenant_admin','platform_admin')),
  xp              INT DEFAULT 0,
  level           VARCHAR(30) DEFAULT 'novice',
  streak_days     INT DEFAULT 0,
  streak_last_at  DATE,
  fcm_token       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, email)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_read" ON users
  FOR SELECT USING (supabase_uid = auth.uid());
CREATE POLICY "tenant_isolation" ON users
  FOR ALL USING (tenant_id = (current_setting('app.tenant_id', true))::UUID);

-- ============================================================
-- 003 — ROADMAPS
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
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- ============================================================
-- 004 — MODULES
-- ============================================================
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
-- 005 — INTERVIEW SESSIONS (partitioned by month)
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

-- Monthly partition for 2026
CREATE TABLE IF NOT EXISTS interview_sessions_2026_03
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_04
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_05
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_06
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_07
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_08
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_09
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_10
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_11
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS interview_sessions_2026_12
  PARTITION OF interview_sessions FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_owner" ON interview_sessions
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- ============================================================
-- 006 — INTERVIEW REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS interview_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID UNIQUE,
  user_id             UUID REFERENCES users(id),
  tenant_id           UUID REFERENCES tenants(id),
  overall_score       FLOAT,
  letter_grade        VARCHAR(3),
  hire_recommendation VARCHAR(20),
  report_storage_key  VARCHAR(500),
  generated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_owner" ON interview_reports
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- ============================================================
-- 007 — USER SKILL GRAPHS (pgvector)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_skill_graphs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id) UNIQUE,
  topic_scores    JSONB NOT NULL DEFAULT '{}',
  skill_embedding VECTOR(768),
  overall_level   VARCHAR(20) DEFAULT 'novice',
  readiness_score FLOAT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ANN index for cosine similarity search (find similar skill profiles)
CREATE INDEX IF NOT EXISTS user_skill_graphs_embedding_idx
  ON user_skill_graphs USING ivfflat (skill_embedding vector_cosine_ops)
  WITH (lists = 50);

-- ============================================================
-- 008 — GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id),
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  access_type   VARCHAR(20) CHECK (access_type IN ('private','public','shared','cohort','company_track')),
  roadmap_id    UUID REFERENCES roadmaps(id),
  settings      JSONB DEFAULT '{}',
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id  UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id),
  role      VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- 009 — HIRING PIPELINES
-- ============================================================
CREATE TABLE IF NOT EXISTS hiring_pipelines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID REFERENCES tenants(id),
  role_name               VARCHAR(255) NOT NULL,
  rounds                  JSONB NOT NULL DEFAULT '[]',
  pass_threshold          FLOAT DEFAULT 70,
  deadline                TIMESTAMPTZ,
  anonymization_enabled   BOOLEAN DEFAULT FALSE,
  bias_check_enabled      BOOLEAN DEFAULT FALSE,
  webhook_url             TEXT,
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
  integrity_mult  FLOAT DEFAULT 1.0,
  invited_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- ============================================================
-- 010 — RESUMES
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  user_id         UUID REFERENCES users(id),
  version         INT NOT NULL DEFAULT 1,
  target_role     VARCHAR(255),
  target_company  VARCHAR(255),
  raw_profile     JSONB NOT NULL DEFAULT '{}',
  ats_score       FLOAT,
  ats_gaps        JSONB DEFAULT '[]',
  pdf_storage_key VARCHAR(500),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 011 — PROMPT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS prompt_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  name        VARCHAR(100) NOT NULL,
  version     INT NOT NULL DEFAULT 1,
  content     TEXT NOT NULL,
  variables   JSONB DEFAULT '[]',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name, version)
);

-- Seed default system prompt
INSERT INTO prompt_templates (tenant_id, name, version, content) VALUES
(NULL, 'interview-system-prompt', 1,
'You are {{interviewerName}}, a {{seniority}} technical interviewer{{companyContext}}.
You are conducting a {{sessionType}} interview for the role of {{targetRole}}.

CANDIDATE PROFILE:
Overall Level: {{overallLevel}}
Strong Topics: {{strongTopics}}
Developing Topics: {{developingTopics}}
Gap Topics: {{gapTopics}}

SESSION PLAN:
Module: {{moduleName}}
Total questions: {{totalQuestions}}
Required topics: {{requiredTopics}}
Difficulty: {{difficultyLevel}}/10

RULES:
1. Do NOT confirm whether answers are correct during the session
2. After a weak answer (score ≤5), ask one follow-up probe
3. Maintain natural conversational tone
4. Call evaluate_answer() after EVERY complete response

Begin with a 2-sentence professional introduction, then ask your first question.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 012 — GEMINI QUOTA TRACKER
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

-- pg_cron: Reset Gemini quotas at midnight Pacific (8:00 UTC)
SELECT cron.schedule(
  'reset-gemini-quotas',
  '0 8 * * *',
  $$UPDATE gemini_quota_tracker SET requests_today = 0, last_reset_at = now()$$
);

-- pg_cron: Keep Supabase active (ping every 6 days)
SELECT cron.schedule(
  'keep-alive-ping',
  '0 0 */6 * *',
  $$SELECT 1$$
);

-- ============================================================
-- 013 — NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT,
  action_url  TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );

-- ============================================================
-- 014 — AUDIT LOGS (INSERT-ONLY)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID,
  user_id     UUID,
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(100),
  resource_id UUID,
  metadata    JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert_only" ON audit_logs FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "audit_tenant_read" ON audit_logs FOR SELECT
  USING (tenant_id = (current_setting('app.tenant_id', true))::UUID);

-- ============================================================
-- 015 — COMPANY PROFILES (Mock Company Interview)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  logo_emoji          VARCHAR(10),
  industry            VARCHAR(100),
  size                VARCHAR(20),
  interview_culture   TEXT,
  rounds              JSONB NOT NULL DEFAULT '[]',
  known_patterns      JSONB DEFAULT '[]',
  community_pass_rate INT DEFAULT 60,
  difficulty_rating   FLOAT DEFAULT 8.0,
  tech_stack          JSONB DEFAULT '[]',
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Seed 9 companies
INSERT INTO company_profiles (name, logo_emoji, industry, size, interview_culture, rounds, known_patterns, community_pass_rate, difficulty_rating) VALUES
('Google', '🔍', 'Tech', 'enterprise', 'Breadth-focused, Googleyness matters', '["DSA Round","System Design","Behavioral","Googleyness"]', '["Graphs and DP heavy","STAR for behavioral"]', 71, 9.2),
('Meta', '📘', 'Tech', 'enterprise', 'Product + coding focus, leadership principles', '["Coding x2","System Design","Leadership Principles"]', '["Product sense expected","Systems must scale to billions"]', 64, 8.8),
('Amazon', '📦', 'E-commerce/Cloud', 'enterprise', '14 Leadership Principles dominate every round', '["Online Assessment","Behavioral (LP)","Technical","Bar Raiser"]', '["STAR mandatory","LP stories in every answer"]', 58, 8.5),
('Apple', '🍎', 'Tech/Consumer', 'enterprise', 'Obsession with quality and low-level details', '["Coding","System Design","Hiring Manager"]', '["Low-level implementation","Attention to edge cases"]', 55, 8.7),
('Microsoft', '🪟', 'Tech/Cloud', 'enterprise', 'Collaborative culture, growth mindset', '["Coding x3","Design","As Appropriate"]', '["Growth mindset culture","OOP and design patterns"]', 68, 8.0),
('Stripe', '💳', 'Fintech', 'large', 'Real-world code, obsession with craft', '["Bug Fix","Architecture","System Design"]', '["Real codebase tasks","API design mastery"]', 52, 9.0),
('Airbnb', '🏠', 'Travel Tech', 'large', 'Strong culture fit, product intuition', '["Coding","Cross-functional","System Design"]', '["Culture fit extremely important","Product thinking"]', 61, 8.3),
('Netflix', '🎬', 'Streaming', 'large', 'Elite only, culture document is law', '["Coding","System Design","Culture Doc Alignment"]', '["Must embody freedom and responsibility","High performance culture"]', 49, 9.4),
('Coinbase', '₿', 'Fintech/Crypto', 'large', 'Blockchain knowledge valued, fast pace', '["Coding","System Design","Crypto Knowledge"]', '["Web3 awareness a plus","Startup speed mentality"]', 60, 8.1)
ON CONFLICT DO NOTHING;
