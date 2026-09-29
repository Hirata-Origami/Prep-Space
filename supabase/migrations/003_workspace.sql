-- ============================================================
-- 003 — Workspace documents (notes, code, SQL and system-design diagrams)
-- Run in the Supabase SQL editor after 002. Safe to run more than once.
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
