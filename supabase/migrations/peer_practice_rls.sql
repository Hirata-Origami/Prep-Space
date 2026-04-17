-- ============================================================
-- PrepSpace — Peer Practice SQL Setup
-- Run this ONCE in: Supabase Dashboard → SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / DO blocks)
-- ============================================================

-- STEP 1: Enable RLS on peer_sessions
ALTER TABLE peer_sessions ENABLE ROW LEVEL SECURITY;

-- STEP 2: Participants can read/update their own sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'peer_sessions' AND policyname = 'peer_session_participant'
  ) THEN
    CREATE POLICY "peer_session_participant" ON peer_sessions
      FOR ALL
      USING (
        user1_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
        OR
        user2_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
      )
      WITH CHECK (
        user1_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
        OR
        user2_id IN (SELECT id FROM users WHERE supabase_uid = auth.uid())
      );
  END IF;
END $$;

-- STEP 3: Let authenticated users read other users' basic info (name/avatar for peer display)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'users_peer_read'
  ) THEN
    CREATE POLICY "users_peer_read" ON users
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- STEP 4: Let authenticated users read all active peer availability (so matching works)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'peer_availability' AND policyname = 'peer_availability_authenticated_read'
  ) THEN
    CREATE POLICY "peer_availability_authenticated_read" ON peer_availability
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- STEP 5: THIS IS THE KEY ONE — add peer_sessions to the realtime publication
-- Without this, WebSocket events NEVER arrive even if the WS connects fine.
ALTER PUBLICATION supabase_realtime ADD TABLE peer_sessions;

-- ============================================================
-- Verify everything worked:
-- ============================================================
SELECT tablename, policyname, cmd FROM pg_policies
  WHERE tablename IN ('peer_sessions', 'peer_availability', 'users')
  ORDER BY tablename, policyname;

SELECT tablename FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
  ORDER BY tablename;
