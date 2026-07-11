-- ============================================
-- MIGRATION: 17_whatsapp_system.sql
-- Dentiva WhatsApp Patient Communication
-- ============================================

-- 1. Add wa_sent flag to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS wa_sent BOOLEAN DEFAULT false;

-- 2. clinic_settings table
CREATE TABLE IF NOT EXISTS clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO clinic_settings (key, value) VALUES
  ('clinic_name', 'Dentiva Dental Clinic'),
  ('clinic_phone', ''),
  ('fonnte_token', ''),
  ('wa_payment_confirmation_enabled', 'true'),
  ('wa_reminder_h1_day_enabled', 'true'),
  ('wa_reminder_h1_hour_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 3. Seed treatments table (with kode_treatment)
INSERT INTO treatments (kode_treatment, nama_treatment, kategori, harga_dasar, durasi_menit, deskripsi) VALUES
  ('TRT-001', 'Tambal Komposit', 'Restorasi', 150000, 30, 'Penambalan gigi dengan bahan komposit'),
  ('TRT-002', 'Tambal Amalgam', 'Restorasi', 100000, 30, 'Penambalan gigi dengan bahan amalgam'),
  ('TRT-003', 'Cabut Gigi Susu', 'Ekstraksi', 75000, 20, 'Pencabutan gigi susu'),
  ('TRT-004', 'Cabut Gigi Permanen', 'Ekstraksi', 150000, 30, 'Pencabutan gigi permanen'),
  ('TRT-005', 'Scaling', 'Periodontal', 200000, 45, 'Pembersihan karang gigi'),
  ('TRT-006', 'Perawatan Saluran Akar (PSA)', 'Endodontik', 500000, 90, 'Perawatan saluran akar gigi'),
  ('TRT-007', 'Pemasangan Mahkota (Crown)', 'Prostetik', 800000, 60, 'Pemasangan mahkota gigi'),
  ('TRT-008', 'Veneer', 'Estetik', 700000, 60, 'Pemasangan veneer gigi'),
  ('TRT-009', 'Bleaching', 'Estetik', 600000, 60, 'Pemutihan gigi'),
  ('TRT-010', 'Gigi Tiruan Lepasan', 'Prostetik', 1500000, 90, 'Pembuatan gigi tiruan lepasan'),
  ('TRT-011', 'Implant Gigi', 'Bedah', 8000000, 120, 'Pemasangan implant gigi'),
  ('TRT-012', 'Ortodonti/Kawat Gigi', 'Ortodontik', 5000000, 60, 'Pemasangan kawat gigi')
ON CONFLICT (kode_treatment) DO NOTHING;

-- 4. treatment_education table
CREATE TABLE IF NOT EXISTS treatment_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  keyword TEXT NOT NULL,
  education_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO treatment_education (keyword, education_text) VALUES
  ('tambal', 'Hindari makan dan minum selama 1 jam. Hindari makanan keras dan lengket pada sisi yang ditambal selama 24 jam. Sikat gigi dengan lembut di area tersebut.'),
  ('cabut', 'Gigit kapas/kasa selama 30 menit. Hindari berkumur keras, meludah, dan menggunakan sedotan selama 24 jam. Hindari makanan panas, keras, dan pedas. Kompres es jika bengkak. Minum obat sesuai anjuran dokter.'),
  ('scaling', 'Gusi mungkin terasa sensitif dan sedikit berdarah 1-2 hari setelah tindakan — ini normal. Sikat gigi 2x sehari dengan sikat berbulu lembut. Gunakan obat kumur antiseptik jika diresepkan.'),
  ('saluran akar', 'Hindari mengunyah pada sisi gigi yang dirawat. Minum obat pereda nyeri dan antibiotik sesuai resep dokter. Segera hubungi klinik jika nyeri bertambah hebat atau bengkak.'),
  ('psa', 'Hindari mengunyah pada sisi gigi yang dirawat. Minum obat pereda nyeri dan antibiotik sesuai resep dokter. Segera hubungi klinik jika nyeri bertambah hebat atau bengkak.'),
  ('crown', 'Hindari makanan lengket dan sangat keras. Sikat dan floss secara normal namun hati-hati di area mahkota. Kembali kontrol sesuai jadwal yang ditentukan.'),
  ('mahkota', 'Hindari makanan lengket dan sangat keras. Sikat dan floss secara normal namun hati-hati di area mahkota. Kembali kontrol sesuai jadwal yang ditentukan.'),
  ('veneer', 'Hindari makanan dan minuman berwarna kuat (kopi, teh, kecap) selama 48 jam pertama. Hindari menggigit benda keras langsung dengan veneer. Sikat gigi dengan pasta gigi non-abrasif.'),
  ('bleaching', 'Hindari kopi, teh, rokok, dan makanan berwarna selama 48 jam. Sensitivitas gigi ringan setelah bleaching adalah normal. Gunakan pasta gigi sensitif jika diperlukan.'),
  ('gigi tiruan', 'Latihan berbicara dan makan secara perlahan. Lepas gigi tiruan saat tidur dan rendam dalam air bersih atau larutan pembersih khusus. Sikat gigi tiruan setiap hari.'),
  ('implant', 'Kompres es area pipi 20 menit on/off selama 24 jam pertama. Hindari merokok selama minimal 2 minggu. Konsumsi makanan lunak selama 1 minggu. Kontrol sesuai jadwal yang ditetapkan dokter.'),
  ('kawat', 'Hindari makanan keras, lengket, dan bergetah. Sikat gigi lebih teliti setelah setiap makan menggunakan sikat interdental. Gunakan wax orthodontic jika kawat mengiritasi gusi.'),
  ('ortodonti', 'Hindari makanan keras, lengket, dan bergetah. Sikat gigi lebih teliti setelah setiap makan menggunakan sikat interdental. Gunakan wax orthodontic jika kawat mengiritasi gusi.')
ON CONFLICT DO NOTHING;

-- 5. master_obat table
CREATE TABLE IF NOT EXISTS master_obat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_obat TEXT NOT NULL,
  satuan TEXT NOT NULL DEFAULT 'tablet',
  harga_satuan NUMERIC NOT NULL DEFAULT 0,
  dosis_default TEXT,
  frekuensi_default TEXT,
  education_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO master_obat (nama_obat, satuan, harga_satuan, dosis_default, frekuensi_default, education_text) VALUES
  ('Amoxicillin 500mg', 'kapsul', 3000, '1 kapsul', '3x sehari selama 5 hari', 'Minum setiap 8 jam secara teratur. HABISKAN antibiotik meski sudah merasa membaik. Jangan hentikan di tengah jalan.'),
  ('Metronidazole 500mg', 'tablet', 2500, '1 tablet', '3x sehari selama 5 hari', 'Minum setelah makan. JANGAN mengonsumsi alkohol selama pengobatan dan 48 jam setelahnya.'),
  ('Asam Mefenamat 500mg', 'tablet', 2000, '1 tablet', '3x sehari jika nyeri', 'Minum SETELAH MAKAN untuk menghindari gangguan lambung. Hentikan jika timbul nyeri ulu hati.'),
  ('Paracetamol 500mg', 'tablet', 1000, '1-2 tablet', '3x sehari jika nyeri/demam', 'Minum saat nyeri atau demam. Jangan melebihi 8 tablet dalam 24 jam. Aman diminum sebelum atau sesudah makan.'),
  ('Dexamethasone 0.5mg', 'tablet', 1500, '1 tablet', 'Sesuai anjuran dokter', 'Minum sesuai dosis yang diresepkan dokter. Jangan menghentikan obat secara tiba-tiba tanpa konsultasi dokter.'),
  ('Clindamycin 300mg', 'kapsul', 5000, '1 kapsul', '3x sehari selama 5 hari', 'Minum dengan segelas penuh air. HABISKAN antibiotik sesuai durasi yang diresepkan dokter.'),
  ('Chlorhexidine Mouthwash', 'ml', 15000, '15 ml', '2x sehari pagi dan malam', 'Kumur selama 30 detik lalu buang — JANGAN ditelan. Gunakan setelah sikat gigi. Hindari makan/minum 30 menit setelah berkumur.')
ON CONFLICT DO NOTHING;

-- 6. visit_obat table
CREATE TABLE IF NOT EXISTS visit_obat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  obat_id UUID REFERENCES master_obat(id),
  nama_obat TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  harga_satuan NUMERIC NOT NULL,
  subtotal NUMERIC GENERATED ALWAYS AS (qty * harga_satuan) STORED,
  dosis TEXT,
  frekuensi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('H-1_day', 'H-1_hour')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_visit_obat_visit_id ON visit_obat(visit_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_visit_id ON reminder_logs(visit_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_type_sent ON reminder_logs(visit_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_clinic_settings_key ON clinic_settings(key);

-- 9. RLS
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_obat ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_obat ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access clinic_settings" ON clinic_settings FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff read clinic_settings" ON clinic_settings FOR SELECT USING (public.get_user_role() IN ('admin', 'dokter', 'resepsionis'));
CREATE POLICY "Staff read treatment_education" ON treatment_education FOR SELECT USING (public.get_user_role() IN ('admin', 'dokter', 'resepsionis'));
CREATE POLICY "Admin manage treatment_education" ON treatment_education FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff read master_obat" ON master_obat FOR SELECT USING (public.get_user_role() IN ('admin', 'dokter', 'resepsionis'));
CREATE POLICY "Admin manage master_obat" ON master_obat FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff manage visit_obat" ON visit_obat FOR ALL USING (public.get_user_role() IN ('admin', 'resepsionis'));
CREATE POLICY "Staff read reminder_logs" ON reminder_logs FOR SELECT USING (public.get_user_role() = 'admin');

NOTIFY pgrst, 'reload schema';