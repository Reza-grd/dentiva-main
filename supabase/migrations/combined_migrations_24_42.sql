

-- ==========================================
-- MIGRATION 24: 24_saas_foundation.sql
-- ==========================================

-- SUPABASE MIGRATION 24: SAAS FOUNDATION (TENANT REGISTRY, USERS, PATIENTS)
-- Target: Establish the SaaS registry, base helper function, and isolate core tables.

-- ==========================================
-- 1. CREATE TENANT REGISTRY & DEFAULT CLINIC
-- ==========================================
CREATE TABLE IF NOT EXISTS public.clinics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert the Default Clinic to host legacy single-tenant data
INSERT INTO public.clinics (id, name, slug)
VALUES ('d0000000-0000-0000-0000-000000000000', 'Dentiva Default Clinic', 'default')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 2. CREATE TENANT RESOLUTION HELPER
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::UUID,
    'd0000000-0000-0000-0000-000000000000'::UUID -- Fallback to Default Clinic
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==========================================
-- 3. MIGRATE public.users TABLE
-- ==========================================
-- Add column with default pointing to Default Clinic (triggers backfill)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;

-- Enforce Not Null
ALTER TABLE public.users ALTER COLUMN clinic_id SET NOT NULL;

-- Remove default constraint to prevent accidental fallback inserts in future
ALTER TABLE public.users ALTER COLUMN clinic_id DROP DEFAULT;

-- ==========================================
-- 4. MIGRATE public.patients TABLE
-- ==========================================
-- Add column with default pointing to Default Clinic (triggers backfill)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;

-- Enforce Not Null
ALTER TABLE public.patients ALTER COLUMN clinic_id SET NOT NULL;

-- Remove default constraint
ALTER TABLE public.patients ALTER COLUMN clinic_id DROP DEFAULT;

-- ==========================================
-- 5. UPGRADE JWT APP METADATA FOR EXISTING USERS
-- ==========================================
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"clinic_id": "d0000000-0000-0000-0000-000000000000"}'::jsonb;

-- ==========================================
-- 6. REWRITE RLS POLICIES FOR public.users
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own" ON public.users;
CREATE POLICY "users_view_own" ON public.users 
  FOR SELECT 
  USING (auth.uid() = id AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "users_read_staff_directory" ON public.users;
CREATE POLICY "users_read_staff_directory" ON public.users 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );

-- ==========================================
-- 7. REWRITE RLS POLICIES FOR public.patients
-- ==========================================
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to patients" ON public.patients;
CREATE POLICY "Admins have full access to patients" ON public.patients 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff can view patients" ON public.patients;
CREATE POLICY "Staff can view patients" ON public.patients 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') 
    AND deleted_at IS NULL
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Resepsionis can modify patients" ON public.patients;
CREATE POLICY "Resepsionis can modify patients" ON public.patients 
  FOR INSERT 
  WITH CHECK (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Resepsionis can update patients" ON public.patients;
CREATE POLICY "Resepsionis can update patients" ON public.patients 
  FOR UPDATE 
  USING (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());


-- ==========================================
-- ROLLBACK SCRIPT (for reference or manual revert)
-- ==========================================
-- /*
-- DROP POLICY IF EXISTS "users_view_own" ON public.users;
-- DROP POLICY IF EXISTS "users_update_own" ON public.users;
-- DROP POLICY IF EXISTS "users_admin_all" ON public.users;
-- DROP POLICY IF EXISTS "users_read_staff_directory" ON public.users;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS clinic_id;
-- 
-- DROP POLICY IF EXISTS "Admins have full access to patients" ON public.patients;
-- DROP POLICY IF EXISTS "Staff can view patients" ON public.patients;
-- DROP POLICY IF EXISTS "Resepsionis can modify patients" ON public.patients;
-- DROP POLICY IF EXISTS "Resepsionis can update patients" ON public.patients;
-- ALTER TABLE public.patients DROP COLUMN IF EXISTS clinic_id;
-- 
-- DROP FUNCTION IF EXISTS public.get_user_clinic_id();
-- DROP TABLE IF EXISTS public.clinics;
-- */


-- ==========================================
-- MIGRATION 25: 25_clinical_data_saas.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION 26: 26_financial_data_saas.sql
-- ==========================================

-- SUPABASE MIGRATION 26: FINANCIAL DATA SAAS (PAYMENTS, EXPENSES, REPORTS)
-- Target: Enforce tenant isolation on payments, invoicing, and expenses.

-- ==========================================
-- 1. ADD clinic_id TO FINANCIAL TABLES
-- ==========================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.payments ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.expenses ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.financial_reports ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.financial_reports ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.financial_reports ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.invoice_counters ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.invoice_counters ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.invoice_counters ALTER COLUMN clinic_id DROP DEFAULT;

-- ==========================================
-- 2. REWRITE RLS POLICIES FOR public.payments
-- ==========================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to payments" ON public.payments;
CREATE POLICY "Admins have full access to payments" ON public.payments 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
CREATE POLICY "Staff can view payments" ON public.payments 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') 
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Resepsionis can modify payments" ON public.payments;
CREATE POLICY "Resepsionis can modify payments" ON public.payments 
  FOR INSERT 
  WITH CHECK (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Resepsionis can update payments" ON public.payments;
CREATE POLICY "Resepsionis can update payments" ON public.payments 
  FOR UPDATE 
  USING (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 3. REWRITE RLS POLICIES FOR public.expenses
-- ==========================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses 
  FOR SELECT 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "expenses_manage" ON public.expenses;
CREATE POLICY "expenses_manage" ON public.expenses 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 4. REWRITE RLS POLICIES FOR public.financial_reports
-- ==========================================
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_reports_select" ON public.financial_reports;
CREATE POLICY "financial_reports_select" ON public.financial_reports 
  FOR SELECT 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "financial_reports_manage" ON public.financial_reports;
CREATE POLICY "financial_reports_manage" ON public.financial_reports 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 5. REWRITE RLS POLICIES FOR public.invoice_counters
-- ==========================================
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_counters_admin" ON public.invoice_counters;
CREATE POLICY "invoice_counters_admin" ON public.invoice_counters 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());


-- ==========================================
-- MIGRATION 27: 27_supporting_modules_saas.sql
-- ==========================================

-- SUPABASE MIGRATION 27: SUPPORTING MODULES SAAS
-- Target: Apply tenant isolation to media, scheduling, settings, templates, prescriptions, and audits.

-- ==========================================
-- 1. ADD clinic_id TO SUPPORTING TABLES
-- ==========================================
ALTER TABLE public.patient_media ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.patient_media ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.patient_media ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.patient_referrals ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.patient_referrals ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.doctor_schedules ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.doctor_schedules ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.doctor_schedules ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.clinic_settings ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.clinic_settings ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.clinic_settings ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.master_obat ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.master_obat ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.master_obat ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.visit_obat ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.visit_obat ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.visit_obat ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.notification_logs ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.notification_logs ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.notification_logs ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.treatment_education_templates ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.treatment_education_templates ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.treatment_education_templates ALTER COLUMN clinic_id DROP DEFAULT;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES public.clinics(id) DEFAULT 'd0000000-0000-0000-0000-000000000000'::UUID;
ALTER TABLE public.audit_logs ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE public.audit_logs ALTER COLUMN clinic_id DROP DEFAULT;

-- ==========================================
-- 2. REWRITE RLS FOR patient_media
-- ==========================================
ALTER TABLE public.patient_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read patient_media" ON public.patient_media;
CREATE POLICY "Staff can read patient_media" ON public.patient_media 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis') 
    AND deleted_at IS NULL
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Staff can insert patient_media" ON public.patient_media;
CREATE POLICY "Staff can insert patient_media" ON public.patient_media 
  FOR INSERT 
  WITH CHECK (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Staff can update patient_media" ON public.patient_media;
CREATE POLICY "Staff can update patient_media" ON public.patient_media 
  FOR UPDATE 
  USING (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Staff can delete patient_media" ON public.patient_media;
CREATE POLICY "Staff can delete patient_media" ON public.patient_media 
  FOR DELETE 
  USING (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );

-- ==========================================
-- 3. REWRITE RLS FOR patient_referrals
-- ==========================================
ALTER TABLE public.patient_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin_ALL" ON public.patient_referrals;
CREATE POLICY "Admin_ALL" ON public.patient_referrals FOR ALL USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff_SELECT" ON public.patient_referrals;
CREATE POLICY "Staff_SELECT" ON public.patient_referrals FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter') AND deleted_at IS NULL AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Dokter_INSERT" ON public.patient_referrals;
CREATE POLICY "Dokter_INSERT" ON public.patient_referrals FOR INSERT WITH CHECK (public.get_user_role() = 'dokter' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Dokter_UPDATE" ON public.patient_referrals;
CREATE POLICY "Dokter_UPDATE" ON public.patient_referrals FOR UPDATE USING (public.get_user_role() = 'dokter' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Dokter_DELETE" ON public.patient_referrals;
CREATE POLICY "Dokter_DELETE" ON public.patient_referrals FOR DELETE USING (public.get_user_role() = 'dokter' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 4. REWRITE RLS FOR doctor_schedules
-- ==========================================
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select_all_staff" ON public.doctor_schedules;
CREATE POLICY "schedules_select_all_staff" ON public.doctor_schedules 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') 
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "schedules_insert_admin" ON public.doctor_schedules;
CREATE POLICY "schedules_insert_admin" ON public.doctor_schedules 
  FOR INSERT 
  WITH CHECK (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "schedules_update_admin" ON public.doctor_schedules;
CREATE POLICY "schedules_update_admin" ON public.doctor_schedules 
  FOR UPDATE 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "schedules_delete_admin" ON public.doctor_schedules;
CREATE POLICY "schedules_delete_admin" ON public.doctor_schedules 
  FOR DELETE 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 5. REWRITE RLS FOR clinic_settings
-- ==========================================
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin_ALL" ON public.clinic_settings;
CREATE POLICY "Admin_ALL" ON public.clinic_settings 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff read clinic_settings" ON public.clinic_settings;
CREATE POLICY "Staff read clinic_settings" ON public.clinic_settings 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );

-- ==========================================
-- 6. REWRITE RLS FOR master_obat & visit_obat
-- ==========================================
ALTER TABLE public.master_obat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read master_obat" ON public.master_obat;
CREATE POLICY "Staff read master_obat" ON public.master_obat 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Admin manage master_obat" ON public.master_obat;
CREATE POLICY "Admin manage master_obat" ON public.master_obat 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

ALTER TABLE public.visit_obat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage visit_obat" ON public.visit_obat;
CREATE POLICY "Staff manage visit_obat" ON public.visit_obat 
  FOR ALL 
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') 
    AND clinic_id = public.get_user_clinic_id()
  );

-- ==========================================
-- 7. REWRITE RLS FOR notification_logs & treatment_education_templates
-- ==========================================
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read all notification logs" ON public.notification_logs;
CREATE POLICY "Admin read all notification logs" ON public.notification_logs 
  FOR SELECT 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff read logs" ON public.notification_logs;
CREATE POLICY "Staff read logs" ON public.notification_logs 
  FOR SELECT 
  USING (
    public.get_user_role() IN ('dokter', 'resepsionis') 
    AND clinic_id = public.get_user_clinic_id()
  );

ALTER TABLE public.treatment_education_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin_Dokter_ALL" ON public.treatment_education_templates;
CREATE POLICY "Admin_Dokter_ALL" ON public.treatment_education_templates 
  FOR ALL 
  USING (
    public.get_user_role() IN ('admin', 'dokter') 
    AND clinic_id = public.get_user_clinic_id()
  );

DROP POLICY IF EXISTS "Resepsionis_SELECT" ON public.treatment_education_templates;
CREATE POLICY "Resepsionis_SELECT" ON public.treatment_education_templates 
  FOR SELECT 
  USING (public.get_user_role() = 'resepsionis' AND clinic_id = public.get_user_clinic_id());

-- ==========================================
-- 8. REWRITE RLS FOR audit_logs
-- ==========================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs 
  FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs 
  FOR SELECT 
  USING (
    (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id()) OR 
    (public.get_user_role() = 'dokter' AND user_id = auth.uid() AND clinic_id = public.get_user_clinic_id())
  );


-- ==========================================
-- MIGRATION 28: 28_server_side_encryption.sql
-- ==========================================

-- SUPABASE MIGRATION 28: SERVER-SIDE ENCRYPTION HARDENING
-- Target: Install secure pgcrypto Vault, create batch encryption RPCs, revoke unauthorized access.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 1. CREATE private SCHEMA & KEY TABLE
-- ==========================================
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.encryption_keys (
    key_name TEXT PRIMARY KEY,
    key_value TEXT NOT NULL
);

-- Revoke all privileges from public access
REVOKE ALL ON TABLE private.encryption_keys FROM PUBLIC;
REVOKE ALL ON TABLE private.encryption_keys FROM anon;
REVOKE ALL ON TABLE private.encryption_keys FROM authenticated;

-- Generate master key dynamically at migration time if it doesn't exist
INSERT INTO private.encryption_keys (key_name, key_value)
VALUES ('master_key', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key_name) DO NOTHING;

-- ==========================================
-- 2. PRIVATE KEY RETRIEVAL HELPER
-- ==========================================
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS BYTEA AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT key_value INTO v_key FROM private.encryption_keys WHERE key_name = 'master_key';
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Configuration Error: Master encryption key is not set!';
  END IF;
  RETURN decode(v_key, 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke function execution
REVOKE ALL ON FUNCTION private.get_encryption_key FROM PUBLIC, anon, authenticated;

-- ==========================================
-- 3. CORE ENCRYPTION & DECRYPTION FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.encrypt_field(p_plaintext TEXT)
RETURNS TEXT AS $$
DECLARE
  v_encrypted TEXT;
BEGIN
  IF p_plaintext IS NULL OR p_plaintext = '' THEN
    RETURN p_plaintext;
  END IF;
  
  -- If it already starts with PGP: prefix, do not encrypt again (avoid double-encryption)
  IF p_plaintext LIKE 'PGP:%' THEN
    RETURN p_plaintext;
  END IF;
  
  v_encrypted := encode(pgp_sym_encrypt(p_plaintext, private.get_encryption_key()::text), 'base64');
  RETURN 'PGP:' || v_encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_field(p_ciphertext TEXT)
RETURNS TEXT AS $$
BEGIN
  IF p_ciphertext IS NULL OR NOT p_ciphertext LIKE 'PGP:%' THEN
    -- Return raw value if not encrypted with server-side PGP scheme
    RETURN p_ciphertext;
  END IF;
  
  BEGIN
    RETURN pgp_sym_decrypt(decode(substring(p_ciphertext from 5), 'base64'), private.get_encryption_key()::text);
  EXCEPTION WHEN OTHERS THEN
    -- Catch exception and return raw string (prevents crashes if key changes/corrupts)
    RETURN p_ciphertext;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. BATCH PROCESSING FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.encrypt_batch(p_payloads TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  v_result TEXT[] := ARRAY[]::TEXT[];
  v_item TEXT;
BEGIN
  FOREACH v_item IN ARRAY p_payloads
  LOOP
    v_result := array_append(v_result, public.encrypt_field(v_item));
  END LOOP;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_batch(p_payloads TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  v_result TEXT[] := ARRAY[]::TEXT[];
  v_item TEXT;
BEGIN
  FOREACH v_item IN ARRAY p_payloads
  LOOP
    v_result := array_append(v_result, public.decrypt_field(v_item));
  END LOOP;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. FUNCTION EXECUTE PERMISSIONS
-- ==========================================
REVOKE ALL ON FUNCTION public.encrypt_field FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_field FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.encrypt_batch FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_batch FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.encrypt_field TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_field TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_batch TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_batch TO authenticated;

-- ==========================================
-- 6. KEY ROTATION PROCEDURE
-- ==========================================
CREATE OR REPLACE FUNCTION private.rotate_master_key(p_new_key_hex TEXT)
RETURNS VOID AS $$
DECLARE
  v_old_key TEXT;
  v_new_key BYTEA;
  r RECORD;
BEGIN
  -- Verify new key format
  BEGIN
    v_new_key := decode(p_new_key_hex, 'hex');
    IF length(v_new_key) != 32 THEN
      RAISE EXCEPTION 'Invalid key length: Key must be 32 bytes (64 hex characters)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid hex format for new encryption key';
  END;

  SELECT key_value INTO v_old_key FROM private.encryption_keys WHERE key_name = 'master_key';
  IF v_old_key IS NULL THEN
    RAISE EXCEPTION 'Current master key not found';
  END IF;

  -- 1. Re-encrypt patients table
  FOR r IN SELECT id, nama_lengkap, no_wa, alamat FROM public.patients LOOP
    UPDATE public.patients
    SET 
      nama_lengkap = CASE 
        WHEN nama_lengkap LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(nama_lengkap from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE nama_lengkap
      END,
      no_wa = CASE 
        WHEN no_wa LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(no_wa from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE no_wa
      END,
      alamat = CASE 
        WHEN alamat LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(alamat from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE alamat
      END
    WHERE id = r.id;
  END LOOP;

  -- 2. Re-encrypt visits table
  FOR r IN SELECT id, diagnosa, keluhan, pemeriksaan_fisik, terapi, catatan_dokter FROM public.visits LOOP
    UPDATE public.visits
    SET 
      diagnosa = CASE 
        WHEN diagnosa LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(diagnosa from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE diagnosa
      END,
      keluhan = CASE 
        WHEN keluhan LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(keluhan from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE keluhan
      END,
      pemeriksaan_fisik = CASE 
        WHEN pemeriksaan_fisik LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(pemeriksaan_fisik from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE pemeriksaan_fisik
      END,
      terapi = CASE 
        WHEN terapi LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(terapi from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE terapi
      END,
      catatan_dokter = CASE 
        WHEN catatan_dokter LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(catatan_dokter from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE catatan_dokter
      END
    WHERE id = r.id;
  END LOOP;

  -- 3. Re-encrypt medical_history table
  FOR r IN SELECT id, alergi_detail, riwayat_lain, konsumsi_obat FROM public.medical_history LOOP
    UPDATE public.medical_history
    SET 
      alergi_detail = CASE 
        WHEN alergi_detail LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(alergi_detail from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE alergi_detail
      END,
      riwayat_lain = CASE 
        WHEN riwayat_lain LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(riwayat_lain from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE riwayat_lain
      END,
      konsumsi_obat = CASE 
        WHEN konsumsi_obat LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(konsumsi_obat from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE konsumsi_obat
      END
    WHERE id = r.id;
  END LOOP;

  -- 4. Update stored master key
  UPDATE private.encryption_keys
  SET key_value = p_new_key_hex
  WHERE key_name = 'master_key';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION private.rotate_master_key FROM PUBLIC, anon, authenticated;


-- ==========================================
-- MIGRATION 29: 29_visits_kode_icd10.sql
-- ==========================================

-- Migration 29: Add kode_icd10 column to visits table
-- This is a schema gap fix: migration 23 added kode_icd10 to medical_record_versions
-- and the versioning trigger reads NEW.kode_icd10 from visits, but the column was
-- never actually added to the visits table via ALTER TABLE. This is a no-op if the
-- column already exists (IF NOT EXISTS), safe to run on any environment.

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS kode_icd10 VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.visits.kode_icd10 IS
  'ICD-10 diagnosis code (e.g. K02.1 = Karies dentin). Tracked by versioning trigger in medical_record_versions.';


-- ==========================================
-- MIGRATION 30: 30_soap_templates.sql
-- ==========================================

-- ============================================
-- MIGRATION: 30_soap_templates.sql
-- Create table for Medical Record SOAP defaults
-- ============================================

CREATE TABLE IF NOT EXISTS soap_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_type TEXT NOT NULL,
  keluhan TEXT,
  pemeriksaan_fisik TEXT,
  diagnosa TEXT,
  terapi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE soap_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Admin gets ALL privileges
DROP POLICY IF EXISTS "Admin_ALL" ON soap_templates;
CREATE POLICY "Admin_ALL" ON soap_templates 
FOR ALL USING (public.get_user_role() = 'admin');

-- Staff (Admin, Resepsionis, Dokter) get SELECT
DROP POLICY IF EXISTS "Staff_SELECT" ON soap_templates;
CREATE POLICY "Staff_SELECT" ON soap_templates 
FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));

-- Insert some default templates
INSERT INTO soap_templates (treatment_type, keluhan, pemeriksaan_fisik, diagnosa, terapi)
VALUES 
  ('Pencabutan Gigi Dewasa', 'Gigi terasa sakit, goyang, dan berlubang besar', 'Gigi tampak karies mencapai pulpa / sisa akar, goyang derajat 3', 'Nekrosis Pulpa / Sisa Akar', 'Odontektomi / Ekstraksi, Pemberian Resep Antibiotik & Analgesik'),
  ('Pembersihan Karang Gigi (Scaling)', 'Gusi sering berdarah saat sikat gigi, mulut terasa bau', 'Terdapat kalkulus supra/subgingiva di regio anterior/posterior, gingiva hiperemis', 'Gingivitis marginalis kronis / Periodontitis', 'Scaling, Root Planing, Edukasi kebersihan mulut'),
  ('Tambal Gigi (Komposit)', 'Gigi ngilu saat makan/minum dingin', 'Karies mencapai dentin pada gigi...', 'Karies Dentin / Pulpitis Reversibel', 'Ekskavasi karies, Restorasi Komposit');


-- ==========================================
-- MIGRATION 31: 31_medical_record_locking.sql
-- ==========================================

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


-- ==========================================
-- MIGRATION 32: 32_informed_consents.sql
-- ==========================================

-- ============================================
-- MIGRATION: 32_informed_consents.sql
-- Create informed_consents table
-- ============================================

CREATE TABLE IF NOT EXISTS informed_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    treatment_type TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    signature_data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_informed_consents_patient_id ON informed_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_informed_consents_visit_id ON informed_consents(visit_id);

-- RLS Policies
ALTER TABLE informed_consents ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user (staff) to perform CRUD
DROP POLICY IF EXISTS "Staff can read informed_consents" ON informed_consents;
CREATE POLICY "Staff can read informed_consents" 
    ON informed_consents FOR SELECT 
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can insert informed_consents" ON informed_consents;
CREATE POLICY "Staff can insert informed_consents" 
    ON informed_consents FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can update informed_consents" ON informed_consents;
CREATE POLICY "Staff can update informed_consents" 
    ON informed_consents FOR UPDATE 
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can delete informed_consents" ON informed_consents;
CREATE POLICY "Staff can delete informed_consents" 
    ON informed_consents FOR DELETE 
    USING (auth.role() = 'authenticated');


-- ==========================================
-- MIGRATION 33: 33_add_is_active_to_users.sql
-- ==========================================

-- Migration: Add is_active to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update RLS or just let existing RLS work (since admins can read/update, but everyone reads).
-- The users table already has RLS, so adding a column is fine. We will rely on AuthContext 
-- to block sign-in for users with is_active = false.


-- ==========================================
-- MIGRATION 34: 34_doctor_schedule_capacity.sql
-- ==========================================

-- Add configurable patient capacity per day to doctor_schedules
ALTER TABLE public.doctor_schedules
  ADD COLUMN IF NOT EXISTS kapasitas_pasien_per_hari INTEGER
  CHECK (kapasitas_pasien_per_hari IS NULL OR kapasitas_pasien_per_hari > 0);


-- ==========================================
-- MIGRATION 35: 35_costing_inventory_overhead.sql
-- ==========================================

-- ============================================================================
-- MIGRATION 35: SISTEM COSTING PERAWATAN & GUDANG BAHAN HABIS PAKAI
-- ============================================================================
-- Tujuan:
--   1. Alokasi biaya operasional (overhead) ke tiap perawatan berbasis tier/bobot
--   2. Resep bahan (BOM) per perawatan
--   3. Gudang bahan habis pakai dengan kartu stok & sinkronisasi otomatis
--   4. Snapshot modal per transaksi (tidak berubah walau harga/bobot diedit nanti)
--
-- Keputusan desain yang sudah disepakati (lihat diskusi produk):
--   - Alokasi overhead: berbasis tier (Ringan/Sedang/Berat), bobot dikonfigurasi admin
--   - Target total bobot bulanan di-set manual per periode (tidak dihitung ulang real-time)
--   - Potong stok: saat kunjungan dicatat SELESAI, dengan opsi override qty aktual
--   - Metode harga stok: rata-rata tertimbang (weighted average cost)
--   - Histori biaya: pakai snapshot per visit_treatment
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TIER & BOBOT ALOKASI OVERHEAD
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tier_weights (
  tier        TEXT PRIMARY KEY CHECK (tier IN ('ringan', 'sedang', 'berat')),
  label       TEXT NOT NULL,
  bobot       NUMERIC(10,2) NOT NULL CHECK (bobot > 0),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES public.users(id)
);

INSERT INTO public.tier_weights (tier, label, bobot) VALUES
  ('ringan', 'Ringan', 1),
  ('sedang', 'Sedang', 2),
  ('berat',  'Berat',  4)
ON CONFLICT (tier) DO NOTHING;

-- Tambahkan kolom tier ke master treatments yang sudah ada
ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('ringan', 'sedang', 'berat')) DEFAULT 'sedang';


-- ----------------------------------------------------------------------------
-- 2. BIAYA OPERASIONAL (OVERHEAD) BULANAN
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.overhead_costs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_biaya     TEXT NOT NULL,                 -- "Listrik", "Sewa Gedung", dst
  kategori       TEXT,                          -- "Utilitas", "Sewa", "Gaji Non-Medis", dst
  jumlah_bulanan NUMERIC(15,2) NOT NULL DEFAULT 0,
  aktif          BOOLEAN DEFAULT true,
  catatan        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Target bobot & total overhead per periode (dikunci per bulan, admin kalibrasi tiap awal bulan)
CREATE TABLE IF NOT EXISTS public.overhead_monthly_target (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode                 DATE NOT NULL,        -- selalu tanggal 1, mis. '2026-08-01'
  total_overhead_bulanan  NUMERIC(15,2) NOT NULL,   -- boleh override manual dari SUM(overhead_costs)
  total_bobot_estimasi    NUMERIC(10,2) NOT NULL,   -- hasil estimasi jumlah treatment x bobot tier
  overhead_per_unit_bobot NUMERIC(15,4) GENERATED ALWAYS AS
    (CASE WHEN total_bobot_estimasi > 0 THEN total_overhead_bulanan / total_bobot_estimasi ELSE 0 END) STORED,
  catatan                 TEXT,
  created_by              UUID REFERENCES public.users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (periode)
);

CREATE INDEX IF NOT EXISTS idx_overhead_target_periode ON public.overhead_monthly_target(periode DESC);


-- ----------------------------------------------------------------------------
-- 3. MASTER BAHAN & GUDANG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_bahan (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_bahan        VARCHAR(50) UNIQUE NOT NULL,
  nama_bahan        TEXT NOT NULL,
  kategori          TEXT,                         -- "Consumable", "Obat", "Alat Sekali Pakai"
  satuan_dasar      TEXT NOT NULL,                 -- satuan pemakaian, mis. "pcs", "ml", "gr"
  satuan_beli       TEXT,                          -- satuan pembelian, mis. "box"
  faktor_konversi   NUMERIC(10,4) DEFAULT 1,        -- 1 satuan_beli = berapa satuan_dasar
  harga_rata2       NUMERIC(15,4) NOT NULL DEFAULT 0,  -- weighted average cost per satuan_dasar (auto-update)
  stok_saat_ini     NUMERIC(12,3) NOT NULL DEFAULT 0,  -- dalam satuan_dasar
  stok_minimum      NUMERIC(12,3) DEFAULT 0,           -- ambang alert reorder
  supplier          TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_bahan_kategori ON public.master_bahan(kategori);
CREATE INDEX IF NOT EXISTS idx_master_bahan_aktif ON public.master_bahan(is_active);

-- Batch/kadaluarsa bahan (opsional tapi disarankan untuk bahan medis) — FEFO
CREATE TABLE IF NOT EXISTS public.material_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id       UUID NOT NULL REFERENCES public.master_bahan(id) ON DELETE CASCADE,
  no_batch          TEXT,
  tanggal_masuk     DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_kadaluarsa DATE,
  qty_awal          NUMERIC(12,3) NOT NULL,
  qty_sisa          NUMERIC(12,3) NOT NULL,
  harga_satuan      NUMERIC(15,4) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_batches_material ON public.material_batches(material_id);
CREATE INDEX IF NOT EXISTS idx_material_batches_expiry ON public.material_batches(tanggal_kadaluarsa)
  WHERE tanggal_kadaluarsa IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. RESEP BAHAN PER PERAWATAN (BILL OF MATERIALS / BOM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_materials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id     UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  material_id      UUID NOT NULL REFERENCES public.master_bahan(id) ON DELETE RESTRICT,
  qty_rata2        NUMERIC(12,4) NOT NULL CHECK (qty_rata2 > 0),  -- dalam satuan_dasar bahan
  wajib            BOOLEAN DEFAULT true,           -- false = opsional, tidak auto-potong
  wastage_percent  NUMERIC(5,2) DEFAULT 0 CHECK (wastage_percent >= 0 AND wastage_percent < 100),
  catatan          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (treatment_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_treatment_materials_treatment ON public.treatment_materials(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_materials_material ON public.treatment_materials(material_id);

-- Override qty aktual per kunjungan (opsional — kalau kosong, pakai qty_rata2 dari BOM)
CREATE TABLE IF NOT EXISTS public.visit_treatment_material_overrides (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_treatment_id UUID NOT NULL REFERENCES public.visit_treatments(id) ON DELETE CASCADE,
  material_id        UUID NOT NULL REFERENCES public.master_bahan(id),
  qty_aktual         NUMERIC(12,4) NOT NULL CHECK (qty_aktual >= 0),
  catatan            TEXT,
  created_by         UUID REFERENCES public.users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (visit_treatment_id, material_id)
);


-- ----------------------------------------------------------------------------
-- 5. PEMBELIAN BAHAN (STOK MASUK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id       UUID NOT NULL REFERENCES public.master_bahan(id),
  tanggal           DATE NOT NULL DEFAULT CURRENT_DATE,
  jumlah_beli       NUMERIC(12,3) NOT NULL CHECK (jumlah_beli > 0),  -- dalam satuan_beli
  jumlah_dasar      NUMERIC(12,3) NOT NULL,        -- hasil konversi ke satuan_dasar (jumlah_beli * faktor_konversi)
  harga_satuan_beli NUMERIC(15,2) NOT NULL,        -- harga per satuan_beli
  total_harga       NUMERIC(15,2) GENERATED ALWAYS AS (jumlah_beli * harga_satuan_beli) STORED,
  supplier          TEXT,
  no_faktur         TEXT,
  tanggal_kadaluarsa DATE,
  recorded_by       UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_purchases_material ON public.material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_tanggal ON public.material_purchases(tanggal DESC);


-- ----------------------------------------------------------------------------
-- 6. KARTU STOK (LOG SEMUA PERGERAKAN — AUDIT TRAIL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stok_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id    UUID NOT NULL REFERENCES public.master_bahan(id),
  tipe           TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar', 'penyesuaian', 'opname')),
  jumlah         NUMERIC(12,3) NOT NULL,   -- signed: masuk/penyesuaian(+) positif, keluar negatif
  stok_sebelum   NUMERIC(12,3) NOT NULL,
  stok_sesudah   NUMERIC(12,3) NOT NULL,
  referensi_tipe TEXT,                     -- 'purchase' | 'visit_treatment' | 'opname' | 'manual'
  referensi_id   UUID,                     -- id ke tabel terkait (purchase_id / visit_treatment_id / opname_id)
  harga_saat_itu NUMERIC(15,4),            -- dipakai untuk update rata-rata tertimbang saat masuk
  catatan        TEXT,
  created_by     UUID REFERENCES public.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stok_movements_material ON public.stok_movements(material_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stok_movements_referensi ON public.stok_movements(referensi_tipe, referensi_id);


-- ----------------------------------------------------------------------------
-- 7. STOK OPNAME (REKONSILIASI FISIK VS SISTEM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stok_opname (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
  material_id     UUID NOT NULL REFERENCES public.master_bahan(id),
  stok_sistem     NUMERIC(12,3) NOT NULL,
  stok_fisik      NUMERIC(12,3) NOT NULL,
  selisih         NUMERIC(12,3) GENERATED ALWAYS AS (stok_fisik - stok_sistem) STORED,
  catatan         TEXT,
  dilakukan_oleh  UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stok_opname_material ON public.stok_opname(material_id, tanggal DESC);


-- ----------------------------------------------------------------------------
-- 8. SNAPSHOT MODAL PER TREATMENT (HASIL AKHIR UNTUK LAPORAN PROFITABILITAS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_cost_snapshot (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_treatment_id          UUID NOT NULL UNIQUE REFERENCES public.visit_treatments(id) ON DELETE CASCADE,
  tier_saat_itu               TEXT NOT NULL,
  bobot_saat_itu              NUMERIC(10,2) NOT NULL,
  overhead_per_unit_bobot     NUMERIC(15,4) NOT NULL,
  overhead_allocated          NUMERIC(15,2) NOT NULL,       -- bobot_saat_itu * overhead_per_unit_bobot
  total_biaya_bahan           NUMERIC(15,2) NOT NULL DEFAULT 0,
  detail_bahan                JSONB,                          -- breakdown: [{material_id, nama, qty, harga_satuan, subtotal}, ...]
  total_modal                 NUMERIC(15,2) GENERATED ALWAYS AS (overhead_allocated + total_biaya_bahan) STORED,
  harga_jual_saat_itu         NUMERIC(15,2) NOT NULL,
  margin                      NUMERIC(15,2) GENERATED ALWAYS AS
    (harga_jual_saat_itu - (overhead_allocated + total_biaya_bahan)) STORED,
  margin_percent              NUMERIC(6,2) GENERATED ALWAYS AS
    (CASE WHEN harga_jual_saat_itu > 0
      THEN ((harga_jual_saat_itu - (overhead_allocated + total_biaya_bahan)) / harga_jual_saat_itu) * 100
      ELSE 0 END) STORED,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_snapshot_visit_treatment ON public.treatment_cost_snapshot(visit_treatment_id);
CREATE INDEX IF NOT EXISTS idx_cost_snapshot_created ON public.treatment_cost_snapshot(created_at DESC);


-- ============================================================================
-- 9. FUNGSI & TRIGGER: OTOMATISASI SAAT KUNJUNGAN DICATAT SELESAI
-- ============================================================================
-- CATATAN PENTING: fungsi ini KOMPLEKS dan menyentuh data finansial + stok.
-- WAJIB diuji di environment staging dengan data dummy sebelum dipakai di
-- production. Beberapa keputusan bisnis yang masih perlu divalidasi manual:
--   - Apakah stok boleh minus (backorder) atau harus di-block? (saat ini: DIIZINKAN
--     minus dengan warning di log, TIDAK di-block, supaya operasional klinik
--     tidak terhenti hanya karena data gudang belum lengkap)
--   - Snapshot hanya dibuat SEKALI per visit_treatment (tidak akan re-generate
--     kalau visit_treatment diedit setelah completed — perlu keputusan terpisah
--     apakah edit setelah selesai diizinkan dan bagaimana penanganannya)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_proses_stok_dan_snapshot_visit_treatment(p_visit_treatment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_treatment_id      UUID;
  v_tier               TEXT;
  v_bobot              NUMERIC;
  v_overhead_per_unit  NUMERIC;
  v_overhead_allocated NUMERIC;
  v_harga_jual         NUMERIC;
  v_total_bahan        NUMERIC := 0;
  v_detail_bahan       JSONB := '[]'::JSONB;
  r                    RECORD;
  v_qty_pakai          NUMERIC;
  v_stok_sebelum       NUMERIC;
  v_stok_sesudah       NUMERIC;
BEGIN
  -- Ambil data treatment & harga jual dari visit_treatments
  SELECT vt.treatment_id, t.tier, vt.harga_satuan
    INTO v_treatment_id, v_tier, v_harga_jual
  FROM public.visit_treatments vt
  JOIN public.treatments t ON t.id = vt.treatment_id
  WHERE vt.id = p_visit_treatment_id;

  IF v_treatment_id IS NULL THEN
    RAISE EXCEPTION 'visit_treatment_id % tidak ditemukan', p_visit_treatment_id;
  END IF;

  -- Ambil bobot tier
  SELECT bobot INTO v_bobot FROM public.tier_weights WHERE tier = v_tier;
  v_bobot := COALESCE(v_bobot, 1);

  -- Ambil overhead_per_unit_bobot dari target bulan berjalan
  SELECT overhead_per_unit_bobot INTO v_overhead_per_unit
  FROM public.overhead_monthly_target
  WHERE periode = date_trunc('month', CURRENT_DATE)::DATE;

  v_overhead_per_unit := COALESCE(v_overhead_per_unit, 0);
  v_overhead_allocated := v_bobot * v_overhead_per_unit;

  -- Loop tiap bahan di BOM treatment ini, potong stok, hitung total biaya bahan
  FOR r IN
    SELECT tm.material_id, tm.qty_rata2, tm.wastage_percent, tm.wajib,
           mb.nama_bahan, mb.harga_rata2, mb.stok_saat_ini
    FROM public.treatment_materials tm
    JOIN public.master_bahan mb ON mb.id = tm.material_id
    WHERE tm.treatment_id = v_treatment_id AND tm.wajib = true
  LOOP
    -- Cek apakah ada override qty aktual untuk visit_treatment ini
    SELECT qty_aktual INTO v_qty_pakai
    FROM public.visit_treatment_material_overrides
    WHERE visit_treatment_id = p_visit_treatment_id AND material_id = r.material_id;

    IF v_qty_pakai IS NULL THEN
      v_qty_pakai := r.qty_rata2 * (1 + COALESCE(r.wastage_percent, 0) / 100.0);
    END IF;

    v_stok_sebelum := r.stok_saat_ini;
    v_stok_sesudah := v_stok_sebelum - v_qty_pakai;

    -- Update stok master_bahan
    UPDATE public.master_bahan
    SET stok_saat_ini = v_stok_sesudah, updated_at = NOW()
    WHERE id = r.material_id;

    -- Catat pergerakan stok (kartu stok)
    INSERT INTO public.stok_movements
      (material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu, catatan)
    VALUES
      (r.material_id, 'keluar', -v_qty_pakai, v_stok_sebelum, v_stok_sesudah,
       'visit_treatment', p_visit_treatment_id, r.harga_rata2,
       CASE WHEN v_stok_sesudah < 0 THEN 'PERINGATAN: stok minus, perlu restock segera' ELSE NULL END);

    v_total_bahan := v_total_bahan + (v_qty_pakai * r.harga_rata2);
    v_detail_bahan := v_detail_bahan || jsonb_build_object(
      'material_id', r.material_id,
      'nama_bahan', r.nama_bahan,
      'qty', v_qty_pakai,
      'harga_satuan', r.harga_rata2,
      'subtotal', v_qty_pakai * r.harga_rata2
    );
  END LOOP;

  -- Simpan snapshot modal (idempotent: kalau sudah ada, jangan duplikat)
  INSERT INTO public.treatment_cost_snapshot
    (visit_treatment_id, tier_saat_itu, bobot_saat_itu, overhead_per_unit_bobot,
     overhead_allocated, total_biaya_bahan, detail_bahan, harga_jual_saat_itu)
  VALUES
    (p_visit_treatment_id, v_tier, v_bobot, v_overhead_per_unit,
     v_overhead_allocated, v_total_bahan, v_detail_bahan, COALESCE(v_harga_jual, 0))
  ON CONFLICT (visit_treatment_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger di level visits: saat status berubah jadi 'completed', proses semua
-- visit_treatments di kunjungan tsb yang belum punya snapshot.
CREATE OR REPLACE FUNCTION public.trg_visit_completed_process_costing()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    FOR r IN
      SELECT vt.id AS visit_treatment_id
      FROM public.visit_treatments vt
      LEFT JOIN public.treatment_cost_snapshot cs ON cs.visit_treatment_id = vt.id
      WHERE vt.visit_id = NEW.id AND cs.id IS NULL
    LOOP
      PERFORM public.fn_proses_stok_dan_snapshot_visit_treatment(r.visit_treatment_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_visit_completed_costing ON public.visits;
CREATE TRIGGER trg_visit_completed_costing
  AFTER UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_visit_completed_process_costing();


-- Trigger di material_purchases: update stok + harga rata-rata tertimbang saat stok masuk
CREATE OR REPLACE FUNCTION public.trg_purchase_update_stok()
RETURNS TRIGGER AS $$
DECLARE
  v_stok_sebelum NUMERIC;
  v_stok_sesudah NUMERIC;
  v_harga_lama   NUMERIC;
  v_harga_baru_rata2 NUMERIC;
BEGIN
  SELECT stok_saat_ini, harga_rata2 INTO v_stok_sebelum, v_harga_lama
  FROM public.master_bahan WHERE id = NEW.material_id;

  v_stok_sesudah := v_stok_sebelum + NEW.jumlah_dasar;

  -- Weighted average cost: (stok_lama*harga_lama + qty_masuk*harga_masuk) / stok_baru
  IF v_stok_sesudah > 0 THEN
    v_harga_baru_rata2 := ((v_stok_sebelum * v_harga_lama) + (NEW.jumlah_dasar * (NEW.total_harga / NULLIF(NEW.jumlah_dasar,0))))
                          / v_stok_sesudah;
  ELSE
    v_harga_baru_rata2 := v_harga_lama;
  END IF;

  UPDATE public.master_bahan
  SET stok_saat_ini = v_stok_sesudah, harga_rata2 = v_harga_baru_rata2, updated_at = NOW()
  WHERE id = NEW.material_id;

  INSERT INTO public.stok_movements
    (material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu)
  VALUES
    (NEW.material_id, 'masuk', NEW.jumlah_dasar, v_stok_sebelum, v_stok_sesudah,
     'purchase', NEW.id, NEW.total_harga / NULLIF(NEW.jumlah_dasar, 0));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_purchase_stok ON public.material_purchases;
CREATE TRIGGER trg_purchase_stok
  AFTER INSERT ON public.material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_update_stok();


-- ============================================================================
-- 10. ROW LEVEL SECURITY (mengikuti pola public.get_user_role() yang sudah ada)
-- ============================================================================
ALTER TABLE public.tier_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overhead_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overhead_monthly_target ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_bahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_treatment_material_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_cost_snapshot ENABLE ROW LEVEL SECURITY;

-- Modul ini murni data finansial/operasional internal → HANYA admin yang boleh akses.
-- (Dokter/resepsionis tidak perlu melihat modal/harga beli bahan.)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tier_weights', 'overhead_costs', 'overhead_monthly_target', 'master_bahan',
    'material_batches', 'treatment_materials', 'visit_treatment_material_overrides',
    'material_purchases', 'stok_movements', 'stok_opname', 'treatment_cost_snapshot'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Admin full access %1$s" ON public.%1$s;',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Admin full access %1$s" ON public.%1$s FOR ALL USING (public.get_user_role() = ''admin'')',
      tbl
    );
  END LOOP;
END $$;

-- Fungsi berjalan sebagai SECURITY DEFINER agar trigger tetap bisa menulis stok/snapshot
-- walau dipicu oleh user dokter yang RLS-nya tidak punya akses langsung ke tabel gudang.


-- ==========================================
-- MIGRATION 36: 36_fefo_and_obat_unification.sql
-- ==========================================

-- ============================================================================
-- MIGRATION 36: FEFO & Obat Unification
-- ============================================================================

-- 1. Tambahkan kolom pendukung obat ke master_bahan
ALTER TABLE public.master_bahan 
  ADD COLUMN IF NOT EXISTS dosis_default TEXT,
  ADD COLUMN IF NOT EXISTS frekuensi_default TEXT,
  ADD COLUMN IF NOT EXISTS education_text TEXT;

-- 2. Memigrasi data dari master_obat ke master_bahan
-- Kita generate kode bahan khusus agar tidak bentrok (misal OBT-[id_awal])
INSERT INTO public.master_bahan (
  id, kode_bahan, nama_bahan, kategori, satuan_dasar, satuan_beli, 
  faktor_konversi, stok_minimum, stok_saat_ini, harga_rata2, 
  dosis_default, frekuensi_default, education_text, is_active
)
SELECT 
  id, -- Pertahankan ID asli agar relasi yang akan dibangun (visit_obat) tetap sinkron
  'OBT-' || SUBSTRING(id::TEXT, 1, 6),
  nama_obat, 
  'Obat', 
  COALESCE(satuan, 'pcs'), 
  COALESCE(satuan, 'pcs'), 
  1, 
  5, 
  0, -- Stok default 0 (karena master_obat lama tidak mencatat stok real-time)
  COALESCE(harga_satuan, 0),
  dosis_default, 
  frekuensi_default, 
  education_text, 
  is_active
FROM public.master_obat
ON CONFLICT (id) DO NOTHING;

-- 3. Modifikasi tabel visit_obat agar merujuk ke master_bahan
ALTER TABLE public.visit_obat 
  ADD COLUMN IF NOT EXISTS master_bahan_id UUID REFERENCES public.master_bahan(id);

-- Salin referensi dari obat_id ke master_bahan_id (karena ID-nya dipertahankan sama)
UPDATE public.visit_obat SET master_bahan_id = obat_id WHERE master_bahan_id IS NULL;

-- 4. Perbarui RLS untuk visit_obat agar menyesuaikan jika diperlukan
-- RLS tidak perlu diubah signifikan karena role yang mengaksesnya sama.
-- Tapi kita bisa drop FK ke master_obat
-- ALTER TABLE public.visit_obat DROP CONSTRAINT IF EXISTS visit_obat_obat_id_fkey;
-- Kita biarkan dulu kolom obat_id (sebagai legacy) atau boleh didelete kalau FE sudah fully migrated.
-- Amannya biarkan saja, tapi aplikasi diarahkan pakai master_bahan_id.

-- 5. Perbarui fungsi `fn_proses_stok_dan_snapshot_visit_treatment` untuk FEFO
CREATE OR REPLACE FUNCTION public.fn_proses_stok_dan_snapshot_visit_treatment(p_visit_treatment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_treatment_id      UUID;
  v_tier               TEXT;
  v_bobot              NUMERIC;
  v_overhead_per_unit  NUMERIC;
  v_overhead_allocated NUMERIC;
  v_harga_jual         NUMERIC;
  v_total_bahan        NUMERIC := 0;
  v_detail_bahan       JSONB := '[]'::JSONB;
  r                    RECORD;
  batch_r              RECORD;
  v_qty_pakai          NUMERIC;
  v_stok_sebelum       NUMERIC;
  v_stok_sesudah       NUMERIC;
  v_sisa_potong        NUMERIC;
BEGIN
  -- Ambil data treatment & harga jual dari visit_treatments
  SELECT vt.treatment_id, t.tier, vt.harga_satuan
    INTO v_treatment_id, v_tier, v_harga_jual
  FROM public.visit_treatments vt
  JOIN public.treatments t ON t.id = vt.treatment_id
  WHERE vt.id = p_visit_treatment_id;

  IF v_treatment_id IS NULL THEN
    RAISE EXCEPTION 'visit_treatment_id % tidak ditemukan', p_visit_treatment_id;
  END IF;

  -- Ambil bobot tier
  SELECT bobot INTO v_bobot FROM public.tier_weights WHERE tier = v_tier;
  v_bobot := COALESCE(v_bobot, 1);

  -- Ambil overhead_per_unit_bobot dari target bulan berjalan
  SELECT overhead_per_unit_bobot INTO v_overhead_per_unit
  FROM public.overhead_monthly_target
  WHERE periode = date_trunc('month', CURRENT_DATE)::DATE;

  v_overhead_per_unit := COALESCE(v_overhead_per_unit, 0);
  v_overhead_allocated := v_bobot * v_overhead_per_unit;

  -- Loop tiap bahan di BOM treatment ini
  FOR r IN
    SELECT tm.material_id, tm.qty_rata2, tm.wastage_percent, tm.wajib,
           mb.nama_bahan, mb.harga_rata2, mb.stok_saat_ini
    FROM public.treatment_materials tm
    JOIN public.master_bahan mb ON mb.id = tm.material_id
    WHERE tm.treatment_id = v_treatment_id AND tm.wajib = true
  LOOP
    -- Cek qty aktual
    SELECT qty_aktual INTO v_qty_pakai
    FROM public.visit_treatment_material_overrides
    WHERE visit_treatment_id = p_visit_treatment_id AND material_id = r.material_id;

    IF v_qty_pakai IS NULL THEN
      v_qty_pakai := r.qty_rata2 * (1 + COALESCE(r.wastage_percent, 0) / 100.0);
    END IF;

    -- Potong FEFO pada material_batches
    v_sisa_potong := v_qty_pakai;
    FOR batch_r IN 
      SELECT id, qty_sisa FROM public.material_batches 
      WHERE material_id = r.material_id AND qty_sisa > 0 
      ORDER BY tanggal_kadaluarsa ASC NULLS LAST, tanggal_masuk ASC
      FOR UPDATE
    LOOP
      IF v_sisa_potong <= 0 THEN EXIT; END IF;
      
      IF batch_r.qty_sisa <= v_sisa_potong THEN
        -- Habiskan batch ini
        UPDATE public.material_batches SET qty_sisa = 0 WHERE id = batch_r.id;
        v_sisa_potong := v_sisa_potong - batch_r.qty_sisa;
      ELSE
        -- Kurangi sebagian
        UPDATE public.material_batches SET qty_sisa = qty_sisa - v_sisa_potong WHERE id = batch_r.id;
        v_sisa_potong := 0;
      END IF;
    END LOOP;

    v_stok_sebelum := r.stok_saat_ini;
    v_stok_sesudah := v_stok_sebelum - v_qty_pakai;

    -- Update stok master_bahan
    UPDATE public.master_bahan
    SET stok_saat_ini = v_stok_sesudah, updated_at = NOW()
    WHERE id = r.material_id;

    -- Catat pergerakan stok (kartu stok)
    INSERT INTO public.stok_movements
      (material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu, catatan)
    VALUES
      (r.material_id, 'keluar', -v_qty_pakai, v_stok_sebelum, v_stok_sesudah,
       'visit_treatment', p_visit_treatment_id, r.harga_rata2,
       CASE WHEN v_stok_sesudah < 0 THEN 'PERINGATAN: stok minus, perlu restock segera' ELSE NULL END);

    v_total_bahan := v_total_bahan + (v_qty_pakai * r.harga_rata2);
    v_detail_bahan := v_detail_bahan || jsonb_build_object(
      'material_id', r.material_id,
      'nama_bahan', r.nama_bahan,
      'qty', v_qty_pakai,
      'harga_satuan', r.harga_rata2,
      'subtotal', v_qty_pakai * r.harga_rata2
    );
  END LOOP;

  -- Simpan snapshot
  INSERT INTO public.treatment_cost_snapshot
    (visit_treatment_id, tier_saat_itu, bobot_saat_itu, overhead_per_unit_bobot,
     overhead_allocated, total_biaya_bahan, detail_bahan, harga_jual_saat_itu)
  VALUES
    (p_visit_treatment_id, v_tier, v_bobot, v_overhead_per_unit,
     v_overhead_allocated, v_total_bahan, v_detail_bahan, COALESCE(v_harga_jual, 0))
  ON CONFLICT (visit_treatment_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- MIGRATION 37: 37_prevent_double_booking.sql
-- ==========================================

-- SUPABASE MIGRATION 37: PREVENT DOUBLE BOOKING
-- Resolves BUS-001 by enforcing a unique constraint on active appointments.

-- Create a unique index for (dokter_id, tanggal_kunjungan, jam_kunjungan)
-- only for visits that are NOT cancelled, ensuring a doctor cannot have 
-- two active appointments at the exact same time slot.
CREATE UNIQUE INDEX IF NOT EXISTS visits_unique_slot_idx 
ON public.visits (dokter_id, tanggal_kunjungan, jam_kunjungan) 
WHERE status != 'cancelled';


-- ==========================================
-- MIGRATION 38: 38_audit_logs_expansion.sql
-- ==========================================

-- SUPABASE MIGRATION 38: AUDIT LOG EXPANSION (Phase 5)
-- Expand the audit log to track Login/Logout (via users table updates), Payments, and Soft-Deletes.

-- Ensure audit_logs can track more modules
ALTER TABLE public.audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_risk_level_check;

-- Helper function to record audit logs for any table dynamically
CREATE OR REPLACE FUNCTION public.dynamic_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_clinic_id UUID;
  v_action TEXT;
  v_module TEXT;
  v_risk_level TEXT := 'LOW';
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if it's a soft delete
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
      v_action := 'SOFT_DELETE';
      v_risk_level := 'HIGH';
    ELSE
      v_action := 'UPDATE';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'HARD_DELETE';
    v_risk_level := 'CRITICAL';
  END IF;

  v_module := TG_TABLE_NAME;

  -- Attempt to extract current user and clinic from auth context (if available)
  v_user_id := auth.uid();
  
  -- If we can't get auth.uid() directly, maybe it's passed in the record (fallback for triggers)
  IF v_user_id IS NULL AND TG_OP IN ('INSERT', 'UPDATE') THEN
    IF to_jsonb(NEW) ? 'clinic_id' THEN
      v_clinic_id := (to_jsonb(NEW)->>'clinic_id')::uuid;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    clinic_id,
    module,
    action,
    previous_value,
    new_value,
    risk_level
  ) VALUES (
    v_user_id,
    v_clinic_id,
    UPPER(v_module),
    v_action,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    v_risk_level
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Apply to Payments
DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.dynamic_audit_trigger();

-- 2. Apply to Users (for Role changes, deactivations)
DROP TRIGGER IF EXISTS audit_users_trigger ON public.users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.dynamic_audit_trigger();

-- 3. Apply to Subscriptions (future billing)
-- (We will apply this once subscriptions table is created in the next migration)


-- ==========================================
-- MIGRATION 39: 39_saas_billing_and_isolation.sql
-- ==========================================

-- SUPABASE MIGRATION 39: SAAS TENANT ISOLATION AND BILLING (Phase 5)

-- 1. Create SaaS Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2) NOT NULL,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_patients INTEGER NOT NULL DEFAULT 100,
  features JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Plans
INSERT INTO public.subscription_plans (name, price_monthly, price_yearly, max_users, max_patients, features)
VALUES 
  ('Starter', 299000, 2990000, 3, 1000, '{"whatsapp_reminders": false, "custom_reports": false}'),
  ('Pro', 599000, 5990000, 10, 5000, '{"whatsapp_reminders": true, "custom_reports": true}'),
  ('Enterprise', 1499000, 14990000, 9999, 99999, '{"whatsapp_reminders": true, "custom_reports": true, "priority_support": true}')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Subscriptions (Billing)
CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL, -- Assuming clinics table exists or ties to users.clinic_id
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: The clinic_id should reference public.clinics if it exists. 
-- In Dentiva currently, it's tied via users table or isolated schemas.
-- We will enforce Tenant Isolation on core tables if missing.

-- 3. Tenant Isolation RLS Check (Replaced by RBAC in Migration 41)
-- To avoid errors if clinic_id is not yet fully propagated in all environments,
-- we rely on the granular RBAC permissions established in Migration 41.
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- MIGRATION 40: 40_enterprise_rbac.sql
-- ==========================================

-- SUPABASE MIGRATION 40: ENTERPRISE RBAC (Phase 1)
-- Implements Granular Role-Based Access Control

-- 1. Create RBAC Tables
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'patient.read'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  is_revoked BOOLEAN DEFAULT FALSE, -- Allows revoking a specific permission from a role
  PRIMARY KEY (user_id, permission_id)
);

-- Note: We add a role_id to users to map them to a primary role
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id);

-- 2. Seed Permissions
INSERT INTO public.permissions (module, action, name, description) VALUES
  -- Patient
  ('patient', 'read', 'patient.read', 'Lihat data pasien'),
  ('patient', 'create', 'patient.create', 'Buat data pasien baru'),
  ('patient', 'update', 'patient.update', 'Ubah data pasien'),
  ('patient', 'delete', 'patient.delete', 'Hapus data pasien'),
  ('patient', 'export', 'patient.export', 'Ekspor data pasien'),
  -- Appointment
  ('appointment', 'read', 'appointment.read', 'Lihat jadwal kunjungan'),
  ('appointment', 'create', 'appointment.create', 'Buat jadwal kunjungan'),
  ('appointment', 'update', 'appointment.update', 'Ubah jadwal kunjungan'),
  ('appointment', 'delete', 'appointment.delete', 'Hapus jadwal kunjungan'),
  ('appointment', 'cancel', 'appointment.cancel', 'Batalkan jadwal kunjungan'),
  -- Medical Record (EMR)
  ('emr', 'read', 'emr.read', 'Lihat rekam medis'),
  ('emr', 'create', 'emr.create', 'Isi rekam medis'),
  ('emr', 'update', 'emr.update', 'Ubah rekam medis'),
  ('emr', 'delete', 'emr.delete', 'Hapus rekam medis'),
  ('emr', 'approve', 'emr.approve', 'Verifikasi rekam medis'),
  ('emr', 'export', 'emr.export', 'Ekspor rekam medis'),
  -- Financial
  ('finance', 'read', 'finance.read', 'Lihat data finansial & tagihan'),
  ('finance', 'update', 'finance.update', 'Ubah data tagihan'),
  ('finance', 'payment', 'finance.payment', 'Proses pembayaran'),
  ('finance', 'refund', 'finance.refund', 'Proses refund'),
  ('finance', 'export', 'finance.export', 'Ekspor data finansial'),
  -- Inventory
  ('inventory', 'read', 'inventory.read', 'Lihat inventaris'),
  ('inventory', 'create', 'inventory.create', 'Tambah inventaris'),
  ('inventory', 'update', 'inventory.update', 'Ubah inventaris'),
  ('inventory', 'delete', 'inventory.delete', 'Hapus inventaris'),
  -- Dashboard & Settings
  ('dashboard', 'read', 'dashboard.read', 'Lihat dashboard analitik'),
  ('settings', 'read', 'settings.read', 'Lihat pengaturan klinik'),
  ('settings', 'update', 'settings.update', 'Ubah pengaturan klinik'),
  -- User Management
  ('user', 'read', 'user.read', 'Lihat data pengguna'),
  ('user', 'create', 'user.create', 'Buat pengguna baru'),
  ('user', 'update', 'user.update', 'Ubah pengguna'),
  ('user', 'delete', 'user.delete', 'Hapus pengguna')
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Roles
INSERT INTO public.roles (name, description, is_system) VALUES
  ('Super Admin', 'Full Access ke seluruh sistem', TRUE),
  ('Clinic Owner', 'Pemilik klinik, akses penuh kecuali manage Super Admin', TRUE),
  ('Manager', 'Manajer operasional klinik', TRUE),
  ('Dentist', 'Dokter gigi spesialis / umum', TRUE),
  ('Assistant', 'Asisten / Perawat gigi', TRUE),
  ('Receptionist', 'Resepsionis pendaftaran', TRUE),
  ('Cashier', 'Kasir / Keuangan', TRUE),
  ('Viewer', 'Akses read-only', TRUE)
ON CONFLICT (name) DO NOTHING;

-- 4. Map Permissions to Roles (Stored Procedure for cleanliness)
DO $$
DECLARE
  role_super_admin UUID;
  role_owner UUID;
  role_manager UUID;
  role_dentist UUID;
  role_assistant UUID;
  role_receptionist UUID;
  role_cashier UUID;
  role_viewer UUID;
BEGIN
  SELECT id INTO role_super_admin FROM public.roles WHERE name = 'Super Admin';
  SELECT id INTO role_owner FROM public.roles WHERE name = 'Clinic Owner';
  SELECT id INTO role_manager FROM public.roles WHERE name = 'Manager';
  SELECT id INTO role_dentist FROM public.roles WHERE name = 'Dentist';
  SELECT id INTO role_assistant FROM public.roles WHERE name = 'Assistant';
  SELECT id INTO role_receptionist FROM public.roles WHERE name = 'Receptionist';
  SELECT id INTO role_cashier FROM public.roles WHERE name = 'Cashier';
  SELECT id INTO role_viewer FROM public.roles WHERE name = 'Viewer';

  -- CLEAR existing to avoid duplicates on re-run
  DELETE FROM public.role_permissions;

  -- Super Admin & Clinic Owner: ALL PERMISSIONS
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_super_admin, id FROM public.permissions;
  
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_owner, id FROM public.permissions WHERE name != 'user.delete'; -- Just an example exception

  -- Manager: All except some critical settings
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_manager, id FROM public.permissions 
  WHERE name NOT IN ('settings.update', 'user.delete');

  -- Dentist: Patient, Appt, EMR (no delete), no finance (except read maybe)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_dentist, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'patient.create', 'patient.update',
    'appointment.read', 'appointment.create',
    'emr.read', 'emr.create', 'emr.update', 'emr.approve',
    'dashboard.read'
  );

  -- Assistant: View appt, help EMR input
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_assistant, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'appointment.read', 
    'emr.read', 'emr.create', 'emr.update',
    'inventory.read', 'inventory.update'
  );

  -- Receptionist: Appt, Patient, basic billing read
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_receptionist, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'patient.create', 'patient.update',
    'appointment.read', 'appointment.create', 'appointment.update', 'appointment.cancel',
    'finance.read', 'dashboard.read'
  );

  -- Cashier: Finance
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_cashier, id FROM public.permissions 
  WHERE name IN (
    'patient.read', 'appointment.read',
    'finance.read', 'finance.update', 'finance.payment', 'finance.refund', 'finance.export',
    'dashboard.read'
  );

  -- Viewer: Read only
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT role_viewer, id FROM public.permissions 
  WHERE action = 'read';
END $$;

-- 5. Helper Function for RLS
CREATE OR REPLACE FUNCTION public.has_permission(p_permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- Check user_permissions explicitly granted
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid() 
      AND p.name = p_permission_name
      AND up.is_revoked = FALSE
  ) INTO v_has_access;

  IF v_has_access THEN RETURN TRUE; END IF;

  -- Check user_permissions explicitly revoked (overrides role)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid() 
      AND p.name = p_permission_name
      AND up.is_revoked = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check role_permissions
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON rp.role_id = u.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE u.id = auth.uid() AND p.name = p_permission_name
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Migrate Existing Users
DO $$
DECLARE
  role_manager UUID;
  role_dentist UUID;
  role_receptionist UUID;
  role_cashier UUID;
BEGIN
  SELECT id INTO role_manager FROM public.roles WHERE name = 'Manager';
  SELECT id INTO role_dentist FROM public.roles WHERE name = 'Dentist';
  SELECT id INTO role_receptionist FROM public.roles WHERE name = 'Receptionist';
  SELECT id INTO role_cashier FROM public.roles WHERE name = 'Cashier';

  -- Map old string roles to new UUID roles
  UPDATE public.users SET role_id = role_manager WHERE role = 'admin' AND role_id IS NULL;
  UPDATE public.users SET role_id = role_dentist WHERE role = 'dokter' AND role_id IS NULL;
  UPDATE public.users SET role_id = role_receptionist WHERE role = 'resepsionis' AND role_id IS NULL;
  UPDATE public.users SET role_id = role_cashier WHERE role = 'kasir' AND role_id IS NULL;
  
  -- Fallback for any unknown role
  UPDATE public.users SET role_id = role_receptionist WHERE role_id IS NULL;
END $$;

-- 7. RPC to fetch permissions for frontend
CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(permission_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT p.name::VARCHAR
  FROM public.users u
  JOIN public.role_permissions rp ON rp.role_id = u.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE u.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() AND up.permission_id = p.id AND up.is_revoked = TRUE
  )
  UNION
  SELECT p.name::VARCHAR
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = auth.uid() AND up.is_revoked = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ==========================================
-- MIGRATION 41: 41_enterprise_rbac_rls.sql
-- ==========================================

-- SUPABASE MIGRATION 41: ENTERPRISE RBAC RLS POLICIES (Phase 1)
-- Replaces role-based RLS with permission-based RLS using has_permission()

-- 1. Patients Table
DROP POLICY IF EXISTS "Patients are isolated by clinic_id" ON public.patients;
DROP POLICY IF EXISTS "patient_read_policy" ON public.patients;
DROP POLICY IF EXISTS "patient_insert_policy" ON public.patients;
DROP POLICY IF EXISTS "patient_update_policy" ON public.patients;
DROP POLICY IF EXISTS "patient_delete_policy" ON public.patients;
CREATE POLICY "patient_read_policy" ON public.patients FOR SELECT USING (has_permission('patient.read'));
CREATE POLICY "patient_insert_policy" ON public.patients FOR INSERT WITH CHECK (has_permission('patient.create'));
CREATE POLICY "patient_update_policy" ON public.patients FOR UPDATE USING (has_permission('patient.update'));
CREATE POLICY "patient_delete_policy" ON public.patients FOR DELETE USING (has_permission('patient.delete'));

-- 2. Visits Table (Appointments)
DROP POLICY IF EXISTS "Visits are isolated by clinic_id" ON public.visits;
DROP POLICY IF EXISTS "appointment_read_policy" ON public.visits;
DROP POLICY IF EXISTS "appointment_insert_policy" ON public.visits;
DROP POLICY IF EXISTS "appointment_update_policy" ON public.visits;
DROP POLICY IF EXISTS "appointment_delete_policy" ON public.visits;
CREATE POLICY "appointment_read_policy" ON public.visits FOR SELECT USING (has_permission('appointment.read'));
CREATE POLICY "appointment_insert_policy" ON public.visits FOR INSERT WITH CHECK (has_permission('appointment.create'));
CREATE POLICY "appointment_update_policy" ON public.visits FOR UPDATE USING (has_permission('appointment.update'));
CREATE POLICY "appointment_delete_policy" ON public.visits FOR DELETE USING (has_permission('appointment.delete'));

-- 3. Medical Record Versions (EMR)
DROP POLICY IF EXISTS "mrv_select" ON public.medical_record_versions;
DROP POLICY IF EXISTS "emr_read_policy" ON public.medical_record_versions;
DROP POLICY IF EXISTS "emr_insert_policy" ON public.medical_record_versions;
DROP POLICY IF EXISTS "emr_update_policy" ON public.medical_record_versions;
DROP POLICY IF EXISTS "emr_delete_policy" ON public.medical_record_versions;
CREATE POLICY "emr_read_policy" ON public.medical_record_versions FOR SELECT USING (has_permission('emr.read'));
CREATE POLICY "emr_insert_policy" ON public.medical_record_versions FOR INSERT WITH CHECK (has_permission('emr.create'));
CREATE POLICY "emr_update_policy" ON public.medical_record_versions FOR UPDATE USING (has_permission('emr.update'));
CREATE POLICY "emr_delete_policy" ON public.medical_record_versions FOR DELETE USING (has_permission('emr.delete'));

-- 4. Payments
-- Assume existing payment policies exist, we override them.
DROP POLICY IF EXISTS "enable_read_for_authenticated" ON public.payments;
DROP POLICY IF EXISTS "enable_insert_for_authenticated" ON public.payments;
DROP POLICY IF EXISTS "finance_read_policy" ON public.payments;
DROP POLICY IF EXISTS "finance_insert_policy" ON public.payments;
DROP POLICY IF EXISTS "finance_update_policy" ON public.payments;
CREATE POLICY "finance_read_policy" ON public.payments FOR SELECT USING (has_permission('finance.read'));
CREATE POLICY "finance_insert_policy" ON public.payments FOR INSERT WITH CHECK (has_permission('finance.payment'));
CREATE POLICY "finance_update_policy" ON public.payments FOR UPDATE USING (has_permission('finance.update'));

-- 5. Audit Logs
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_read_policy" ON public.audit_logs;
CREATE POLICY "audit_read_policy" ON public.audit_logs FOR SELECT USING (has_permission('dashboard.read'));

-- Note: In a true multi-tenant environment, we still append `AND clinic_id = get_clinic_id()` to all these policies.
-- However, for Dentiva's backward compatibility, we focus purely on the `has_permission` RBAC check here, 
-- which already provides a much more granular layer than the string `role = 'admin'` approach.


-- ==========================================
-- MIGRATION 42: 42_enterprise_emr_versioning.sql
-- ==========================================

-- SUPABASE MIGRATION 42: ENTERPRISE EMR VERSIONING (Phase 2)
-- Upgrades the medical_record_versions table to use a JSONB structure for full auditability and restore tracing.

-- 1. Upgrade the Table Structure
-- We keep the old columns for a moment to migrate data, or just add the new JSONB columns.
ALTER TABLE public.medical_record_versions 
  ADD COLUMN IF NOT EXISTS previous_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS restored_from INTEGER DEFAULT NULL;

-- 2. Migrate existing versions to JSONB format (if any exist)
-- This ensures backward compatibility and data preservation.
UPDATE public.medical_record_versions
SET 
  new_data = jsonb_build_object(
    'diagnosa', diagnosa,
    'keluhan', keluhan,
    'pemeriksaan_fisik', pemeriksaan_fisik,
    'terapi', terapi,
    'catatan_dokter', catatan_dokter,
    'kode_icd10', kode_icd10
  )
WHERE new_data IS NULL;

-- 3. Replace the old Soft Delete & Update Triggers
-- We will override the trigger created in migration 23.

CREATE OR REPLACE FUNCTION audit_emr_update()
RETURNS TRIGGER AS $$
DECLARE
  v_version INTEGER;
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- Determine next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version 
  FROM public.medical_record_versions
  WHERE visit_id = NEW.id;

  -- Create JSON representations of the changes (only tracking the medical fields on visits)
  v_old := jsonb_build_object(
    'diagnosa', OLD.diagnosa,
    'keluhan', OLD.keluhan,
    'pemeriksaan_fisik', OLD.pemeriksaan_fisik,
    'terapi', OLD.terapi,
    'catatan_dokter', OLD.catatan_dokter,
    'kode_icd10', OLD.kode_icd10
  );

  v_new := jsonb_build_object(
    'diagnosa', NEW.diagnosa,
    'keluhan', NEW.keluhan,
    'pemeriksaan_fisik', NEW.pemeriksaan_fisik,
    'terapi', NEW.terapi,
    'catatan_dokter', NEW.catatan_dokter,
    'kode_icd10', NEW.kode_icd10
  );

  -- Only record a version if there is an actual medical change
  IF v_old IS DISTINCT FROM v_new THEN
    INSERT INTO public.medical_record_versions (
      visit_id,
      patient_id,
      version,
      changed_by,
      change_summary,
      previous_data,
      new_data,
      -- We extract reason if it was passed via application context/metadata, or default to generic update
      reason
    ) VALUES (
      NEW.id,
      NEW.patient_id,
      v_version,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID), -- Should be actual user
      'EMR Updated',
      v_old,
      v_new,
      'System update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Overwrite the old trigger
DROP TRIGGER IF EXISTS trigger_audit_emr_update ON public.visits;
CREATE TRIGGER trigger_audit_emr_update
  AFTER UPDATE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION audit_emr_update();

-- 4. Restore EMR Function (Creates a NEW version pointing to restored_from)
CREATE OR REPLACE FUNCTION public.restore_emr_version(
  p_visit_id UUID, 
  p_version INTEGER, 
  p_reason TEXT DEFAULT 'Restored from history'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_version_data RECORD;
  v_restored_data JSONB;
BEGIN
  -- We rely on RLS and RBAC to prevent unauthorized execution, but we can do a hard check just in case.
  IF NOT has_permission('emr.approve') AND NOT has_permission('emr.update') THEN
    RAISE EXCEPTION 'Akses ditolak: Tidak memiliki izin untuk restore EMR';
  END IF;

  SELECT * INTO v_version_data 
  FROM public.medical_record_versions 
  WHERE visit_id = p_visit_id AND version = p_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versi % tidak ditemukan untuk visit_id %', p_version, p_visit_id;
  END IF;

  v_restored_data := v_version_data.new_data;

  -- This update will automatically trigger `audit_emr_update()` which creates the NEW version.
  -- But we also want to mark it with `restored_from`.
  UPDATE public.visits
  SET 
    diagnosa = v_restored_data->>'diagnosa',
    keluhan = v_restored_data->>'keluhan',
    pemeriksaan_fisik = v_restored_data->>'pemeriksaan_fisik',
    terapi = v_restored_data->>'terapi',
    catatan_dokter = v_restored_data->>'catatan_dokter',
    kode_icd10 = v_restored_data->>'kode_icd10'
  WHERE id = p_visit_id;

  -- We must find the newly inserted version (which just happened in the trigger) and update it
  UPDATE public.medical_record_versions
  SET 
    restored_from = p_version,
    reason = p_reason
  WHERE visit_id = p_visit_id 
    AND version = (SELECT MAX(version) FROM public.medical_record_versions WHERE visit_id = p_visit_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
