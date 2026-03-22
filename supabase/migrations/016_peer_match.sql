-- ============================================================
-- PEER MATCHING SCHEMA
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
  room_id         TEXT, -- For shared session
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE peer_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage_own_availability" ON peer_availability
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()));

ALTER TABLE peer_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_own_peer_sessions" ON peer_sessions
  FOR SELECT USING (
    user1_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid()) OR
    user2_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
  );
