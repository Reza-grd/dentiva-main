-- 50. Medication Form Coding (Kemenkes System) & STR Qualification Default

-- 1. Add kode_bentuk_sediaan column to master_bahan
ALTER TABLE public.master_bahan 
ADD COLUMN IF NOT EXISTS kode_bentuk_sediaan TEXT DEFAULT 'BS066'; -- Default: BS066 (Tablet) per Kemenkes CodeSystem medication-form

-- 2. Update default value for qualification_code in users
ALTER TABLE public.users 
ALTER COLUMN qualification_code SET DEFAULT 'STR-KKI';
