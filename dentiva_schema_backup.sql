-- =====================================================================
-- DENTIVA — CONSOLIDATED MASTER SQL (ALL-IN-ONE SCHEMA BACKUP)
-- File: dentiva_schema_backup.sql
-- Description: Fully consolidated database script to recreate the entire
--              Dentiva schema from scratch (tables, indexes, views, 
--              functions, triggers, RLS, storage buckets, and seed data).
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 1: EXTENSIONS & SEQUENCE
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS seq_no_rm START 1;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 2: SECURITY & HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 3: TABEL UTAMA & INDEX
-- ─────────────────────────────────────────────────────────────────────

-- 3.1. USERS
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'dokter', 'resepsionis')),
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  gelar_depan TEXT,
  gelar_belakang TEXT,
  foto_profil TEXT,
  jenis_dokter TEXT CHECK (jenis_dokter IN ('umum', 'spesialis')),
  spesialisasi TEXT,
  no_str TEXT,
  no_sip TEXT,
  no_telepon TEXT,
  bio TEXT
);

-- 3.2. PATIENTS
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  no_rm VARCHAR(50) UNIQUE NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  nama_kk VARCHAR(255),
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
  umur INTEGER,
  alamat TEXT,
  no_wa VARCHAR(20),
  no_telepon VARCHAR(20),
  pekerjaan VARCHAR(100),
  status_pernikahan VARCHAR(50),
  jaminan_kesehatan VARCHAR(100),
  golongan_darah VARCHAR(5),
  keluhan_awal TEXT,
  foto_profile TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  registered_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  wa_consent BOOLEAN NOT NULL DEFAULT false,
  agama VARCHAR(50),
  pendidikan_terakhir VARCHAR(20),
  dokter_keluarga VARCHAR(255),
  dokter_gigi_keluarga VARCHAR(255),
  rujukan_dari VARCHAR(255),
  berat_badan NUMERIC(5,1),
  tinggi_badan NUMERIC(5,1),
  alamat_detail TEXT,
  provinsi VARCHAR(100),
  alamat_kabupaten VARCHAR(100), -- renamed to avoid conflicts with reserved words, wait, check migration
  alamat_kecamatan VARCHAR(100),
  alamat_desa VARCHAR(100),
  provinsi_nama VARCHAR(100),
  kabupaten VARCHAR(100),
  kecamatan VARCHAR(100),
  desa VARCHAR(100),
  CONSTRAINT chk_status_pernikahan CHECK (status_pernikahan IN ('Belum Menikah', 'Menikah', 'Duda/Janda', 'Cerai'))
);

-- 3.3. MEDICAL HISTORY
CREATE TABLE IF NOT EXISTS public.medical_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  hipertensi BOOLEAN DEFAULT false,
  jantung BOOLEAN DEFAULT false,
  asma BOOLEAN DEFAULT false,
  diabetes BOOLEAN DEFAULT false,
  alergi BOOLEAN DEFAULT false,
  alergi_detail TEXT,
  riwayat_lain TEXT,
  stroke BOOLEAN DEFAULT false,
  ginjal BOOLEAN DEFAULT false,
  hepatitis BOOLEAN DEFAULT false,
  tuberkulosis BOOLEAN DEFAULT false,
  kanker BOOLEAN DEFAULT false,
  hiv BOOLEAN DEFAULT false,
  thalassemia BOOLEAN DEFAULT false,
  hemofilia BOOLEAN DEFAULT false,
  osteoporosis BOOLEAN DEFAULT false,
  tiroid BOOLEAN DEFAULT false,
  asam_urat BOOLEAN DEFAULT false,
  reumatik BOOLEAN DEFAULT false,
  epilepsi BOOLEAN DEFAULT false,
  glaukoma BOOLEAN DEFAULT false,
  covid19 BOOLEAN DEFAULT false,
  konsumsi_obat TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

-- 3.4. CLINICAL DATA
CREATE TABLE IF NOT EXISTS public.clinical_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  oklusi VARCHAR(100),
  torus_palatinus VARCHAR(100),
  torus_mandibularis VARCHAR(100),
  palatum VARCHAR(100),
  supernumery_teeth VARCHAR(100),
  diastema VARCHAR(100),
  gigi_anomali VARCHAR(100),
  lain_lain TEXT,
  tanggal_pencatatan DATE DEFAULT CURRENT_DATE,
  diagnosis_list JSONB DEFAULT '[]'::jsonb,
  treatment_list JSONB DEFAULT '[]'::jsonb,
  total_treatment_cost INTEGER DEFAULT 0,
  diagnosis_additional_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

-- 3.5. TOOTH CONDITIONS
CREATE TABLE IF NOT EXISTS public.tooth_conditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number INTEGER NOT NULL,
  condition_type VARCHAR(50) NOT NULL,
  condition_code VARCHAR(50) NOT NULL,
  surface VARCHAR(50),
  has_rct BOOLEAN DEFAULT false,
  notes TEXT,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tooth_conditions_patient ON public.tooth_conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_tooth_conditions_tooth ON public.tooth_conditions(tooth_number);

-- 3.6. VISITS
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_number INTEGER NOT NULL DEFAULT 1,
  tanggal_kunjungan DATE NOT NULL DEFAULT CURRENT_DATE,
  jam_kunjungan TIME,
  keluhan TEXT,
  pemeriksaan_fisik TEXT,
  diagnosa TEXT,
  kode_icd10 VARCHAR(50),
  terapi TEXT,
  catatan_dokter TEXT,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  dokter_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON public.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON public.visits(tanggal_kunjungan);
CREATE INDEX IF NOT EXISTS idx_visits_date_status ON public.visits(tanggal_kunjungan, status);
CREATE INDEX IF NOT EXISTS idx_visits_dokter_tanggal ON public.visits(dokter_id, tanggal_kunjungan DESC);
CREATE INDEX IF NOT EXISTS idx_visits_tanggal_desc ON public.visits(tanggal_kunjungan DESC);
CREATE INDEX IF NOT EXISTS idx_visits_patient_number ON public.visits(patient_id, visit_number);
CREATE INDEX IF NOT EXISTS idx_visits_dokter_date ON public.visits(dokter_id, tanggal_kunjungan);
CREATE INDEX IF NOT EXISTS idx_visits_date_jam ON public.visits(tanggal_kunjungan, jam_kunjungan) WHERE jam_kunjungan IS NOT NULL;

-- 3.7. TREATMENTS
CREATE TABLE IF NOT EXISTS public.treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode_treatment VARCHAR(50) UNIQUE NOT NULL,
  nama_treatment VARCHAR(255) NOT NULL,
  kategori VARCHAR(100),
  harga_dasar DECIMAL(15,2) NOT NULL,
  durasi_menit INTEGER,
  deskripsi TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.8. VISIT TREATMENTS
CREATE TABLE IF NOT EXISTS public.visit_treatments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES public.treatments(id),
  tooth_number INTEGER,
  quantity INTEGER DEFAULT 1,
  harga_satuan DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_treatments_visit ON public.visit_treatments(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_treatments_treatment ON public.visit_treatments(treatment_id);

-- 3.9. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  tanggal_pembayaran DATE NOT NULL DEFAULT CURRENT_DATE,
  total_treatment DECIMAL(15,2) NOT NULL DEFAULT 0,
  biaya_tambahan DECIMAL(15,2) DEFAULT 0,
  keterangan_tambahan TEXT,
  diskon DECIMAL(15,2) DEFAULT 0,
  total_bayar DECIMAL(15,2) NOT NULL,
  jumlah_bayar DECIMAL(15,2) DEFAULT 0,
  kembalian DECIMAL(15,2) DEFAULT 0,
  metode_pembayaran VARCHAR(50) CHECK (metode_pembayaran IN ('cash', 'transfer', 'debit', 'credit', 'insurance')),
  status_pembayaran VARCHAR(50) DEFAULT 'pending',
  processed_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  wa_sent BOOLEAN DEFAULT false,
  CONSTRAINT unique_visit_payment UNIQUE(visit_id),
  CONSTRAINT chk_status_pembayaran CHECK (status_pembayaran IN ('paid', 'pending', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_payments_patient ON public.payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(tanggal_pembayaran);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_payments_status_date ON public.payments(status_pembayaran, tanggal_pembayaran);
CREATE INDEX IF NOT EXISTS idx_payments_visit ON public.payments(visit_id);

-- 3.10. FINANCIAL REPORTS
CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_expenses DECIMAL(15,2) DEFAULT 0,
  net_income DECIMAL(15,2) DEFAULT 0,
  total_patients INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  report_type VARCHAR(50) CHECK (report_type IN ('daily', 'monthly', 'yearly')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID REFERENCES public.users(id),
  UNIQUE(report_date, report_type)
);

CREATE INDEX IF NOT EXISTS idx_financial_reports_date ON public.financial_reports(report_date);

-- 3.11. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tanggal_expense DATE NOT NULL DEFAULT CURRENT_DATE,
  kategori VARCHAR(100) NOT NULL,
  deskripsi TEXT NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL,
  bukti_url TEXT,
  recorded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(tanggal_expense);
CREATE INDEX IF NOT EXISTS idx_expenses_kategori ON public.expenses(kategori);

-- 3.12. PERIODONTAL DATA
CREATE TABLE IF NOT EXISTS public.periodontal_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  ohi_s VARCHAR(50),
  calculus VARCHAR(100),
  plak_indeks VARCHAR(50),
  bop VARCHAR(50),
  mobility VARCHAR(50),
  furkasi VARCHAR(50),
  pocket_depth TEXT,
  resesi_gingiva TEXT,
  kondisi_gingiva TEXT,
  kondisi_mukosa TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

CREATE INDEX IF NOT EXISTS idx_periodontal_patient ON public.periodontal_data(patient_id);

-- 3.13. EXTRA ORAL DATA
CREATE TABLE IF NOT EXISTS public.extra_oral_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  wajah VARCHAR(50),
  bibir VARCHAR(50),
  pipi VARCHAR(100),
  kelenjar_getah_bening VARCHAR(100),
  temporomandibular VARCHAR(100),
  otot_pengunyahan VARCHAR(100),
  keterangan TEXT,
  riwayat_perawatan VARCHAR(50) DEFAULT 'belum_dirawat',
  riwayat_perawatan_keterangan TEXT,
  kebiasaan_buruk TEXT,
  riwayat_sosial TEXT,
  bibir_keterangan TEXT,
  kgb_kanan VARCHAR(100) DEFAULT 'tidak_teraba',
  kgb_kanan_sakit VARCHAR(20) DEFAULT '',
  kgb_kiri VARCHAR(100) DEFAULT 'tidak_teraba',
  kgb_kiri_sakit VARCHAR(20) DEFAULT '',
  kelenjar_lainnya TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

CREATE INDEX IF NOT EXISTS idx_extra_oral_patient ON public.extra_oral_data(patient_id);

-- 3.14. INTRA ORAL DATA
CREATE TABLE IF NOT EXISTS public.intra_oral_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  debri VARCHAR(20) DEFAULT 'tidak_ada',
  debri_regio TEXT,
  plak VARCHAR(20) DEFAULT 'tidak_ada',
  plak_regio TEXT,
  kalkulus VARCHAR(20) DEFAULT 'tidak_ada',
  kalkulus_regio TEXT,
  perdarahan_papila VARCHAR(20) DEFAULT 'tidak_ada',
  perdarahan_papila_regio TEXT,
  risiko_karies VARCHAR(20) DEFAULT 'tidak_ada',
  ph_plak TEXT,
  ph_plak_tinggi BOOLEAN DEFAULT false,
  ph_saliva TEXT,
  ph_saliva_tinggi BOOLEAN DEFAULT false,
  gingiva VARCHAR(20) DEFAULT 'sehat',
  gingiva_keterangan TEXT,
  mukosa VARCHAR(20) DEFAULT 'sehat',
  mukosa_keterangan TEXT,
  palatum VARCHAR(20) DEFAULT 'sehat',
  palatum_keterangan TEXT,
  lidah VARCHAR(20) DEFAULT 'sehat',
  lidah_keterangan TEXT,
  dasar_mulut VARCHAR(20) DEFAULT 'sehat',
  dasar_mulut_keterangan TEXT,
  hubungan_rahang VARCHAR(20) DEFAULT 'ortognati',
  kelainan_gigi_geligi VARCHAR(20) DEFAULT 'tidak_ada',
  kelainan_gigi_geligi_keterangan TEXT,
  lain_lain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

CREATE INDEX IF NOT EXISTS idx_intra_oral_data_patient_id ON public.intra_oral_data (patient_id);

-- 3.15. ODONTOGRAM META
CREATE TABLE IF NOT EXISTS public.odontogram_meta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  relasi_molar_kanan VARCHAR(10) DEFAULT '',
  relasi_molar_kiri  VARCHAR(10) DEFAULT '',
  catatan_odontogram TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

CREATE INDEX IF NOT EXISTS idx_odontogram_meta_patient_id ON public.odontogram_meta (patient_id);

-- 3.16. TREATMENT PLANS
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  prioritas INTEGER NOT NULL DEFAULT 1,
  tindakan TEXT NOT NULL,
  gigi VARCHAR(50),
  keterangan TEXT,
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_prio ON public.treatment_plans(patient_id, prioritas);

-- 3.17. INVOICE COUNTERS
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  month_key CHAR(6) PRIMARY KEY,
  last_number INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_counters_month ON public.invoice_counters(month_key);

-- 3.18. DOCTOR SCHEDULES
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    dokter_id    UUID      NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    hari         SMALLINT  NOT NULL CHECK (hari BETWEEN 0 AND 6),
    jam_mulai    TIME      NOT NULL,
    jam_selesai  TIME      NOT NULL,
    keterangan   TEXT,
    is_active    BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_doctor_schedules_jam CHECK (jam_selesai > jam_mulai),
    UNIQUE (dokter_id, hari)
);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_hari ON public.doctor_schedules (hari, is_active);
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_dokter ON public.doctor_schedules (dokter_id);

-- 3.19. CLINIC SETTINGS
CREATE TABLE IF NOT EXISTS public.clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_settings_key ON clinic_settings(key);

-- 3.20. MASTER OBAT
CREATE TABLE IF NOT EXISTS public.master_obat (
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

-- 3.21. VISIT OBAT
CREATE TABLE IF NOT EXISTS public.visit_obat (
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

CREATE INDEX IF NOT EXISTS idx_visit_obat_visit_id ON visit_obat(visit_id);

-- 3.22. NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL,
    status TEXT NOT NULL,
    gateway_response TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 3.23. TREATMENT EDUCATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.treatment_education_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_type TEXT UNIQUE NOT NULL,
    education_text TEXT,
    medication_instructions TEXT,
    last_updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    keywords TEXT[] DEFAULT '{}'
);

-- 3.24. PATIENT MEDIA
CREATE TABLE IF NOT EXISTS public.patient_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    category TEXT NOT NULL CHECK (category IN ('panoramic', 'cephalometric', 'dental', 'intraoral', 'extraoral', 'other')),
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    caption TEXT,
    notes TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_media_patient_id ON patient_media(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_media_visit_id ON patient_media(visit_id);

-- 3.25. PATIENT REFERRALS
CREATE TABLE IF NOT EXISTS public.patient_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    referral_number TEXT,
    to_doctor TEXT NOT NULL,
    to_hospital TEXT NOT NULL,
    to_specialist TEXT NOT NULL,
    anamnesis TEXT,
    physical_exam TEXT,
    diagnosis TEXT,
    therapy TEXT,
    place TEXT,
    date DATE DEFAULT CURRENT_DATE,
    doctor_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_referrals_patient_id ON public.patient_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_visit_id ON public.patient_referrals(visit_id);


-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 4: TRIGGERS & PROCEDURES
-- ─────────────────────────────────────────────────────────────────────

-- AUTO-UPDATE updated_at
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_update_users ON public.users;
  CREATE TRIGGER trigger_update_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_patients ON public.patients;
  CREATE TRIGGER trigger_update_patients BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_medical_history ON public.medical_history;
  CREATE TRIGGER trigger_update_medical_history BEFORE UPDATE ON public.medical_history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_clinical_data ON public.clinical_data;
  CREATE TRIGGER trigger_update_clinical_data BEFORE UPDATE ON public.clinical_data FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_tooth_conditions ON public.tooth_conditions;
  CREATE TRIGGER trigger_update_tooth_conditions BEFORE UPDATE ON public.tooth_conditions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_visits ON public.visits;
  CREATE TRIGGER trigger_update_visits BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_treatments ON public.treatments;
  CREATE TRIGGER trigger_update_treatments BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_payments ON public.payments;
  CREATE TRIGGER trigger_update_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_expenses ON public.expenses;
  CREATE TRIGGER trigger_update_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_periodontal ON public.periodontal_data;
  CREATE TRIGGER trigger_update_periodontal BEFORE UPDATE ON public.periodontal_data FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_extra_oral ON public.extra_oral_data;
  CREATE TRIGGER trigger_update_extra_oral BEFORE UPDATE ON public.extra_oral_data FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trigger_update_treatment_plans ON public.treatment_plans;
  CREATE TRIGGER trigger_update_treatment_plans BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  
  DROP TRIGGER IF EXISTS trg_doctor_schedules_updated_at ON public.doctor_schedules;
  CREATE TRIGGER trg_doctor_schedules_updated_at BEFORE UPDATE ON public.doctor_schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trg_intra_oral_data_updated_at ON public.intra_oral_data;
  CREATE TRIGGER trg_intra_oral_data_updated_at BEFORE UPDATE ON public.intra_oral_data FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS trg_odontogram_meta_updated_at ON public.odontogram_meta;
  CREATE TRIGGER trg_odontogram_meta_updated_at BEFORE UPDATE ON public.odontogram_meta FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END $$;

-- PATIENT NO RM GENERATOR
CREATE OR REPLACE FUNCTION generate_no_rm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.no_rm IS NULL OR NEW.no_rm = '' THEN
    NEW.no_rm := 'RM-' || LPAD(nextval('seq_no_rm')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_generate_no_rm ON public.patients;
  CREATE TRIGGER trigger_generate_no_rm BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION generate_no_rm();
END $$;

-- INVOICE NUMBER GENERATOR
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_month_key CHAR(6);
  new_number  INTEGER;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number != '' THEN
    RETURN NEW;
  END IF;
  v_month_key := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  INSERT INTO public.invoice_counters (month_key, last_number) VALUES (v_month_key, 1)
  ON CONFLICT (month_key) DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO new_number;
  NEW.invoice_number := 'INV-' || v_month_key || '-' || LPAD(new_number::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_generate_invoice ON public.payments;
  CREATE TRIGGER trigger_generate_invoice BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();
END $$;

-- VISIT NUMBER GENERATOR (ADVISORY LOCKING TO PREVENT RACE CONDITION)
CREATE OR REPLACE FUNCTION set_visit_number()
RETURNS TRIGGER AS $$
DECLARE next_num INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || REPLACE(NEW.patient_id::text, '-', ''))::bit(64)::bigint);
  SELECT COALESCE(MAX(visit_number), 0) + 1 INTO next_num
  FROM public.visits WHERE patient_id = NEW.patient_id;
  NEW.visit_number := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_set_visit_number ON public.visits;
  CREATE TRIGGER trigger_set_visit_number BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION set_visit_number();
END $$;


-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 5: VIEWS
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_patient_summary AS
SELECT
  p.id, p.no_rm, p.nama_lengkap, p.jenis_kelamin, p.umur, p.no_wa, p.status, p.created_at,
  p.tempat_lahir, p.tanggal_lahir, p.agama, p.status_pernikahan, p.pendidikan_terakhir,
  p.pekerjaan, p.golongan_darah, p.berat_badan, p.tinggi_badan,
  p.alamat, p.alamat_detail, p.provinsi, p.kabupaten, p.kecamatan, p.desa,
  p.keluhan_awal, p.foto_profile,
  COALESCE(v.total_visits, 0)  AS total_visits,
  v.last_visit,
  COALESCE(pay.total_spent, 0) AS total_spent
FROM public.patients p
LEFT JOIN (
  SELECT patient_id, COUNT(*) AS total_visits, MAX(tanggal_kunjungan) AS last_visit
  FROM public.visits GROUP BY patient_id
) v ON p.id = v.patient_id
LEFT JOIN (
  SELECT patient_id, SUM(total_bayar) AS total_spent
  FROM public.payments WHERE status_pembayaran = 'paid' GROUP BY patient_id
) pay ON p.id = pay.patient_id;

CREATE OR REPLACE VIEW public.v_daily_revenue AS
SELECT
  tanggal_pembayaran AS tanggal,
  COUNT(*)                         AS total_transactions,
  COALESCE(SUM(total_bayar), 0)    AS total_revenue,
  COALESCE(AVG(total_bayar), 0)    AS avg_transaction
FROM public.payments
WHERE status_pembayaran = 'paid'
GROUP BY tanggal_pembayaran
ORDER BY tanggal DESC;

CREATE OR REPLACE VIEW public.v_popular_treatments AS
SELECT
  t.id AS treatment_id, t.nama_treatment, t.kategori,
  COUNT(vt.id)                     AS usage_count,
  COALESCE(SUM(vt.subtotal), 0)   AS total_revenue
FROM public.treatments t
JOIN public.visit_treatments vt ON t.id = vt.treatment_id
GROUP BY t.id, t.nama_treatment, t.kategori
ORDER BY usage_count DESC;

CREATE OR REPLACE VIEW public.v_monthly_revenue AS
SELECT
  DATE_TRUNC('month', tanggal_pembayaran)::DATE            AS bulan,
  TO_CHAR(DATE_TRUNC('month', tanggal_pembayaran), 'Mon YYYY') AS label_bulan,
  COUNT(*)                                                  AS total_transactions,
  COALESCE(SUM(total_bayar), 0)                            AS total_revenue,
  COALESCE(AVG(total_bayar), 0)                            AS avg_transaction
FROM public.payments
WHERE status_pembayaran = 'paid'
GROUP BY DATE_TRUNC('month', tanggal_pembayaran)
ORDER BY bulan DESC;


-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 6: RPC FUNCTIONS FOR TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION replace_treatment_plans(p_patient_id UUID, p_plans JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memodifikasi rencana perawatan';
    END IF;

    DELETE FROM treatment_plans WHERE patient_id = p_patient_id;
    IF jsonb_array_length(p_plans) > 0 THEN
        INSERT INTO treatment_plans (patient_id, prioritas, tindakan, gigi, keterangan, status, created_by)
        SELECT 
            p_patient_id,
            (elem->>'prioritas')::INTEGER,
            elem->>'tindakan',
            elem->>'gigi',
            elem->>'keterangan',
            elem->>'status',
            (elem->>'created_by')::UUID
        FROM jsonb_array_elements(p_plans) AS elem;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION replace_tooth_conditions(p_patient_id UUID, p_conditions JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memodifikasi kondisi odontogram';
    END IF;

    DELETE FROM tooth_conditions WHERE patient_id = p_patient_id;
    IF jsonb_array_length(p_conditions) > 0 THEN
        INSERT INTO tooth_conditions (patient_id, tooth_number, condition_type, condition_code, surface, has_rct, notes, recorded_by)
        SELECT 
            p_patient_id,
            (elem->>'tooth_number')::INTEGER,
            elem->>'condition_type',
            elem->>'condition_code',
            elem->>'surface',
            (elem->>'has_rct')::BOOLEAN,
            elem->>'notes',
            (elem->>'recorded_by')::UUID
        FROM jsonb_array_elements(p_conditions) AS elem;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION replace_visit_treatments(p_visit_id UUID, p_treatments JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memodifikasi tindakan kunjungan';
    END IF;

    DELETE FROM visit_treatments WHERE visit_id = p_visit_id;
    IF jsonb_array_length(p_treatments) > 0 THEN
        INSERT INTO visit_treatments (visit_id, treatment_id, tooth_number, quantity, harga_satuan, subtotal, notes)
        SELECT 
            p_visit_id,
            (elem->>'treatment_id')::UUID,
            (elem->>'tooth_number')::INTEGER,
            (elem->>'quantity')::INTEGER,
            (elem->>'harga_satuan')::NUMERIC,
            (elem->>'subtotal')::NUMERIC,
            elem->>'notes'
        FROM jsonb_array_elements(p_treatments) AS elem;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION replace_tooth_conditions(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_treatment_plans(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_visit_treatments(UUID, JSONB) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 7: ROW LEVEL SECURITY & POLICIES
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_data     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tooth_conditions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_treatments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodontal_data  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_oral_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intra_oral_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odontogram_meta   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_obat       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_obat        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_education_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_media     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_referrals ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    pol record;
BEGIN 
    -- Clean drop all active policies to rebuild them safely
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 7.1. USERS POLICIES
CREATE POLICY "users_view_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_admin_all" ON public.users FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "users_read_staff_directory" ON public.users FOR SELECT USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM public.users AS me WHERE me.id = auth.uid() AND me.role IN ('admin', 'dokter', 'resepsionis') AND me.is_active = TRUE)
);

-- 7.2. PATIENTS POLICIES
CREATE POLICY "Admins have full access to patients" ON patients FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view patients" ON patients FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Resepsionis can modify patients" ON patients FOR INSERT WITH CHECK (public.get_user_role() = 'resepsionis');
CREATE POLICY "Resepsionis can update patients" ON patients FOR UPDATE USING (public.get_user_role() = 'resepsionis');

-- 7.3. VISITS POLICIES
CREATE POLICY "Admins have full access to visits" ON visits FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view visits" ON visits FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Resepsionis can modify visits" ON visits FOR INSERT WITH CHECK (public.get_user_role() = 'resepsionis');
CREATE POLICY "Resepsionis can update visits" ON visits FOR UPDATE USING (public.get_user_role() = 'resepsionis');
CREATE POLICY "Dokter can update visits" ON visits FOR UPDATE USING (public.get_user_role() = 'dokter');

-- 7.4. TREATMENTS POLICIES
CREATE POLICY "treatments_select" ON public.treatments FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "treatments_manage" ON public.treatments FOR ALL USING (public.get_user_role() = 'admin');

-- 7.5. PAYMENTS POLICIES
CREATE POLICY "Admins have full access to payments" ON payments FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff can view payments" ON payments FOR SELECT USING (public.get_user_role() IN ('admin', 'resepsionis', 'dokter'));
CREATE POLICY "Resepsionis can modify payments" ON payments FOR INSERT WITH CHECK (public.get_user_role() = 'resepsionis');
CREATE POLICY "Resepsionis can update payments" ON payments FOR UPDATE USING (public.get_user_role() = 'resepsionis');

-- 7.6. FINANCIAL REPORTS POLICIES
CREATE POLICY "financial_reports_select" ON public.financial_reports FOR SELECT USING (public.get_user_role() = 'admin');
CREATE POLICY "financial_reports_manage" ON public.financial_reports FOR ALL USING (public.get_user_role() = 'admin');

-- 7.7. EXPENSES POLICIES
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (public.get_user_role() = 'admin');
CREATE POLICY "expenses_manage" ON public.expenses FOR ALL USING (public.get_user_role() = 'admin');

-- 7.8. CLINICAL MODULE TABLES (LOOP GENERATOR)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'medical_history', 'clinical_data', 'periodontal_data', 'extra_oral_data', 
        'intra_oral_data', 'odontogram_meta', 'tooth_conditions', 'treatment_plans', 
        'patient_referrals', 'visit_treatments'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('CREATE POLICY "Admin_ALL" ON %I FOR ALL USING (public.get_user_role() = ''admin'')', t);
        EXECUTE format('CREATE POLICY "Staff_SELECT" ON %I FOR SELECT USING (public.get_user_role() IN (''admin'', ''resepsionis'', ''dokter''))', t);
        EXECUTE format('CREATE POLICY "Dokter_INSERT" ON %I FOR INSERT WITH CHECK (public.get_user_role() = ''dokter'')', t);
        EXECUTE format('CREATE POLICY "Dokter_UPDATE" ON %I FOR UPDATE USING (public.get_user_role() = ''dokter'')', t);
    END LOOP;
END $$;

-- 7.9. CLINICAL MODULE SPECIFIC DELETES
CREATE POLICY "Dokter_DELETE" ON tooth_conditions FOR DELETE USING (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter_DELETE" ON treatment_plans FOR DELETE USING (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter_DELETE" ON visit_treatments FOR DELETE USING (public.get_user_role() = 'dokter');
CREATE POLICY "Dokter_DELETE" ON patient_referrals FOR DELETE USING (public.get_user_role() = 'dokter');

-- 7.10. INVOICE COUNTERS
CREATE POLICY "invoice_counters_admin" ON public.invoice_counters FOR ALL USING (public.get_user_role() = 'admin');

-- 7.11. DOCTOR SCHEDULES
CREATE POLICY "schedules_select_all_staff" ON public.doctor_schedules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis') AND is_active = TRUE)
);
CREATE POLICY "schedules_insert_admin" ON public.doctor_schedules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
);
CREATE POLICY "schedules_update_admin" ON public.doctor_schedules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
);
CREATE POLICY "schedules_delete_admin" ON public.doctor_schedules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE)
);

-- 7.12. CLINIC SETTINGS
CREATE POLICY "Admin_ALL" ON clinic_settings FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff read clinic_settings" ON clinic_settings FOR SELECT USING (
  public.get_user_role() = 'admin' OR 
  (public.get_user_role() IN ('dokter', 'resepsionis') AND key IN ('clinic_name', 'clinic_phone', 'wa_payment_confirmation_enabled', 'wa_reminder_h1_day_enabled', 'wa_reminder_h1_hour_enabled', 'wa_post_treatment_education_enabled'))
);

-- 7.13. MASTER OBAT & VISIT OBAT
CREATE POLICY "Staff read master_obat" ON master_obat FOR SELECT USING (public.get_user_role() IN ('admin', 'dokter', 'resepsionis'));
CREATE POLICY "Admin manage master_obat" ON master_obat FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff manage visit_obat" ON visit_obat FOR ALL USING (public.get_user_role() IN ('admin', 'resepsionis'));

-- 7.14. NOTIFICATION LOGS & TREATMENT EDUCATION TEMPLATES
CREATE POLICY "Admin read all notification logs" ON notification_logs FOR SELECT USING (public.get_user_role() = 'admin');
CREATE POLICY "Staff read logs" ON notification_logs FOR SELECT USING (public.get_user_role() IN ('dokter', 'resepsionis'));
CREATE POLICY "Admin_Dokter_ALL" ON treatment_education_templates FOR ALL USING (public.get_user_role() IN ('admin', 'dokter'));
CREATE POLICY "Resepsionis_SELECT" ON treatment_education_templates FOR SELECT USING (public.get_user_role() = 'resepsionis');

-- 7.15. PATIENT MEDIA & REFERRALS (V12 COMPATIBILITY)
CREATE POLICY "Staff can read patient_media" ON patient_media FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));
CREATE POLICY "Staff can insert patient_media" ON patient_media FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));
CREATE POLICY "Staff can update patient_media" ON patient_media FOR UPDATE USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));
CREATE POLICY "Staff can delete patient_media" ON patient_media FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND role IN ('admin', 'dokter', 'resepsionis')));


-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 8: STORAGE BUCKETS & POLICIES
-- ─────────────────────────────────────────────────────────────────────

-- Buckets creation
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES 
('patient-photos', 'patient-photos', false, 5242880, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
('radiologi', 'radiologi', false, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
('klinik', 'klinik', false, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp']),
('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS Enable on objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean storage policies
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- patient-photos policies
CREATE POLICY "patient_photos_read" ON storage.objects FOR SELECT USING (bucket_id = 'patient-photos' AND auth.role() = 'authenticated');
CREATE POLICY "patient_photos_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'patient-photos' AND auth.role() = 'authenticated');
CREATE POLICY "patient_photos_update" ON storage.objects FOR UPDATE USING (bucket_id = 'patient-photos' AND auth.role() = 'authenticated');
CREATE POLICY "patient_photos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'patient-photos' AND auth.role() = 'authenticated');

-- radiologi policies
CREATE POLICY "Auth Read for radiologi" ON storage.objects FOR SELECT USING (bucket_id = 'radiologi' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Insert for radiologi" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'radiologi' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete for radiologi" ON storage.objects FOR DELETE USING (bucket_id = 'radiologi' AND auth.role() = 'authenticated');

-- klinik policies
CREATE POLICY "Auth Read for klinik" ON storage.objects FOR SELECT USING (bucket_id = 'klinik' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Insert for klinik" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'klinik' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete for klinik" ON storage.objects FOR DELETE USING (bucket_id = 'klinik' AND auth.role() = 'authenticated');

-- avatars policies
CREATE POLICY "Public Access for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth Insert for avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update for avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete for avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 9: SEED DATA
-- ─────────────────────────────────────────────────────────────────────

-- 9.1. Settings seeds
INSERT INTO clinic_settings (key, value) VALUES
  ('clinic_name', 'Dentiva Dental Clinic'),
  ('clinic_phone', ''),
  ('wa_payment_confirmation_enabled', 'true'),
  ('wa_reminder_h1_day_enabled', 'true'),
  ('wa_reminder_h1_hour_enabled', 'true'),
  ('wa_post_treatment_education_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- 9.2. Treatment seeds
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

-- 9.3. Master Obat seeds
INSERT INTO master_obat (nama_obat, satuan, harga_satuan, dosis_default, frekuensi_default, education_text) VALUES
  ('Amoxicillin 500mg', 'kapsul', 3000, '1 kapsul', '3x sehari selama 5 hari', 'Minum setiap 8 jam secara teratur. HABISKAN antibiotik meski sudah merasa membaik. Jangan hentikan di tengah jalan.'),
  ('Metronidazole 500mg', 'tablet', 2500, '1 tablet', '3x sehari selama 5 hari', 'Minum setelah makan. JANGAN mengonsumsi alkohol selama pengobatan dan 48 jam setelahnya.'),
  ('Asam Mefenamat 500mg', 'tablet', 2000, '1 tablet', '3x sehari jika nyeri', 'Minum SETELAH MAKAN untuk menghindari gangguan lambung. Hentikan jika timbul nyeri ulu hati.'),
  ('Paracetamol 500mg', 'tablet', 1000, '1-2 tablet', '3x sehari jika nyeri/demam', 'Minum saat nyeri atau demam. Jangan melebihi 8 tablet dalam 24 jam. Aman diminum sebelum atau sesudah makan.'),
  ('Dexamethasone 0.5mg', 'tablet', 1500, '1 tablet', 'Sesuai anjuran dokter', 'Minum sesuai dosis yang diresepkan dokter. Jangan menghentikan obat secara tiba-tiba tanpa konsultasi dokter.'),
  ('Clindamycin 300mg', 'kapsul', 5000, '1 kapsul', '3x sehari selama 5 hari', 'Minum dengan segelas penuh air. HABISKAN antibiotik sesuai durasi yang diresepkan dokter.'),
  ('Chlorhexidine Mouthwash', 'ml', 15000, '15 ml', '2x sehari pagi dan malam', 'Kumur selama 30 detik lalu buang — JANGAN ditelan. Gunakan setelah sikat gigi. Hindari makan/minum 30 menit setelah berkumur.')
ON CONFLICT DO NOTHING;

-- 9.4. Treatment Education Templates seeds (with keywords mapping)
INSERT INTO treatment_education_templates (treatment_type, education_text, medication_instructions, keywords) VALUES
(
  'scaling',
  'Yang perlu diperhatikan setelah scaling:
• Gusi mungkin terasa ngilu atau sedikit berdarah selama 1-2 hari, ini normal.
• Gigi bisa terasa lebih sensitif terhadap makanan/minuman dingin atau panas sementara waktu.
• Hindari makan/minum terlalu panas atau dingin dalam 24 jam pertama.
• Tetap sikat gigi 2x sehari seperti biasa, gunakan sikat berbulu lembut.
• Hindari merokok dan kumur dengan obat kumur beralkohol selama 1-2 hari.
⚠️ Jika perdarahan tidak berhenti setelah 24 jam, gusi bengkak signifikan, atau nyeri hebat — segera hubungi klinik.',
  '[Diisi oleh dokter sesuai resep]',
  ARRAY['scaling', 'pembersihan karang', 'periodontal', 'kuretase']
)
ON CONFLICT (treatment_type) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- BAGIAN 10: UPDATE INTEGRIAS REKAM MEDIS & SOFT DELETES (FASE 2)
-- ─────────────────────────────────────────────────────────────────────

-- 10.1. Soft delete columns
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

ALTER TABLE public.patient_media ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.patient_media ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- 10.2. Create Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    clinic_id UUID DEFAULT NULL,
    user_id UUID REFERENCES public.users(id),
    user_role TEXT,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    previous_value JSONB DEFAULT NULL,
    new_value JSONB DEFAULT NULL,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON public.audit_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_visit_id ON public.audit_logs(visit_id);

-- 10.3. Create Medical Record Versions
CREATE TABLE IF NOT EXISTS public.medical_record_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    diagnosa TEXT,
    keluhan TEXT,
    pemeriksaan_fisik TEXT,
    terapi TEXT,
    catatan_dokter TEXT,
    kode_icd10 VARCHAR(50),
    changed_by UUID NOT NULL REFERENCES public.users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(visit_id, version)
);

CREATE INDEX IF NOT EXISTS idx_mrv_visit_version ON public.medical_record_versions(visit_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_mrv_patient ON public.medical_record_versions(patient_id);

-- 10.4. Soft Delete Triggers & Functions
CREATE OR REPLACE FUNCTION soft_delete_patient()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.patients 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_soft_delete_patient ON public.patients;
  CREATE TRIGGER trigger_soft_delete_patient BEFORE DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION soft_delete_patient();
END $$;

CREATE OR REPLACE FUNCTION soft_delete_visit()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.visits 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_soft_delete_visit ON public.visits;
  CREATE TRIGGER trigger_soft_delete_visit BEFORE DELETE ON public.visits FOR EACH ROW EXECUTE FUNCTION soft_delete_visit();
END $$;

CREATE OR REPLACE FUNCTION soft_delete_patient_media()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.patient_media 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_soft_delete_patient_media ON public.patient_media;
  CREATE TRIGGER trigger_soft_delete_patient_media BEFORE DELETE ON public.patient_media FOR EACH ROW EXECUTE FUNCTION soft_delete_patient_media();
END $$;

CREATE OR REPLACE FUNCTION soft_delete_patient_referral()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.patient_referrals 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_soft_delete_patient_referral ON public.patient_referrals;
  CREATE TRIGGER trigger_soft_delete_patient_referral BEFORE DELETE ON public.patient_referrals FOR EACH ROW EXECUTE FUNCTION soft_delete_patient_referral();
END $$;

-- 10.5. Audit Logging Triggers & Functions
CREATE OR REPLACE FUNCTION process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_old JSONB := NULL;
  v_new JSONB := NULL;
  v_patient_id UUID := NULL;
  v_visit_id UUID := NULL;
  v_action TEXT := TG_OP;
  v_risk TEXT := 'LOW';
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_new := to_jsonb(NEW);
  ELSIF (TG_OP = 'DELETE') THEN
    v_old := to_jsonb(OLD);
  END IF;

  BEGIN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      IF (v_new ? 'patient_id') THEN v_patient_id := (v_new->>'patient_id')::UUID; END IF;
      IF (v_new ? 'visit_id') THEN v_visit_id := (v_new->>'visit_id')::UUID; END IF;
    ELSE
      IF (v_old ? 'patient_id') THEN v_patient_id := (v_old->>'patient_id')::UUID; END IF;
      IF (v_old ? 'visit_id') THEN v_visit_id := (v_old->>'visit_id')::UUID; END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
  END;

  IF TG_TABLE_NAME = 'patients' THEN
    v_patient_id := COALESCE(NEW.id, OLD.id);
  END IF;
  IF TG_TABLE_NAME = 'visits' THEN
    v_visit_id := COALESCE(NEW.id, OLD.id);
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      v_patient_id := NEW.patient_id;
    ELSE
      v_patient_id := OLD.patient_id;
    END IF;
  END IF;

  IF TG_TABLE_NAME IN ('visits', 'medical_history', 'clinical_data') THEN
    v_risk := 'MEDIUM';
  ELSIF TG_TABLE_NAME = 'users' AND TG_OP = 'UPDATE' THEN
    v_risk := 'HIGH';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    user_role,
    patient_id,
    visit_id,
    module,
    action,
    previous_value,
    new_value,
    risk_level
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(public.get_user_role(), 'system'),
    v_patient_id,
    v_visit_id,
    TG_TABLE_NAME,
    v_action,
    v_old,
    v_new,
    v_risk
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_audit_patients ON public.patients;
  CREATE TRIGGER trg_audit_patients AFTER INSERT OR UPDATE OR DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION process_audit_log();
  
  DROP TRIGGER IF EXISTS trg_audit_visits ON public.visits;
  CREATE TRIGGER trg_audit_visits AFTER INSERT OR UPDATE OR DELETE ON public.visits FOR EACH ROW EXECUTE FUNCTION process_audit_log();
  
  DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
  CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION process_audit_log();
  
  DROP TRIGGER IF EXISTS trg_audit_users ON public.users;
  CREATE TRIGGER trg_audit_users AFTER INSERT OR UPDATE OR DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION process_audit_log();
END $$;

-- 10.6. Medical Record Versioning Triggers & Functions
CREATE OR REPLACE FUNCTION process_visit_versioning()
RETURNS TRIGGER AS $$
DECLARE
  v_version INTEGER;
  v_summary TEXT := 'Rekam medis dibuat';
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_version := 1;
    
    INSERT INTO public.medical_record_versions (
      visit_id,
      patient_id,
      version,
      diagnosa,
      keluhan,
      pemeriksaan_fisik,
      terapi,
      catatan_dokter,
      kode_icd10,
      changed_by,
      change_summary
    ) VALUES (
      NEW.id,
      NEW.patient_id,
      v_version,
      NEW.diagnosa,
      NEW.keluhan,
      NEW.pemeriksaan_fisik,
      NEW.terapi,
      NEW.catatan_dokter,
      NEW.kode_icd10,
      COALESCE(auth.uid(), NEW.dokter_id),
      v_summary
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.diagnosa IS DISTINCT FROM NEW.diagnosa OR
        OLD.keluhan IS DISTINCT FROM NEW.keluhan OR
        OLD.pemeriksaan_fisik IS DISTINCT FROM NEW.pemeriksaan_fisik OR
        OLD.terapi IS DISTINCT FROM NEW.terapi OR
        OLD.catatan_dokter IS DISTINCT FROM NEW.catatan_dokter OR
        OLD.kode_icd10 IS DISTINCT FROM NEW.kode_icd10) THEN
        
      SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
      FROM public.medical_record_versions
      WHERE visit_id = NEW.id;

      v_summary := '';
      IF OLD.diagnosa IS DISTINCT FROM NEW.diagnosa THEN v_summary := v_summary || 'Diagnosa diubah. '; END IF;
      IF OLD.keluhan IS DISTINCT FROM NEW.keluhan THEN v_summary := v_summary || 'Keluhan diubah. '; END IF;
      IF OLD.pemeriksaan_fisik IS DISTINCT FROM NEW.pemeriksaan_fisik THEN v_summary := v_summary || 'Pemeriksaan fisik diubah. '; END IF;
      IF OLD.terapi IS DISTINCT FROM NEW.terapi THEN v_summary := v_summary || 'Terapi diubah. '; END IF;
      IF OLD.catatan_dokter IS DISTINCT FROM NEW.catatan_dokter THEN v_summary := v_summary || 'Catatan dokter diubah. '; END IF;
      
      IF v_summary = '' THEN
        v_summary := 'Rekam medis diperbarui';
      END IF;

      INSERT INTO public.medical_record_versions (
        visit_id,
        patient_id,
        version,
        diagnosa,
        keluhan,
        pemeriksaan_fisik,
        terapi,
        catatan_dokter,
        kode_icd10,
        changed_by,
        change_summary
      ) VALUES (
        NEW.id,
        NEW.patient_id,
        v_version,
        NEW.diagnosa,
        NEW.keluhan,
        NEW.pemeriksaan_fisik,
        NEW.terapi,
        NEW.catatan_dokter,
        NEW.kode_icd10,
        COALESCE(auth.uid(), NEW.dokter_id),
        v_summary
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_visit_versioning ON public.visits;
  CREATE TRIGGER trigger_visit_versioning AFTER INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION process_visit_versioning();
END $$;

-- 10.7. Secure RPC Functions
CREATE OR REPLACE FUNCTION restore_visit_version(p_visit_id UUID, p_version INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_version_data RECORD;
BEGIN
  IF public.get_user_role() NOT IN ('admin', 'dokter') THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya dokter atau admin yang dapat memulihkan versi rekam medis';
  END IF;

  SELECT * INTO v_version_data 
  FROM public.medical_record_versions 
  WHERE visit_id = p_visit_id AND version = p_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versi tidak ditemukan';
  END IF;

  UPDATE public.visits
  SET 
    diagnosa = v_version_data.diagnosa,
    keluhan = v_version_data.keluhan,
    pemeriksaan_fisik = v_version_data.pemeriksaan_fisik,
    terapi = v_version_data.terapi,
    catatan_dokter = v_version_data.catatan_dokter,
    kode_icd10 = v_version_data.kode_icd10
  WHERE id = p_visit_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_audit_logs()
RETURNS SETOF public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() = 'admin' THEN
    RETURN QUERY SELECT * FROM public.audit_logs ORDER BY timestamp DESC;
  ELSIF public.get_user_role() = 'dokter' THEN
    RETURN QUERY SELECT * FROM public.audit_logs WHERE user_id = auth.uid() ORDER BY timestamp DESC;
  ELSE
    RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat log audit';
  END IF;
END;
$$;

-- 10.8. RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
  CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT WITH CHECK (true);
  
  DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
  CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT USING (
    (public.get_user_role() = 'admin') OR 
    (public.get_user_role() = 'dokter' AND user_id = auth.uid())
  );
END $$;

ALTER TABLE public.medical_record_versions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  DROP POLICY IF EXISTS mrv_select ON public.medical_record_versions;
  CREATE POLICY mrv_select ON public.medical_record_versions FOR SELECT USING (
    public.get_user_role() IN ('admin', 'dokter', 'resepsionis')
  );
END $$;

-- Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
