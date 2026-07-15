-- SUPABASE MIGRATION 25: CLINICAL DATA SAAS (VISITS, HISTORIES, ODONTOGRAM)
-- Target: Propagate clinic_id and enforce tenant boundaries on clinical records.

-- ==========================================
-- 1. ADD clinic_id TO CLINICAL TABLES
-- ==========================================
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.visits ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.visits ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.tooth_conditions ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.tooth_conditions ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.tooth_conditions ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.treatment_plans ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.treatment_plans ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.treatment_plans ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.medical_history ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.medical_history ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.medical_history ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.clinical_data ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.clinical_data ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.clinical_data ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.periodontal_data ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.periodontal_data ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.periodontal_data ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.extra_oral_data ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.extra_oral_data ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.extra_oral_data ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.intra_oral_data ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.intra_oral_data ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.intra_oral_data ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.odontogram_meta ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.odontogram_meta ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.odontogram_meta ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.medical_record_versions ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.medical_record_versions ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.medical_record_versions ALTER COLUMN clinic_id DROP DEFAULT;

-- ==========================================
-- 2. REWRITE RLS POLICIES FOR public.visits
-- ==========================================
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to visits" ON public.visits;
CREATE POLICY "Admins have full access to visits" ON public.visits 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff can view visits" ON public.visits;
CREATE POLICY "Staff can view visits" ON public.visits 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') 
    AND deleted_at IS NULL
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Resepsionis can modify visits" ON public.visits;
CREATE POLICY "Resepsionis can modify visits" ON public.visits 
  FOR INSERT 
  WITH CHECK (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Resepsionis can update visits" ON public.visits;
CREATE POLICY "Resepsionis can update visits" ON public.visits 
  FOR UPDATE 
  USING (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Dokter can update visits" ON public.visits;
CREATE POLICY "Dokter can update visits" ON public.visits 
  FOR UPDATE 
  USING (public.get_user_role() = 'dokter' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 3. REWRITE RLS FOR DIAGNOSTIC/EMR SUB-TABLES
-- ==========================================
-- Helper macro execution logic inside a DO block
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'tooth_conditions', 'treatment_plans', 'medical_history', 'clinical_data',
    'periodontal_data', 'extra_oral_data', 'intra_oral_data', 'odontogram_meta'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Admin_ALL" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Admin_ALL" ON public.%I FOR ALL USING (public.get_user_role() = ''admin'' AND clinic_id = public.get_user_clinic_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "Staff_SELECT" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Staff_SELECT" ON public.%I FOR SELECT USING (public.get_user_role() IN (''admin'', ''resepsionis'', ''dokter'') AND clinic_id = public.get_user_clinic_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "Dokter_INSERT" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Dokter_INSERT" ON public.%I FOR INSERT WITH CHECK (public.get_user_role() = ''dokter'' AND clinic_id = public.get_user_clinic_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "Dokter_UPDATE" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Dokter_UPDATE" ON public.%I FOR UPDATE USING (public.get_user_role() = ''dokter'' AND clinic_id = public.get_user_clinic_id())', t);
  END LOOP;
END $$;

-- Rewrite delete policies for sub-tables
DROP POLICY IF EXISTS "Dokter_DELETE" ON public.tooth_conditions;
CREATE POLICY "Dokter_DELETE" ON public.tooth_conditions FOR DELETE USING (public.get_user_role() = 'dokter' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Dokter_DELETE" ON public.treatment_plans;
CREATE POLICY "Dokter_DELETE" ON public.treatment_plans FOR DELETE USING (public.get_user_role() = 'dokter' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 4. REWRITE RLS FOR medical_record_versions
-- ==========================================
ALTER TABLE public.medical_record_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mrv_select" ON public.medical_record_versions;
CREATE POLICY "mrv_select" ON public.medical_record_versions 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );
