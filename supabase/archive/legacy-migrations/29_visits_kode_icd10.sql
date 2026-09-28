-- Migration 29: Add kode_icd10 column to visits table
-- This is a schema gap fix: migration 23 added kode_icd10 to medical_record_versions
-- and the versioning trigger reads NEW.kode_icd10 from visits, but the column was
-- never actually added to the visits table via ALTER TABLE. This is a no-op if the
-- column already exists (IF NOT EXISTS), safe to run on any environment.

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS kode_icd10 VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.visits.kode_icd10 IS
  'ICD-10 diagnosis code (e.g. K02.1 = Karies dentin). Tracked by versioning trigger in medical_record_versions.';
