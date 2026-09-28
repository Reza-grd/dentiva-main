-- Fix Doctor "Mulai" button crash
DROP POLICY IF EXISTS "Dokter can update visits" ON visits;
CREATE POLICY "Dokter can update visits"
ON visits FOR UPDATE
USING (public.get_user_role() = 'dokter');

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
