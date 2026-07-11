-- MIGRATION: 7_diagnosis_treatment.sql
-- Description: Add diagnosis and treatment lists to clinical_data table

-- Add diagnosis_list and treatment_list (JSONB) and total_treatment_cost (INTEGER)
ALTER TABLE clinical_data 
ADD COLUMN IF NOT EXISTS diagnosis_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS treatment_list JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_treatment_cost INTEGER DEFAULT 0;

-- Optionally, we could drop the old treatment_plans table if it is completely deprecated,
-- but for data preservation, we'll keep it as legacy data.
