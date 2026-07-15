-- ============================================
-- MIGRATION: 31_medical_record_locking.sql
-- Add locking functionality to visits
-- ============================================

-- Add locking columns to visits table
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);

-- Create index for faster querying of locked status
CREATE INDEX IF NOT EXISTS idx_visits_is_locked ON visits(is_locked);
