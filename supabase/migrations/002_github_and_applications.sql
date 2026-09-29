-- ============================================================
-- 002 — GitHub token storage and the application tracker
-- Run in the Supabase SQL editor. Safe to run more than once.
-- ============================================================

-- Encrypted GitHub token (AES-256-GCM, key in APP_ENCRYPTION_KEY). Never readable in plaintext.
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_token_enc TEXT;

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
