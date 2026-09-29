-- ============================================================
-- 005 — Email preferences
-- Run in the Supabase SQL editor. Safe to run more than once.
-- ============================================================

-- Lets people turn off the weekly digest and the daily tip. Report-ready emails are always sent.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_updates BOOLEAN NOT NULL DEFAULT TRUE;
