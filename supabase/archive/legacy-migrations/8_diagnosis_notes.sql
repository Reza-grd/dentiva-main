-- MIGRATION: 8_diagnosis_notes.sql
-- Description: Add diagnosis_additional_notes to clinical_data table

ALTER TABLE clinical_data 
ADD COLUMN IF NOT EXISTS diagnosis_additional_notes TEXT DEFAULT '';
