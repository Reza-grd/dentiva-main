-- ============================================
-- MIGRATION: 21_education_keywords.sql
-- Add keywords array to treatment_education_templates for fuzzy matching
-- ============================================

-- 1. Add keywords column
ALTER TABLE treatment_education_templates 
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- 2. Backfill common keywords
UPDATE treatment_education_templates
SET keywords = ARRAY['scaling', 'pembersihan karang', 'periodontal', 'kuretase']
WHERE treatment_type ILIKE '%scaling%';

UPDATE treatment_education_templates
SET keywords = ARRAY['cabut', 'pencabutan', 'ekstraksi', 'odontektomi']
WHERE treatment_type ILIKE '%cabut%';

UPDATE treatment_education_templates
SET keywords = ARRAY['tambal', 'restorasi', 'komposit', 'inlay', 'onlay']
WHERE treatment_type ILIKE '%tambal%';

UPDATE treatment_education_templates
SET keywords = ARRAY['saluran akar', 'psa', 'endodontik']
WHERE treatment_type ILIKE '%saluran akar%' OR treatment_type ILIKE '%psa%';

UPDATE treatment_education_templates
SET keywords = ARRAY['implan', 'implant', 'tanam']
WHERE treatment_type ILIKE '%implan%';

UPDATE treatment_education_templates
SET keywords = ARRAY['crown', 'mahkota', 'jembatan', 'bridge']
WHERE treatment_type ILIKE '%mahkota%' OR treatment_type ILIKE '%crown%';

UPDATE treatment_education_templates
SET keywords = ARRAY['gigi tiruan', 'denture', 'lepasan', 'palsu']
WHERE treatment_type ILIKE '%gigi tiruan%' OR treatment_type ILIKE '%denture%';

UPDATE treatment_education_templates
SET keywords = ARRAY['behel', 'kawat', 'pasang behel', 'ortodonti', 'orthodonti']
WHERE treatment_type ILIKE '%behel%';

UPDATE treatment_education_templates
SET keywords = ARRAY['veneer', 'estetik']
WHERE treatment_type ILIKE '%veneer%';

UPDATE treatment_education_templates
SET keywords = ARRAY['bleaching', 'pemutihan']
WHERE treatment_type ILIKE '%bleaching%';

UPDATE treatment_education_templates
SET keywords = ARRAY['nyeri', 'akut', 'darurat']
WHERE treatment_type ILIKE '%nyeri%';

UPDATE treatment_education_templates
SET keywords = ARRAY['anak', 'pedodonti', 'gigi susu']
WHERE treatment_type ILIKE '%anak%';

UPDATE treatment_education_templates
SET keywords = ARRAY['fluoride', 'fissure', 'sealant']
WHERE treatment_type ILIKE '%fluoride%' OR treatment_type ILIKE '%sealant%';

UPDATE treatment_education_templates
SET keywords = ARRAY['polishing', 'poles']
WHERE treatment_type ILIKE '%polishing%' OR treatment_type ILIKE '%poles%';

-- Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
