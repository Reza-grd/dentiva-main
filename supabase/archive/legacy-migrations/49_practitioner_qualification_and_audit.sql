-- 49. Practitioner Qualification & SATUSEHAT Sync Audit Trail Schema

-- 1. Add practitioner qualification columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS practitioner_type TEXT DEFAULT 'dentist' CHECK (practitioner_type IN ('dentist', 'specialist', 'physician', 'nurse', 'other')),
ADD COLUMN IF NOT EXISTS qualification_code TEXT DEFAULT 'DDS';

-- 2. Add audit trail columns to satusehat_outbox table
ALTER TABLE public.satusehat_outbox 
ADD COLUMN IF NOT EXISTS triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS trigger_source TEXT DEFAULT 'manual_user' CHECK (trigger_source IN ('manual_user', 'auto_visit', 'outbox_processor', 'system_cron'));

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_satusehat_outbox_triggered_by ON public.satusehat_outbox(triggered_by);
