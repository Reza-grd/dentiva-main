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
