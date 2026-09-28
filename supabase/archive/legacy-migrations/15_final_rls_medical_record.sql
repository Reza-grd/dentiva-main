-- 15_final_rls_medical_record.sql
-- Single source of truth for all Medical Record module RLS policies

-- 1. Ensure the get_user_role helper function exists
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. Clean slate: Drop ALL existing policies for these tables dynamically
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN (
        'medical_history', 'clinical_data', 'periodontal_data', 'extra_oral_data', 
        'intra_oral_data', 'odontogram_meta', 'tooth_conditions', 'treatment_plans', 
        'patient_referrals', 'visit_treatments'
    ) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. Create generic policy generator for Medical Record tables
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'medical_history', 'clinical_data', 'periodontal_data', 'extra_oral_data', 
        'intra_oral_data', 'odontogram_meta', 'tooth_conditions', 'treatment_plans', 
        'patient_referrals', 'visit_treatments'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- Admin gets ALL privileges
        EXECUTE format('CREATE POLICY "Admin_ALL" ON %I FOR ALL USING (public.get_user_role() = ''admin'')', t);
        
        -- Staff (Admin, Resepsionis, Dokter) get SELECT
        EXECUTE format('CREATE POLICY "Staff_SELECT" ON %I FOR SELECT USING (public.get_user_role() IN (''admin'', ''resepsionis'', ''dokter''))', t);
        
        -- Dokter gets INSERT and UPDATE on all medical record tables
        EXECUTE format('CREATE POLICY "Dokter_INSERT" ON %I FOR INSERT WITH CHECK (public.get_user_role() = ''dokter'')', t);
        EXECUTE format('CREATE POLICY "Dokter_UPDATE" ON %I FOR UPDATE USING (public.get_user_role() = ''dokter'')', t);
    END LOOP;
END $$;

-- 4. Specific DELETE policies for tables that might require row removal
-- tooth_conditions, treatment_plans, visit_treatments, patient_referrals
CREATE POLICY "Dokter_DELETE" ON tooth_conditions FOR DELETE USING (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter_DELETE" ON treatment_plans FOR DELETE USING (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter_DELETE" ON visit_treatments FOR DELETE USING (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter_DELETE" ON patient_referrals FOR DELETE USING (public.get_user_role() = 'dokter');

-- 5. Grant EXECUTE permissions to authenticated users for RPC functions used in transactions
-- Note: These RPCs are already SECURITY DEFINER, so they bypass RLS internally, but the user must be able to call them.
GRANT EXECUTE ON FUNCTION replace_tooth_conditions(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_treatment_plans(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_visit_treatments(UUID, JSONB) TO authenticated;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
