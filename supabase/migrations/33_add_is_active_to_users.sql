-- Migration: Add is_active to users table
ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update RLS or just let existing RLS work (since admins can read/update, but everyone reads).
-- The users table already has RLS, so adding a column is fine. We will rely on AuthContext 
-- to block sign-in for users with is_active = false.
