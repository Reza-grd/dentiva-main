-- SUPABASE MIGRATION 23: MEDICAL RECORD INTEGRITY & SOFT DELETES

-- 1. ADD SOFT DELETE COLUMNS
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

ALTER TABLE public.patient_media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.patient_media ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- 2. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clinic_id UUID DEFAULT NULL, -- Prepared for future multi-tenant support
    user_id UUID REFERENCES public.users(id),
    user_role TEXT,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    previous_value JSONB DEFAULT NULL,
    new_value JSONB DEFAULT NULL,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON public.audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_visit_id ON public.audit_logs(visit_id);

-- 3. CREATE MEDICAL RECORD VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.medical_record_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    diagnosa TEXT,
    keluhan TEXT,
    pemeriksaan_fisik TEXT,
    terapi TEXT,
    catatan_dokter TEXT,
    kode_icd10 VARCHAR(50),
    changed_by UUID NOT NULL REFERENCES public.users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(visit_id, version)
);

CREATE INDEX IF NOT EXISTS idx_mrv_visit_version ON public.medical_record_versions(visit_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_mrv_patient ON public.medical_record_versions(patient_id);

-- 4. SOFT DELETE TRIGGERS
CREATE OR REPLACE FUNCTION soft_delete_patient()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.patients 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL; -- Cancel hard delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_soft_delete_patient
BEFORE DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION soft_delete_patient();

CREATE OR REPLACE FUNCTION soft_delete_visit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.visits 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL; -- Cancel hard delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_soft_delete_visit
BEFORE DELETE ON public.visits
FOR EACH ROW EXECUTE FUNCTION soft_delete_visit();

CREATE OR REPLACE FUNCTION soft_delete_patient_media()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.patient_media 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL; -- Cancel hard delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_soft_delete_patient_media
BEFORE DELETE ON public.patient_media
FOR EACH ROW EXECUTE FUNCTION soft_delete_patient_media();

CREATE OR REPLACE FUNCTION soft_delete_patient_referral()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.patient_referrals 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL; -- Cancel hard delete
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_soft_delete_patient_referral
BEFORE DELETE ON public.patient_referrals
FOR EACH ROW EXECUTE FUNCTION soft_delete_patient_referral();

-- 5. AUDIT LOGGING TRIGGERS
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_patient_id UUID := NULL;
  v_visit_id UUID := NULL;
  v_action TEXT := TG_OP;
  v_risk TEXT := 'LOW';
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_new := to_jsonb(NEW);
  ELSIF (TG_OP = 'DELETE') THEN
    v_old := to_jsonb(OLD);
  END IF;

  BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      IF (v_new ? 'patient_id') THEN v_patient_id := (v_new->>'patient_id')::UUID; END IF;
      IF (v_new ? 'visit_id') THEN v_visit_id := (v_new->>'visit_id')::UUID; END IF;
    ELSE
      IF (v_old ? 'patient_id') THEN v_patient_id := (v_old->>'patient_id')::UUID; END IF;
      IF (v_old ? 'visit_id') THEN v_visit_id := (v_old->>'visit_id')::UUID; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
  END;

  IF TG_TABLE_NAME = 'patients' THEN
    v_patient_id := COALESCE(NEW.id, OLD.id);
  END IF;
  IF TG_TABLE_NAME = 'visits' THEN
    v_visit_id := COALESCE(NEW.id, OLD.id);
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      v_patient_id := NEW.patient_id;
    ELSE
      v_patient_id := OLD.patient_id;
    END IF;
  END IF;

  IF TG_TABLE_NAME IN ('visits', 'medical_history', 'clinical_data') THEN
    v_risk := 'MEDIUM';
  ELSIF TG_TABLE_NAME = 'users' AND TG_OP = 'UPDATE' THEN
    v_risk := 'HIGH';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    user_role,
    patient_id,
    visit_id,
    module,
    action,
    previous_value,
    new_value,
    risk_level
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(public.get_user_role(), 'system'),
    v_patient_id,
    v_visit_id,
    TG_TABLE_NAME,
    v_action,
    v_old,
    v_new,
    v_risk
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_patients
AFTER INSERT OR UPDATE OR DELETE ON public.patients
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER trg_audit_visits
AFTER INSERT OR UPDATE OR DELETE ON public.visits
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER trg_audit_users
AFTER INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 6. MEDICAL RECORD VERSIONING TRIGGER
CREATE OR REPLACE FUNCTION process_visit_versioning()
RETURNS TRIGGER AS $$
DECLARE
  v_version INTEGER;
  v_summary TEXT := 'Rekam medis dibuat';
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_version := 1;
    
    INSERT INTO public.medical_record_versions (
      visit_id,
      patient_id,
      version,
      diagnosa,
      keluhan,
      pemeriksaan_fisik,
      terapi,
      catatan_dokter,
      kode_icd10,
      changed_by,
      change_summary
    ) VALUES (
      NEW.id,
      NEW.patient_id,
      v_version,
      NEW.diagnosa,
      NEW.keluhan,
      NEW.pemeriksaan_fisik,
      NEW.terapi,
      NEW.catatan_dokter,
      NEW.kode_icd10,
      COALESCE(auth.uid(), NEW.dokter_id),
      v_summary
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.diagnosa IS DISTINCT FROM NEW.diagnosa OR
        OLD.keluhan IS DISTINCT FROM NEW.keluhan OR
        OLD.pemeriksaan_fisik IS DISTINCT FROM NEW.pemeriksaan_fisik OR
        OLD.terapi IS DISTINCT FROM NEW.terapi OR
        OLD.catatan_dokter IS DISTINCT FROM NEW.catatan_dokter OR
        OLD.kode_icd10 IS DISTINCT FROM NEW.kode_icd10) THEN
        
      SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
      FROM public.medical_record_versions
      WHERE visit_id = NEW.id;

      v_summary := '';
      IF OLD.diagnosa IS DISTINCT FROM NEW.diagnosa THEN v_summary := v_summary || 'Diagnosa diubah. '; END IF;
      IF OLD.keluhan IS DISTINCT FROM NEW.keluhan THEN v_summary := v_summary || 'Keluhan diubah. '; END IF;
      IF OLD.pemeriksaan_fisik IS DISTINCT FROM NEW.pemeriksaan_fisik THEN v_summary := v_summary || 'Pemeriksaan fisik diubah. '; END IF;
      IF OLD.terapi IS DISTINCT FROM NEW.terapi THEN v_summary := v_summary || 'Terapi diubah. '; END IF;
      IF OLD.catatan_dokter IS DISTINCT FROM NEW.catatan_dokter THEN v_summary := v_summary || 'Catatan dokter diubah. '; END IF;
      
      IF v_summary = '' THEN
        v_summary := 'Rekam medis diperbarui';
      END IF;

      INSERT INTO public.medical_record_versions (
        visit_id,
        patient_id,
        version,
        diagnosa,
        keluhan,
        pemeriksaan_fisik,
        terapi,
        catatan_dokter,
        kode_icd10,
        changed_by,
        change_summary
      ) VALUES (
        NEW.id,
        NEW.patient_id,
        v_version,
        NEW.diagnosa,
        NEW.keluhan,
        NEW.pemeriksaan_fisik,
        NEW.terapi,
        NEW.catatan_dokter,
        NEW.kode_icd10,
        COALESCE(auth.uid(), NEW.dokter_id),
        v_summary
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_visit_versioning
AFTER INSERT OR UPDATE ON public.visits
FOR EACH ROW EXECUTE FUNCTION process_visit_versioning();

-- 7. RESTORE AND RETRIEVE SECURE APIS (RPC)
CREATE OR REPLACE FUNCTION restore_visit_version(p_visit_id UUID, p_version INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_data RECORD;
BEGIN
  IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memulihkan versi rekam medis';
  END IF;

  SELECT * INTO v_version_data 
  FROM public.medical_record_versions 
  WHERE visit_id = p_visit_id AND version = p_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versi tidak ditemukan';
  END IF;

  UPDATE public.visits
  SET 
    diagnosa = v_version_data.diagnosa,
    keluhan = v_version_data.keluhan,
    pemeriksaan_fisik = v_version_data.pemeriksaan_fisik,
    terapi = v_version_data.terapi,
    catatan_dokter = v_version_data.catatan_dokter,
    kode_icd10 = v_version_data.kode_icd10
  WHERE id = p_visit_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_audit_logs()
RETURNS SETOF public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() = 'admin' THEN
    RETURN QUERY SELECT * FROM public.audit_logs ORDER BY timestamp DESC;
  ELSIF public.get_user_role() = 'dokter' THEN
    RETURN QUERY SELECT * FROM public.audit_logs WHERE user_id = auth.uid() ORDER BY timestamp DESC;
  ELSE
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat log audit';
  END IF;
END;
$$;

-- 8. ROW LEVEL SECURITY
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (
  (public.get_user_role() = 'admin') OR 
  (public.get_user_role() = 'dokter' AND user_id = auth.uid())
);

ALTER TABLE public.medical_record_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mrv_select" ON public.medical_record_versions FOR SELECT USING (
  public.get_user_role() IN ('admin', 'dokter', 'resepsionis')
);
