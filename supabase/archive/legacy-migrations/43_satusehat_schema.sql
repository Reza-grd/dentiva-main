-- SUPABASE MIGRATION 43: SATUSEHAT INTEGRATION SCHEMA
-- Target: Prepare EMR tables and security policies for SatuSehat FHIR compliance.

-- 1. Patients Table additions
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS nik_ibu TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS identitas_alternatif_jenis TEXT 
  CHECK (identitas_alternatif_jenis IN ('NIK', 'NIK_IBU', 'PASPOR', 'LAINNYA'));
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS satusehat_patient_id TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS satusehat_last_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_satusehat_id ON public.patients(satusehat_patient_id) WHERE satusehat_patient_id IS NOT NULL;

-- 2. Users Table additions (Practitioner fields)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS satusehat_practitioner_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS str_berlaku_hingga DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_satusehat_practitioner_id ON public.users(satusehat_practitioner_id) WHERE satusehat_practitioner_id IS NOT NULL;

-- 3. SatuSehat Organizations Table (mapped 1-to-1 to clinics)
CREATE TABLE IF NOT EXISTS public.satusehat_organizations (
  clinic_id UUID PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  satusehat_organization_id TEXT UNIQUE,
  client_id TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  registered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SatuSehat Locations Table
CREATE TABLE IF NOT EXISTS public.satusehat_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  nama_unit TEXT NOT NULL,
  satusehat_location_id TEXT UNIQUE,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS for satusehat_organizations
ALTER TABLE public.satusehat_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin_ALL" ON public.satusehat_organizations;
CREATE POLICY "Admin_ALL" ON public.satusehat_organizations 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff_SELECT" ON public.satusehat_organizations;
CREATE POLICY "Staff_SELECT" ON public.satusehat_organizations 
  FOR SELECT 
  USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter') AND clinic_id = public.get_user_clinic_id());

-- 6. RLS for satusehat_locations
ALTER TABLE public.satusehat_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin_ALL" ON public.satusehat_locations;
CREATE POLICY "Admin_ALL" ON public.satusehat_locations 
  FOR ALL 
  USING (public.get_user_role() = 'admin' AND clinic_id = public.get_user_clinic_id());

DROP POLICY IF EXISTS "Staff_SELECT" ON public.satusehat_locations;
CREATE POLICY "Staff_SELECT" ON public.satusehat_locations 
  FOR SELECT 
  USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter') AND clinic_id = public.get_user_clinic_id());

-- 7. Treatment mapping columns (ICD-9-CM & SNOMED-CT)
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS kode_icd9cm TEXT;
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS kode_snomed_ct TEXT;

-- 8. Master Obat KFA code
ALTER TABLE public.master_obat ADD COLUMN IF NOT EXISTS kode_kfa TEXT;
ALTER TABLE public.master_bahan ADD COLUMN IF NOT EXISTS kode_kfa TEXT;

-- 9. SatuSehat Consents Table (scoped via join to patients)
CREATE TABLE IF NOT EXISTS public.satusehat_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMPTZ,
  recorded_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.satusehat_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin_ALL" ON public.satusehat_consents;
CREATE POLICY "Admin_ALL" ON public.satusehat_consents FOR ALL
  USING (
    public.get_user_role() = 'admin' AND
    EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.clinic_id = public.get_user_clinic_id())
  );

DROP POLICY IF EXISTS "Staff_SELECT" ON public.satusehat_consents;
CREATE POLICY "Staff_SELECT" ON public.satusehat_consents FOR SELECT
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') AND
    EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.clinic_id = public.get_user_clinic_id())
  );

DROP POLICY IF EXISTS "Staff_INSERT" ON public.satusehat_consents;
CREATE POLICY "Staff_INSERT" ON public.satusehat_consents FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') AND
    EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.clinic_id = public.get_user_clinic_id())
  );

DROP POLICY IF EXISTS "Staff_UPDATE" ON public.satusehat_consents;
CREATE POLICY "Staff_UPDATE" ON public.satusehat_consents FOR UPDATE
  USING (
    public.get_user_role() IN ('admin', 'resepsionis', 'dokter') AND
    EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.clinic_id = public.get_user_clinic_id())
  );
