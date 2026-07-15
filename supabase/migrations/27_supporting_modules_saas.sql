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
