-- MIGRATION: 13_audit_fixes.sql
-- Description: Applies schema fixes from the Full System Audit (Indexes, Cascades, Constraints, RLS)

-- ==========================================
-- 1. Missing Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_visit_id ON payments(visit_id);

-- ==========================================
-- 2. Cascades (Orphaned Records)
-- ==========================================
DO $$ 
DECLARE 
    fk_name text;
BEGIN
    -- Drop existing FK for payments.visit_id
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'payments' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%visit_id%';

    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE payments DROP CONSTRAINT ' || fk_name;
    END IF;

    -- Drop existing FK for visit_treatments.visit_id
    SELECT constraint_name INTO fk_name
    FROM information_schema.table_constraints
    WHERE table_name = 'visit_treatments' AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%visit_id%';

    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE visit_treatments DROP CONSTRAINT ' || fk_name;
    END IF;
END $$;

ALTER TABLE payments 
ADD CONSTRAINT payments_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE visit_treatments 
ADD CONSTRAINT visit_treatments_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

-- ==========================================
-- 3. Unique Constraints (Race Condition)
-- ==========================================
-- Before adding, we must drop if it exists to be idempotent
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_visit_payment'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT unique_visit_payment;
    END IF;
END $$;

ALTER TABLE payments ADD CONSTRAINT unique_visit_payment UNIQUE(visit_id);

-- ==========================================
-- 4. CHECK Constraints
-- ==========================================
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_status_pembayaran'
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT chk_status_pembayaran;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_status_pernikahan'
    ) THEN
        ALTER TABLE patients DROP CONSTRAINT chk_status_pernikahan;
    END IF;
END $$;

-- Standardizing 'lunas' to 'paid' in existing data before adding constraint
UPDATE payments SET status_pembayaran = 'paid' WHERE status_pembayaran = 'lunas';

ALTER TABLE payments ADD CONSTRAINT chk_status_pembayaran CHECK (status_pembayaran IN ('paid', 'pending', 'cancelled'));
ALTER TABLE patients ADD CONSTRAINT chk_status_pernikahan CHECK (status_pernikahan IN ('Belum Menikah', 'Menikah', 'Duda/Janda', 'Cerai')); -- Kept Cerai just in case existing data has it, though UI uses Duda/Janda

-- ==========================================
-- 9. RLS Policies
-- ==========================================
-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_treatments ENABLE ROW LEVEL SECURITY;

-- Drop existing generic policies if any exist (to recreate strict ones)
-- We will just use OR REPLACE if possible, but postgres CREATE POLICY doesn't have OR REPLACE natively in older versions.
-- So we drop IF EXISTS.
DO $$ 
DECLARE
    t_name text;
    p_name text;
    pol_cursor CURSOR FOR 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('patients', 'visits', 'payments', 'clinical_data', 'visit_treatments');
BEGIN
    FOR pol_record IN pol_cursor LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_record.policyname, pol_record.tablename);
    END LOOP;
END $$;

-- Admin has ALL access to everything
CREATE POLICY "Admins have full access to patients" ON patients FOR ALL USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admins have full access to visits" ON visits FOR ALL USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admins have full access to payments" ON payments FOR ALL USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admins have full access to clinical_data" ON clinical_data FOR ALL USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admins have full access to visit_treatments" ON visit_treatments FOR ALL USING (auth.jwt()->>'role' = 'admin');

-- Resepsionis and Dokter can SELECT all
CREATE POLICY "Staff can view patients" ON patients FOR SELECT USING (auth.jwt()->>'role' IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Staff can view visits" ON visits FOR SELECT USING (auth.jwt()->>'role' IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Staff can view payments" ON payments FOR SELECT USING (auth.jwt()->>'role' IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Staff can view clinical_data" ON clinical_data FOR SELECT USING (auth.jwt()->>'role' IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Staff can view visit_treatments" ON visit_treatments FOR SELECT USING (auth.jwt()->>'role' IN ('admin', 'resepsionis', 'dokter'));

-- Resepsionis can INSERT/UPDATE patients, visits, payments
CREATE POLICY "Resepsionis can modify patients" ON patients FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'resepsionis');
CREATE POLICY "Resepsionis can update patients" ON patients FOR UPDATE USING (auth.jwt()->>'role' = 'resepsionis');

CREATE POLICY "Resepsionis can modify visits" ON visits FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'resepsionis');
CREATE POLICY "Resepsionis can update visits" ON visits FOR UPDATE USING (auth.jwt()->>'role' = 'resepsionis');

CREATE POLICY "Resepsionis can modify payments" ON payments FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'resepsionis');
CREATE POLICY "Resepsionis can update payments" ON payments FOR UPDATE USING (auth.jwt()->>'role' = 'resepsionis');

-- Dokter can INSERT/UPDATE clinical_data, visit_treatments
CREATE POLICY "Dokter can modify clinical_data" ON clinical_data FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'dokter');
CREATE POLICY "Dokter can update clinical_data" ON clinical_data FOR UPDATE USING (auth.jwt()->>'role' = 'dokter');

CREATE POLICY "Dokter can modify visit_treatments" ON visit_treatments FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'dokter');
CREATE POLICY "Dokter can update visit_treatments" ON visit_treatments FOR UPDATE USING (auth.jwt()->>'role' = 'dokter');
CREATE POLICY "Dokter can delete visit_treatments" ON visit_treatments FOR DELETE USING (auth.jwt()->>'role' = 'dokter');
