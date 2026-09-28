-- 14_rls_fixes.sql
-- Fixes broken RLS policies that incorrectly relied on auth.jwt()->>'role' instead of the public.users table

-- Create a helper function to get current user role securely (Optional but recommended for performance to avoid repeating subqueries)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- PATIENTS
DROP POLICY IF EXISTS "Admins have full access to patients" ON patients;
DROP POLICY IF EXISTS "Staff can view patients" ON patients;
DROP POLICY IF EXISTS "Resepsionis can modify patients" ON patients;
DROP POLICY IF EXISTS "Resepsionis can update patients" ON patients;

CREATE POLICY "Admins have full access to patients" ON patients FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view patients" ON patients FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Resepsionis can modify patients" ON patients FOR INSERT WITH CHECK (public.get_user_role() = 'resepsionis');
CREATE POLICY "Resepsionis can update patients" ON patients FOR UPDATE USING (public.get_user_role() = 'resepsionis');

-- VISITS
DROP POLICY IF EXISTS "Admins have full access to visits" ON visits;
DROP POLICY IF EXISTS "Staff can view visits" ON visits;
DROP POLICY IF EXISTS "Resepsionis can modify visits" ON visits;
DROP POLICY IF EXISTS "Resepsionis can update visits" ON visits;

CREATE POLICY "Admins have full access to visits" ON visits FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view visits" ON visits FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Resepsionis can modify visits" ON visits FOR INSERT WITH CHECK (public.get_user_role() = 'resepsionis');
CREATE POLICY "Resepsionis can update visits" ON visits FOR UPDATE USING (public.get_user_role() = 'resepsionis');

-- PAYMENTS
DROP POLICY IF EXISTS "Admins have full access to payments" ON payments;
DROP POLICY IF EXISTS "Staff can view payments" ON payments;
DROP POLICY IF EXISTS "Resepsionis can modify payments" ON payments;
DROP POLICY IF EXISTS "Resepsionis can update payments" ON payments;

CREATE POLICY "Admins have full access to payments" ON payments FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view payments" ON payments FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Resepsionis can modify payments" ON payments FOR INSERT WITH CHECK (public.get_user_role() = 'resepsionis');
CREATE POLICY "Resepsionis can update payments" ON payments FOR UPDATE USING (public.get_user_role() = 'resepsionis');

-- CLINICAL DATA
DROP POLICY IF EXISTS "Admins have full access to clinical_data" ON clinical_data;
DROP POLICY IF EXISTS "Staff can view clinical_data" ON clinical_data;
DROP POLICY IF EXISTS "Dokter can modify clinical_data" ON clinical_data;
DROP POLICY IF EXISTS "Dokter can update clinical_data" ON clinical_data;

CREATE POLICY "Admins have full access to clinical_data" ON clinical_data FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view clinical_data" ON clinical_data FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Dokter can modify clinical_data" ON clinical_data FOR INSERT WITH CHECK (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter can update clinical_data" ON clinical_data FOR UPDATE USING (public.get_user_role() = 'dokter');

-- VISIT TREATMENTS
DROP POLICY IF EXISTS "Admins have full access to visit_treatments" ON visit_treatments;
DROP POLICY IF EXISTS "Staff can view visit_treatments" ON visit_treatments;
DROP POLICY IF EXISTS "Dokter can modify visit_treatments" ON visit_treatments;
DROP POLICY IF EXISTS "Dokter can update visit_treatments" ON visit_treatments;
DROP POLICY IF EXISTS "Dokter can delete visit_treatments" ON visit_treatments;

CREATE POLICY "Admins have full access to visit_treatments" ON visit_treatments FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view visit_treatments" ON visit_treatments FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Dokter can modify visit_treatments" ON visit_treatments FOR INSERT WITH CHECK (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter can update visit_treatments" ON visit_treatments FOR UPDATE USING (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter can delete visit_treatments" ON visit_treatments FOR DELETE USING (public.get_user_role() = 'dokter');
