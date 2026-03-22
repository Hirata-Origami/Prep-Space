-- Migration 002: Add gemini_api_key to users table
-- Run this in Supabase SQL Editor if you already applied schema.sql

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;

-- Policy: only the user can see their own key
CREATE POLICY IF NOT EXISTS "users_own_gemini_key"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Function to safely increment XP
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, amount INT)
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET xp = COALESCE(xp, 0) + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
