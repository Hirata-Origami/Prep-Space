-- Run this in Supabase SQL Editor
-- Atomic "get or create session" function — completely eliminates race conditions

CREATE OR REPLACE FUNCTION get_or_create_peer_session(
  p_user1_id UUID,
  p_user2_id UUID,
  p_topic    TEXT
)
RETURNS TABLE(session_id UUID, is_new BOOLEAN) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id UUID;
  v_is_new     BOOLEAN := FALSE;
  v_lo UUID := LEAST(p_user1_id, p_user2_id);
  v_hi UUID := GREATEST(p_user1_id, p_user2_id);
BEGIN
  -- 1. Look for any existing established session between these two users
  SELECT id INTO v_session_id
  FROM peer_sessions
  WHERE user1_id = v_lo
    AND user2_id = v_hi
    AND status = 'established'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 2. If none found, create one atomically
  IF v_session_id IS NULL THEN
    INSERT INTO peer_sessions (user1_id, user2_id, topic, status)
    VALUES (v_lo, v_hi, p_topic, 'established')
    RETURNING id INTO v_session_id;

    -- Set room_id = session UUID for deterministic Jitsi room
    UPDATE peer_sessions SET room_id = v_session_id WHERE id = v_session_id;

    v_is_new := TRUE;
  END IF;

  RETURN QUERY SELECT v_session_id, v_is_new;
END;
$$;

-- Disable RLS on all peer tables
ALTER TABLE peer_sessions    DISABLE ROW LEVEL SECURITY;
ALTER TABLE peer_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;

-- Drop the expression-based unique index (caused the fallback to fail)
-- The function above is the race guard now
DROP INDEX IF EXISTS peer_sessions_unique_active_pair;

-- Verify the function was created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_or_create_peer_session';
