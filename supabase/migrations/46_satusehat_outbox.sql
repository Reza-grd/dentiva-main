-- 46. SatuSehat Outbox Queue & Retry Tracking Table
CREATE TABLE IF NOT EXISTS public.satusehat_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('Organization','Location','Practitioner','Patient','Encounter','Condition','Procedure','MedicationRequest','Composition')),
  related_visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
  related_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed_retryable','failed_permanent')),
  satusehat_resource_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient query processing
CREATE INDEX IF NOT EXISTS idx_outbox_status_retry ON public.satusehat_outbox(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_outbox_visit ON public.satusehat_outbox(related_visit_id);
CREATE INDEX IF NOT EXISTS idx_outbox_clinic ON public.satusehat_outbox(clinic_id);

-- Enable RLS
ALTER TABLE public.satusehat_outbox ENABLE ROW LEVEL SECURITY;

-- Policy: Clinic Isolation for Admin and Doctor roles
DROP POLICY IF EXISTS "Outbox_Clinic_Isolation" ON public.satusehat_outbox;
CREATE POLICY "Outbox_Clinic_Isolation" ON public.satusehat_outbox
  FOR ALL
  USING (
    clinic_id = public.get_user_clinic_id()
    AND public.get_user_role() IN ('admin', 'dokter')
  );
