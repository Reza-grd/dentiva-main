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
