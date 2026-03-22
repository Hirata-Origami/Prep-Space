-- 🚨 DANGER ZONE: This script will WIPE ALL DATA from your PrepSpace database.
-- Use this to completely reset your environment and test the new onboarding flow.

-- Disable foreign key checks to allow truncating tables with relationships
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE;';
    END LOOP;
END $$;

-- Optional: If you also want to delete all users from Supabase Auth so you can sign up again
-- Run this block (Note: this only works if you have permissions to the auth schema)
-- TRUNCATE auth.users CASCADE;
