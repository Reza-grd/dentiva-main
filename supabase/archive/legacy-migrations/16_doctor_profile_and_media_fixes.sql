-- MIGRATION: 16_doctor_profile_and_media_fixes.sql
-- Description: Extends users table, updates media category constraints, and configures avatars storage bucket.

-- 1. Extend public.users table with doctor-specific fields
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS gelar_depan TEXT,
ADD COLUMN IF NOT EXISTS gelar_belakang TEXT,
ADD COLUMN IF NOT EXISTS foto_profil TEXT,
ADD COLUMN IF NOT EXISTS jenis_dokter TEXT CHECK (jenis_dokter IN ('umum', 'spesialis')),
ADD COLUMN IF NOT EXISTS spesialisasi TEXT,
ADD COLUMN IF NOT EXISTS no_str TEXT,
ADD COLUMN IF NOT EXISTS no_sip TEXT,
ADD COLUMN IF NOT EXISTS no_telepon TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Fix patient_media category constraint to include 'other' (Lainnya)
ALTER TABLE patient_media DROP CONSTRAINT IF EXISTS patient_media_category_check;
ALTER TABLE patient_media ADD CONSTRAINT patient_media_category_check 
CHECK (category IN ('panoramic', 'cephalometric', 'dental', 'intraoral', 'extraoral', 'other'));

-- 3. Create avatars storage bucket and configure policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Recreate storage policies for public avatars
DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects;
CREATE POLICY "Public Access for avatars" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Auth Insert for avatars" ON storage.objects;
CREATE POLICY "Auth Insert for avatars" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Update for avatars" ON storage.objects;
CREATE POLICY "Auth Update for avatars" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Delete for avatars" ON storage.objects;
CREATE POLICY "Auth Delete for avatars" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
