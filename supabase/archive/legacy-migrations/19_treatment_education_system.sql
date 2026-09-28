-- ============================================
-- MIGRATION: 19_treatment_education_system.sql
-- Drop legacy keyword-based treatment education table
-- Create new treatment_id foreign-key-based table
-- Add settings toggle for post-treatment education
-- ============================================

-- 1. Check and Drop or Rename old table
DO $$
DECLARE
  row_count INT;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'treatment_education') THEN
    EXECUTE 'SELECT count(*) FROM treatment_education' INTO row_count;
    IF row_count > 0 THEN
      EXECUTE 'ALTER TABLE treatment_education RENAME TO treatment_education_legacy_backup';
    ELSE
      EXECUTE 'DROP TABLE treatment_education CASCADE';
    END IF;
  END IF;
END $$;

-- 2. Create new table
CREATE TABLE treatment_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE UNIQUE,
  judul TEXT NOT NULL,
  isi_edukasi TEXT NOT NULL,
  edukasi_obat TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add settings toggle with default 'false'
INSERT INTO clinic_settings (key, value) 
VALUES ('wa_post_treatment_education_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 4. Enable RLS
ALTER TABLE treatment_education ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
-- Admin gets ALL privileges
CREATE POLICY "Admin_ALL" ON treatment_education 
FOR ALL USING (public.get_user_role() = 'admin');

-- Staff (Admin, Resepsionis, Dokter) get SELECT
CREATE POLICY "Staff_SELECT" ON treatment_education 
FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));

-- Dokter gets INSERT and UPDATE
CREATE POLICY "Dokter_INSERT" ON treatment_education 
FOR INSERT WITH CHECK (public.get_user_role() = 'dokter');

CREATE POLICY "Dokter_UPDATE" ON treatment_education 
FOR UPDATE USING (public.get_user_role() = 'dokter');

-- 6. Populate treatment_education records based on category and treatment name keywords
INSERT INTO treatment_education (treatment_id, judul, isi_edukasi, edukasi_obat)
SELECT 
  id as treatment_id,
  CASE 
    -- NEW LIGHTWEIGHT TEMPLATES
    WHEN nama_treatment = 'Perawatan Nyeri Akut' THEN 'Edukasi Pasca Perawatan Nyeri Akut'
    WHEN nama_treatment IN ('Topical Fluoride Anak', 'Fissure Sealant', 'Fluoridasi') THEN 'Edukasi Pasca Fluoride / Fissure Sealant'
    WHEN nama_treatment = 'Polishing Gigi' THEN 'Edukasi Pasca Polishing Gigi'
    WHEN nama_treatment = 'Perawatan Gigi Anak' THEN 'Edukasi Pasca Perawatan Gigi Anak'

    -- 1. EKSTRAKSI
    WHEN kategori IN ('Ekstraksi') 
         OR (kategori = 'Bedah' AND (nama_treatment ILIKE '%cabut%' OR nama_treatment ILIKE '%odontektomi%' OR nama_treatment ILIKE '%operculectomy%')) THEN 'Edukasi Pasca Pencabutan Gigi'
         
    -- 2. RESTORASI
    WHEN kategori IN ('Restorasi', 'Restoratif') 
         OR (nama_treatment ILIKE '%tambal%' OR nama_treatment ILIKE '%inlay%' OR nama_treatment ILIKE '%onlay%') THEN 'Edukasi Pasca Penambalan Gigi'
         
    -- 3. ENDODONTIK
    WHEN kategori IN ('Endodontik') 
         OR (nama_treatment ILIKE '%saluran akar%' OR nama_treatment ILIKE '%psa%') THEN 'Edukasi Pasca Perawatan Saluran Akar (PSA)'
         
    -- 10. BEDAH - Implan Gigi (check this before Prostetik/Bedah general)
    WHEN nama_treatment ILIKE '%implant%' OR nama_treatment ILIKE '%implan%' THEN 'Edukasi Pasca Pemasangan Implan Gigi'
         
    -- 4. PROSTETIK - Crown
    WHEN (kategori IN ('Prostetik', 'Prostodonti') OR nama_treatment ILIKE '%crown%' OR nama_treatment ILIKE '%mahkota%' OR nama_treatment ILIKE '%bridge%' OR nama_treatment ILIKE '%jembatan%')
         AND (nama_treatment ILIKE '%crown%' OR nama_treatment ILIKE '%mahkota%' OR nama_treatment ILIKE '%bridge%' OR nama_treatment ILIKE '%jembatan%') THEN 'Edukasi Pasca Pemasangan Mahkota (Crown)'
         
    -- 9. PROSTETIK - Denture
    WHEN (kategori IN ('Prostetik', 'Prostodonti') OR nama_treatment ILIKE '%gigi tiruan%' OR nama_treatment ILIKE '%denture%')
         AND (nama_treatment ILIKE '%gigi tiruan%' OR nama_treatment ILIKE '%denture%' OR nama_treatment ILIKE '%lepasan%') THEN 'Edukasi Pasca Pemasangan Gigi Tiruan Lepasan'
         
    -- 5. PERIODONTAL
    WHEN kategori IN ('Periodontal', 'Periodonti') 
         OR (nama_treatment ILIKE '%scaling%' OR nama_treatment ILIKE '%kuretase%' OR nama_treatment ILIKE '%gingivektomi%') THEN 'Edukasi Pasca Scaling (Pembersihan Karang Gigi)'
         
    -- 6. ORTODONTIK
    WHEN kategori IN ('Ortodontik', 'Ortodonti') 
         AND (nama_treatment ILIKE '%behel%' OR nama_treatment ILIKE '%kawat%' OR nama_treatment ILIKE '%pasang%') THEN 'Edukasi Pasca Pemasangan Behel (Tahap Awal)'
         
    -- 7. ESTETIK - Veneer
    WHEN nama_treatment ILIKE '%veneer%' THEN 'Edukasi Pasca Pemasangan Veneer'
         
    -- 8. ESTETIK - Bleaching
    WHEN nama_treatment ILIKE '%bleaching%' OR nama_treatment ILIKE '%pemutihan%' THEN 'Edukasi Pasca Bleaching (Pemutihan Gigi)'
  END as judul,
  
  CASE 
    -- NEW LIGHTWEIGHT TEMPLATES
    WHEN nama_treatment = 'Perawatan Nyeri Akut' THEN 
'*PETUNJUK SETELAH PERAWATAN NYERI AKUT*

✅ Minum obat pereda nyeri sesuai resep/anjuran dokter
✅ Kompres es di pipi luar bila ada bengkak
✅ Makan makanan lunak sampai nyeri benar-benar reda
✅ Segera buat janji kontrol/lanjutan sesuai arahan dokter — perawatan hari ini biasanya bersifat sementara untuk meredakan nyeri

❌ Jangan tunda kunjungan lanjutan, karena penyebab nyeri perlu ditangani tuntas
❌ Hindari makanan/minuman panas, dingin, atau keras di sisi yang nyeri

⚠️ *Segera hubungi klinik bila:* nyeri tidak membaik dalam 1-2 hari, bengkak bertambah, atau demam muncul.'

    WHEN nama_treatment IN ('Topical Fluoride Anak', 'Fissure Sealant', 'Fluoridasi') THEN 
'*PETUNJUK SETELAH APLIKASI FLUORIDE / FISSURE SEALANT*

✅ Tunggu minimal 30 menit sebelum makan atau minum
✅ Sikat gigi seperti biasa di hari yang sama (boleh, tidak perlu ditunda)

❌ Hindari makan/minum selama 30 menit pertama agar fluoride/sealant menyerap optimal
❌ Hindari makanan sangat keras atau lengket pada hari pertama (khusus fissure sealant)

ℹ️ Lapisan fluoride mungkin terasa sedikit berbeda di gigi untuk sementara — ini normal.

⚠️ *Segera hubungi klinik bila:* sealant terasa lepas/pecah dalam beberapa hari pertama, atau ada reaksi tidak biasa (gatal, bengkak).'

    WHEN nama_treatment = 'Polishing Gigi' THEN 
'*PETUNJUK SETELAH POLISHING GIGI*

✅ Makan dan minum seperti biasa
✅ Sikat gigi seperti biasa di hari yang sama

❌ Hindari makanan/minuman berwarna kuat (kopi, teh, kecap) selama 1 jam pertama, agar permukaan gigi yang baru dipoles tidak cepat ternoda

ℹ️ Gigi mungkin terasa lebih halus dan licin dari biasanya — ini hasil normal dari polishing.

⚠️ *Segera hubungi klinik bila:* muncul rasa ngilu yang tidak biasa atau tidak kunjung membaik.'

    WHEN nama_treatment = 'Perawatan Gigi Anak' THEN 
'*PETUNJUK UNTUK ORANG TUA SETELAH PERAWATAN GIGI ANAK*

✅ Dampingi anak saat makan/minum pertama setelah tindakan, terutama bila masih ada rasa baal di mulut
✅ Pastikan anak tetap sikat gigi 2x sehari dengan didampingi orang tua
✅ Beri pujian/apresiasi agar anak punya pengalaman positif terhadap kunjungan ke dokter gigi
✅ Catat jadwal kontrol berikutnya sesuai anjuran dokter

❌ Jangan biarkan anak menggigit bibir, lidah, atau pipi sendiri saat masih baal (awasi sampai baal hilang)
❌ Hindari memberi makanan/minuman manis berlebihan setelah tindakan

⚠️ *Segera hubungi klinik bila:* anak mengeluh nyeri terus-menerus, ada pembengkakan, atau rewel berkepanjangan yang tidak biasa.'

    -- 1. EKSTRAKSI
    WHEN kategori IN ('Ekstraksi') 
         OR (kategori = 'Bedah' AND (nama_treatment ILIKE '%cabut%' OR nama_treatment ILIKE '%odontektomi%' OR nama_treatment ILIKE '%operculectomy%')) THEN 
'*PETUNJUK PASCA PENCABUTAN GIGI*

✅ Gigit kasa 30-45 menit, ganti bila basah penuh darah
✅ Kompres es di pipi luar 10-15 menit (hari pertama)
✅ Makan makanan lunak & dingin/hangat 24 jam pertama
✅ Kumur air garam hangat mulai hari ke-2

❌ Jangan berkumur keras, meludah, atau pakai sedotan 24 jam pertama
❌ Jangan merokok minimal 24-48 jam
❌ Jangan makanan keras/panas/pedas hari pertama

⚠️ *Segera hubungi klinik bila:* darah tidak berhenti >2 jam, nyeri memburuk di hari ke-3/4, demam, atau bengkak terus membesar.'

    -- 2. RESTORASI
    WHEN kategori IN ('Restorasi', 'Restoratif') 
         OR (nama_treatment ILIKE '%tambal%' OR nama_treatment ILIKE '%inlay%' OR nama_treatment ILIKE '%onlay%') THEN 
'*PETUNJUK PASCA TAMBAL GIGI*

✅ Makan/minum setelah baal hilang sepenuhnya (±2-3 jam)
✅ Sikat gigi seperti biasa, lembut di area tambalan

❌ Jangan makan sebelum baal hilang (cegah tergigit bibir/lidah)
❌ Hindari makanan keras/lengket di hari pertama (tambalan sementara)

ℹ️ Gigi sensitif terhadap dingin/manis beberapa hari adalah wajar.

⚠️ *Segera hubungi klinik bila:* nyeri tajam berdenyut tidak membaik, tambalan lepas/pecah, atau gusi bengkak.'

    -- 3. ENDODONTIK
    WHEN kategori IN ('Endodontik') 
         OR (nama_treatment ILIKE '%saluran akar%' OR nama_treatment ILIKE '%psa%') THEN 
'*PETUNJUK PASCA PERAWATAN SALURAN AKAR (PSA)*

✅ Gunakan sisi mulut sebaliknya untuk mengunyah
✅ Datang sesuai jadwal kontrol — PSA butuh beberapa kali kunjungan
✅ Segera pasang crown setelah PSA tuntas (gigi jadi lebih rapuh)

❌ Jangan gigit makanan keras di gigi yang sedang dirawat
❌ Jangan tunda kunjungan lanjutan (tambalan sementara bisa bocor)

⚠️ *Segera hubungi klinik bila:* nyeri hebat tak terkontrol, bengkak gusi/wajah, tambalan sementara lepas, atau demam.'

    -- 10. BEDAH - Implan Gigi
    WHEN nama_treatment ILIKE '%implant%' OR nama_treatment ILIKE '%implan%' THEN 
'*PETUNJUK PASCA PEMASANGAN IMPLAN GIGI*

✅ Kompres es di pipi luar (20 menit on/off) 24 jam pertama
✅ Makan makanan lunak & dingin/suam-suam kuku ±1 minggu
✅ Minum obat sesuai resep dokter secara teratur, habiskan antibiotik
✅ Kumur air garam hangat mulai hari ke-2 (bila dianjurkan)
✅ Hadiri semua jadwal kontrol untuk pantau penyatuan implan

❌ Hindari rokok total minimal 2 minggu (sangat memengaruhi keberhasilan implan)
❌ Jangan sentuh/tekan area implan dengan lidah/jari
❌ Jangan kunyah makanan keras di sisi implan sampai dokter izinkan
❌ Jangan berkumur keras, meludah kuat, atau pakai sedotan beberapa hari pertama

ℹ️ Bengkak memuncak hari ke-2/3 lalu menurun, nyeri ringan-sedang terkontrol obat, dan memar ringan wajah adalah wajar.

⚠️ *Segera hubungi klinik bila:* darah tak berhenti/bengkak terus membesar setelah hari ke-3, demam/nanah, implan terasa goyang, atau mati rasa bibir/dagu/lidah tak kunjung hilang.'

    -- 4. PROSTETIK - Crown
    WHEN (kategori IN ('Prostetik', 'Prostodonti') OR nama_treatment ILIKE '%crown%' OR nama_treatment ILIKE '%mahkota%' OR nama_treatment ILIKE '%bridge%' OR nama_treatment ILIKE '%jembatan%')
         AND (nama_treatment ILIKE '%crown%' OR nama_treatment ILIKE '%mahkota%' OR nama_treatment ILIKE '%bridge%' OR nama_treatment ILIKE '%jembatan%') THEN 
'*PETUNJUK PASCA PEMASANGAN MAHKOTA (CROWN)*

✅ Makan makanan lunak dulu, terutama untuk crown sementara
✅ Sikat & floss seperti biasa, lembut di tepi mahkota
✅ Tarik benang gigi ke samping, bukan ke atas (untuk crown sementara)

❌ Hindari makanan lengket (permen karet, karamel) — crown sementara bisa tertarik lepas
❌ Hindari makanan sangat keras (es batu, kacang keras)

⚠️ *Segera hubungi klinik bila:* mahkota goyang/lepas, nyeri tajam saat menggigit, atau gusi bengkak/berdarah terus.'

    -- 9. PROSTETIK - Denture
    WHEN (kategori IN ('Prostetik', 'Prostodonti') OR nama_treatment ILIKE '%gigi tiruan%' OR nama_treatment ILIKE '%denture%')
         AND (nama_treatment ILIKE '%gigi tiruan%' OR nama_treatment ILIKE '%denture%' OR nama_treatment ILIKE '%lepasan%') THEN 
'*PETUNJUK PASCA PEMASANGAN GIGI TIRUAN LEPASAN*

✅ Lepas gigi tiruan setiap malam saat tidur
✅ Rendam dalam air bersih/larutan pembersih khusus saat tidak dipakai
✅ Sikat gigi tiruan setiap hari sebelum dipasang kembali
✅ Latihan makan potongan kecil, kunyah perlahan di kedua sisi
✅ Latihan bicara dengan membaca nyaring
✅ Datang kontrol rutin untuk penyesuaian (adjustment)

❌ Jangan rendam/cuci dengan air panas (bisa berubah bentuk)
❌ Jangan gigit makanan keras/lengket langsung, terutama di awal
❌ Jangan tidur dengan gigi tiruan tetap terpasang
❌ Jangan coba sesuaikan/kikir sendiri di rumah

ℹ️ Air liur meningkat & sedikit sulit bicara di awal adalah wajar, akan membaik.

⚠️ *Segera hubungi klinik bila:* luka gusi tak kunjung sembuh, gigi tiruan sangat tidak stabil/patah, atau nyeri hebat menetap meski sudah dilepas.'

    -- 5. PERIODONTAL
    WHEN kategori IN ('Periodontal', 'Periodonti') 
         OR (nama_treatment ILIKE '%scaling%' OR nama_treatment ILIKE '%kuretase%' OR nama_treatment ILIKE '%gingivektomi%') THEN 
'*PETUNJUK PASCA SCALING*

✅ Sikat gigi 2x sehari seperti biasa (sikat bulu lembut)
✅ Kumur air garam hangat bila gusi ngilu
✅ Lanjutkan flossing rutin harian

❌ Hindari makanan/minuman sangat panas, dingin, atau asam 1-2 hari pertama

ℹ️ Gusi sedikit ngilu, sensitif, atau kemerahan 1-3 hari adalah wajar.

⚠️ *Segera hubungi klinik bila:* gusi berdarah terus-menerus, atau nyeri makin memburuk (bukan membaik).'

    -- 6. ORTODONTIK
    WHEN kategori IN ('Ortodontik', 'Ortodonti') 
         AND (nama_treatment ILIKE '%behel%' OR nama_treatment ILIKE '%kawat%' OR nama_treatment ILIKE '%pasang%') THEN 
'*PETUNJUK PASCA PEMASANGAN BEHEL*

✅ Makan makanan lunak beberapa hari pertama
✅ Pakai lilin ortodontik (wax) bila bracket menggesek bibir/pipi
✅ Kumur air garam hangat bila ada luka kecil di mulut
✅ Sikat teliti di sekitar bracket & kawat setelah makan

❌ Hindari makanan keras (es batu, kacang) & lengket (permen karet, karamel)
❌ Potong kecil dulu makanan keras seperti apel/jagung, jangan gigit langsung
❌ Jangan gigit benda keras (pulpen, kuku) dengan gigi

ℹ️ Rasa tertekan/nyeri ringan 3-5 hari & luka kecil di mulut adalah wajar.

⚠️ *Segera hubungi klinik bila:* bracket/kawat lepas atau patah, ujung kawat menusuk dan melukai, atau nyeri sangat hebat.'

    -- 7. ESTETIK - Veneer
    WHEN nama_treatment ILIKE '%veneer%' THEN 
'*PETUNJUK PASCA PEMASANGAN VENEER*

✅ Makan/minum seperti biasa setelah baal hilang
✅ Sikat & floss lembut di sekitar tepi veneer
✅ Gunakan pasta gigi non-abrasif

❌ Hindari kopi, teh, kecap, anggur merah minimal 48 jam pertama
❌ Jangan gigit benda keras langsung (kuku, pulpen, buka kemasan)
❌ Hindari makanan sangat keras/lengket
❌ Hindari rokok (mempercepat perubahan warna veneer komposit)

⚠️ *Segera hubungi klinik bila:* veneer lepas/retak/pecah, tepi terasa tajam, atau nyeri tajam tak membaik.'

    -- 8. ESTETIK - Bleaching
    WHEN nama_treatment ILIKE '%bleaching%' OR nama_treatment ILIKE '%pemutihan%' THEN 
'*PETUNJUK PASCA BLEACHING GIGI*

✅ Makan makanan berwarna terang (nasi putih, dada ayam, susu) selama pantang warna
✅ Sikat gigi seperti biasa, pakai pasta gigi sensitif bila perlu
✅ Ikuti jadwal pemakaian tray/gel sesuai instruksi (untuk take-home)

❌ Hindari kopi, teh, anggur merah, kecap, kunyit minimal 48 jam
❌ Hindari rokok selama masa pantang warna
❌ Hindari minuman bersoda & sangat asam

ℹ️ Gigi ngilu/sensitif 1-3 hari adalah efek samping normal dan biasanya mereda sendiri.

⚠️ *Segera hubungi klinik bila:* nyeri/sensitivitas hebat tak membaik, atau iritasi gusi tak kunjung sembuh.'
  END as isi_edukasi,
  
  CASE 
    -- NEW LIGHTWEIGHT TEMPLATES
    WHEN nama_treatment = 'Perawatan Nyeri Akut' THEN 
'Minum obat pereda nyeri (dan antibiotik bila diresepkan) sesuai jadwal dari dokter. Jangan menunda kunjungan lanjutan meski nyeri sudah mereda.'

    WHEN nama_treatment = 'Perawatan Gigi Anak' THEN 
'Bila dokter meresepkan obat, berikan sesuai dosis dan jadwal yang dianjurkan untuk usia/berat badan anak — jangan menyamakan dosis dengan obat dewasa.'

    -- 1. EKSTRAKSI
    WHEN kategori IN ('Ekstraksi') 
         OR (kategori = 'Bedah' AND (nama_treatment ILIKE '%cabut%' OR nama_treatment ILIKE '%odontektomi%' OR nama_treatment ILIKE '%operculectomy%')) THEN 
'Minum obat pereda nyeri & antibiotik (bila diresepkan) sesuai jadwal dari dokter. Habiskan antibiotik meski sudah merasa membaik.'

    -- 3. ENDODONTIK
    WHEN kategori IN ('Endodontik') 
         OR (nama_treatment ILIKE '%saluran akar%' OR nama_treatment ILIKE '%psa%') THEN 
'Minum obat pereda nyeri & antibiotik (bila diresepkan) sesuai jadwal. Habiskan antibiotik sampai tuntas.'

    -- 10. BEDAH - Implan Gigi
    WHEN nama_treatment ILIKE '%implant%' OR nama_treatment ILIKE '%implan%' THEN 
'Minum obat pereda nyeri & antibiotik sesuai resep dokter, secara teratur. Habiskan antibiotik sampai tuntas meski sudah merasa baik.'
    
    ELSE NULL
  END as edukasi_obat
FROM treatments
WHERE 
  -- We only insert a row if it matches one of our templates!
  (kategori IN ('Ekstraksi') OR (kategori = 'Bedah' AND (nama_treatment ILIKE '%cabut%' OR nama_treatment ILIKE '%odontektomi%' OR nama_treatment ILIKE '%operculectomy%'))) OR
  (kategori IN ('Restorasi', 'Restoratif') OR (nama_treatment ILIKE '%tambal%' OR nama_treatment ILIKE '%inlay%' OR nama_treatment ILIKE '%onlay%')) OR
  (kategori IN ('Endodontik') OR (nama_treatment ILIKE '%saluran akar%' OR nama_treatment ILIKE '%psa%')) OR
  (nama_treatment ILIKE '%implant%' OR nama_treatment ILIKE '%implan%') OR
  ((kategori IN ('Prostetik', 'Prostodonti') OR nama_treatment ILIKE '%crown%' OR nama_treatment ILIKE '%mahkota%' OR nama_treatment ILIKE '%bridge%' OR nama_treatment ILIKE '%jembatan%') AND (nama_treatment ILIKE '%crown%' OR nama_treatment ILIKE '%mahkota%' OR nama_treatment ILIKE '%bridge%' OR nama_treatment ILIKE '%jembatan%')) OR
  ((kategori IN ('Prostetik', 'Prostodonti') OR nama_treatment ILIKE '%gigi tiruan%' OR nama_treatment ILIKE '%denture%') AND (nama_treatment ILIKE '%gigi tiruan%' OR nama_treatment ILIKE '%denture%' OR nama_treatment ILIKE '%lepasan%')) OR
  (kategori IN ('Periodontal', 'Periodonti') OR (nama_treatment ILIKE '%scaling%' OR nama_treatment ILIKE '%kuretase%' OR nama_treatment ILIKE '%gingivektomi%')) OR
  (kategori IN ('Ortodontik', 'Ortodonti') AND (nama_treatment ILIKE '%behel%' OR nama_treatment ILIKE '%kawat%' OR nama_treatment ILIKE '%pasang%')) OR
  (nama_treatment ILIKE '%veneer%') OR
  (nama_treatment ILIKE '%bleaching%' OR nama_treatment ILIKE '%pemutihan%') OR
  (nama_treatment IN ('Perawatan Nyeri Akut', 'Topical Fluoride Anak', 'Fissure Sealant', 'Fluoridasi', 'Polishing Gigi', 'Perawatan Gigi Anak'));

-- 7. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
