-- MIGRATION: 6_patient_media.sql
-- Description: Create table for patient media and setup storage buckets

-- 1. Create Storage Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('radiologi', 'radiologi', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('klinik', 'klinik', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for radiologi
CREATE POLICY "Public Access for radiologi" ON storage.objects FOR SELECT USING (bucket_id = 'radiologi');
CREATE POLICY "Auth Insert for radiologi" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'radiologi' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete for radiologi" ON storage.objects FOR DELETE USING (bucket_id = 'radiologi' AND auth.role() = 'authenticated');

-- Storage Policies for klinik
CREATE POLICY "Public Access for klinik" ON storage.objects FOR SELECT USING (bucket_id = 'klinik');
CREATE POLICY "Auth Insert for klinik" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'klinik' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete for klinik" ON storage.objects FOR DELETE USING (bucket_id = 'klinik' AND auth.role() = 'authenticated');

-- 2. Create patient_media table
CREATE TABLE IF NOT EXISTS patient_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES patient_visits(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('panoramic', 'cephalometric', 'dental', 'intraoral', 'extraoral')),
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    caption TEXT,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_media_patient_id ON patient_media(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_media_visit_id ON patient_media(visit_id);

-- Enable RLS
ALTER TABLE patient_media ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for patient_media table
CREATE POLICY "Allow authenticated users to read patient_media" 
    ON patient_media FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert patient_media" 
    ON patient_media FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update patient_media" 
    ON patient_media FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete patient_media" 
    ON patient_media FOR DELETE 
    USING (auth.role() = 'authenticated');
