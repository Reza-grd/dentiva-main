-- MIGRATION: 12_schema_consistency_fixes.sql
-- Description: Fixes schema inconsistencies where migrations incorrectly referenced `patient_visits` instead of `visits`.
-- This ensures foreign key constraints are correctly mapped.

-- ==========================================
-- 1. FIX patient_media
-- ==========================================
DO $$
BEGIN
    -- Drop the incorrect constraint if it exists
    ALTER TABLE patient_media DROP CONSTRAINT IF EXISTS patient_media_visit_id_fkey;
    
    -- Add the correct constraint to the 'visits' table
    ALTER TABLE patient_media 
    ADD CONSTRAINT patient_media_visit_id_fkey 
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_table THEN
        -- Table might not exist yet in some environments, ignore
        NULL;
END $$;

-- ==========================================
-- 2. FIX patient_referrals
-- ==========================================
DO $$
BEGIN
    -- Drop the incorrect constraint if it exists
    ALTER TABLE patient_referrals DROP CONSTRAINT IF EXISTS patient_referrals_visit_id_fkey;
    
    -- Add the correct constraint to the 'visits' table
    ALTER TABLE patient_referrals 
    ADD CONSTRAINT patient_referrals_visit_id_fkey 
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_table THEN
        -- Table might not exist yet in some environments, ignore
        NULL;
END $$;

-- ==========================================
-- 3. HARDEN RLS FOR patient_referrals
-- ==========================================
-- While we are fixing the schema, let's also harden the RLS for referrals like we did for media

DROP POLICY IF EXISTS "Allow authenticated users to read patient_referrals" ON patient_referrals;
DROP POLICY IF EXISTS "Allow authenticated users to insert patient_referrals" ON patient_referrals;
DROP POLICY IF EXISTS "Allow authenticated users to update patient_referrals" ON patient_referrals;
DROP POLICY IF EXISTS "Allow authenticated users to delete patient_referrals" ON patient_referrals;

CREATE POLICY "Staff can read patient_referrals" 
    ON patient_referrals FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));

CREATE POLICY "Staff can insert patient_referrals" 
    ON patient_referrals FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));

CREATE POLICY "Staff can update patient_referrals" 
    ON patient_referrals FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));

CREATE POLICY "Staff can delete patient_referrals" 
    ON patient_referrals FOR DELETE 
    USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));
