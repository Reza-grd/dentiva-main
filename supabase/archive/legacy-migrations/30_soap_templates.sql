-- ============================================
-- MIGRATION: 30_soap_templates.sql
-- Create table for Medical Record SOAP defaults
-- ============================================

CREATE TABLE IF NOT EXISTS soap_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_type TEXT NOT NULL,
  keluhan TEXT,
  pemeriksaan_fisik TEXT,
  diagnosa TEXT,
  terapi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE soap_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Admin gets ALL privileges
DROP POLICY IF EXISTS "Admin_ALL" ON soap_templates;
CREATE POLICY "Admin_ALL" ON soap_templates 
FOR ALL USING (public.get_user_role() = 'admin');

-- Staff (Admin, Resepsionis, Dokter) get SELECT
DROP POLICY IF EXISTS "Staff_SELECT" ON soap_templates;
CREATE POLICY "Staff_SELECT" ON soap_templates 
FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));

-- Insert some default templates
INSERT INTO soap_templates (treatment_type, keluhan, pemeriksaan_fisik, diagnosa, terapi)
VALUES 
  ('Pencabutan Gigi Dewasa', 'Gigi terasa sakit, goyang, dan berlubang besar', 'Gigi tampak karies mencapai pulpa / sisa akar, goyang derajat 3', 'Nekrosis Pulpa / Sisa Akar', 'Odontektomi / Ekstraksi, Pemberian Resep Antibiotik & Analgesik'),
  ('Pembersihan Karang Gigi (Scaling)', 'Gusi sering berdarah saat sikat gigi, mulut terasa bau', 'Terdapat kalkulus supra/subgingiva di regio anterior/posterior, gingiva hiperemis', 'Gingivitis marginalis kronis / Periodontitis', 'Scaling, Root Planing, Edukasi kebersihan mulut'),
  ('Tambal Gigi (Komposit)', 'Gigi ngilu saat makan/minum dingin', 'Karies mencapai dentin pada gigi...', 'Karies Dentin / Pulpitis Reversibel', 'Ekskavasi karies, Restorasi Komposit');
