-- MIGRATION: 9_patient_referrals.sql
-- Description: Create table for storing patient referral letters (Surat Rujukan)

CREATE TABLE IF NOT EXISTS patient_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES patient_visits(id) ON DELETE SET NULL,
    referral_number TEXT,
    to_doctor TEXT NOT NULL,
    to_hospital TEXT NOT NULL,
    to_specialist TEXT NOT NULL,
    anamnesis TEXT,
    physical_exam TEXT,
    diagnosis TEXT,
    therapy TEXT,
    place TEXT,
    date DATE DEFAULT CURRENT_DATE,
    doctor_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_referrals_patient_id ON patient_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_visit_id ON patient_referrals(visit_id);

-- Enable RLS
ALTER TABLE patient_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to read patient_referrals" 
    ON patient_referrals FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert patient_referrals" 
    ON patient_referrals FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update patient_referrals" 
    ON patient_referrals FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete patient_referrals" 
    ON patient_referrals FOR DELETE 
    USING (auth.role() = 'authenticated');
