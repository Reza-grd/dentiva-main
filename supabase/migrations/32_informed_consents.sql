-- ============================================
-- MIGRATION: 32_informed_consents.sql
-- Create informed_consents table
-- ============================================

CREATE TABLE IF NOT EXISTS informed_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    treatment_type TEXT NOT NULL,
    patient_name TEXT NOT NULL,
    doctor_name TEXT NOT NULL,
    signature_data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_informed_consents_clinic_id ON informed_consents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_informed_consents_patient_id ON informed_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_informed_consents_visit_id ON informed_consents(visit_id);

-- RLS Policies
ALTER TABLE informed_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read informed_consents" 
    ON informed_consents FOR SELECT 
    USING (
        clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()) 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "Staff can insert informed_consents" 
    ON informed_consents FOR INSERT 
    WITH CHECK (
        clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()) 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "Staff can update informed_consents" 
    ON informed_consents FOR UPDATE 
    USING (
        clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()) 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "Staff can delete informed_consents" 
    ON informed_consents FOR DELETE 
    USING (
        clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()) 
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'superadmin'
    );
