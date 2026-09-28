-- 48. Medical Record Retention & Data Subject Rights (UU PDP) Schema

-- 1. Insert default retention period setting into clinic_settings using WHERE NOT EXISTS
INSERT INTO public.clinic_settings (clinic_id, key, value)
SELECT c.id, 'retention_period_years', '5'
FROM public.clinics c
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinic_settings cs 
  WHERE cs.clinic_id = c.id AND cs.key = 'retention_period_years'
);

-- Optional: ensure unique constraint on (clinic_id, key) for future upserts if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clinic_settings_clinic_key_unique'
    ) THEN
        ALTER TABLE public.clinic_settings ADD CONSTRAINT clinic_settings_clinic_key_unique UNIQUE (clinic_id, key);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Create data_subject_requests table (PDP compliance)
CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'correction', 'deletion')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  handled_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_clinic ON public.data_subject_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_patient ON public.data_subject_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON public.data_subject_requests(status);

-- RLS Enforcement
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DataSubjectRequests_Clinic_Isolation" ON public.data_subject_requests;
CREATE POLICY "DataSubjectRequests_Clinic_Isolation" ON public.data_subject_requests
  FOR ALL
  USING (
    clinic_id = public.get_user_clinic_id()
    AND public.get_user_role() IN ('admin', 'dokter', 'resepsionis')
  );
