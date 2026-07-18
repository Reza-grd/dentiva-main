-- Add configurable patient capacity per day to doctor_schedules
ALTER TABLE public.doctor_schedules
  ADD COLUMN IF NOT EXISTS kapasitas_pasien_per_hari INTEGER
  CHECK (kapasitas_pasien_per_hari IS NULL OR kapasitas_pasien_per_hari > 0);
