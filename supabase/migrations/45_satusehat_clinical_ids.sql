-- 45. SatuSehat Clinical Resource IDs for Visits Table
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS satusehat_encounter_id TEXT;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS satusehat_composition_id TEXT;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS satusehat_resource_ids JSONB DEFAULT '{}'::jsonb;
