-- MIGRATION: 10_rls_hardening.sql
-- Description: Hardens Row Level Security (RLS) for patient media and storage buckets to prevent unauthorized access.

-- ==========================================
-- 1. HARDEN STORAGE BUCKET POLICIES
-- ==========================================
-- Currently, radiologi and klinik buckets have "Public Access" which allows anyone on the internet to view X-rays if they have the URL.
-- We must restrict this to authenticated clinic staff only.

-- Drop the insecure public policies
DROP POLICY IF EXISTS "Public Access for radiologi" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for klinik" ON storage.objects;

-- Create secure read policies for storage buckets
-- Only authenticated users (clinic staff) can read media files
CREATE POLICY "Auth Read for radiologi" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'radiologi' AND auth.role() = 'authenticated');

CREATE POLICY "Auth Read for klinik" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'klinik' AND auth.role() = 'authenticated');

-- ==========================================
-- 2. HARDEN PATIENT_MEDIA TABLE POLICIES
-- ==========================================
-- Currently, patient_media allows any 'authenticated' user. We will restrict it to users who actually have a valid role in our users table.

-- Drop the old generic policies
DROP POLICY IF EXISTS "Allow authenticated users to read patient_media" ON patient_media;
DROP POLICY IF EXISTS "Allow authenticated users to insert patient_media" ON patient_media;
DROP POLICY IF EXISTS "Allow authenticated users to update patient_media" ON patient_media;
DROP POLICY IF EXISTS "Allow authenticated users to delete patient_media" ON patient_media;

-- Create strict policies using a subquery to check the users table role
CREATE POLICY "Staff can read patient_media" 
    ON patient_media FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND role IN ('admin', 'dokter', 'resepsionis')
        )
    );

CREATE POLICY "Staff can insert patient_media" 
    ON patient_media FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND role IN ('admin', 'dokter', 'resepsionis')
        )
    );

CREATE POLICY "Staff can update patient_media" 
    ON patient_media FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND role IN ('admin', 'dokter', 'resepsionis')
        )
    );

CREATE POLICY "Staff can delete patient_media" 
    ON patient_media FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND role IN ('admin', 'dokter', 'resepsionis')
        )
    );
