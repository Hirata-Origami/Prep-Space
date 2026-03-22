-- Migration 003: Add target_role and target_company to users table
-- Run this in the Supabase SQL Editor to support the Settings page inputs

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS target_role TEXT,
ADD COLUMN IF NOT EXISTS target_company TEXT;
