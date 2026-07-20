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
