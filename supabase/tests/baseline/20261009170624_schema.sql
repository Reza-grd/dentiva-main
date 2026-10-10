-- Schema-only catalog snapshot of linked project, through 20261009170624.
-- NO patient rows, account rows, encryption keys or Vault values. Tests only.
create schema if not exists private;
create schema if not exists platform;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
set search_path=public,extensions;
create extension if not exists "uuid-ossp" with schema extensions;
set check_function_bodies=off;
CREATE SEQUENCE IF NOT EXISTS public.seq_no_rm;

CREATE TABLE IF NOT EXISTS platform.announcements (id uuid DEFAULT gen_random_uuid() NOT NULL, title text NOT NULL, body text NOT NULL, severity text DEFAULT 'info'::text NOT NULL, audience text DEFAULT 'all'::text NOT NULL, starts_at timestamp with time zone DEFAULT now() NOT NULL, ends_at timestamp with time zone, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS platform.audit_logs (id uuid DEFAULT gen_random_uuid() NOT NULL, operator_id uuid, action text NOT NULL, target_type text NOT NULL, target_id text, clinic_id uuid, reason text, before jsonb, after jsonb, ip inet, user_agent text, request_id text, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS platform.clinic_notes (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, operator_id uuid, body text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS platform.invoice_counters (year integer NOT NULL, last integer DEFAULT 0 NOT NULL);

CREATE TABLE IF NOT EXISTS platform.invoices (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, number text NOT NULL, period_start date NOT NULL, period_end date NOT NULL, amount_idr bigint NOT NULL, tax_idr bigint DEFAULT 0 NOT NULL, total_idr bigint GENERATED ALWAYS AS ((amount_idr + tax_idr)) STORED, status text DEFAULT 'open'::text NOT NULL, due_date date NOT NULL, paid_at timestamp with time zone, notes text, source text DEFAULT 'console'::text NOT NULL, created_by uuid, voided_at timestamp with time zone, void_reason text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS platform.operators (user_id uuid NOT NULL, full_name text NOT NULL, role text NOT NULL, is_active boolean DEFAULT true NOT NULL, last_login_at timestamp with time zone, invited_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS platform.payments (id uuid DEFAULT gen_random_uuid() NOT NULL, invoice_id uuid, clinic_id uuid NOT NULL, provider text NOT NULL, provider_ref text, amount_idr bigint NOT NULL, status text DEFAULT 'pending'::text NOT NULL, paid_at timestamp with time zone, confirmed_by uuid, notes text, metadata jsonb DEFAULT '{}'::jsonb NOT NULL, raw jsonb, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS platform.usage_daily (clinic_id uuid NOT NULL, date date NOT NULL, patients_total integer DEFAULT 0 NOT NULL, visits_count integer DEFAULT 0 NOT NULL, active_users integer DEFAULT 0 NOT NULL, storage_bytes bigint DEFAULT 0 NOT NULL, wa_sent integer DEFAULT 0 NOT NULL, satusehat_errors integer DEFAULT 0 NOT NULL, collected_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS private.encryption_keys (key_name text NOT NULL, key_value text NOT NULL);

CREATE TABLE IF NOT EXISTS public.ai_feedback (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, usage_id uuid, user_id uuid, correct boolean NOT NULL, note text, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS public.ai_insights (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, kind text DEFAULT 'daily_brief'::text NOT NULL, content jsonb NOT NULL, model text, generated_by uuid, generated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS public.ai_knowledge (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, question text NOT NULL, question_norm text NOT NULL, answer text NOT NULL, kind text DEFAULT 'data'::text NOT NULL, tools_used text[] DEFAULT '{}'::text[] NOT NULL, data_fingerprint text, source_usage_id uuid, verified_by uuid, hit_count integer DEFAULT 0 NOT NULL, last_used_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS public.ai_usage (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, user_id uuid, feature text DEFAULT 'finance_chat'::text NOT NULL, model text NOT NULL, question text, tools_used text[] DEFAULT '{}'::text[] NOT NULL, input_tokens integer DEFAULT 0 NOT NULL, output_tokens integer DEFAULT 0 NOT NULL, cache_read_tokens integer DEFAULT 0 NOT NULL, cache_write_tokens integer DEFAULT 0 NOT NULL, cost_usd numeric(10,5) DEFAULT 0 NOT NULL, status text DEFAULT 'ok'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, answer text, question_norm text, data_fingerprint text);

CREATE TABLE IF NOT EXISTS public.audit_logs (id uuid DEFAULT gen_random_uuid() NOT NULL, "timestamp" timestamp with time zone DEFAULT now() NOT NULL, clinic_id uuid NOT NULL, user_id uuid, user_role text, patient_id uuid, visit_id uuid, module text NOT NULL, action text NOT NULL, previous_value jsonb, new_value jsonb, ip_address text, user_agent text, session_id text, risk_level text DEFAULT 'LOW'::text);

CREATE TABLE IF NOT EXISTS public.booking_requests (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, dokter_id uuid, requested_date date NOT NULL, requested_time time without time zone NOT NULL, patient_name text NOT NULL, patient_phone text NOT NULL, phone_hash text NOT NULL, complaint text, status text DEFAULT 'pending'::text NOT NULL, reference_code text NOT NULL, handled_by uuid, handled_at timestamp with time zone, note text, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS public.clinic_rm_counters (clinic_id uuid NOT NULL, last_value integer DEFAULT 0 NOT NULL);

CREATE TABLE IF NOT EXISTS public.clinic_settings (id uuid DEFAULT gen_random_uuid() NOT NULL, key text NOT NULL, value text, updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.clinic_subscriptions (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, plan_id uuid NOT NULL, status character varying(20) DEFAULT 'active'::character varying, current_period_start timestamp with time zone DEFAULT now() NOT NULL, current_period_end timestamp with time zone NOT NULL, cancel_at_period_end boolean DEFAULT false, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), billing_cycle text DEFAULT 'monthly'::text NOT NULL);

CREATE TABLE IF NOT EXISTS public.clinical_data (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, oklusi character varying(100), torus_palatinus character varying(100), torus_mandibularis character varying(100), palatum character varying(100), supernumery_teeth character varying(100), diastema character varying(100), gigi_anomali character varying(100), lain_lain text, tanggal_pencatatan date, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), diagnosis_list jsonb DEFAULT '[]'::jsonb, treatment_list jsonb DEFAULT '[]'::jsonb, total_treatment_cost integer DEFAULT 0, diagnosis_additional_notes text DEFAULT ''::text, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.clinics (id uuid DEFAULT gen_random_uuid() NOT NULL, name text NOT NULL, slug text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, status text DEFAULT 'pending'::text NOT NULL, owner_user_id uuid, phone text, email text, address text, city text, province text, trial_ends_at timestamp with time zone, activated_at timestamp with time zone, suspended_at timestamp with time zone, suspended_reason text, closed_at timestamp with time zone, updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS public.data_subject_requests (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, patient_id uuid NOT NULL, request_type text NOT NULL, status text DEFAULT 'pending'::text NOT NULL, requested_at timestamp with time zone DEFAULT now(), handled_by uuid, notes text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.doctor_schedules (id uuid DEFAULT gen_random_uuid() NOT NULL, dokter_id uuid NOT NULL, hari smallint NOT NULL, jam_mulai time without time zone NOT NULL, jam_selesai time without time zone NOT NULL, keterangan text, is_active boolean DEFAULT true NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, kapasitas_pasien_per_hari integer, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.expenses (id uuid DEFAULT uuid_generate_v4() NOT NULL, tanggal_expense date DEFAULT CURRENT_DATE NOT NULL, kategori character varying(100) NOT NULL, deskripsi text NOT NULL, jumlah numeric(15,2) NOT NULL, bukti_url text, recorded_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL, pemasok text, nomor_nota text, sumber text DEFAULT 'manual'::text NOT NULL);

CREATE TABLE IF NOT EXISTS public.extra_oral_data (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, wajah character varying(100), bibir character varying(100), pipi character varying(100), kelenjar_getah_bening character varying(100), temporomandibular character varying(100), otot_pengunyahan character varying(100), keterangan text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), riwayat_perawatan character varying(50) DEFAULT 'belum_dirawat'::character varying, riwayat_perawatan_keterangan text, kebiasaan_buruk text, riwayat_sosial text, bibir_keterangan text, kgb_kanan character varying(100) DEFAULT 'tidak_teraba'::character varying, kgb_kanan_sakit character varying(20) DEFAULT ''::character varying, kgb_kiri character varying(100) DEFAULT 'tidak_teraba'::character varying, kgb_kiri_sakit character varying(20) DEFAULT ''::character varying, kelenjar_lainnya text, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.financial_reports (id uuid DEFAULT uuid_generate_v4() NOT NULL, report_date date NOT NULL, total_revenue numeric(15,2) DEFAULT 0, total_expenses numeric(15,2) DEFAULT 0, net_income numeric(15,2) DEFAULT 0, total_patients integer DEFAULT 0, total_visits integer DEFAULT 0, report_type character varying(50), generated_at timestamp with time zone DEFAULT now(), generated_by uuid, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.informed_consents (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid NOT NULL, visit_id uuid, title text NOT NULL, treatment_type text NOT NULL, patient_name text NOT NULL, doctor_name text NOT NULL, signature_data text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.intra_oral_data (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, debri character varying(20) DEFAULT 'tidak_ada'::character varying, debri_regio text, plak character varying(20) DEFAULT 'tidak_ada'::character varying, plak_regio text, kalkulus character varying(20) DEFAULT 'tidak_ada'::character varying, kalkulus_regio text, perdarahan_papila character varying(20) DEFAULT 'tidak_ada'::character varying, perdarahan_papila_regio text, risiko_karies character varying(20) DEFAULT 'tidak_ada'::character varying, ph_plak text, ph_plak_tinggi boolean DEFAULT false, ph_saliva text, ph_saliva_tinggi boolean DEFAULT false, gingiva character varying(20) DEFAULT 'sehat'::character varying, gingiva_keterangan text, mukosa character varying(20) DEFAULT 'sehat'::character varying, mukosa_keterangan text, palatum character varying(20) DEFAULT 'sehat'::character varying, palatum_keterangan text, lidah character varying(20) DEFAULT 'sehat'::character varying, lidah_keterangan text, dasar_mulut character varying(20) DEFAULT 'sehat'::character varying, dasar_mulut_keterangan text, hubungan_rahang character varying(20) DEFAULT 'ortognati'::character varying, kelainan_gigi_geligi character varying(20) DEFAULT 'tidak_ada'::character varying, kelainan_gigi_geligi_keterangan text, lain_lain text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.invoice_counters (month_key character(6) NOT NULL, last_number integer DEFAULT 0, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.master_bahan (id uuid DEFAULT gen_random_uuid() NOT NULL, kode_bahan character varying(50) NOT NULL, nama_bahan text NOT NULL, kategori text, satuan_dasar text NOT NULL, satuan_beli text, faktor_konversi numeric(10,4) DEFAULT 1, harga_rata2 numeric(15,4) DEFAULT 0 NOT NULL, stok_saat_ini numeric(12,3) DEFAULT 0 NOT NULL, stok_minimum numeric(12,3) DEFAULT 0, supplier text, is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), dosis_default text, frekuensi_default text, education_text text, kode_kfa text, kode_bentuk_sediaan text DEFAULT 'BS066'::text, clinic_id uuid NOT NULL, kfa_nama text, kfa_bentuk_sediaan_nama text, kfa_verified_at timestamp with time zone);

CREATE TABLE IF NOT EXISTS public.master_obat (id uuid DEFAULT gen_random_uuid() NOT NULL, nama_obat text NOT NULL, satuan text DEFAULT 'tablet'::text NOT NULL, harga_satuan numeric DEFAULT 0 NOT NULL, dosis_default text, frekuensi_default text, education_text text, is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL, kode_kfa text);

CREATE TABLE IF NOT EXISTS public.material_batches (id uuid DEFAULT gen_random_uuid() NOT NULL, material_id uuid NOT NULL, no_batch text, tanggal_masuk date DEFAULT CURRENT_DATE NOT NULL, tanggal_kadaluarsa date, qty_awal numeric(12,3) NOT NULL, qty_sisa numeric(12,3) NOT NULL, harga_satuan numeric(15,4) NOT NULL, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.material_purchases (id uuid DEFAULT gen_random_uuid() NOT NULL, material_id uuid NOT NULL, tanggal date DEFAULT CURRENT_DATE NOT NULL, jumlah_beli numeric(12,3) NOT NULL, jumlah_dasar numeric(12,3) NOT NULL, harga_satuan_beli numeric(15,2) NOT NULL, total_harga numeric(15,2) GENERATED ALWAYS AS ((jumlah_beli * harga_satuan_beli)) STORED, supplier text, no_faktur text, tanggal_kadaluarsa date, recorded_by uuid, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.medical_history (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, hipertensi boolean DEFAULT false, jantung boolean DEFAULT false, asma boolean DEFAULT false, diabetes boolean DEFAULT false, alergi boolean DEFAULT false, alergi_detail text, riwayat_lain text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), stroke boolean DEFAULT false, ginjal boolean DEFAULT false, hepatitis boolean DEFAULT false, tuberkulosis boolean DEFAULT false, kanker boolean DEFAULT false, hiv boolean DEFAULT false, thalassemia boolean DEFAULT false, hemofilia boolean DEFAULT false, osteoporosis boolean DEFAULT false, tiroid boolean DEFAULT false, asam_urat boolean DEFAULT false, reumatik boolean DEFAULT false, epilepsi boolean DEFAULT false, glaukoma boolean DEFAULT false, covid19 boolean DEFAULT false, konsumsi_obat text DEFAULT ''::text, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.medical_record_versions (id uuid DEFAULT gen_random_uuid() NOT NULL, visit_id uuid NOT NULL, patient_id uuid NOT NULL, version integer NOT NULL, diagnosa text, keluhan text, pemeriksaan_fisik text, terapi text, catatan_dokter text, kode_icd10 character varying(50), changed_by uuid NOT NULL, changed_at timestamp with time zone DEFAULT now() NOT NULL, change_summary text, metadata jsonb DEFAULT '{}'::jsonb, previous_data jsonb, new_data jsonb, reason text, restored_from integer, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.notification_logs (id uuid DEFAULT gen_random_uuid() NOT NULL, patient_id uuid, visit_id uuid, message_type text NOT NULL, status text NOT NULL, gateway_response text, "timestamp" timestamp with time zone DEFAULT now() NOT NULL, triggered_by uuid, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.odontogram_meta (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, relasi_molar_kanan character varying(10) DEFAULT ''::character varying, relasi_molar_kiri character varying(10) DEFAULT ''::character varying, catatan_odontogram text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.overhead_costs (id uuid DEFAULT gen_random_uuid() NOT NULL, nama_biaya text NOT NULL, kategori text, jumlah_bulanan numeric(15,2) DEFAULT 0 NOT NULL, aktif boolean DEFAULT true, catatan text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.overhead_monthly_target (id uuid DEFAULT gen_random_uuid() NOT NULL, periode date NOT NULL, total_overhead_bulanan numeric(15,2) NOT NULL, total_bobot_estimasi numeric(10,2) NOT NULL, overhead_per_unit_bobot numeric(15,4) GENERATED ALWAYS AS (
CASE
    WHEN (total_bobot_estimasi > (0)::numeric) THEN (total_overhead_bulanan / total_bobot_estimasi)
    ELSE (0)::numeric
END) STORED, catatan text, created_by uuid, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.patient_media (id uuid DEFAULT gen_random_uuid() NOT NULL, patient_id uuid NOT NULL, visit_id uuid, category text NOT NULL, filename text NOT NULL, file_url text NOT NULL, file_type text, caption text, notes text, display_order integer DEFAULT 0, created_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone, deleted_by uuid, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.patient_referrals (id uuid DEFAULT gen_random_uuid() NOT NULL, patient_id uuid NOT NULL, visit_id uuid, referral_number text, to_doctor text NOT NULL, to_hospital text NOT NULL, to_specialist text NOT NULL, anamnesis text, physical_exam text, diagnosis text, therapy text, place text, date date DEFAULT CURRENT_DATE, doctor_name text NOT NULL, created_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone, deleted_by uuid, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.patient_visits (id uuid DEFAULT gen_random_uuid() NOT NULL, patient_id uuid NOT NULL, visit_date timestamp with time zone DEFAULT now(), chief_complaint text, treatment_notes text, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.patients (id uuid DEFAULT uuid_generate_v4() NOT NULL, no_rm character varying(50) NOT NULL, nama_lengkap character varying(255) NOT NULL, nama_kk character varying(255), tempat_lahir character varying(100), tanggal_lahir date, jenis_kelamin character varying(20), umur integer, alamat text, no_wa text, no_telepon character varying(20), pekerjaan character varying(100), status_pernikahan character varying(50), jaminan_kesehatan character varying(100), golongan_darah character varying(5), keluhan_awal text, foto_profile text, status character varying(20) DEFAULT 'active'::character varying, registered_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), agama character varying(50), pendidikan_terakhir character varying(20), dokter_keluarga character varying(255), dokter_gigi_keluarga character varying(255), rujukan_dari character varying(255), berat_badan numeric(5,1), tinggi_badan numeric(5,1), alamat_detail text, provinsi character varying(100), kabupaten character varying(100), kecamatan character varying(100), desa character varying(100), wa_consent boolean DEFAULT false NOT NULL, deleted_at timestamp with time zone, deleted_by uuid, clinic_id uuid NOT NULL, nik text, nik_ibu text, identitas_alternatif_jenis text, satusehat_patient_id text, satusehat_last_synced_at timestamp with time zone);

CREATE TABLE IF NOT EXISTS public.payments (id uuid DEFAULT uuid_generate_v4() NOT NULL, visit_id uuid, patient_id uuid, invoice_number character varying(50) NOT NULL, tanggal_pembayaran timestamp with time zone DEFAULT now(), total_treatment numeric(15,2) DEFAULT 0 NOT NULL, biaya_tambahan numeric(15,2) DEFAULT 0, keterangan_tambahan text, diskon numeric(15,2) DEFAULT 0, total_bayar numeric(15,2) NOT NULL, metode_pembayaran character varying(50), status_pembayaran character varying(50) DEFAULT 'pending'::character varying, processed_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), jumlah_bayar numeric(15,2) DEFAULT 0, kembalian numeric(15,2) DEFAULT 0, wa_sent boolean DEFAULT false, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.periodontal_data (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, ohi_s character varying(50), calculus character varying(100), plak_indeks character varying(50), bop character varying(50), mobility character varying(50), furkasi character varying(50), pocket_depth text, resesi_gingiva text, kondisi_gingiva text, kondisi_mukosa text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.permissions (id uuid DEFAULT gen_random_uuid() NOT NULL, module character varying(50) NOT NULL, action character varying(50) NOT NULL, name character varying(100) NOT NULL, description text, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.queue_display_links (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, label text DEFAULT 'Layar ruang tunggu'::text NOT NULL, token_hash text NOT NULL, token_hint text NOT NULL, created_by uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, last_seen_at timestamp with time zone, revoked_at timestamp with time zone);

CREATE TABLE IF NOT EXISTS public.recall_contacts (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, patient_id uuid NOT NULL, contacted_by uuid, channel text DEFAULT 'wa'::text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS public.reminder_logs (id uuid DEFAULT gen_random_uuid() NOT NULL, visit_id uuid, reminder_type text NOT NULL, sent_at timestamp with time zone DEFAULT now(), status text NOT NULL, error_message text, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.role_permissions (role_id uuid NOT NULL, permission_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.roles (id uuid DEFAULT gen_random_uuid() NOT NULL, name character varying(50) NOT NULL, description text, is_system boolean DEFAULT false, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.satusehat_consents (id uuid DEFAULT gen_random_uuid() NOT NULL, patient_id uuid NOT NULL, consent_given boolean DEFAULT false NOT NULL, consent_date timestamp with time zone, recorded_by uuid, notes text, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.satusehat_locations (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, nama_unit text NOT NULL, satusehat_location_id text, is_default boolean DEFAULT true, created_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.satusehat_organizations (clinic_id uuid NOT NULL, satusehat_organization_id text, client_id text, environment text DEFAULT 'sandbox'::text NOT NULL, registered_at timestamp with time zone, updated_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.satusehat_outbox (id uuid DEFAULT gen_random_uuid() NOT NULL, clinic_id uuid NOT NULL, resource_type text NOT NULL, related_visit_id uuid, related_patient_id uuid, payload jsonb NOT NULL, status text DEFAULT 'pending'::text NOT NULL, satusehat_resource_id text, attempt_count integer DEFAULT 0 NOT NULL, last_attempt_at timestamp with time zone, next_retry_at timestamp with time zone, last_error text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), triggered_by uuid, trigger_source text DEFAULT 'manual_user'::text);

CREATE TABLE IF NOT EXISTS public.satusehat_token_cache (id integer DEFAULT 1 NOT NULL, access_token text NOT NULL, expires_at timestamp with time zone NOT NULL, environment text NOT NULL, updated_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.satusehat_verification_runs (id uuid DEFAULT gen_random_uuid() NOT NULL, visit_id uuid, environment text DEFAULT 'sandbox'::text NOT NULL, passed boolean NOT NULL, report jsonb NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE IF NOT EXISTS public.soap_templates (id uuid DEFAULT gen_random_uuid() NOT NULL, treatment_type text NOT NULL, keluhan text, pemeriksaan_fisik text, diagnosa text, terapi text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.stok_movements (id uuid DEFAULT gen_random_uuid() NOT NULL, material_id uuid NOT NULL, tipe text NOT NULL, jumlah numeric(12,3) NOT NULL, stok_sebelum numeric(12,3) NOT NULL, stok_sesudah numeric(12,3) NOT NULL, referensi_tipe text, referensi_id uuid, harga_saat_itu numeric(15,4), catatan text, created_by uuid, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.stok_opname (id uuid DEFAULT gen_random_uuid() NOT NULL, tanggal date DEFAULT CURRENT_DATE NOT NULL, material_id uuid NOT NULL, stok_sistem numeric(12,3) NOT NULL, stok_fisik numeric(12,3) NOT NULL, selisih numeric(12,3) GENERATED ALWAYS AS ((stok_fisik - stok_sistem)) STORED, catatan text, dilakukan_oleh uuid, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.subscription_plans (id uuid DEFAULT gen_random_uuid() NOT NULL, name character varying(50) NOT NULL, price_monthly numeric(10,2) NOT NULL, price_yearly numeric(10,2) NOT NULL, max_users integer DEFAULT 1 NOT NULL, max_patients integer DEFAULT 100 NOT NULL, features jsonb DEFAULT '{}'::jsonb, is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now());

CREATE TABLE IF NOT EXISTS public.tier_weights (tier text NOT NULL, label text NOT NULL, bobot numeric(10,2) NOT NULL, updated_at timestamp with time zone DEFAULT now(), updated_by uuid, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.tooth_conditions (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, tooth_number integer NOT NULL, condition_type character varying(50) NOT NULL, condition_code character varying(50) NOT NULL, surface character varying(50), has_rct boolean DEFAULT false, notes text, recorded_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.treatment_cost_snapshot (id uuid DEFAULT gen_random_uuid() NOT NULL, visit_treatment_id uuid NOT NULL, tier_saat_itu text NOT NULL, bobot_saat_itu numeric(10,2) NOT NULL, overhead_per_unit_bobot numeric(15,4) NOT NULL, overhead_allocated numeric(15,2) NOT NULL, total_biaya_bahan numeric(15,2) DEFAULT 0 NOT NULL, detail_bahan jsonb, total_modal numeric(15,2) GENERATED ALWAYS AS ((overhead_allocated + total_biaya_bahan)) STORED, harga_jual_saat_itu numeric(15,2) NOT NULL, margin numeric(15,2) GENERATED ALWAYS AS ((harga_jual_saat_itu - (overhead_allocated + total_biaya_bahan))) STORED, margin_percent numeric(6,2) GENERATED ALWAYS AS (
CASE
    WHEN (harga_jual_saat_itu > (0)::numeric) THEN (((harga_jual_saat_itu - (overhead_allocated + total_biaya_bahan)) / harga_jual_saat_itu) * (100)::numeric)
    ELSE (0)::numeric
END) STORED, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.treatment_education (id uuid DEFAULT gen_random_uuid() NOT NULL, treatment_id uuid NOT NULL, judul text NOT NULL, isi_edukasi text NOT NULL, edukasi_obat text, is_active boolean DEFAULT true NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.treatment_education_templates (id uuid DEFAULT gen_random_uuid() NOT NULL, treatment_type text NOT NULL, education_text text, medication_instructions text, last_updated_by uuid, last_updated_at timestamp with time zone DEFAULT now() NOT NULL, keywords text[] DEFAULT '{}'::text[], clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.treatment_materials (id uuid DEFAULT gen_random_uuid() NOT NULL, treatment_id uuid NOT NULL, material_id uuid NOT NULL, qty_rata2 numeric(12,4) NOT NULL, wajib boolean DEFAULT true, wastage_percent numeric(5,2) DEFAULT 0, catatan text, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.treatment_plans (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, prioritas integer DEFAULT 1 NOT NULL, tindakan text NOT NULL, gigi character varying(50), keterangan text, status character varying(50) DEFAULT 'planned'::character varying, created_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.treatments (id uuid DEFAULT uuid_generate_v4() NOT NULL, kode_treatment character varying(50) NOT NULL, nama_treatment character varying(255) NOT NULL, kategori character varying(100), harga_dasar numeric(15,2) NOT NULL, durasi_menit integer, deskripsi text, is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), tier text DEFAULT 'sedang'::text, kode_icd9cm text, kode_snomed_ct text, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.user_permissions (user_id uuid NOT NULL, permission_id uuid NOT NULL, is_revoked boolean DEFAULT false);

CREATE TABLE IF NOT EXISTS public.users (id uuid NOT NULL, email character varying(255) NOT NULL, full_name character varying(255) NOT NULL, role character varying(50) NOT NULL, phone character varying(20), avatar_url text, is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), gelar_depan text, gelar_belakang text, foto_profil text, jenis_dokter text, spesialisasi text, no_str text, no_sip text, no_telepon text, bio text, role_id uuid, clinic_id uuid NOT NULL, nik text, satusehat_practitioner_id text, str_berlaku_hingga date, practitioner_type text DEFAULT 'dentist'::text, qualification_code text DEFAULT 'STR-KKI'::text, status text DEFAULT 'active'::text NOT NULL, last_login_at timestamp with time zone, invited_by uuid);

CREATE TABLE IF NOT EXISTS public.visit_obat (id uuid DEFAULT gen_random_uuid() NOT NULL, visit_id uuid NOT NULL, obat_id uuid, nama_obat text NOT NULL, qty integer DEFAULT 1 NOT NULL, harga_satuan numeric NOT NULL, subtotal numeric GENERATED ALWAYS AS (((qty)::numeric * harga_satuan)) STORED, dosis text, frekuensi text, created_at timestamp with time zone DEFAULT now(), master_bahan_id uuid, clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.visit_treatment_material_overrides (id uuid DEFAULT gen_random_uuid() NOT NULL, visit_treatment_id uuid NOT NULL, material_id uuid NOT NULL, qty_aktual numeric(12,4) NOT NULL, catatan text, created_by uuid, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.visit_treatments (id uuid DEFAULT uuid_generate_v4() NOT NULL, visit_id uuid, treatment_id uuid, tooth_number integer, quantity integer DEFAULT 1, harga_satuan numeric(15,2) NOT NULL, subtotal numeric(15,2) NOT NULL, notes text, created_at timestamp with time zone DEFAULT now(), clinic_id uuid NOT NULL);

CREATE TABLE IF NOT EXISTS public.visits (id uuid DEFAULT uuid_generate_v4() NOT NULL, patient_id uuid, visit_number integer NOT NULL, tanggal_kunjungan date DEFAULT CURRENT_DATE NOT NULL, keluhan text, pemeriksaan_fisik text, diagnosa text, kode_icd10 character varying(50), terapi text, catatan_dokter text, status character varying(50) DEFAULT 'completed'::character varying, dokter_id uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), jam_kunjungan time without time zone, deleted_at timestamp with time zone, deleted_by uuid, is_locked boolean DEFAULT false NOT NULL, locked_at timestamp with time zone, locked_by uuid, clinic_id uuid NOT NULL, satusehat_encounter_id text, satusehat_composition_id text, satusehat_resource_ids jsonb DEFAULT '{}'::jsonb);

ALTER TABLE platform.announcements ADD CONSTRAINT announcements_audience_check CHECK ((audience = ANY (ARRAY['all'::text, 'trial'::text, 'active'::text, 'admins'::text])));

ALTER TABLE platform.announcements ADD CONSTRAINT announcements_body_check CHECK (((length(TRIM(BOTH FROM body)) >= 3) AND (length(TRIM(BOTH FROM body)) <= 2000)));

ALTER TABLE platform.announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);

ALTER TABLE platform.announcements ADD CONSTRAINT announcements_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));

ALTER TABLE platform.announcements ADD CONSTRAINT announcements_title_check CHECK (((length(TRIM(BOTH FROM title)) >= 3) AND (length(TRIM(BOTH FROM title)) <= 120)));

ALTER TABLE platform.announcements ADD CONSTRAINT announcements_window CHECK (((ends_at IS NULL) OR (ends_at > starts_at)));

ALTER TABLE platform.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK ((action ~ '^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$'::text));

ALTER TABLE platform.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE platform.clinic_notes ADD CONSTRAINT clinic_notes_body_check CHECK (((length(TRIM(BOTH FROM body)) >= 2) AND (length(TRIM(BOTH FROM body)) <= 4000)));

ALTER TABLE platform.clinic_notes ADD CONSTRAINT clinic_notes_pkey PRIMARY KEY (id);

ALTER TABLE platform.invoice_counters ADD CONSTRAINT invoice_counters_pkey PRIMARY KEY (year);

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_amount_idr_check CHECK ((amount_idr > 0));

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_number_key UNIQUE (number);

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_paid_consistency CHECK (((status = 'paid'::text) = (paid_at IS NOT NULL)));

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_period CHECK ((period_end >= period_start));

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_source_check CHECK ((source = ANY (ARRAY['console'::text, 'midtrans_checkout'::text])));

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['open'::text, 'paid'::text, 'overdue'::text, 'void'::text])));

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_tax_idr_check CHECK ((tax_idr >= 0));

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_void_consistency CHECK (((status = 'void'::text) = (voided_at IS NOT NULL)));

ALTER TABLE platform.operators ADD CONSTRAINT operators_full_name_check CHECK (((length(TRIM(BOTH FROM full_name)) >= 2) AND (length(TRIM(BOTH FROM full_name)) <= 120)));

ALTER TABLE platform.operators ADD CONSTRAINT operators_pkey PRIMARY KEY (user_id);

ALTER TABLE platform.operators ADD CONSTRAINT operators_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'support'::text, 'finance'::text])));

ALTER TABLE platform.payments ADD CONSTRAINT payments_amount_idr_check CHECK ((amount_idr > 0));

ALTER TABLE platform.payments ADD CONSTRAINT payments_confirmed_has_paid_at CHECK (((status <> 'confirmed'::text) OR (paid_at IS NOT NULL)));

ALTER TABLE platform.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE platform.payments ADD CONSTRAINT payments_provider_check CHECK ((provider = ANY (ARRAY['midtrans'::text, 'manual'::text])));

ALTER TABLE platform.payments ADD CONSTRAINT payments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'failed'::text, 'refunded'::text])));

ALTER TABLE platform.usage_daily ADD CONSTRAINT usage_daily_pkey PRIMARY KEY (clinic_id, date);

ALTER TABLE private.encryption_keys ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (key_name);

ALTER TABLE public.ai_feedback ADD CONSTRAINT ai_feedback_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_clinic_id_kind_key UNIQUE (clinic_id, kind);

ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_kind_check CHECK ((kind = ANY (ARRAY['daily_brief'::text, 'staff_brief'::text])));

ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_knowledge ADD CONSTRAINT ai_knowledge_clinic_id_question_norm_key UNIQUE (clinic_id, question_norm);

ALTER TABLE public.ai_knowledge ADD CONSTRAINT ai_knowledge_kind_check CHECK ((kind = ANY (ARRAY['panduan'::text, 'data'::text])));

ALTER TABLE public.ai_knowledge ADD CONSTRAINT ai_knowledge_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'error'::text, 'refused'::text, 'cached'::text])));

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_reference_code_key UNIQUE (reference_code);

ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])));

ALTER TABLE public.clinic_rm_counters ADD CONSTRAINT clinic_rm_counters_last_value_check CHECK ((last_value >= 0));

ALTER TABLE public.clinic_rm_counters ADD CONSTRAINT clinic_rm_counters_pkey PRIMARY KEY (clinic_id);

ALTER TABLE public.clinic_settings ADD CONSTRAINT clinic_settings_clinic_key_unique UNIQUE (clinic_id, key);

ALTER TABLE public.clinic_settings ADD CONSTRAINT clinic_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.clinic_subscriptions ADD CONSTRAINT clinic_subscriptions_billing_cycle_check CHECK ((billing_cycle = ANY (ARRAY['monthly'::text, 'yearly'::text])));

ALTER TABLE public.clinic_subscriptions ADD CONSTRAINT clinic_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.clinic_subscriptions ADD CONSTRAINT clinic_subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'past_due'::character varying, 'canceled'::character varying, 'trialing'::character varying])::text[])));

ALTER TABLE public.clinical_data ADD CONSTRAINT clinical_data_patient_id_key UNIQUE (patient_id);

ALTER TABLE public.clinical_data ADD CONSTRAINT clinical_data_pkey PRIMARY KEY (id);

ALTER TABLE public.clinics ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);

ALTER TABLE public.clinics ADD CONSTRAINT clinics_slug_key UNIQUE (slug);

ALTER TABLE public.clinics ADD CONSTRAINT clinics_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'trial'::text, 'active'::text, 'suspended'::text, 'closed'::text])));

ALTER TABLE public.clinics ADD CONSTRAINT clinics_suspended_reason_check CHECK (((status <> 'suspended'::text) OR (suspended_reason IS NOT NULL)));

ALTER TABLE public.clinics ADD CONSTRAINT clinics_trial_end_check CHECK (((status <> 'trial'::text) OR (trial_ends_at IS NOT NULL)));

ALTER TABLE public.data_subject_requests ADD CONSTRAINT data_subject_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.data_subject_requests ADD CONSTRAINT data_subject_requests_request_type_check CHECK ((request_type = ANY (ARRAY['access'::text, 'correction'::text, 'deletion'::text])));

ALTER TABLE public.data_subject_requests ADD CONSTRAINT data_subject_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'rejected'::text])));

ALTER TABLE public.doctor_schedules ADD CONSTRAINT chk_doctor_schedules_jam CHECK ((jam_selesai > jam_mulai));

ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_dokter_id_hari_key UNIQUE (dokter_id, hari);

ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_hari_check CHECK (((hari >= 0) AND (hari <= 6)));

ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_kapasitas_pasien_per_hari_check CHECK (((kapasitas_pasien_per_hari IS NULL) OR (kapasitas_pasien_per_hari > 0)));

ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_pkey PRIMARY KEY (id);

ALTER TABLE public.expenses ADD CONSTRAINT expenses_jumlah_positive CHECK (((jumlah IS NULL) OR (jumlah >= (0)::numeric))) NOT VALID;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

ALTER TABLE public.expenses ADD CONSTRAINT expenses_sumber_check CHECK ((sumber = ANY (ARRAY['manual'::text, 'ai_nota'::text])));

ALTER TABLE public.extra_oral_data ADD CONSTRAINT extra_oral_data_patient_id_key UNIQUE (patient_id);

ALTER TABLE public.extra_oral_data ADD CONSTRAINT extra_oral_data_pkey PRIMARY KEY (id);

ALTER TABLE public.financial_reports ADD CONSTRAINT financial_reports_pkey PRIMARY KEY (id);

ALTER TABLE public.financial_reports ADD CONSTRAINT financial_reports_report_date_report_type_key UNIQUE (report_date, report_type);

ALTER TABLE public.financial_reports ADD CONSTRAINT financial_reports_report_type_check CHECK (((report_type)::text = ANY ((ARRAY['daily'::character varying, 'monthly'::character varying, 'yearly'::character varying])::text[])));

ALTER TABLE public.informed_consents ADD CONSTRAINT informed_consents_pkey PRIMARY KEY (id);

ALTER TABLE public.intra_oral_data ADD CONSTRAINT intra_oral_data_patient_id_key UNIQUE (patient_id);

ALTER TABLE public.intra_oral_data ADD CONSTRAINT intra_oral_data_pkey PRIMARY KEY (id);

ALTER TABLE public.invoice_counters ADD CONSTRAINT invoice_counters_pkey PRIMARY KEY (month_key);

ALTER TABLE public.master_bahan ADD CONSTRAINT master_bahan_clinic_kode_bahan_key UNIQUE (clinic_id, kode_bahan);

ALTER TABLE public.master_bahan ADD CONSTRAINT master_bahan_pkey PRIMARY KEY (id);

ALTER TABLE public.master_obat ADD CONSTRAINT master_obat_pkey PRIMARY KEY (id);

ALTER TABLE public.material_batches ADD CONSTRAINT material_batches_pkey PRIMARY KEY (id);

ALTER TABLE public.material_purchases ADD CONSTRAINT material_purchases_jumlah_beli_check CHECK ((jumlah_beli > (0)::numeric));

ALTER TABLE public.material_purchases ADD CONSTRAINT material_purchases_pkey PRIMARY KEY (id);

ALTER TABLE public.medical_history ADD CONSTRAINT medical_history_patient_id_key UNIQUE (patient_id);

ALTER TABLE public.medical_history ADD CONSTRAINT medical_history_pkey PRIMARY KEY (id);

ALTER TABLE public.medical_record_versions ADD CONSTRAINT medical_record_versions_pkey PRIMARY KEY (id);

ALTER TABLE public.medical_record_versions ADD CONSTRAINT medical_record_versions_visit_id_version_key UNIQUE (visit_id, version);

ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.odontogram_meta ADD CONSTRAINT odontogram_meta_patient_id_key UNIQUE (patient_id);

ALTER TABLE public.odontogram_meta ADD CONSTRAINT odontogram_meta_pkey PRIMARY KEY (id);

ALTER TABLE public.overhead_costs ADD CONSTRAINT overhead_costs_pkey PRIMARY KEY (id);

ALTER TABLE public.overhead_monthly_target ADD CONSTRAINT overhead_monthly_target_clinic_periode_key UNIQUE (clinic_id, periode);

ALTER TABLE public.overhead_monthly_target ADD CONSTRAINT overhead_monthly_target_pkey PRIMARY KEY (id);

ALTER TABLE public.patient_media ADD CONSTRAINT patient_media_category_check CHECK ((category = ANY (ARRAY['panoramic'::text, 'cephalometric'::text, 'dental'::text, 'intraoral'::text, 'extraoral'::text, 'other'::text])));

ALTER TABLE public.patient_media ADD CONSTRAINT patient_media_pkey PRIMARY KEY (id);

ALTER TABLE public.patient_referrals ADD CONSTRAINT patient_referrals_pkey PRIMARY KEY (id);

ALTER TABLE public.patient_visits ADD CONSTRAINT patient_visits_pkey PRIMARY KEY (id);

ALTER TABLE public.patients ADD CONSTRAINT chk_status_pernikahan CHECK (((status_pernikahan)::text = ANY ((ARRAY['Belum Menikah'::character varying, 'Menikah'::character varying, 'Duda/Janda'::character varying, 'Cerai'::character varying])::text[])));

ALTER TABLE public.patients ADD CONSTRAINT patients_agama_check CHECK (((agama IS NULL) OR ((agama)::text = ANY ((ARRAY['Islam'::character varying, 'Kristen'::character varying, 'Katolik'::character varying, 'Hindu'::character varying, 'Budha'::character varying, 'Konghucu'::character varying])::text[]))));

ALTER TABLE public.patients ADD CONSTRAINT patients_bb_check CHECK (((berat_badan IS NULL) OR ((berat_badan > (0)::numeric) AND (berat_badan <= (300)::numeric))));

ALTER TABLE public.patients ADD CONSTRAINT patients_clinic_no_rm_key UNIQUE (clinic_id, no_rm);

ALTER TABLE public.patients ADD CONSTRAINT patients_identitas_alternatif_jenis_check CHECK ((identitas_alternatif_jenis = ANY (ARRAY['NIK'::text, 'NIK_IBU'::text, 'PASPOR'::text, 'LAINNYA'::text])));

ALTER TABLE public.patients ADD CONSTRAINT patients_jenis_kelamin_check CHECK (((jenis_kelamin)::text = ANY ((ARRAY['Laki-laki'::character varying, 'Perempuan'::character varying])::text[])));

ALTER TABLE public.patients ADD CONSTRAINT patients_pendidikan_check CHECK (((pendidikan_terakhir IS NULL) OR ((pendidikan_terakhir)::text = ANY ((ARRAY['SD'::character varying, 'SLTP'::character varying, 'SLTA'::character varying, 'D3'::character varying, 'S1'::character varying, 'Sp/S2'::character varying, 'S3'::character varying])::text[]))));

ALTER TABLE public.patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);

ALTER TABLE public.patients ADD CONSTRAINT patients_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying])::text[])));

ALTER TABLE public.patients ADD CONSTRAINT patients_tb_check CHECK (((tinggi_badan IS NULL) OR ((tinggi_badan > (0)::numeric) AND (tinggi_badan <= (300)::numeric))));

ALTER TABLE public.payments ADD CONSTRAINT chk_status_pembayaran CHECK (((status_pembayaran)::text = ANY ((ARRAY['paid'::character varying, 'pending'::character varying, 'cancelled'::character varying])::text[])));

ALTER TABLE public.payments ADD CONSTRAINT payments_invoice_number_key UNIQUE (invoice_number);

ALTER TABLE public.payments ADD CONSTRAINT payments_metode_pembayaran_check CHECK (((metode_pembayaran)::text = ANY (ARRAY['cash'::text, 'transfer'::text, 'debit'::text, 'credit'::text, 'insurance'::text, 'qris'::text])));

ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE public.payments ADD CONSTRAINT payments_status_pembayaran_check CHECK (((status_pembayaran)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'partial'::character varying, 'cancelled'::character varying])::text[])));

ALTER TABLE public.payments ADD CONSTRAINT unique_visit_payment UNIQUE (visit_id);

ALTER TABLE public.periodontal_data ADD CONSTRAINT periodontal_data_patient_id_key UNIQUE (patient_id);

ALTER TABLE public.periodontal_data ADD CONSTRAINT periodontal_data_pkey PRIMARY KEY (id);

ALTER TABLE public.permissions ADD CONSTRAINT permissions_module_action_key UNIQUE (module, action);

ALTER TABLE public.permissions ADD CONSTRAINT permissions_name_key UNIQUE (name);

ALTER TABLE public.permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);

ALTER TABLE public.queue_display_links ADD CONSTRAINT queue_display_links_label_check CHECK (((length(label) >= 1) AND (length(label) <= 60)));

ALTER TABLE public.queue_display_links ADD CONSTRAINT queue_display_links_pkey PRIMARY KEY (id);

ALTER TABLE public.queue_display_links ADD CONSTRAINT queue_display_links_token_hash_key UNIQUE (token_hash);

ALTER TABLE public.recall_contacts ADD CONSTRAINT recall_contacts_channel_check CHECK ((channel = ANY (ARRAY['wa'::text, 'telepon'::text, 'lainnya'::text])));

ALTER TABLE public.recall_contacts ADD CONSTRAINT recall_contacts_pkey PRIMARY KEY (id);

ALTER TABLE public.reminder_logs ADD CONSTRAINT reminder_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.reminder_logs ADD CONSTRAINT reminder_logs_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['H-1_day'::text, 'H-1_hour'::text])));

ALTER TABLE public.reminder_logs ADD CONSTRAINT reminder_logs_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text])));

ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);

ALTER TABLE public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);

ALTER TABLE public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE public.satusehat_consents ADD CONSTRAINT satusehat_consents_pkey PRIMARY KEY (id);

ALTER TABLE public.satusehat_locations ADD CONSTRAINT satusehat_locations_pkey PRIMARY KEY (id);

ALTER TABLE public.satusehat_locations ADD CONSTRAINT satusehat_locations_satusehat_location_id_key UNIQUE (satusehat_location_id);

ALTER TABLE public.satusehat_organizations ADD CONSTRAINT satusehat_organizations_environment_check CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));

ALTER TABLE public.satusehat_organizations ADD CONSTRAINT satusehat_organizations_pkey PRIMARY KEY (clinic_id);

ALTER TABLE public.satusehat_organizations ADD CONSTRAINT satusehat_organizations_satusehat_organization_id_key UNIQUE (satusehat_organization_id);

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_pkey PRIMARY KEY (id);

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_resource_type_check CHECK ((resource_type = ANY (ARRAY['Organization'::text, 'Location'::text, 'Practitioner'::text, 'Patient'::text, 'Encounter'::text, 'Condition'::text, 'Procedure'::text, 'MedicationRequest'::text, 'Composition'::text])));

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'success'::text, 'failed_retryable'::text, 'failed_permanent'::text])));

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_trigger_source_check CHECK ((trigger_source = ANY (ARRAY['manual_user'::text, 'auto_visit'::text, 'outbox_processor'::text, 'system_cron'::text])));

ALTER TABLE public.satusehat_token_cache ADD CONSTRAINT satusehat_token_cache_id_check CHECK ((id = 1));

ALTER TABLE public.satusehat_token_cache ADD CONSTRAINT satusehat_token_cache_pkey PRIMARY KEY (id);

ALTER TABLE public.satusehat_verification_runs ADD CONSTRAINT satusehat_verification_runs_environment_check CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text])));

ALTER TABLE public.satusehat_verification_runs ADD CONSTRAINT satusehat_verification_runs_pkey PRIMARY KEY (id);

ALTER TABLE public.soap_templates ADD CONSTRAINT soap_templates_pkey PRIMARY KEY (id);

ALTER TABLE public.stok_movements ADD CONSTRAINT stok_movements_pkey PRIMARY KEY (id);

ALTER TABLE public.stok_movements ADD CONSTRAINT stok_movements_tipe_check CHECK ((tipe = ANY (ARRAY['masuk'::text, 'keluar'::text, 'penyesuaian'::text, 'opname'::text])));

ALTER TABLE public.stok_opname ADD CONSTRAINT stok_opname_pkey PRIMARY KEY (id);

ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_name_key UNIQUE (name);

ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);

ALTER TABLE public.tier_weights ADD CONSTRAINT tier_weights_bobot_check CHECK ((bobot > (0)::numeric));

ALTER TABLE public.tier_weights ADD CONSTRAINT tier_weights_pkey PRIMARY KEY (clinic_id, tier);

ALTER TABLE public.tier_weights ADD CONSTRAINT tier_weights_tier_check CHECK ((tier = ANY (ARRAY['ringan'::text, 'sedang'::text, 'berat'::text])));

ALTER TABLE public.tooth_conditions ADD CONSTRAINT tooth_conditions_pkey PRIMARY KEY (id);

ALTER TABLE public.treatment_cost_snapshot ADD CONSTRAINT treatment_cost_snapshot_pkey PRIMARY KEY (id);

ALTER TABLE public.treatment_cost_snapshot ADD CONSTRAINT treatment_cost_snapshot_visit_treatment_id_key UNIQUE (visit_treatment_id);

ALTER TABLE public.treatment_education ADD CONSTRAINT treatment_education_pkey PRIMARY KEY (id);

ALTER TABLE public.treatment_education ADD CONSTRAINT treatment_education_treatment_id_key UNIQUE (treatment_id);

ALTER TABLE public.treatment_education_templates ADD CONSTRAINT treatment_education_templates_pkey PRIMARY KEY (id);

ALTER TABLE public.treatment_education_templates ADD CONSTRAINT treatment_education_templates_treatment_type_key UNIQUE (treatment_type);

ALTER TABLE public.treatment_materials ADD CONSTRAINT treatment_materials_pkey PRIMARY KEY (id);

ALTER TABLE public.treatment_materials ADD CONSTRAINT treatment_materials_qty_rata2_check CHECK ((qty_rata2 > (0)::numeric));

ALTER TABLE public.treatment_materials ADD CONSTRAINT treatment_materials_treatment_id_material_id_key UNIQUE (treatment_id, material_id);

ALTER TABLE public.treatment_materials ADD CONSTRAINT treatment_materials_wastage_percent_check CHECK (((wastage_percent >= (0)::numeric) AND (wastage_percent < (100)::numeric)));

ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_pkey PRIMARY KEY (id);

ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_status_check CHECK (((status)::text = ANY ((ARRAY['planned'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])));

ALTER TABLE public.treatments ADD CONSTRAINT treatments_clinic_kode_treatment_key UNIQUE (clinic_id, kode_treatment);

ALTER TABLE public.treatments ADD CONSTRAINT treatments_pkey PRIMARY KEY (id);

ALTER TABLE public.treatments ADD CONSTRAINT treatments_tier_check CHECK ((tier = ANY (ARRAY['ringan'::text, 'sedang'::text, 'berat'::text])));

ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id);

ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.users ADD CONSTRAINT users_jenis_dokter_check CHECK ((jenis_dokter = ANY (ARRAY['umum'::text, 'spesialis'::text])));

ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.users ADD CONSTRAINT users_practitioner_type_check CHECK ((practitioner_type = ANY (ARRAY['dentist'::text, 'specialist'::text, 'physician'::text, 'nurse'::text, 'other'::text])));

ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'dokter'::character varying, 'resepsionis'::character varying])::text[])));

ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'deactivated'::text])));

ALTER TABLE public.visit_obat ADD CONSTRAINT visit_obat_pkey PRIMARY KEY (id);

ALTER TABLE public.visit_treatment_material_overrides ADD CONSTRAINT visit_treatment_material_over_visit_treatment_id_material_i_key UNIQUE (visit_treatment_id, material_id);

ALTER TABLE public.visit_treatment_material_overrides ADD CONSTRAINT visit_treatment_material_overrides_pkey PRIMARY KEY (id);

ALTER TABLE public.visit_treatment_material_overrides ADD CONSTRAINT visit_treatment_material_overrides_qty_aktual_check CHECK ((qty_aktual >= (0)::numeric));

ALTER TABLE public.visit_treatments ADD CONSTRAINT visit_treatments_pkey PRIMARY KEY (id);

ALTER TABLE public.visits ADD CONSTRAINT visits_pkey PRIMARY KEY (id);

ALTER TABLE public.visits ADD CONSTRAINT visits_status_check CHECK (((status)::text = ANY ((ARRAY['scheduled'::character varying, 'ongoing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])));

ALTER TABLE platform.announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES platform.operators(user_id) ON DELETE SET NULL;

ALTER TABLE platform.audit_logs ADD CONSTRAINT audit_logs_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;

ALTER TABLE platform.audit_logs ADD CONSTRAINT audit_logs_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES platform.operators(user_id) ON DELETE SET NULL;

ALTER TABLE platform.clinic_notes ADD CONSTRAINT clinic_notes_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE platform.clinic_notes ADD CONSTRAINT clinic_notes_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES platform.operators(user_id) ON DELETE SET NULL;

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

ALTER TABLE platform.invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES platform.operators(user_id) ON DELETE SET NULL;

ALTER TABLE platform.operators ADD CONSTRAINT operators_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES platform.operators(user_id) ON DELETE SET NULL;

ALTER TABLE platform.operators ADD CONSTRAINT operators_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE platform.payments ADD CONSTRAINT payments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE RESTRICT;

ALTER TABLE platform.payments ADD CONSTRAINT payments_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES platform.operators(user_id) ON DELETE SET NULL;

ALTER TABLE platform.payments ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES platform.invoices(id) ON DELETE RESTRICT;

ALTER TABLE platform.usage_daily ADD CONSTRAINT usage_daily_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.ai_feedback ADD CONSTRAINT ai_feedback_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.ai_feedback ADD CONSTRAINT ai_feedback_usage_id_fkey FOREIGN KEY (usage_id) REFERENCES ai_usage(id) ON DELETE CASCADE;

ALTER TABLE public.ai_feedback ADD CONSTRAINT ai_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.ai_insights ADD CONSTRAINT ai_insights_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.ai_knowledge ADD CONSTRAINT ai_knowledge_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.ai_knowledge ADD CONSTRAINT ai_knowledge_source_usage_id_fkey FOREIGN KEY (source_usage_id) REFERENCES ai_usage(id) ON DELETE SET NULL;

ALTER TABLE public.ai_knowledge ADD CONSTRAINT ai_knowledge_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_dokter_id_fkey FOREIGN KEY (dokter_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.clinic_rm_counters ADD CONSTRAINT clinic_rm_counters_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.clinic_settings ADD CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.clinic_subscriptions ADD CONSTRAINT clinic_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);

ALTER TABLE public.clinic_subscriptions ADD CONSTRAINT fk_clinic_subscriptions_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.clinical_data ADD CONSTRAINT clinical_data_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.clinical_data ADD CONSTRAINT clinical_data_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.clinics ADD CONSTRAINT clinics_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.data_subject_requests ADD CONSTRAINT data_subject_requests_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.data_subject_requests ADD CONSTRAINT data_subject_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES users(id);

ALTER TABLE public.data_subject_requests ADD CONSTRAINT data_subject_requests_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.doctor_schedules ADD CONSTRAINT doctor_schedules_dokter_id_fkey FOREIGN KEY (dokter_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.expenses ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES users(id);

ALTER TABLE public.extra_oral_data ADD CONSTRAINT extra_oral_data_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.extra_oral_data ADD CONSTRAINT extra_oral_data_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.financial_reports ADD CONSTRAINT financial_reports_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.financial_reports ADD CONSTRAINT financial_reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES users(id);

ALTER TABLE public.informed_consents ADD CONSTRAINT informed_consents_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.informed_consents ADD CONSTRAINT informed_consents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.informed_consents ADD CONSTRAINT informed_consents_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;

ALTER TABLE public.intra_oral_data ADD CONSTRAINT intra_oral_data_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.intra_oral_data ADD CONSTRAINT intra_oral_data_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_counters ADD CONSTRAINT invoice_counters_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.master_bahan ADD CONSTRAINT master_bahan_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.master_obat ADD CONSTRAINT master_obat_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.material_batches ADD CONSTRAINT material_batches_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.material_batches ADD CONSTRAINT material_batches_material_id_fkey FOREIGN KEY (material_id) REFERENCES master_bahan(id) ON DELETE CASCADE;

ALTER TABLE public.material_purchases ADD CONSTRAINT material_purchases_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.material_purchases ADD CONSTRAINT material_purchases_material_id_fkey FOREIGN KEY (material_id) REFERENCES master_bahan(id);

ALTER TABLE public.material_purchases ADD CONSTRAINT material_purchases_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES users(id);

ALTER TABLE public.medical_history ADD CONSTRAINT medical_history_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.medical_history ADD CONSTRAINT medical_history_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.medical_record_versions ADD CONSTRAINT medical_record_versions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES users(id);

ALTER TABLE public.medical_record_versions ADD CONSTRAINT medical_record_versions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.medical_record_versions ADD CONSTRAINT medical_record_versions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.medical_record_versions ADD CONSTRAINT medical_record_versions_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE public.odontogram_meta ADD CONSTRAINT odontogram_meta_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.odontogram_meta ADD CONSTRAINT odontogram_meta_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.overhead_costs ADD CONSTRAINT overhead_costs_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.overhead_monthly_target ADD CONSTRAINT overhead_monthly_target_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.overhead_monthly_target ADD CONSTRAINT overhead_monthly_target_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public.patient_media ADD CONSTRAINT patient_media_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.patient_media ADD CONSTRAINT patient_media_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE public.patient_media ADD CONSTRAINT patient_media_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.patient_media ADD CONSTRAINT patient_media_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;

ALTER TABLE public.patient_referrals ADD CONSTRAINT patient_referrals_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.patient_referrals ADD CONSTRAINT patient_referrals_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE public.patient_referrals ADD CONSTRAINT patient_referrals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.patient_referrals ADD CONSTRAINT patient_referrals_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL;

ALTER TABLE public.patient_visits ADD CONSTRAINT patient_visits_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.patient_visits ADD CONSTRAINT patient_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.patients ADD CONSTRAINT patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.patients ADD CONSTRAINT patients_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE public.patients ADD CONSTRAINT patients_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES users(id);

ALTER TABLE public.payments ADD CONSTRAINT payments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.payments ADD CONSTRAINT payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id);

ALTER TABLE public.payments ADD CONSTRAINT payments_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES users(id);

ALTER TABLE public.payments ADD CONSTRAINT payments_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE public.periodontal_data ADD CONSTRAINT periodontal_data_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.periodontal_data ADD CONSTRAINT periodontal_data_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.queue_display_links ADD CONSTRAINT queue_display_links_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.queue_display_links ADD CONSTRAINT queue_display_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.recall_contacts ADD CONSTRAINT recall_contacts_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.recall_contacts ADD CONSTRAINT recall_contacts_contacted_by_fkey FOREIGN KEY (contacted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.recall_contacts ADD CONSTRAINT recall_contacts_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.reminder_logs ADD CONSTRAINT reminder_logs_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.reminder_logs ADD CONSTRAINT reminder_logs_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE public.satusehat_consents ADD CONSTRAINT satusehat_consents_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.satusehat_consents ADD CONSTRAINT satusehat_consents_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.satusehat_consents ADD CONSTRAINT satusehat_consents_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES users(id);

ALTER TABLE public.satusehat_locations ADD CONSTRAINT satusehat_locations_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.satusehat_organizations ADD CONSTRAINT satusehat_organizations_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_related_patient_id_fkey FOREIGN KEY (related_patient_id) REFERENCES patients(id) ON DELETE SET NULL;

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_related_visit_id_fkey FOREIGN KEY (related_visit_id) REFERENCES visits(id) ON DELETE SET NULL;

ALTER TABLE public.satusehat_outbox ADD CONSTRAINT satusehat_outbox_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.soap_templates ADD CONSTRAINT soap_templates_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.stok_movements ADD CONSTRAINT stok_movements_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.stok_movements ADD CONSTRAINT stok_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public.stok_movements ADD CONSTRAINT stok_movements_material_id_fkey FOREIGN KEY (material_id) REFERENCES master_bahan(id);

ALTER TABLE public.stok_opname ADD CONSTRAINT stok_opname_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.stok_opname ADD CONSTRAINT stok_opname_dilakukan_oleh_fkey FOREIGN KEY (dilakukan_oleh) REFERENCES users(id);

ALTER TABLE public.stok_opname ADD CONSTRAINT stok_opname_material_id_fkey FOREIGN KEY (material_id) REFERENCES master_bahan(id);

ALTER TABLE public.tier_weights ADD CONSTRAINT tier_weights_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.tier_weights ADD CONSTRAINT tier_weights_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE public.tooth_conditions ADD CONSTRAINT tooth_conditions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.tooth_conditions ADD CONSTRAINT tooth_conditions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.tooth_conditions ADD CONSTRAINT tooth_conditions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES users(id);

ALTER TABLE public.treatment_cost_snapshot ADD CONSTRAINT treatment_cost_snapshot_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_cost_snapshot ADD CONSTRAINT treatment_cost_snapshot_visit_treatment_id_fkey FOREIGN KEY (visit_treatment_id) REFERENCES visit_treatments(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_education ADD CONSTRAINT treatment_education_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_education ADD CONSTRAINT treatment_education_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_education_templates ADD CONSTRAINT treatment_education_templates_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.treatment_education_templates ADD CONSTRAINT treatment_education_templates_last_updated_by_fkey FOREIGN KEY (last_updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.treatment_materials ADD CONSTRAINT treatment_materials_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_materials ADD CONSTRAINT treatment_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES master_bahan(id) ON DELETE RESTRICT;

ALTER TABLE public.treatment_materials ADD CONSTRAINT treatment_materials_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE;

ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public.treatment_plans ADD CONSTRAINT treatment_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.treatments ADD CONSTRAINT treatments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.users ADD CONSTRAINT users_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.users ADD CONSTRAINT users_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.users ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id);

ALTER TABLE public.visit_obat ADD CONSTRAINT visit_obat_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.visit_obat ADD CONSTRAINT visit_obat_master_bahan_id_fkey FOREIGN KEY (master_bahan_id) REFERENCES master_bahan(id);

ALTER TABLE public.visit_obat ADD CONSTRAINT visit_obat_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE public.visit_treatment_material_overrides ADD CONSTRAINT visit_treatment_material_overrides_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.visit_treatment_material_overrides ADD CONSTRAINT visit_treatment_material_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE public.visit_treatment_material_overrides ADD CONSTRAINT visit_treatment_material_overrides_material_id_fkey FOREIGN KEY (material_id) REFERENCES master_bahan(id);

ALTER TABLE public.visit_treatment_material_overrides ADD CONSTRAINT visit_treatment_material_overrides_visit_treatment_id_fkey FOREIGN KEY (visit_treatment_id) REFERENCES visit_treatments(id) ON DELETE CASCADE;

ALTER TABLE public.visit_treatments ADD CONSTRAINT visit_treatments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE public.visit_treatments ADD CONSTRAINT visit_treatments_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES treatments(id);

ALTER TABLE public.visit_treatments ADD CONSTRAINT visit_treatments_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE public.visits ADD CONSTRAINT visits_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES clinics(id);

ALTER TABLE public.visits ADD CONSTRAINT visits_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES users(id);

ALTER TABLE public.visits ADD CONSTRAINT visits_dokter_id_fkey FOREIGN KEY (dokter_id) REFERENCES users(id);

ALTER TABLE public.visits ADD CONSTRAINT visits_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES auth.users(id);

ALTER TABLE public.visits ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION platform.block_audit_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'platform.audit_logs bersifat append-only (% diblokir)', tg_op
    using errcode = 'insufficient_privilege';
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.clinic_health(p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  return (
  with base as (
    select o.id, o.name, o.status, o.plan_name, o.users_count, o.last_activity_at, o.trial_ends_at, o.created_at,
      (select count(*)::int from public.visits v where v.clinic_id = o.id and v.deleted_at is null
         and v.tanggal_kunjungan > current_date - 30) as visits_30,
      (select count(*)::int from public.visits v where v.clinic_id = o.id and v.deleted_at is null
         and v.tanggal_kunjungan > current_date - 60 and v.tanggal_kunjungan <= current_date - 30) as visits_prev_30,
      (select count(*)::int from public.payments p where p.clinic_id = o.id and p.status_pembayaran = 'paid'
         and p.tanggal_pembayaran > now() - interval '30 days') as payments_30,
      (select count(*)::int from platform.invoices i where i.clinic_id = o.id and i.status = 'overdue') as overdue,
      exists (select 1 from public.booking_requests b where b.clinic_id = o.id and b.created_at > now() - interval '30 days') as f_booking,
      exists (select 1 from platform.usage_daily u where u.clinic_id = o.id and u.date > current_date - 30 and u.wa_sent > 0) as f_wa,
      exists (select 1 from public.visits v where v.clinic_id = o.id and v.satusehat_encounter_id is not null
                and v.updated_at > now() - interval '30 days') as f_satusehat,
      exists (select 1 from public.ai_usage a where a.clinic_id = o.id and a.created_at > now() - interval '30 days') as f_ai,
      exists (select 1 from public.expenses e where e.clinic_id = o.id and e.created_at > now() - interval '30 days') as f_expenses
    from platform.clinic_overview o
    where o.status in ('trial', 'active')
  ), scored as (
    select b.*,
      extract(day from now() - b.last_activity_at)::int as days_inactive,
      (b.f_booking::int + b.f_wa::int + b.f_satusehat::int + b.f_ai::int + b.f_expenses::int) as features_used,
      array_remove(array[
        case when b.last_activity_at is null then 'Belum pernah ada staf yang login'
             when b.last_activity_at < now() - interval '14 days' then 'Tidak ada login staf ' || extract(day from now() - b.last_activity_at)::int || ' hari'
             when b.last_activity_at < now() - interval '7 days' then 'Login staf terakhir ' || extract(day from now() - b.last_activity_at)::int || ' hari lalu' end,
        case when b.visits_30 = 0 then 'Tidak ada kunjungan tercatat 30 hari terakhir'
             when b.visits_prev_30 > 0 and b.visits_30 < b.visits_prev_30 * 0.5
               then 'Kunjungan turun ' || round((1 - b.visits_30::numeric / b.visits_prev_30) * 100) || '% dibanding 30 hari sebelumnya' end,
        case when b.visits_30 > 0 and b.payments_30 = 0 then 'Ada kunjungan tetapi pembayaran tidak dicatat di Dentiva' end,
        case when b.overdue > 0 then b.overdue || ' invoice lewat jatuh tempo' end,
        case when b.status = 'trial' and b.trial_ends_at is not null and b.trial_ends_at < now() + interval '7 days'
             then 'Trial berakhir ' || to_char(b.trial_ends_at at time zone 'Asia/Jakarta', 'DD-MM-YYYY') end,
        case when b.users_count <= 1 then 'Hanya ' || b.users_count || ' pengguna terdaftar' end,
        case when not (b.f_booking or b.f_wa or b.f_satusehat or b.f_ai or b.f_expenses) then 'Belum memakai fitur tambahan (booking, WA, SATUSEHAT, AI, pengeluaran)' end
      ], null) as reasons,
      greatest(0, least(100, 100
        - case when b.last_activity_at is null or b.last_activity_at < now() - interval '30 days' then 45
               when b.last_activity_at < now() - interval '14 days' then 35
               when b.last_activity_at < now() - interval '7 days' then 15 else 0 end
        - case when b.visits_30 = 0 then 25
               when b.visits_prev_30 > 0 and b.visits_30 < b.visits_prev_30 * 0.5 then 15 else 0 end
        - case when b.visits_30 > 0 and b.payments_30 = 0 then 5 else 0 end
        - case when b.overdue > 0 then 20 else 0 end
        - case when b.status = 'trial' and b.trial_ends_at is not null and b.trial_ends_at < now() + interval '7 days' then 10 else 0 end
        - case when b.users_count <= 1 then 5 else 0 end
        - case when not (b.f_booking or b.f_wa or b.f_satusehat or b.f_ai or b.f_expenses) then 5 else 0 end
      ))::int as score
    from base b
  ), leveled as (
    select s.*, case when s.score >= 70 then 'sehat' when s.score >= 40 then 'perhatian' else 'berisiko' end as level
    from scored s
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'summary', jsonb_build_object(
      'total', (select count(*) from leveled),
      'sehat', (select count(*) from leveled where level = 'sehat'),
      'perhatian', (select count(*) from leveled where level = 'perhatian'),
      'berisiko', (select count(*) from leveled where level = 'berisiko')),
    'adoption', jsonb_build_object(
      'booking', (select count(*) from leveled where f_booking),
      'whatsapp', (select count(*) from leveled where f_wa),
      'satusehat', (select count(*) from leveled where f_satusehat),
      'ai', (select count(*) from leveled where f_ai),
      'expenses', (select count(*) from leveled where f_expenses)),
    'clinics', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'status', status, 'plan_name', plan_name,
        'score', score, 'level', level, 'reasons', to_jsonb(reasons),
        'metrics', jsonb_build_object(
          'days_inactive', days_inactive, 'visits_30', visits_30, 'visits_prev_30', visits_prev_30,
          'payments_30', payments_30, 'overdue_invoices', overdue, 'users', users_count, 'features_used', features_used)
      ) order by score, name)
      from (select * from leveled order by score, name limit greatest(1, least(coalesce(p_limit, 50), 500))) x), '[]'::jsonb)
  ));
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.collect_usage_daily(p_date date DEFAULT (((now() AT TIME ZONE 'Asia/Jakarta'::text))::date - 1))
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_rows int;
  v_wa_col text;
  v_has_outbox boolean := to_regclass('public.satusehat_outbox') is not null;
  v_has_wa boolean := to_regclass('public.notification_logs') is not null;
  v_has_storage boolean := to_regclass('storage.objects') is not null;
  v_day_start timestamptz := (p_date::timestamp at time zone 'Asia/Jakarta');
  v_day_end   timestamptz := ((p_date + 1)::timestamp at time zone 'Asia/Jakarta');
begin
  if v_has_wa then
    select column_name into v_wa_col
    from information_schema.columns
    where table_schema = 'public' and table_name = 'notification_logs'
      and column_name in ('timestamp', 'created_at', 'sent_at')
    order by array_position(array['timestamp', 'created_at', 'sent_at'], column_name::text)
    limit 1;
  end if;

  create temp table if not exists _usage_wa (clinic_id uuid primary key, n int) on commit drop;
  truncate _usage_wa;
  if v_has_wa and v_wa_col is not null then
    execute format(
      'insert into _usage_wa (clinic_id, n)
       select clinic_id, count(*)::int from public.notification_logs
       where status = ''sent'' and %I >= $1 and %I < $2
       group by clinic_id', v_wa_col, v_wa_col)
    using v_day_start, v_day_end;
  end if;

  create temp table if not exists _usage_ss (clinic_id uuid primary key, n int) on commit drop;
  truncate _usage_ss;
  if v_has_outbox then
    insert into _usage_ss (clinic_id, n)
    select clinic_id, count(*)::int
    from public.satusehat_outbox
    where status like 'failed%'
      and coalesce(last_attempt_at, updated_at) >= v_day_start
      and coalesce(last_attempt_at, updated_at) < v_day_end
    group by clinic_id;
  end if;

  create temp table if not exists _usage_storage (clinic_id uuid primary key, bytes bigint) on commit drop;
  truncate _usage_storage;
  if v_has_storage then
    insert into _usage_storage (clinic_id, bytes)
    select c.id, coalesce(sum((o.metadata ->> 'size')::bigint), 0)
    from public.clinics c
    join storage.objects o on split_part(o.name, '/', 1) = c.id::text
    group by c.id;
  end if;

  insert into platform.usage_daily as ud
    (clinic_id, date, patients_total, visits_count, active_users, storage_bytes, wa_sent, satusehat_errors, collected_at)
  select
    c.id,
    p_date,
    (select count(*) from public.patients p where p.clinic_id = c.id and p.deleted_at is null)::int,
    (select count(*) from public.visits v where v.clinic_id = c.id and v.tanggal_kunjungan = p_date)::int,
    (select count(*) from public.users u
       where u.clinic_id = c.id and u.last_login_at >= v_day_end - interval '30 days' and u.last_login_at < v_day_end)::int,
    coalesce((select s.bytes from _usage_storage s where s.clinic_id = c.id), 0),
    coalesce((select w.n from _usage_wa w where w.clinic_id = c.id), 0),
    coalesce((select e.n from _usage_ss e where e.clinic_id = c.id), 0),
    now()
  from public.clinics c
  where c.status <> 'closed'
  on conflict (clinic_id, date) do update set
    patients_total   = excluded.patients_total,
    visits_count     = excluded.visits_count,
    active_users     = excluded.active_users,
    storage_bytes    = excluded.storage_bytes,
    wa_sent          = excluded.wa_sent,
    satusehat_errors = excluded.satusehat_errors,
    collected_at     = excluded.collected_at;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.confirm_manual_payment(p_invoice_id uuid, p_amount_idr bigint, p_paid_at timestamp with time zone, p_reference text, p_notes text, p_operator_id uuid)
 RETURNS TABLE(payment_id uuid, invoice_status text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_inv platform.invoices;
  v_paid bigint;
  v_payment_id uuid;
begin
  select * into v_inv from platform.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice tidak ditemukan' using errcode = 'no_data_found';
  end if;
  if v_inv.status in ('paid', 'void') then
    raise exception 'Invoice % sudah berstatus %', v_inv.number, v_inv.status using errcode = 'check_violation';
  end if;

  insert into platform.payments (invoice_id, clinic_id, provider, provider_ref, amount_idr, status,
                                 paid_at, confirmed_by, notes)
  values (v_inv.id, v_inv.clinic_id, 'manual', p_reference, p_amount_idr, 'confirmed',
          p_paid_at, p_operator_id, p_notes)
  returning id into v_payment_id;

  select coalesce(sum(amount_idr), 0) into v_paid
  from platform.payments
  where invoice_id = v_inv.id and status = 'confirmed';

  if v_paid >= v_inv.total_idr then
    update platform.invoices set status = 'paid', paid_at = p_paid_at where id = v_inv.id;
    return query select v_payment_id, 'paid'::text;
  else
    return query select v_payment_id, v_inv.status;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.create_invoice(p_clinic_id uuid, p_period_start date, p_period_end date, p_amount_idr bigint, p_tax_idr bigint, p_due_date date, p_notes text, p_operator_id uuid, p_source text DEFAULT 'console'::text)
 RETURNS platform.invoices
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_inv platform.invoices;
begin
  if not exists (select 1 from public.clinics where id = p_clinic_id) then
    raise exception 'Klinik % tidak ditemukan', p_clinic_id using errcode = 'no_data_found';
  end if;

  insert into platform.invoices (clinic_id, number, period_start, period_end, amount_idr, tax_idr,
                                 due_date, notes, created_by, source)
  values (p_clinic_id, platform.next_invoice_number(), p_period_start, p_period_end, p_amount_idr,
          coalesce(p_tax_idr, 0), p_due_date, p_notes, p_operator_id, coalesce(p_source, 'console'))
  returning * into v_inv;

  return v_inv;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.dashboard_summary(p_churn_days integer DEFAULT 14)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with
  by_status as (
    select jsonb_object_agg(s.status, coalesce(cnt.n, 0)) as j
    from unnest(array['pending', 'trial', 'active', 'suspended', 'closed']) as s(status)
    left join (select status, count(*)::int as n from public.clinics group by status) cnt using (status)
  ),
  mrr as (
    select
      coalesce(sum(case when cs.billing_cycle = 'yearly' then p.price_yearly / 12.0 else p.price_monthly end), 0)::bigint as mrr,
      count(*)::int as n
    from public.clinic_subscriptions cs
    join public.subscription_plans p on p.id = cs.plan_id
    join public.clinics c on c.id = cs.clinic_id
    where cs.status = 'active' and c.status = 'active'
  ),
  due as (
    select count(*)::int as n, coalesce(sum(total_idr), 0)::bigint as amt
    from platform.invoices where status = 'open'
  ),
  overdue as (
    select count(*)::int as n, coalesce(sum(total_idr), 0)::bigint as amt
    from platform.invoices where status = 'overdue'
  ),
  trials as (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'trial_ends_at', trial_ends_at)
                              order by trial_ends_at), '[]'::jsonb) as j
    from (
      select id, name, trial_ends_at from public.clinics
      where status = 'trial' and trial_ends_at < now() + interval '7 days'
      order by trial_ends_at limit 10
    ) t
  ),
  churn as (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'last_activity_at', last_activity_at)
                              order by last_activity_at nulls first), '[]'::jsonb) as j
    from (
      select o.id, o.name, o.last_activity_at
      from platform.clinic_overview o
      where o.status in ('trial', 'active')
        and (o.last_activity_at is null or o.last_activity_at < now() - make_interval(days => p_churn_days))
        and o.created_at < now() - make_interval(days => p_churn_days)
      order by o.last_activity_at nulls first
      limit 10
    ) x
  )
  select jsonb_build_object(
    'clinicsByStatus', (select j from by_status),
    'newClinicsThisMonth', (
      select count(*)::int from public.clinics
      where created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'
    ),
    'mrrIdr', (select mrr from mrr),
    'activeSubscriptions', (select n from mrr),
    'invoicesDue', jsonb_build_object('count', (select n from due), 'amountIdr', (select amt from due)),
    'invoicesOverdue', jsonb_build_object('count', (select n from overdue), 'amountIdr', (select amt from overdue)),
    'trialsEndingSoon', (select j from trials),
    'churnRisk', (select j from churn),
    'generatedAt', now()
  );
$function$
;

CREATE OR REPLACE FUNCTION platform.guard_last_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if (tg_op = 'DELETE' and old.role = 'owner' and old.is_active)
     or (tg_op = 'UPDATE' and old.role = 'owner' and old.is_active
         and (new.role <> 'owner' or not new.is_active)) then
    if not exists (
      select 1 from platform.operators o
      where o.role = 'owner' and o.is_active and o.user_id <> old.user_id
    ) then
      raise exception 'Tidak bisa menonaktifkan atau menurunkan owner terakhir'
        using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.guard_operator_not_clinic_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (select 1 from public.users u where u.id = new.user_id) then
    raise exception 'User % sudah terdaftar sebagai user klinik; operator harus memakai akun terpisah', new.user_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.legacy_clinic_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    (select id from public.clinics where id = 'd0000000-0000-0000-0000-000000000000'),
    (select id from public.clinics order by created_at limit 1)
  );
$function$
;

CREATE OR REPLACE FUNCTION platform.make_unique_per_clinic(p_table text, p_column text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  rel regclass := to_regclass('public.' || p_table);
  col_num smallint;
  con record;
  idx record;
begin
  if rel is null then
    return;
  end if;

  select attnum into col_num
  from pg_attribute
  where attrelid = rel and attname = p_column and not attisdropped;

  if col_num is null then
    return;
  end if;

  for con in
    select conname, contype
    from pg_constraint
    where conrelid = rel
      and contype in ('u', 'p')
      and conkey = array[col_num]
  loop
    if con.contype = 'p' then
      execute format('alter table public.%I drop constraint %I', p_table, con.conname);
      execute format('alter table public.%I add primary key (clinic_id, %I)', p_table, p_column);
    else
      execute format('alter table public.%I drop constraint %I', p_table, con.conname);
    end if;
  end loop;

  for idx in
    select i.indexrelid::regclass::text as idxname
    from pg_index i
    where i.indrelid = rel
      and i.indisunique
      and i.indkey::smallint[] = array[col_num]
      and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)
  loop
    execute format('drop index %s', idx.idxname);
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = rel and contype in ('u', 'p')
      and conkey @> array[col_num]
      and conkey @> array[(select attnum from pg_attribute where attrelid = rel and attname = 'clinic_id')]
  ) then
    execute format('alter table public.%I add constraint %I unique (clinic_id, %I)',
                   p_table, p_table || '_clinic_' || p_column || '_key', p_column);
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.mark_overdue_invoices()
 RETURNS integer
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with updated as (
    update platform.invoices
    set status = 'overdue'
    where status = 'open'
      and due_date < (now() at time zone 'Asia/Jakarta')::date
    returning 1
  )
  select count(*)::int from updated;
$function$
;

CREATE OR REPLACE FUNCTION platform.next_invoice_number(p_at timestamp with time zone DEFAULT now())
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_year int := extract(year from (p_at at time zone 'Asia/Jakarta'))::int;
  v_next int;
begin
  insert into platform.invoice_counters as ic (year, last)
  values (v_year, 1)
  on conflict (year) do update set last = ic.last + 1
  returning last into v_next;

  return format('INV-%s-%s', v_year, lpad(v_next::text, 6, '0'));
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.provision_clinic(p_owner_user_id uuid, p_owner_email text, p_owner_name text, p_owner_phone text, p_name text, p_slug text, p_phone text, p_email text, p_address text, p_city text, p_province text, p_plan_id uuid, p_trial_days integer, p_operator_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_clinic_id uuid;
  v_owner_role_id uuid;
  v_legacy uuid;
  v_cols text;
  v_trial_end timestamptz;
  v_status text;
begin
  if p_trial_days is null or p_trial_days < 0 or p_trial_days > 90 then
    raise exception 'trial_days harus 0–90' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.clinics where slug = p_slug) then
    raise exception 'Slug "%" sudah dipakai klinik lain', p_slug using errcode = 'unique_violation';
  end if;

  if not exists (select 1 from public.subscription_plans where id = p_plan_id and coalesce(is_active, true)) then
    raise exception 'Paket tidak ditemukan atau tidak aktif' using errcode = 'no_data_found';
  end if;

  if exists (select 1 from public.users where id = p_owner_user_id) then
    raise exception 'Akun pemilik sudah terdaftar di klinik lain' using errcode = 'unique_violation';
  end if;

  if exists (select 1 from platform.operators where user_id = p_owner_user_id) then
    raise exception 'Akun pemilik adalah operator Dentiva; gunakan email lain' using errcode = 'check_violation';
  end if;

  v_trial_end := case when p_trial_days > 0 then now() + make_interval(days => p_trial_days) end;
  v_status := case when p_trial_days > 0 then 'trial' else 'active' end;

  insert into public.clinics (name, slug, status, owner_user_id, phone, email, address, city, province,
                              trial_ends_at, activated_at)
  values (p_name, p_slug, v_status, p_owner_user_id, nullif(p_phone, ''), nullif(p_email, ''),
          nullif(p_address, ''), nullif(p_city, ''), nullif(p_province, ''),
          v_trial_end, case when v_status = 'active' then now() end)
  returning id into v_clinic_id;

  insert into public.clinic_subscriptions (clinic_id, plan_id, status, billing_cycle,
                                           current_period_start, current_period_end, cancel_at_period_end)
  values (v_clinic_id, p_plan_id,
          case when v_status = 'trial' then 'trialing' else 'active' end,
          'monthly',
          now(),
          coalesce(v_trial_end, now() + interval '1 month'),
          false);

  if to_regclass('public.roles') is not null then
    select id into v_owner_role_id from public.roles where name = 'Clinic Owner';
  end if;

  insert into public.users (id, email, full_name, role, phone, clinic_id, status, invited_by, role_id)
  values (p_owner_user_id, lower(p_owner_email), p_owner_name, 'admin', nullif(p_owner_phone, ''),
          v_clinic_id, 'invited', p_operator_id, v_owner_role_id);

  if to_regclass('public.clinic_settings') is not null then
    insert into public.clinic_settings (clinic_id, key, value)
    values (v_clinic_id, 'clinic_name', p_name),
           (v_clinic_id, 'clinic_phone', coalesce(p_phone, ''))
    on conflict do nothing;
  end if;

  v_legacy := platform.legacy_clinic_id();
  if to_regclass('public.tier_weights') is not null and v_legacy is not null and v_legacy <> v_clinic_id then
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'tier_weights'
      and column_name not in ('clinic_id', 'updated_by', 'updated_at', 'created_at');

    if v_cols is not null then
      execute format(
        'insert into public.tier_weights (clinic_id, %s) select $1, %s from public.tier_weights where clinic_id = $2 on conflict do nothing',
        v_cols, v_cols)
      using v_clinic_id, v_legacy;
    end if;
  end if;

  return v_clinic_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.register_midtrans_order(p_order_id text, p_clinic_id uuid, p_plan_id uuid, p_billing_cycle text)
 RETURNS TABLE(invoice_id uuid, payment_id uuid, amount_idr bigint, plan_name text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_plan public.subscription_plans;
  v_amount bigint;
  v_inv platform.invoices;
  v_payment_id uuid;
  v_start date := (now() at time zone 'Asia/Jakarta')::date;
  v_end date;
begin
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'billing_cycle tidak valid' using errcode = 'check_violation';
  end if;

  select * into v_plan from public.subscription_plans where id = p_plan_id and coalesce(is_active, true);
  if not found then
    raise exception 'Paket tidak ditemukan atau tidak aktif' using errcode = 'no_data_found';
  end if;

  v_amount := round(case when p_billing_cycle = 'yearly' then v_plan.price_yearly else v_plan.price_monthly end)::bigint;
  v_end := (case when p_billing_cycle = 'yearly' then v_start + interval '1 year' else v_start + interval '1 month' end)::date - 1;

  v_inv := platform.create_invoice(p_clinic_id, v_start, v_end, v_amount, 0, v_start,
                                   format('Langganan %s (%s)', v_plan.name, p_billing_cycle),
                                   null, 'midtrans_checkout');

  insert into platform.payments (invoice_id, clinic_id, provider, provider_ref, amount_idr, status, metadata)
  values (v_inv.id, p_clinic_id, 'midtrans', p_order_id, v_amount, 'pending',
          jsonb_build_object('plan_id', p_plan_id, 'billing_cycle', p_billing_cycle))
  returning id into v_payment_id;

  return query select v_inv.id, v_payment_id, v_amount, v_plan.name::text;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.revoke_user_sessions(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_count int;
begin
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.rls_consolidate()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  g record;
  c text;
  using_expr text;
  check_expr text;
  creates text[];
  stmt text;
  n int := 0;
begin
  for g in
    select tablename, roles, array_to_string(roles, ', ') as roles_sql,
           replace(array_to_string(roles, '_'), '"', '') as roles_tag
    from pg_policies
    where schemaname = 'public' and permissive = 'PERMISSIVE'
    group by tablename, roles
    having count(*) > 1
  loop
    creates := array[]::text[];
    foreach c in array array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] loop
      using_expr := null;
      check_expr := null;
      if c <> 'INSERT' then
        select '(' || string_agg(distinct qual, ') OR (') || ')'
        into using_expr
        from pg_policies
        where schemaname = 'public' and tablename = g.tablename and roles = g.roles
          and permissive = 'PERMISSIVE' and cmd in (c, 'ALL') and qual is not null;
      end if;
      if c in ('INSERT', 'UPDATE') then
        select '(' || string_agg(distinct coalesce(with_check, qual), ') OR (') || ')'
        into check_expr
        from pg_policies
        where schemaname = 'public' and tablename = g.tablename and roles = g.roles
          and permissive = 'PERMISSIVE' and cmd in (c, 'ALL') and coalesce(with_check, qual) is not null;
      end if;
      if using_expr is null and check_expr is null then
        continue;
      end if;
      stmt := format('create policy %I on public.%I as permissive for %s to %s',
                     'rls_' || lower(c) || '_' || g.roles_tag, g.tablename, c, g.roles_sql);
      if using_expr is not null then stmt := stmt || format(' using (%s)', using_expr); end if;
      if check_expr is not null then stmt := stmt || format(' with check (%s)', check_expr); end if;
      creates := creates || stmt;
    end loop;
    for stmt in
      select format('drop policy %I on public.%I', policyname, tablename)
      from pg_policies
      where schemaname = 'public' and tablename = g.tablename and roles = g.roles and permissive = 'PERMISSIVE'
    loop
      execute stmt;
    end loop;
    foreach stmt in array creates loop
      execute stmt;
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.settle_midtrans_order(p_order_id text, p_outcome text, p_gross_amount bigint, p_raw jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_pay platform.payments;
  v_plan_id uuid;
  v_cycle text;
  v_sub public.clinic_subscriptions;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_pay from platform.payments
  where provider = 'midtrans' and provider_ref = p_order_id
  for update;

  if not found then
    return 'unknown_order';
  end if;

  if v_pay.status = 'confirmed' then
    return 'already_confirmed';
  end if;

  if p_outcome = 'pending' then
    update platform.payments set raw = p_raw where id = v_pay.id;
    return 'pending';
  end if;

  if p_outcome = 'failed' then
    update platform.payments set status = 'failed', raw = p_raw where id = v_pay.id;
    update platform.invoices set status = 'void', voided_at = now(), void_reason = 'Checkout Midtrans gagal/kedaluwarsa'
    where id = v_pay.invoice_id and status = 'open' and source = 'midtrans_checkout';
    return 'failed';
  end if;

  if p_outcome <> 'success' then
    raise exception 'outcome tidak dikenal: %', p_outcome;
  end if;

  if p_gross_amount <> v_pay.amount_idr then
    update platform.payments set raw = p_raw, notes = 'Nominal tidak cocok; perlu tinjauan manual' where id = v_pay.id;
    return 'amount_mismatch';
  end if;

  update platform.payments set status = 'confirmed', paid_at = now(), raw = p_raw where id = v_pay.id;
  update platform.invoices set status = 'paid', paid_at = now()
  where id = v_pay.invoice_id and status in ('open', 'overdue');

  v_plan_id := (v_pay.metadata ->> 'plan_id')::uuid;
  v_cycle := coalesce(v_pay.metadata ->> 'billing_cycle', 'monthly');

  select * into v_sub from public.clinic_subscriptions
  where clinic_id = v_pay.clinic_id and status in ('trialing', 'active', 'past_due')
  order by current_period_end desc
  limit 1
  for update;

  v_start := greatest(now(), coalesce(case when v_sub.status = 'active' then v_sub.current_period_end end, now()));
  v_end := v_start + case when v_cycle = 'yearly' then interval '1 year' else interval '1 month' end;

  if v_sub.id is not null then
    update public.clinic_subscriptions
    set plan_id = v_plan_id,
        status = 'active',
        billing_cycle = v_cycle,
        current_period_start = v_start,
        current_period_end = v_end,
        cancel_at_period_end = false,
        updated_at = now()
    where id = v_sub.id;
  else
    insert into public.clinic_subscriptions (clinic_id, plan_id, status, billing_cycle,
                                             current_period_start, current_period_end, cancel_at_period_end)
    values (v_pay.clinic_id, v_plan_id, 'active', v_cycle, v_start, v_end, false);
  end if;

  update public.clinics set status = 'active' where id = v_pay.clinic_id and status = 'trial';

  return 'confirmed';
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.wrap_policy_expr(expr text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  out_expr text := expr;
begin
  if out_expr is null then
    return null;
  end if;

  if out_expr !~* 'select\s+(public\.)?get_user_clinic_id\(\)' then
    out_expr := regexp_replace(out_expr, '(public\.)?get_user_clinic_id\(\)',
                               '( SELECT public.get_user_clinic_id() AS get_user_clinic_id)', 'g');
  end if;

  if out_expr !~* 'select\s+(public\.)?get_user_role\(\)' then
    out_expr := regexp_replace(out_expr, '(public\.)?get_user_role\(\)',
                               '( SELECT public.get_user_role() AS get_user_role)', 'g');
  end if;

  if out_expr !~* 'select\s+(public\.)?has_permission\(' then
    out_expr := regexp_replace(out_expr, '(public\.)?has_permission\((''[^'']*''(::(text|character varying))?)\)',
                               '( SELECT public.has_permission(\2) AS has_permission)', 'g');
  end if;

  return out_expr;
end;
$function$
;

CREATE OR REPLACE FUNCTION platform.write_audit(p_operator_id uuid, p_action text, p_target_type text, p_target_id text, p_clinic_id uuid, p_reason text, p_before jsonb, p_after jsonb, p_ip text, p_user_agent text, p_request_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_ip inet;
begin
  begin
    v_ip := nullif(split_part(coalesce(p_ip, ''), ',', 1), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into platform.audit_logs (operator_id, action, target_type, target_id, clinic_id, reason,
                                   before, after, ip, user_agent, request_id)
  values (p_operator_id, p_action, p_target_type, p_target_id, p_clinic_id, p_reason,
          p_before, p_after, v_ip, left(p_user_agent, 300), p_request_id)
  returning id into v_id;
  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.get_encryption_key()
 RETURNS bytea
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key TEXT;
BEGIN
  SELECT key_value INTO v_key FROM private.encryption_keys WHERE key_name = 'master_key';
  IF v_key IS NULL OR v_key = '' THEN
    RAISE EXCEPTION 'Configuration Error: Master encryption key is not set!';
  END IF;
  RETURN decode(v_key, 'hex');
END;
$function$
;

CREATE OR REPLACE FUNCTION private.medical_plain(p text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p is null then return null; end if;
  if p like 'PGPM:%' then
    return pgp_sym_decrypt(decode(substring(p from 6), 'base64'), private.get_encryption_key()::text);
  end if;
  if p like 'PGP:%' then
    return pgp_sym_decrypt(decode(substring(p from 5), 'base64'), private.get_encryption_key()::text);
  end if;
  return p;
exception when others then
  -- Ciphertext rusak: perlakukan apa adanya agar penyimpanan tidak macet
  return p;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.medical_reseal(p_new text, p_old text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p_old is not null and private.medical_plain(p_new) is not distinct from private.medical_plain(p_old) then
    return p_old;
  end if;
  return private.medical_seal(p_new);
end;
$function$
;

CREATE OR REPLACE FUNCTION private.medical_seal(p text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p is null or p = '' or p like 'PGPM:%' then return p; end if;
  return 'PGPM:' || encode(pgp_sym_encrypt(private.medical_plain(p), private.get_encryption_key()::text), 'base64');
end;
$function$
;

CREATE OR REPLACE FUNCTION private.medical_seal_json(j jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  k text;
begin
  if j is null or jsonb_typeof(j) <> 'object' then return j; end if;
  foreach k in array array['pemeriksaan_fisik', 'diagnosa', 'kode_icd10', 'terapi', 'catatan_dokter'] loop
    if jsonb_typeof(j -> k) = 'string' then
      j := jsonb_set(j, array[k], to_jsonb(private.medical_seal(j ->> k)));
    end if;
  end loop;
  return j;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.rotate_master_key(p_new_key_hex text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_old_key TEXT;
  v_new_key BYTEA;
  r RECORD;
BEGIN
  -- Verify new key format
  BEGIN
    v_new_key := decode(p_new_key_hex, 'hex');
    IF length(v_new_key) != 32 THEN
      RAISE EXCEPTION 'Invalid key length: Key must be 32 bytes (64 hex characters)';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid hex format for new encryption key';
  END;

  SELECT key_value INTO v_old_key FROM private.encryption_keys WHERE key_name = 'master_key';
  IF v_old_key IS NULL THEN
    RAISE EXCEPTION 'Current master key not found';
  END IF;

  -- 1. Re-encrypt patients table
  FOR r IN SELECT id, nama_lengkap, no_wa, alamat FROM public.patients LOOP
    UPDATE public.patients
    SET 
      nama_lengkap = CASE 
        WHEN nama_lengkap LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(nama_lengkap from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE nama_lengkap
      END,
      no_wa = CASE 
        WHEN no_wa LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(no_wa from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE no_wa
      END,
      alamat = CASE 
        WHEN alamat LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(alamat from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE alamat
      END
    WHERE id = r.id;
  END LOOP;

  -- 2. Re-encrypt visits table
  FOR r IN SELECT id, diagnosa, keluhan, pemeriksaan_fisik, terapi, catatan_dokter FROM public.visits LOOP
    UPDATE public.visits
    SET 
      diagnosa = CASE 
        WHEN diagnosa LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(diagnosa from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE diagnosa
      END,
      keluhan = CASE 
        WHEN keluhan LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(keluhan from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE keluhan
      END,
      pemeriksaan_fisik = CASE 
        WHEN pemeriksaan_fisik LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(pemeriksaan_fisik from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE pemeriksaan_fisik
      END,
      terapi = CASE 
        WHEN terapi LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(terapi from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE terapi
      END,
      catatan_dokter = CASE 
        WHEN catatan_dokter LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(catatan_dokter from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE catatan_dokter
      END
    WHERE id = r.id;
  END LOOP;

  -- 3. Re-encrypt medical_history table
  FOR r IN SELECT id, alergi_detail, riwayat_lain, konsumsi_obat FROM public.medical_history LOOP
    UPDATE public.medical_history
    SET 
      alergi_detail = CASE 
        WHEN alergi_detail LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(alergi_detail from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE alergi_detail
      END,
      riwayat_lain = CASE 
        WHEN riwayat_lain LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(riwayat_lain from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE riwayat_lain
      END,
      konsumsi_obat = CASE 
        WHEN konsumsi_obat LIKE 'PGP:%' THEN 'PGP:' || encode(pgp_sym_encrypt(pgp_sym_decrypt(decode(substring(konsumsi_obat from 5), 'base64'), decode(v_old_key, 'hex')::text), v_new_key::text), 'base64')
        ELSE konsumsi_obat
      END
    WHERE id = r.id;
  END LOOP;

  -- 4. Update stored master key
  UPDATE private.encryption_keys
  SET key_value = p_new_key_hex
  WHERE key_name = 'master_key';

END;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_answer_feedback(p_usage_id uuid, p_correct boolean, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  u public.ai_usage%rowtype;
  v_kind text;
begin
  select * into u from public.ai_usage where id = p_usage_id and clinic_id = v_clinic;
  if not found or u.feature <> 'finance_chat' or u.answer is null or u.question_norm is null then
    raise exception 'Jawaban tidak ditemukan' using errcode = 'P0002';
  end if;
  if u.status not in ('ok', 'cached') then
    raise exception 'Jawaban ini tidak dapat dinilai' using errcode = '22023';
  end if;

  insert into public.ai_feedback (clinic_id, usage_id, user_id, correct, note)
  values (v_clinic, u.id, auth.uid(), p_correct, nullif(left(trim(coalesce(p_note, '')), 500), ''));

  if p_correct then
    v_kind := case
      when cardinality(u.tools_used) = 0
       and u.question_norm ~ '(cara|bagaimana|gimana|apa itu|apa fungsi|dimana|di mana|menu|fitur|langkah|aktifkan|mengaktifkan|membuat|buat|mengatur|atur|mengubah|ubah|menambah|tambah|cetak|unduh|download|install|instal|login|daftar|hapus|pengaturan)'
      then 'panduan' else 'data' end;
    insert into public.ai_knowledge (clinic_id, question, question_norm, answer, kind, tools_used, data_fingerprint, source_usage_id, verified_by)
    values (v_clinic, left(u.question, 1000), u.question_norm, u.answer, v_kind, u.tools_used, u.data_fingerprint, u.id, auth.uid())
    on conflict (clinic_id, question_norm) do update set
      question = excluded.question, answer = excluded.answer, kind = excluded.kind,
      tools_used = excluded.tools_used, data_fingerprint = excluded.data_fingerprint,
      source_usage_id = excluded.source_usage_id, verified_by = excluded.verified_by, updated_at = now();
    return jsonb_build_object('saved', true, 'kind', v_kind);
  end if;

  delete from public.ai_knowledge where clinic_id = v_clinic and question_norm = u.question_norm;
  return jsonb_build_object('saved', false);
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_break_even(p_bulan integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_to date := (now() at time zone 'Asia/Jakarta')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date;
  v_from date; v_last date;
  v_overhead numeric; v_exp_avg numeric; v_fixed numeric; v_fixed_src text;
  v_rev numeric; v_visits int; v_bahan numeric; v_rev_snap numeric; v_var_ratio numeric;
  v_bep numeric; v_avg_visit numeric; v_mtd numeric; v_days_in_month int; v_day int;
begin
  if p_bulan is null or p_bulan < 1 or p_bulan > 12 then
    raise exception 'Periode historis harus 1–12 bulan' using errcode = '22023';
  end if;
  -- Bulan penuh terakhir (bulan berjalan tidak dihitung agar tidak bias)
  v_last := v_month_start - 1;
  v_from := (v_month_start - make_interval(months => p_bulan))::date;

  select coalesce(sum(jumlah_bulanan), 0) into v_overhead
    from public.overhead_costs where clinic_id = v_clinic and coalesce(aktif, true);
  select coalesce(sum(jumlah), 0) / p_bulan into v_exp_avg
    from public.expenses where clinic_id = v_clinic and tanggal_expense between v_from and v_last;
  if v_overhead > 0 then v_fixed := v_overhead; v_fixed_src := 'overhead_bulanan';
  else v_fixed := v_exp_avg; v_fixed_src := 'rata_rata_pengeluaran'; end if;

  select coalesce(sum(total_bayar), 0), count(distinct visit_id) into v_rev, v_visits
    from public.payments where clinic_id = v_clinic and status_pembayaran = 'paid'
     and (tanggal_pembayaran at time zone 'Asia/Jakarta')::date between v_from and v_last;

  select sum(s.total_biaya_bahan), sum(vt.subtotal) into v_bahan, v_rev_snap
    from public.payments p
    join public.visit_treatments vt on vt.visit_id = p.visit_id
    join public.treatment_cost_snapshot s on s.visit_treatment_id = vt.id
   where p.clinic_id = v_clinic and p.status_pembayaran = 'paid'
     and (p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date between v_from and v_last;
  v_var_ratio := case when coalesce(v_rev_snap, 0) > 0 then least(v_bahan / v_rev_snap, 0.95) end;

  v_bep := case when v_fixed > 0 then round(v_fixed / (1 - coalesce(v_var_ratio, 0))) end;
  v_avg_visit := case when v_visits > 0 then round(v_rev / v_visits) end;

  select coalesce(sum(total_bayar), 0) into v_mtd from public.payments
   where clinic_id = v_clinic and status_pembayaran = 'paid'
     and (tanggal_pembayaran at time zone 'Asia/Jakarta')::date between v_month_start and v_to;
  v_days_in_month := extract(day from (v_month_start + interval '1 month' - interval '1 day'))::int;
  v_day := extract(day from v_to)::int;

  return jsonb_build_object(
    'periode_historis', jsonb_build_object('dari', v_from, 'sampai', v_last, 'bulan', p_bulan),
    'biaya_tetap_per_bulan', round(v_fixed),
    'sumber_biaya_tetap', v_fixed_src,
    'total_overhead_bulanan', v_overhead,
    'rata_rata_pengeluaran_per_bulan', round(v_exp_avg),
    'rasio_biaya_bahan_terhadap_pendapatan', case when v_var_ratio is not null then round(v_var_ratio * 100, 1) end,
    'catatan_rasio', case when v_var_ratio is null then 'Biaya bahan per tindakan belum tercatat (snapshot HPP kosong); BEP dihitung tanpa biaya variabel sehingga bisa terlalu rendah.' end,
    'catatan_biaya_tetap', case when coalesce(v_fixed, 0) = 0 then 'Belum ada overhead (menu Biaya & Modal) maupun pengeluaran tercatat pada periode ini, sehingga BEP belum bisa dihitung.' end,
    'bep_pendapatan_per_bulan', v_bep,
    'rata_rata_pendapatan_per_bulan', round(v_rev / p_bulan),
    'rata_rata_per_kunjungan', v_avg_visit,
    'bep_kunjungan_per_bulan', case when v_bep is not null and v_avg_visit > 0 then ceil(v_bep / v_avg_visit) end,
    'rata_rata_kunjungan_dibayar_per_bulan', round(v_visits::numeric / p_bulan, 1),
    'bulan_berjalan', jsonb_build_object(
      'pendapatan_sejauh_ini', v_mtd, 'hari_ke', v_day, 'jumlah_hari', v_days_in_month,
      'proyeksi_akhir_bulan', case when v_day > 0 then round(v_mtd / v_day * v_days_in_month) end,
      'persen_dari_bep', case when v_bep > 0 then round(v_mtd / v_bep * 100, 1) end)
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_cashflow_projection(p_bulan_historis integer, p_bulan_ke_depan integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_month_start date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date;
  v_from date;
  v_hist jsonb; v_proj jsonb;
  v_n int; v_avg_in numeric; v_avg_out numeric; v_slope_in numeric; v_slope_out numeric;
  v_base_in numeric; v_base_out numeric;
  v_overhead numeric;
begin
  if p_bulan_historis is null or p_bulan_historis < 3 or p_bulan_historis > 12 then
    raise exception 'Periode historis harus 3–12 bulan' using errcode = '22023';
  end if;
  if p_bulan_ke_depan is null or p_bulan_ke_depan < 1 or p_bulan_ke_depan > 6 then
    raise exception 'Proyeksi 1–6 bulan ke depan' using errcode = '22023';
  end if;
  v_from := (v_month_start - make_interval(months => p_bulan_historis))::date;
  select coalesce(sum(jumlah_bulanan), 0) into v_overhead
    from public.overhead_costs where clinic_id = v_clinic and coalesce(aktif, true);

  with m as (
    select row_number() over (order by g)::int i, g::date bulan
    from generate_series(v_from, v_month_start - interval '1 month', interval '1 month') g
  ), cf as (
    select m.i, m.bulan,
      coalesce((select sum(total_bayar) from public.payments p where p.clinic_id = v_clinic and p.status_pembayaran = 'paid'
                and date_trunc('month', p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date = m.bulan), 0) masuk,
      coalesce((select sum(jumlah) from public.expenses e where e.clinic_id = v_clinic
                and date_trunc('month', e.tanggal_expense)::date = m.bulan), 0) keluar_pengeluaran,
      coalesce((select sum(total_harga) from public.material_purchases mp where mp.clinic_id = v_clinic
                and date_trunc('month', mp.tanggal)::date = m.bulan), 0) keluar_bahan
    from m
  )
  select count(*), avg(masuk), avg(keluar_pengeluaran + keluar_bahan),
         coalesce(regr_slope(masuk::float8, i::float8), 0), coalesce(regr_slope((keluar_pengeluaran + keluar_bahan)::float8, i::float8), 0),
         jsonb_agg(jsonb_build_object('bulan', to_char(bulan, 'YYYY-MM'), 'kas_masuk', masuk,
           'pengeluaran', keluar_pengeluaran, 'pembelian_bahan', keluar_bahan,
           'arus_kas_bersih', masuk - keluar_pengeluaran - keluar_bahan) order by i)
    into v_n, v_avg_in, v_avg_out, v_slope_in, v_slope_out, v_hist from cf;

  -- Dasar proyeksi: rata-rata 3 bulan penuh terakhir (lebih tahan terhadap satu bulan ekstrem
  -- dibanding garis tren). Tren tetap dilaporkan terpisah sebagai informasi.
  select avg(masuk), avg(keluar) into v_base_in, v_base_out from (
    select coalesce((select sum(total_bayar) from public.payments p where p.clinic_id = v_clinic and p.status_pembayaran = 'paid'
                     and date_trunc('month', p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date = g::date), 0) masuk,
           coalesce((select sum(jumlah) from public.expenses e where e.clinic_id = v_clinic
                     and date_trunc('month', e.tanggal_expense)::date = g::date), 0)
         + coalesce((select sum(total_harga) from public.material_purchases mp where mp.clinic_id = v_clinic
                     and date_trunc('month', mp.tanggal)::date = g::date), 0) keluar
    from generate_series(v_month_start - interval '3 month', v_month_start - interval '1 month', interval '1 month') g
  ) t;

  select jsonb_agg(jsonb_build_object('bulan', to_char(b, 'YYYY-MM'),
           'kas_masuk', pin, 'kas_keluar', pout, 'arus_kas_bersih', pin - pout,
           'kumulatif', (pin - pout) * k) order by k)
    into v_proj
    from (
      select k, (v_month_start + make_interval(months => k - 1))::date b,
             round(coalesce(v_base_in, 0)) pin, round(coalesce(v_base_out, 0)) pout
      from generate_series(1, p_bulan_ke_depan) k
    ) x;

  return jsonb_build_object(
    'metode', 'Proyeksi = rata-rata 3 bulan penuh terakhir per bulan (kas masuk = pembayaran lunas; kas keluar = pengeluaran tercatat + pembelian bahan). Bulan berjalan adalah bulan pertama proyeksi. Tren per bulan dari seluruh periode historis hanya sebagai informasi arah.',
    'historis', coalesce(v_hist, '[]'),
    'rata_rata_kas_masuk', round(coalesce(v_avg_in, 0)),
    'dasar_proyeksi_kas_masuk', round(coalesce(v_base_in, 0)),
    'dasar_proyeksi_kas_keluar', round(coalesce(v_base_out, 0)),
    'rata_rata_kas_keluar', round(coalesce(v_avg_out, 0)),
    'tren_kas_masuk_per_bulan', round(v_slope_in),
    'tren_kas_keluar_per_bulan', round(v_slope_out),
    'total_overhead_bulanan_tercatat', v_overhead,
    'catatan', case when v_overhead > coalesce(v_base_out, 0) then 'Overhead bulanan tercatat lebih besar dari rata-rata pengeluaran yang dicatat; kemungkinan sebagian biaya belum dicatat di Pengeluaran.' end,
    'proyeksi', coalesce(v_proj, '[]')
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_check_range(p_from date, p_to date)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Periode tidak valid' using errcode = 'invalid_parameter_value';
  end if;
  if p_to - p_from > 400 then
    raise exception 'Periode maksimal 400 hari' using errcode = 'invalid_parameter_value';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_doctor_performance(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.ai_require_admin(); r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  with v as (
    select v.id, v.dokter_id, v.status
    from public.visits v
    where v.clinic_id = v_clinic and v.deleted_at is null and v.tanggal_kunjungan between p_from and p_to
  ), pay as (
    select p.visit_id, sum(p.total_bayar) total
    from public.payments p
    where p.clinic_id = v_clinic and p.status_pembayaran = 'paid' and p.visit_id in (select id from v)
    group by 1
  )
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'dokter', coalesce(jsonb_agg(jsonb_build_object(
        'nama', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'kunjungan', x.kunjungan, 'selesai', x.selesai, 'batal', x.batal, 'pendapatan', x.pendapatan
      ) order by x.pendapatan desc), '[]')
  ) into r
  from (
    select v.dokter_id, count(*) kunjungan,
           count(*) filter (where v.status = 'completed') selesai,
           count(*) filter (where v.status = 'cancelled') batal,
           coalesce(sum(pay.total), 0) pendapatan
    from v left join pay on pay.visit_id = v.id
    group by v.dokter_id
  ) x
  left join public.users u on u.id = x.dokter_id;
  return r;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_doctor_schedule_load(p_minggu integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_to date := (now() at time zone 'Asia/Jakarta')::date - 1;
  v_from date;
  r jsonb;
begin
  if p_minggu is null or p_minggu < 2 or p_minggu > 26 then
    raise exception 'Periode harus 2–26 minggu' using errcode = '22023';
  end if;
  v_from := v_to - (p_minggu * 7) + 1;
  with days as (
    select d::date d, extract(dow from d)::int hari from generate_series(v_from, v_to, interval '1 day') d
  ), occ as (
    select hari, count(*) n from days group by 1
  ), vis as (
    select v.dokter_id, extract(dow from v.tanggal_kunjungan)::int hari, count(*) n
    from public.visits v
    where v.clinic_id = v_clinic and v.deleted_at is null and v.status <> 'cancelled'
      and v.tanggal_kunjungan between v_from and v_to
    group by 1, 2
  ), sched as (
    select dokter_id, hari, min(jam_mulai) jam_mulai, max(jam_selesai) jam_selesai,
           sum(coalesce(kapasitas_pasien_per_hari, 0)) kapasitas
    from public.doctor_schedules where clinic_id = v_clinic and coalesce(is_active, true)
    group by 1, 2
  ), grid as (
    select coalesce(s.dokter_id, vi.dokter_id) dokter_id, coalesce(s.hari, vi.hari) hari,
           s.jam_mulai, s.jam_selesai, s.kapasitas, coalesce(vi.n, 0) kunjungan
    from sched s full join vis vi on vi.dokter_id = s.dokter_id and vi.hari = s.hari
  )
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', v_from, 'sampai', v_to, 'minggu', p_minggu),
    'catatan', 'hari: 0=Minggu … 6=Sabtu. rata_rata_kunjungan = kunjungan tidak batal dibagi jumlah hari tersebut dalam periode. utilisasi = rata-rata / kapasitas.',
    'jadwal', coalesce(jsonb_agg(jsonb_build_object(
        'dokter', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'hari', g.hari,
        'nama_hari', (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[g.hari + 1],
        'ada_jadwal', g.jam_mulai is not null,
        'jam', case when g.jam_mulai is not null then to_char(g.jam_mulai, 'HH24:MI') || '–' || to_char(g.jam_selesai, 'HH24:MI') end,
        'kapasitas', nullif(g.kapasitas, 0),
        'rata_rata_kunjungan', round(g.kunjungan::numeric / nullif(o.n, 0), 1),
        'utilisasi_persen', case when g.kapasitas > 0 then round(g.kunjungan::numeric / nullif(o.n, 0) / g.kapasitas * 100, 1) end
      ) order by u.full_name, g.hari), '[]')
  ) into r
  from grid g left join occ o on o.hari = g.hari left join public.users u on u.id = g.dokter_id;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_expense_summary(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.ai_require_admin(); v_rev numeric; v_exp numeric; r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  select coalesce(sum(total_bayar), 0) into v_rev from public.payments
   where clinic_id = v_clinic and status_pembayaran = 'paid'
     and (tanggal_pembayaran at time zone 'Asia/Jakarta')::date between p_from and p_to;
  select coalesce(sum(jumlah), 0) into v_exp from public.expenses
   where clinic_id = v_clinic and tanggal_expense between p_from and p_to;
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'total_pendapatan', v_rev,
    'total_pengeluaran', v_exp,
    'selisih_pendapatan_minus_pengeluaran', v_rev - v_exp,
    'per_kategori', coalesce((select jsonb_agg(jsonb_build_object('kategori', kategori, 'total', t, 'jumlah_catatan', n) order by t desc)
        from (select coalesce(kategori, 'Lainnya') kategori, sum(jumlah) t, count(*) n from public.expenses
              where clinic_id = v_clinic and tanggal_expense between p_from and p_to group by 1) k), '[]'),
    'overhead_bulanan_aktif', coalesce((select jsonb_agg(jsonb_build_object('nama', nama_biaya, 'kategori', kategori, 'per_bulan', jumlah_bulanan) order by jumlah_bulanan desc)
        from public.overhead_costs where clinic_id = v_clinic and coalesce(aktif, true)), '[]'),
    'total_overhead_bulanan', coalesce((select sum(jumlah_bulanan) from public.overhead_costs where clinic_id = v_clinic and coalesce(aktif, true)), 0)
  ) into r;
  return r;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_knowledge_hit(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.ai_knowledge set hit_count = hit_count + 1, last_used_at = now() where id = p_id;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_knowledge_match(p_norm text, p_limit integer DEFAULT 3)
 RETURNS TABLE(id uuid, question text, question_norm text, answer text, kind text, data_fingerprint text, similarity real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
#variable_conflict use_column
declare v_clinic uuid := public.ai_require_admin();
begin
  return query
  select k.id, k.question, k.question_norm, k.answer, k.kind, k.data_fingerprint,
         case when k.question_norm = p_norm then 1::real else extensions.similarity(k.question_norm, p_norm) end as sim
  from public.ai_knowledge k
  where k.clinic_id = v_clinic
    and (k.question_norm = p_norm or extensions.similarity(k.question_norm, p_norm) >= 0.45)
  order by sim desc
  limit least(greatest(coalesce(p_limit, 3), 1), 5);
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_price_simulation(p_nama text, p_perubahan_persen numeric, p_bulan integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_from date; v_to date := (now() at time zone 'Asia/Jakarta')::date;
  v_pat text; r jsonb;
begin
  if p_perubahan_persen is null or p_perubahan_persen < -50 or p_perubahan_persen > 100 then
    raise exception 'Perubahan harga harus antara -50%% dan 100%%' using errcode = '22023';
  end if;
  if p_bulan is null or p_bulan < 1 or p_bulan > 12 then
    raise exception 'Periode historis harus 1–12 bulan' using errcode = '22023';
  end if;
  v_from := (v_to - make_interval(months => p_bulan))::date + 1;
  v_pat := '%' || replace(replace(replace(coalesce(trim(p_nama), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  with paid_visits as (
    select distinct p.visit_id from public.payments p
    where p.clinic_id = v_clinic and p.status_pembayaran = 'paid' and p.visit_id is not null
      and (p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date between v_from and v_to
  ), t as (
    select id, nama_treatment, harga_dasar from public.treatments
    where clinic_id = v_clinic and coalesce(is_active, true) and nama_treatment ilike v_pat
  ), rows as (
    select t.id, coalesce(vt.quantity, 1) q, vt.subtotal, s.total_modal
    from t join public.visit_treatments vt on vt.treatment_id = t.id
    join paid_visits pv on pv.visit_id = vt.visit_id
    left join public.treatment_cost_snapshot s on s.visit_treatment_id = vt.id
  ), agg as (
    select t.nama_treatment, t.harga_dasar,
           coalesce(sum(r.q), 0) volume,
           coalesce(sum(r.subtotal), 0) pendapatan,
           sum(r.total_modal) / nullif(sum(r.q) filter (where r.total_modal is not null), 0) hpp_per_unit
    from t left join rows r on r.id = t.id
    group by t.id, t.nama_treatment, t.harga_dasar
  ), calc as (
    select *, volume::numeric / p_bulan vol_bln, pendapatan / p_bulan pend_bln,
           round(harga_dasar * (1 + p_perubahan_persen / 100)) harga_baru
    from agg
  ), fin as (
    select *,
      round(pend_bln * (1 + p_perubahan_persen / 100)) pend_bln_baru,
      case when hpp_per_unit is not null then round(vol_bln * (harga_dasar - hpp_per_unit)) end margin_bln,
      case when hpp_per_unit is not null then round(vol_bln * (harga_baru - hpp_per_unit)) end margin_bln_baru,
      -- Volume per bulan agar total margin sama dengan sebelum perubahan harga
      case when hpp_per_unit is not null and harga_baru > hpp_per_unit and vol_bln > 0
           then round(vol_bln * (harga_dasar - hpp_per_unit) / (harga_baru - hpp_per_unit), 1) end vol_impas
    from calc
  )
  select jsonb_build_object(
    'asumsi', 'Volume per bulan diasumsikan tetap seperti rata-rata historis; pendapatan baru = pendapatan historis × (1 + perubahan). HPP per unit dari snapshot biaya bila tersedia.',
    'periode_historis', jsonb_build_object('dari', v_from, 'sampai', v_to, 'bulan', p_bulan),
    'perubahan_persen', p_perubahan_persen,
    'jumlah_tindakan_cocok', (select count(*) from fin),
    'total', jsonb_build_object(
      'pendapatan_per_bulan_sekarang', coalesce(round((select sum(pend_bln) from fin)), 0),
      'pendapatan_per_bulan_simulasi', coalesce((select sum(pend_bln_baru) from fin), 0),
      'selisih_per_bulan', coalesce((select sum(pend_bln_baru) - round(sum(pend_bln)) from fin), 0)),
    'tindakan', coalesce((select jsonb_agg(jsonb_build_object(
        'nama', nama_treatment, 'harga_sekarang', harga_dasar, 'harga_simulasi', harga_baru,
        'volume_per_bulan', round(vol_bln, 1),
        'pendapatan_per_bulan_sekarang', round(pend_bln), 'pendapatan_per_bulan_simulasi', pend_bln_baru,
        'hpp_per_unit', round(hpp_per_unit), 'margin_per_bulan_sekarang', margin_bln, 'margin_per_bulan_simulasi', margin_bln_baru,
        'volume_impas_per_bulan', vol_impas,
        'toleransi_penurunan_volume_persen', case when vol_impas is not null and vol_bln > 0 and p_perubahan_persen > 0
             then round((1 - vol_impas / vol_bln) * 100, 1) end
      ) order by pend_bln desc) from (select * from fin order by pend_bln desc limit 30) x), '[]')
  ) into r;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_recall_stats(p_bulan integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  r jsonb;
begin
  if p_bulan is null or p_bulan < 1 or p_bulan > 36 then
    raise exception 'Periode recall harus 1–36 bulan' using errcode = '22023';
  end if;
  with last_visit as (
    select v.patient_id, max(v.tanggal_kunjungan) terakhir
    from public.visits v where v.clinic_id = v_clinic and v.deleted_at is null and v.status = 'completed' group by 1
  ), due as (
    select p.id, coalesce(p.wa_consent, false) wa, lv.terakhir
    from last_visit lv join public.patients p on p.id = lv.patient_id and p.clinic_id = v_clinic and p.deleted_at is null
    where lv.terakhir <= (v_today - make_interval(months => p_bulan))::date
      and not exists (select 1 from public.visits f where f.patient_id = p.id and f.clinic_id = v_clinic
                      and f.deleted_at is null and f.status = 'scheduled' and f.tanggal_kunjungan >= v_today)
  )
  select jsonb_build_object(
    'batas_bulan', p_bulan,
    'pasien_perlu_recall', (select count(*) from due),
    'dengan_izin_wa', (select count(*) from due where wa),
    'sudah_dihubungi_30_hari', (select count(distinct rc.patient_id) from public.recall_contacts rc
        where rc.clinic_id = v_clinic and rc.created_at > now() - interval '30 days' and rc.patient_id in (select id from due)),
    'per_lama_tidak_kembali', coalesce((select jsonb_object_agg(k, n) from (
        select case when terakhir > v_today - interval '12 months' then '6-12 bulan'
                    when terakhir > v_today - interval '24 months' then '12-24 bulan' else '>24 bulan' end k, count(*) n
        from due group by 1) b), '{}'),
    'total_pasien_pernah_berkunjung', (select count(*) from last_visit)
  ) into r;
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_require_admin()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.get_user_clinic_id();
begin
  if public.get_user_role() is distinct from 'admin' or v_clinic is null then
    raise exception 'Asisten AI hanya untuk admin klinik' using errcode = 'insufficient_privilege';
  end if;
  return v_clinic;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_revenue_summary(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_len int; v_prev_from date; v_prev_to date; r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  v_len := p_to - p_from;
  v_prev_to := p_from - 1;
  v_prev_from := v_prev_to - v_len;
  with p as (
    select (tanggal_pembayaran at time zone 'Asia/Jakarta')::date d, total_bayar, coalesce(diskon, 0) diskon, metode_pembayaran
    from public.payments
    where clinic_id = v_clinic and status_pembayaran = 'paid'
      and (tanggal_pembayaran at time zone 'Asia/Jakarta')::date between v_prev_from and p_to
  ), cur as (select * from p where d between p_from and p_to),
     prev as (select * from p where d between v_prev_from and v_prev_to)
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to, 'jumlah_hari', v_len + 1),
    'total_pendapatan', coalesce((select sum(total_bayar) from cur), 0),
    'jumlah_transaksi', (select count(*) from cur),
    'rata_rata_transaksi', coalesce(round((select avg(total_bayar) from cur)), 0),
    'total_diskon', coalesce((select sum(diskon) from cur), 0),
    'per_metode', coalesce((select jsonb_agg(jsonb_build_object('metode', metode_pembayaran, 'total', t, 'transaksi', n) order by t desc)
                             from (select metode_pembayaran, sum(total_bayar) t, count(*) n from cur group by 1) m), '[]'),
    'per_hari', case when v_len <= 62 then coalesce((select jsonb_agg(jsonb_build_object('tanggal', d, 'total', t, 'transaksi', n) order by d)
                             from (select d, sum(total_bayar) t, count(*) n from cur group by 1) h), '[]') end,
    'per_bulan', case when v_len > 62 then coalesce((select jsonb_agg(jsonb_build_object('bulan', to_char(b, 'YYYY-MM'), 'total', t, 'transaksi', n) order by b)
                             from (select date_trunc('month', d) b, sum(total_bayar) t, count(*) n from cur group by 1) mm), '[]') end,
    'periode_sebelumnya', jsonb_build_object('dari', v_prev_from, 'sampai', v_prev_to,
        'total_pendapatan', coalesce((select sum(total_bayar) from prev), 0),
        'jumlah_transaksi', (select count(*) from prev))
  ) into r;
  return r;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_service_clinics()
 RETURNS TABLE(clinic_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.id
  from public.clinics c
  where c.status in ('trial', 'active')
    and exists (select 1 from public.clinic_settings cs
                where cs.clinic_id = c.id and cs.key = 'ai_assistant_enabled' and cs.value = 'true')
    and exists (select 1 from public.clinic_subscriptions s join public.subscription_plans p on p.id = s.plan_id
                where s.clinic_id = c.id and s.status in ('active', 'trialing')
                  and coalesce((p.features ->> 'ai_assistant')::boolean, false))
    and exists (select 1 from public.users u where u.clinic_id = c.id and u.role = 'admin' and u.status = 'active');
$function$
;

CREATE OR REPLACE FUNCTION public.ai_service_snapshots(p_clinic uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_admin uuid;
  v_old text := current_setting('request.jwt.claims', true);
  r jsonb;
begin
  select u.id into v_admin from public.users u
   where u.clinic_id = p_clinic and u.role = 'admin' and u.status = 'active'
   order by u.created_at limit 1;
  if v_admin is null then return null; end if;

  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin, 'role', 'authenticated',
    'app_metadata', jsonb_build_object('clinic_id', p_clinic))::text, true);
  r := jsonb_build_object(
    'admin_user', v_admin,
    'snapshot', public.ai_snapshot(),
    'staff_snapshot', public.ai_staff_snapshot());
  perform set_config('request.jwt.claims', coalesce(v_old, ''), true);
  return r;
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_set_enabled(p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.ai_require_admin();
begin
  update public.clinic_settings set value = case when p_enabled then 'true' else 'false' end, updated_at = now()
   where clinic_id = v_clinic and key = 'ai_assistant_enabled';
  if not found then
    insert into public.clinic_settings (clinic_id, key, value)
    values (v_clinic, 'ai_assistant_enabled', case when p_enabled then 'true' else 'false' end);
  end if;
  if p_enabled then
    delete from public.clinic_settings where clinic_id = v_clinic and key = 'ai_assistant_consent';
    insert into public.clinic_settings (clinic_id, key, value)
    values (v_clinic, 'ai_assistant_consent', jsonb_build_object('oleh', auth.uid(), 'pada', now())::text);
  end if;
  return public.ai_status();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_month date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date;
  v_tindakan jsonb;
begin
  v_tindakan := public.ai_treatment_performance(v_today - 89, v_today);
  return jsonb_build_object(
    'dihitung_pada', to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') || ' WIB',
    'hari_ini', public.ai_today_summary(),
    'pendapatan_bulan_ini', public.ai_revenue_summary(v_month, v_today),
    'pengeluaran_bulan_ini', public.ai_expense_summary(v_month, v_today) - 'overhead_bulanan_aktif',
    'tindakan_90_hari_top10', jsonb_build_object(
      'periode', v_tindakan -> 'periode',
      'tindakan', coalesce((select jsonb_agg(e) from (
        select e from jsonb_array_elements(v_tindakan -> 'tindakan') e limit 10) t), '[]')),
    'stok', public.ai_stock_alerts(),
    'belum_dibayar_30_hari', public.ai_unbilled_visits(30),
    'recall_6_bulan', public.ai_recall_stats(6)
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_staff_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.recall_require_staff();
  v_now timestamp := now() at time zone 'Asia/Jakarta';
  v_today date := v_now::date;
  v_dow int := extract(dow from v_now)::int;
  v_hari text := (array['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'])[extract(dow from v_now)::int + 1];
begin
  return jsonb_build_object(
    'dihitung_pada', to_char(v_now, 'YYYY-MM-DD HH24:MI') || ' WIB',
    'hari', v_hari,
    'kunjungan_hari_ini', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.visits
        where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan = v_today group by 1) s), '{}'),
    'kunjungan_per_dokter_hari_ini', coalesce((select jsonb_agg(jsonb_build_object(
        'dokter', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'menunggu', x.menunggu, 'selesai', x.selesai) order by x.menunggu desc)
      from (select dokter_id,
                   count(*) filter (where status = 'scheduled') menunggu,
                   count(*) filter (where status = 'completed') selesai
            from public.visits where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan = v_today
            group by 1) x left join public.users u on u.id = x.dokter_id), '[]'),
    'jadwal_3_jam_ke_depan', (select count(*) from public.visits where clinic_id = v_clinic and deleted_at is null
        and status = 'scheduled' and tanggal_kunjungan = v_today and jam_kunjungan is not null
        and jam_kunjungan between v_now::time and (v_now + interval '3 hours')::time),
    'dokter_praktik_hari_ini', coalesce((select jsonb_agg(jsonb_build_object(
        'dokter', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'jam', to_char(ds.jam_mulai, 'HH24:MI') || '–' || to_char(ds.jam_selesai, 'HH24:MI')) order by ds.jam_mulai)
      from public.doctor_schedules ds left join public.users u on u.id = ds.dokter_id
      where ds.clinic_id = v_clinic and coalesce(ds.is_active, true) and ds.hari = v_dow), '[]'),
    'booking_menunggu_konfirmasi', (select count(*) from public.booking_requests where clinic_id = v_clinic and status = 'pending'),
    'booking_untuk_hari_ini', (select count(*) from public.booking_requests where clinic_id = v_clinic
        and status in ('pending', 'confirmed') and requested_date = v_today),
    'pasien_baru_hari_ini', (select count(*) from public.patients where clinic_id = v_clinic and deleted_at is null
        and (created_at at time zone 'Asia/Jakarta')::date = v_today),
    'selesai_belum_dibayar_hari_ini', (select count(*) from public.visits v where v.clinic_id = v_clinic and v.deleted_at is null
        and v.tanggal_kunjungan = v_today and v.status = 'completed'
        and not exists (select 1 from public.payments p where p.visit_id = v.id and p.status_pembayaran = 'paid')),
    'selesai_belum_dibayar_7_hari', (select count(*) from public.visits v where v.clinic_id = v_clinic and v.deleted_at is null
        and v.tanggal_kunjungan between v_today - 6 and v_today and v.status = 'completed'
        and not exists (select 1 from public.payments p where p.visit_id = v.id and p.status_pembayaran = 'paid')),
    'terjadwal_besok', (select count(*) from public.visits where clinic_id = v_clinic and deleted_at is null
        and status = 'scheduled' and tanggal_kunjungan = v_today + 1),
    'recall', (
      with last_visit as (
        select v.patient_id, max(v.tanggal_kunjungan) terakhir from public.visits v
        where v.clinic_id = v_clinic and v.deleted_at is null and v.status = 'completed' group by 1
      ), due as (
        select p.id, coalesce(p.wa_consent, false) wa from last_visit lv
        join public.patients p on p.id = lv.patient_id and p.clinic_id = v_clinic and p.deleted_at is null
        where lv.terakhir <= (v_today - interval '6 months')::date
          and not exists (select 1 from public.visits f where f.patient_id = p.id and f.clinic_id = v_clinic
                          and f.deleted_at is null and f.status = 'scheduled' and f.tanggal_kunjungan >= v_today)
      )
      select jsonb_build_object(
        'perlu_dihubungi', (select count(*) from due),
        'bisa_via_wa', (select count(*) from due where wa),
        'sudah_dihubungi_30_hari', (select count(distinct rc.patient_id) from public.recall_contacts rc
            where rc.clinic_id = v_clinic and rc.created_at > now() - interval '30 days' and rc.patient_id in (select id from due)))
    )
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_staff_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.recall_require_staff(); v_feature boolean; v_enabled boolean;
begin
  select coalesce((p.features ->> 'ai_assistant')::boolean, false) into v_feature
    from public.clinic_subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.clinic_id = v_clinic and s.status in ('active', 'trialing')
   order by s.created_at desc limit 1;
  select value = 'true' into v_enabled from public.clinic_settings where clinic_id = v_clinic and key = 'ai_assistant_enabled';
  return jsonb_build_object('tersedia_di_paket', coalesce(v_feature, false), 'aktif', coalesce(v_enabled, false));
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_plan text; v_feature boolean; v_enabled boolean; v_used int;
begin
  select p.name, coalesce((p.features ->> 'ai_assistant')::boolean, false)
    into v_plan, v_feature
    from public.clinic_subscriptions s join public.subscription_plans p on p.id = s.plan_id
   where s.clinic_id = v_clinic and s.status in ('active', 'trialing')
   order by s.created_at desc limit 1;
  select value = 'true' into v_enabled from public.clinic_settings where clinic_id = v_clinic and key = 'ai_assistant_enabled';
  select count(*) into v_used from public.ai_usage
   where clinic_id = v_clinic and status = 'ok' and feature not in ('daily_brief', 'staff_brief')
     and created_at >= date_trunc('month', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  return jsonb_build_object(
    'paket', v_plan,
    'tersedia_di_paket', coalesce(v_feature, false),
    'aktif', coalesce(v_enabled, false),
    'kuota_bulanan', case v_plan when 'Enterprise' then 1000 when 'Pro' then 300 else 0 end,
    'terpakai_bulan_ini', v_used
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_stock_alerts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.ai_require_admin(); v_today date := (now() at time zone 'Asia/Jakarta')::date; r jsonb;
begin
  select jsonb_build_object(
    'tanggal', v_today,
    'stok_menipis', coalesce((select jsonb_agg(jsonb_build_object('bahan', nama_bahan, 'stok', stok_saat_ini, 'minimum', stok_minimum, 'satuan', satuan_dasar) order by stok_saat_ini)
        from public.master_bahan where clinic_id = v_clinic and coalesce(is_active, true) and stok_minimum is not null and stok_saat_ini <= stok_minimum), '[]'),
    'kadaluarsa_60_hari', coalesce((select jsonb_agg(jsonb_build_object('bahan', m.nama_bahan, 'batch', b.no_batch, 'sisa', b.qty_sisa, 'kadaluarsa', b.tanggal_kadaluarsa,
                                   'sudah_lewat', b.tanggal_kadaluarsa < v_today) order by b.tanggal_kadaluarsa)
        from public.material_batches b join public.master_bahan m on m.id = b.material_id
        where b.clinic_id = v_clinic and coalesce(b.qty_sisa, 0) > 0 and b.tanggal_kadaluarsa is not null
          and b.tanggal_kadaluarsa <= v_today + 60), '[]')
  ) into r;
  return r;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_today_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_clinic uuid := public.ai_require_admin();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  return jsonb_build_object(
    'tanggal', v_today,
    'kunjungan_per_status', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.visits
        where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan = v_today group by 1) s), '{}'),
    'kunjungan_per_dokter', coalesce((select jsonb_agg(jsonb_build_object(
        'dokter', trim(concat_ws(' ', u.gelar_depan, u.full_name, u.gelar_belakang)),
        'terjadwal', x.terjadwal, 'selesai', x.selesai, 'batal', x.batal) order by x.total desc)
      from (select dokter_id, count(*) total,
                   count(*) filter (where status = 'scheduled') terjadwal,
                   count(*) filter (where status = 'completed') selesai,
                   count(*) filter (where status = 'cancelled') batal
            from public.visits where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan = v_today
            group by 1) x left join public.users u on u.id = x.dokter_id), '[]'),
    'pasien_baru_hari_ini', (select count(*) from public.patients where clinic_id = v_clinic and deleted_at is null
        and (created_at at time zone 'Asia/Jakarta')::date = v_today),
    'booking_online_menunggu', (select count(*) from public.booking_requests where clinic_id = v_clinic and status = 'pending'),
    'booking_online_untuk_hari_ini', (select count(*) from public.booking_requests where clinic_id = v_clinic
        and status in ('pending', 'confirmed') and requested_date = v_today),
    'pembayaran_hari_ini', (select jsonb_build_object('total', coalesce(sum(total_bayar), 0), 'transaksi', count(*))
        from public.payments where clinic_id = v_clinic and status_pembayaran = 'paid'
         and (tanggal_pembayaran at time zone 'Asia/Jakarta')::date = v_today),
    'selesai_belum_dibayar_hari_ini', (select count(*) from public.visits v where v.clinic_id = v_clinic and v.deleted_at is null
        and v.tanggal_kunjungan = v_today and v.status = 'completed'
        and not exists (select 1 from public.payments p where p.visit_id = v.id and p.status_pembayaran = 'paid')),
    'terjadwal_7_hari_ke_depan', (select count(*) from public.visits where clinic_id = v_clinic and deleted_at is null
        and status = 'scheduled' and tanggal_kunjungan between v_today + 1 and v_today + 7)
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.ai_treatment_performance(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.ai_require_admin(); r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  with paid_visits as (
    select distinct p.visit_id
    from public.payments p
    where p.clinic_id = v_clinic and p.status_pembayaran = 'paid' and p.visit_id is not null
      and (p.tanggal_pembayaran at time zone 'Asia/Jakarta')::date between p_from and p_to
  ), rows as (
    select t.nama_treatment, t.kategori, t.harga_dasar, vt.quantity, vt.subtotal, s.total_modal, s.margin
    from paid_visits pv
    join public.visit_treatments vt on vt.visit_id = pv.visit_id
    join public.treatments t on t.id = vt.treatment_id and t.clinic_id = v_clinic
    left join public.treatment_cost_snapshot s on s.visit_treatment_id = vt.id
  ), agg as (
    select nama_treatment, kategori, max(harga_dasar) harga_master,
           sum(coalesce(quantity, 1)) jumlah, sum(subtotal) pendapatan,
           count(total_modal) baris_dengan_hpp, count(*) baris,
           sum(total_modal) total_hpp, sum(margin) total_margin
    from rows group by 1, 2
  )
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'catatan', 'HPP/margin hanya tersedia untuk tindakan yang sudah dihitung biayanya (snapshot saat kunjungan selesai).',
    'tindakan', coalesce((select jsonb_agg(jsonb_build_object(
        'nama', nama_treatment, 'kategori', kategori, 'harga_master', harga_master,
        'jumlah', jumlah, 'pendapatan', pendapatan,
        'hpp_tersedia', baris_dengan_hpp = baris and baris > 0,
        'total_hpp', total_hpp, 'total_margin', total_margin,
        'margin_persen', case when baris_dengan_hpp = baris and pendapatan > 0 then round(total_margin / pendapatan * 100, 1) end
      ) order by pendapatan desc) from (select * from agg order by pendapatan desc limit 40) a), '[]')
  ) into r;
  return r;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_unbilled_visits(p_days integer DEFAULT 60)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.ai_require_admin(); v_days int := least(greatest(coalesce(p_days, 60), 1), 365); r jsonb;
begin
  with u as (
    select v.id, v.tanggal_kunjungan,
           coalesce((select sum(vt.subtotal) from public.visit_treatments vt where vt.visit_id = v.id), 0) est
    from public.visits v
    where v.clinic_id = v_clinic and v.deleted_at is null and v.status = 'completed'
      and v.tanggal_kunjungan >= (now() at time zone 'Asia/Jakarta')::date - v_days
      and not exists (select 1 from public.payments p where p.visit_id = v.id and p.status_pembayaran = 'paid')
  )
  select jsonb_build_object(
    'rentang_hari', v_days,
    'jumlah_kunjungan', (select count(*) from u),
    'perkiraan_nilai', coalesce((select sum(est) from u), 0),
    'per_tanggal', coalesce((select jsonb_agg(jsonb_build_object('tanggal', tanggal_kunjungan, 'kunjungan', n, 'perkiraan', t) order by tanggal_kunjungan desc)
        from (select tanggal_kunjungan, count(*) n, sum(est) t from u group by 1 order by 1 desc limit 31) d), '[]')
  ) into r;
  return r;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ai_visit_stats(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.ai_require_admin(); r jsonb;
begin
  perform public.ai_check_range(p_from, p_to);
  select jsonb_build_object(
    'periode', jsonb_build_object('dari', p_from, 'sampai', p_to),
    'kunjungan_per_status', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.visits
        where clinic_id = v_clinic and deleted_at is null and tanggal_kunjungan between p_from and p_to group by 1) s), '{}'),
    'pasien_baru', (select count(*) from public.patients where clinic_id = v_clinic and deleted_at is null
                     and (created_at at time zone 'Asia/Jakarta')::date between p_from and p_to),
    'booking_online', coalesce((select jsonb_object_agg(status, n) from (
        select status, count(*) n from public.booking_requests
        where clinic_id = v_clinic and (created_at at time zone 'Asia/Jakarta')::date between p_from and p_to group by 1) b), '{}')
  ) into r;
  return r;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_emr_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_version INTEGER;
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- Determine next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version 
  FROM public.medical_record_versions
  WHERE visit_id = NEW.id;

  -- Create JSON representations of the changes (only tracking the medical fields on visits)
  v_old := jsonb_build_object(
    'diagnosa', OLD.diagnosa,
    'keluhan', OLD.keluhan,
    'pemeriksaan_fisik', OLD.pemeriksaan_fisik,
    'terapi', OLD.terapi,
    'catatan_dokter', OLD.catatan_dokter,
    'kode_icd10', OLD.kode_icd10
  );

  v_new := jsonb_build_object(
    'diagnosa', NEW.diagnosa,
    'keluhan', NEW.keluhan,
    'pemeriksaan_fisik', NEW.pemeriksaan_fisik,
    'terapi', NEW.terapi,
    'catatan_dokter', NEW.catatan_dokter,
    'kode_icd10', NEW.kode_icd10
  );

  -- Only record a version if there is an actual medical change
  IF v_old IS DISTINCT FROM v_new THEN
    INSERT INTO public.medical_record_versions (
      visit_id,
      patient_id,
      version,
      changed_by,
      change_summary,
      previous_data,
      new_data,
      -- We extract reason if it was passed via application context/metadata, or default to generic update
      reason
    ) VALUES (
      NEW.id,
      NEW.patient_id,
      v_version,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID), -- Should be actual user
      'EMR Updated',
      v_old,
      v_new,
      'System update'
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.billing_register_midtrans_order(p_order_id text, p_clinic_id uuid, p_plan_id uuid, p_billing_cycle text)
 RETURNS TABLE(invoice_id uuid, payment_id uuid, amount_idr bigint, plan_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select * from platform.register_midtrans_order(p_order_id, p_clinic_id, p_plan_id, p_billing_cycle);
$function$
;

CREATE OR REPLACE FUNCTION public.billing_settle_midtrans_order(p_order_id text, p_outcome text, p_gross_amount bigint, p_raw jsonb)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select platform.settle_midtrans_order(p_order_id, p_outcome, p_gross_amount, p_raw);
$function$
;

CREATE OR REPLACE FUNCTION public.check_max_patients_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_max_patients int;
  v_current_count int;
begin
  select sp.max_patients
  into v_max_patients
  from public.clinic_subscriptions cs
  join public.subscription_plans sp on sp.id = cs.plan_id
  where cs.clinic_id = new.clinic_id
    and cs.status in ('trialing', 'active', 'past_due')
  order by cs.current_period_end desc
  limit 1;

  if v_max_patients is null then
    v_max_patients := 1000;
  end if;

  select count(*) into v_current_count
  from public.patients
  where clinic_id = new.clinic_id and deleted_at is null;

  if v_current_count >= v_max_patients then
    raise exception 'Batas jumlah pasien pada paket Anda telah tercapai (maksimal % pasien). Silakan upgrade paket langganan klinik Anda untuk menambah pasien baru.', v_max_patients;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.clinics_touch()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    if new.status = 'active' and old.status <> 'active' then
      new.activated_at := coalesce(new.activated_at, now());
    end if;
    if new.status = 'suspended' then
      new.suspended_at := now();
    elsif old.status = 'suspended' then
      new.suspended_at := null;
      new.suspended_reason := null;
    end if;
    if new.status = 'closed' then
      new.closed_at := now();
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_queue_display_link(p_label text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_clinic uuid := public.get_user_clinic_id();
  v_token  text;
  v_id     uuid;
begin
  if v_clinic is null or public.get_user_role() is distinct from 'admin' then
    raise exception 'Hanya admin klinik yang dapat membuat tautan layar antrean' using errcode = 'insufficient_privilege';
  end if;

  if (select count(*) from public.queue_display_links where clinic_id = v_clinic and revoked_at is null) >= 10 then
    raise exception 'Maksimal 10 tautan aktif. Cabut tautan lama terlebih dahulu.' using errcode = 'check_violation';
  end if;

  v_token := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');

  insert into public.queue_display_links (clinic_id, label, token_hash, token_hint, created_by)
  values (v_clinic, coalesce(nullif(trim(p_label), ''), 'Layar ruang tunggu'),
          encode(extensions.digest(v_token, 'sha256'), 'hex'), right(v_token, 4), auth.uid())
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'token', v_token);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_batch(p_payloads text[])
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_result TEXT[] := ARRAY[]::TEXT[];
  v_item TEXT;
BEGIN
  FOREACH v_item IN ARRAY p_payloads
  LOOP
    v_result := array_append(v_result, public.decrypt_field(v_item));
  END LOOP;
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrypt_field(p_ciphertext text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if p_ciphertext is null then
    return null;
  end if;
  if p_ciphertext like 'PGPM:%' then
    if not public.is_medical_reader() then
      return '[Terbatas: hanya dokter]';
    end if;
    begin
      return pgp_sym_decrypt(decode(substring(p_ciphertext from 6), 'base64'), private.get_encryption_key()::text);
    exception when others then
      return p_ciphertext;
    end;
  end if;
  if not p_ciphertext like 'PGP:%' then
    -- Return raw value if not encrypted with server-side PGP scheme
    return p_ciphertext;
  end if;
  begin
    return pgp_sym_decrypt(decode(substring(p_ciphertext from 5), 'base64'), private.get_encryption_key()::text);
  exception when others then
    -- Catch exception and return raw string (prevents crashes if key changes/corrupts)
    return p_ciphertext;
  end;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dynamic_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    declare
      v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
      v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
      v_action text;
      v_risk_level text := 'LOW';
      v_clinic_id uuid;
    begin
      if tg_op = 'INSERT' then
        v_action := 'CREATE';
      elsif tg_op = 'UPDATE' then
        if (v_new ->> 'is_active') = 'false' and (v_old ->> 'is_active') = 'true' then
          v_action := 'SOFT_DELETE';
          v_risk_level := 'HIGH';
        else
          v_action := 'UPDATE';
        end if;
      else
        v_action := 'HARD_DELETE';
        v_risk_level := 'CRITICAL';
      end if;

      v_clinic_id := coalesce(
        nullif(v_new ->> 'clinic_id', '')::uuid,
        nullif(v_old ->> 'clinic_id', '')::uuid,
        public.get_user_clinic_id()
      );

      if v_clinic_id is null then
        return coalesce(new, old);
      end if;

      insert into public.audit_logs (user_id, clinic_id, module, action, previous_value, new_value, risk_level)
      values (
        auth.uid(),
        v_clinic_id,
        upper(tg_table_name),
        v_action,
        case when tg_op in ('UPDATE', 'DELETE') then v_old end,
        case when tg_op in ('INSERT', 'UPDATE') then v_new end,
        v_risk_level
      );

      return coalesce(new, old);
    end;
    $function$
;

CREATE OR REPLACE FUNCTION public.encrypt_batch(p_payloads text[])
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_result TEXT[] := ARRAY[]::TEXT[];
  v_item TEXT;
BEGIN
  FOREACH v_item IN ARRAY p_payloads
  LOOP
    v_result := array_append(v_result, public.encrypt_field(v_item));
  END LOOP;
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.encrypt_field(p_plaintext text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_encrypted TEXT;
BEGIN
  IF p_plaintext IS NULL OR p_plaintext = '' THEN
    RETURN p_plaintext;
  END IF;
  
  -- If it already starts with PGP: prefix, do not encrypt again (avoid double-encryption)
  IF p_plaintext LIKE 'PGP:%' THEN
    RETURN p_plaintext;
  END IF;
  
  v_encrypted := encode(pgp_sym_encrypt(p_plaintext, private.get_encryption_key()::text), 'base64');
  RETURN 'PGP:' || v_encrypted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_proses_stok_dan_snapshot_visit_treatment(p_visit_treatment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_treatment_id      UUID;
  v_tier               TEXT;
  v_bobot              NUMERIC;
  v_overhead_per_unit  NUMERIC;
  v_overhead_allocated NUMERIC;
  v_harga_jual         NUMERIC;
  v_total_bahan        NUMERIC := 0;
  v_detail_bahan       JSONB := '[]'::JSONB;
  r                    RECORD;
  batch_r              RECORD;
  v_qty_pakai          NUMERIC;
  v_stok_sebelum       NUMERIC;
  v_stok_sesudah       NUMERIC;
  v_sisa_potong        NUMERIC;
BEGIN
  -- Ambil data treatment & harga jual dari visit_treatments
  SELECT vt.treatment_id, t.tier, vt.harga_satuan
    INTO v_treatment_id, v_tier, v_harga_jual
  FROM public.visit_treatments vt
  JOIN public.treatments t ON t.id = vt.treatment_id
  WHERE vt.id = p_visit_treatment_id;

  IF v_treatment_id IS NULL THEN
    RAISE EXCEPTION 'visit_treatment_id % tidak ditemukan', p_visit_treatment_id;
  END IF;

  -- Ambil bobot tier
  SELECT bobot INTO v_bobot FROM public.tier_weights WHERE tier = v_tier;
  v_bobot := COALESCE(v_bobot, 1);

  -- Ambil overhead_per_unit_bobot dari target bulan berjalan
  SELECT overhead_per_unit_bobot INTO v_overhead_per_unit
  FROM public.overhead_monthly_target
  WHERE periode = date_trunc('month', CURRENT_DATE)::DATE;

  v_overhead_per_unit := COALESCE(v_overhead_per_unit, 0);
  v_overhead_allocated := v_bobot * v_overhead_per_unit;

  -- Loop tiap bahan di BOM treatment ini
  FOR r IN
    SELECT tm.material_id, tm.qty_rata2, tm.wastage_percent, tm.wajib,
           mb.nama_bahan, mb.harga_rata2, mb.stok_saat_ini
    FROM public.treatment_materials tm
    JOIN public.master_bahan mb ON mb.id = tm.material_id
    WHERE tm.treatment_id = v_treatment_id AND tm.wajib = true
  LOOP
    -- Cek qty aktual
    SELECT qty_aktual INTO v_qty_pakai
    FROM public.visit_treatment_material_overrides
    WHERE visit_treatment_id = p_visit_treatment_id AND material_id = r.material_id;

    IF v_qty_pakai IS NULL THEN
      v_qty_pakai := r.qty_rata2 * (1 + COALESCE(r.wastage_percent, 0) / 100.0);
    END IF;

    -- Potong FEFO pada material_batches
    v_sisa_potong := v_qty_pakai;
    FOR batch_r IN 
      SELECT id, qty_sisa FROM public.material_batches 
      WHERE material_id = r.material_id AND qty_sisa > 0 
      ORDER BY tanggal_kadaluarsa ASC NULLS LAST, tanggal_masuk ASC
      FOR UPDATE
    LOOP
      IF v_sisa_potong <= 0 THEN EXIT; END IF;
      
      IF batch_r.qty_sisa <= v_sisa_potong THEN
        -- Habiskan batch ini
        UPDATE public.material_batches SET qty_sisa = 0 WHERE id = batch_r.id;
        v_sisa_potong := v_sisa_potong - batch_r.qty_sisa;
      ELSE
        -- Kurangi sebagian
        UPDATE public.material_batches SET qty_sisa = qty_sisa - v_sisa_potong WHERE id = batch_r.id;
        v_sisa_potong := 0;
      END IF;
    END LOOP;

    v_stok_sebelum := r.stok_saat_ini;
    v_stok_sesudah := v_stok_sebelum - v_qty_pakai;

    -- Update stok master_bahan
    UPDATE public.master_bahan
    SET stok_saat_ini = v_stok_sesudah, updated_at = NOW()
    WHERE id = r.material_id;

    -- Catat pergerakan stok (kartu stok)
    INSERT INTO public.stok_movements
      (material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu, catatan)
    VALUES
      (r.material_id, 'keluar', -v_qty_pakai, v_stok_sebelum, v_stok_sesudah,
       'visit_treatment', p_visit_treatment_id, r.harga_rata2,
       CASE WHEN v_stok_sesudah < 0 THEN 'PERINGATAN: stok minus, perlu restock segera' ELSE NULL END);

    v_total_bahan := v_total_bahan + (v_qty_pakai * r.harga_rata2);
    v_detail_bahan := v_detail_bahan || jsonb_build_object(
      'material_id', r.material_id,
      'nama_bahan', r.nama_bahan,
      'qty', v_qty_pakai,
      'harga_satuan', r.harga_rata2,
      'subtotal', v_qty_pakai * r.harga_rata2
    );
  END LOOP;

  -- Simpan snapshot
  INSERT INTO public.treatment_cost_snapshot
    (visit_treatment_id, tier_saat_itu, bobot_saat_itu, overhead_per_unit_bobot,
     overhead_allocated, total_biaya_bahan, detail_bahan, harga_jual_saat_itu)
  VALUES
    (p_visit_treatment_id, v_tier, v_bobot, v_overhead_per_unit,
     v_overhead_allocated, v_total_bahan, v_detail_bahan, COALESCE(v_harga_jual, 0))
  ON CONFLICT (visit_treatment_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_month_key CHAR(6);
  new_number INTEGER;
BEGIN

  IF NEW.invoice_number IS NOT NULL
     AND NEW.invoice_number <> '' THEN
    RETURN NEW;
  END IF;

  v_month_key := TO_CHAR(CURRENT_DATE, 'YYYYMM');

  INSERT INTO public.invoice_counters(month_key, last_number)
  VALUES(v_month_key, 1)

  ON CONFLICT(month_key)
  DO UPDATE
  SET last_number = invoice_counters.last_number + 1

  RETURNING last_number INTO new_number;

  NEW.invoice_number :=
    'INV-' || v_month_key || '-' ||
    LPAD(new_number::TEXT, 4, '0');

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_no_rm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_clinic uuid;
  v_next int;
begin
  if new.no_rm is null or new.no_rm = '' then
    v_clinic := coalesce(new.clinic_id, public.get_user_clinic_id());
    if v_clinic is null then
      raise exception 'Klinik tidak diketahui; nomor rekam medis tidak bisa dibuat'
        using errcode = 'not_null_violation';
    end if;

    insert into public.clinic_rm_counters as c (clinic_id, last_value)
    values (v_clinic, 1)
    on conflict (clinic_id) do update set last_value = c.last_value + 1
    returning last_value into v_next;

    new.no_rm := 'RM-' || lpad(v_next::text, 6, '0');
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_announcements()
 RETURNS TABLE(id uuid, title text, body text, severity text, starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (
    select u.role, c.status as clinic_status
    from public.users u
    join public.clinics c on c.id = u.clinic_id
    where u.id = auth.uid()
  )
  select a.id, a.title, a.body, a.severity, a.starts_at, a.ends_at
  from platform.announcements a
  cross join me
  where a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
    and (
      a.audience = 'all'
      or (a.audience = 'trial'  and me.clinic_status = 'trial')
      or (a.audience = 'active' and me.clinic_status = 'active')
      or (a.audience = 'admins' and me.role = 'admin')
    )
  order by case a.severity when 'critical' then 0 when 'warning' then 1 else 2 end, a.starts_at desc
  limit 5;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_logs()
 RETURNS SETOF audit_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if public.get_user_role() = 'admin' then
    return query select * from public.audit_logs
      where clinic_id = public.get_user_clinic_id()
      order by timestamp desc;
  elsif public.get_user_role() = 'dokter' then
    return query select * from public.audit_logs
      where user_id = auth.uid() and clinic_id = public.get_user_clinic_id()
      order by timestamp desc;
  else
    raise exception 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat log audit';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_booking_page(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_clinic record;
  v_name text;
  v_doctors jsonb;
begin
  select c.id, c.name, c.phone, c.address, c.city into v_clinic
  from public.clinics c
  where c.slug = lower(trim(p_slug)) and c.status in ('trial', 'active');
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not exists (select 1 from public.clinic_settings
                 where clinic_id = v_clinic.id and key = 'online_booking_enabled' and value = 'true') then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;
  select coalesce(nullif(trim(value), ''), v_clinic.name) into v_name
  from public.clinic_settings where clinic_id = v_clinic.id and key = 'clinic_name';
  select coalesce(jsonb_agg(d order by d->>'name'), '[]'::jsonb) into v_doctors
  from (
    select jsonb_build_object(
      'id', u.id,
      'name', trim(concat_ws(' ', nullif(trim(u.gelar_depan), ''), u.full_name))
              || coalesce(', ' || nullif(trim(u.gelar_belakang), ''), ''),
      'schedules', (select coalesce(jsonb_agg(jsonb_build_object(
                       'hari', s.hari, 'mulai', to_char(s.jam_mulai, 'HH24:MI'), 'selesai', to_char(s.jam_selesai, 'HH24:MI'))
                       order by s.hari, s.jam_mulai), '[]'::jsonb)
                    from public.doctor_schedules s
                    where s.dokter_id = u.id and s.clinic_id = v_clinic.id and coalesce(s.is_active, true))
    ) as d
    from public.users u
    where u.clinic_id = v_clinic.id and u.role = 'dokter' and u.status in ('invited', 'active')
  ) x
  where jsonb_array_length(d->'schedules') > 0;
  return jsonb_build_object(
    'ok', true,
    'clinic', jsonb_build_object(
      'name', coalesce(v_name, v_clinic.name),
      'phone', (select value from public.clinic_settings where clinic_id = v_clinic.id and key = 'clinic_phone'),
      'address', coalesce((select nullif(value, '') from public.clinic_settings where clinic_id = v_clinic.id and key = 'clinic_address'), v_clinic.address),
      'city', v_clinic.city),
    'doctors', v_doctors,
    'today', (now() at time zone 'Asia/Jakarta')::date);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_account_status()
 RETURNS TABLE(user_id uuid, user_status text, role text, clinic_id uuid, clinic_name text, clinic_status text, suspended_reason text, trial_ends_at timestamp with time zone, has_access boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    u.id,
    u.status,
    u.role,
    c.id,
    c.name,
    c.status,
    case when c.status = 'suspended' then c.suspended_reason end,
    c.trial_ends_at,
    (u.status in ('invited', 'active') and c.status in ('trial', 'active')) as has_access
  from public.users u
  join public.clinics c on c.id = u.clinic_id
  where u.id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
 RETURNS TABLE(permission_name character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.name::VARCHAR
  FROM public.users u
  JOIN public.role_permissions rp ON rp.role_id = u.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE u.id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM public.user_permissions up 
    WHERE up.user_id = auth.uid() AND up.permission_id = p.id AND up.is_revoked = TRUE
  )
  UNION
  SELECT p.name::VARCHAR
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = auth.uid() AND up.is_revoked = FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_onboarding_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  return jsonb_build_object(
    'profile',
      exists (select 1 from public.clinic_settings where key = 'clinic_address' and length(trim(value)) > 0)
      and exists (select 1 from public.clinic_settings where key = 'clinic_phone' and length(trim(value)) > 0),
    'treatments', exists (select 1 from public.treatments where coalesce(is_active, true)),
    'doctors',    exists (select 1 from public.users where role = 'dokter' and status in ('invited', 'active')),
    'schedules',  exists (select 1 from public.doctor_schedules where coalesce(is_active, true)),
    'staff',      exists (select 1 from public.users where role = 'resepsionis' and status in ('invited', 'active')),
    'satusehat',  exists (select 1 from public.satusehat_organizations where satusehat_organization_id is not null),
    'dismissed',  exists (select 1 from public.clinic_settings where key = 'onboarding_dismissed' and value = 'true')
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_patient_media_paths(p_patient_id uuid)
 RETURNS TABLE(category text, file_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if public.get_user_role() not in ('admin', 'dokter') then
    raise exception 'Akses ditolak' using errcode = 'insufficient_privilege';
  end if;
  return query
    select m.category::text, m.file_url::text
    from public.patient_media m
    join public.patients p on p.id = m.patient_id
    where m.patient_id = p_patient_id
      and p.clinic_id = public.get_user_clinic_id();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_queue_display(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_link  public.queue_display_links%rowtype;
  v_name  text;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_rows  jsonb;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 64 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select l.* into v_link
  from public.queue_display_links l
  where l.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if not found or v_link.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select coalesce(nullif(trim(s.value), ''), c.name) into v_name
  from public.clinics c
  left join public.clinic_settings s on s.clinic_id = c.id and s.key = 'clinic_name'
  where c.id = v_link.clinic_id and c.status in ('trial', 'active');

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;

  if v_link.last_seen_at is null or v_link.last_seen_at < now() - interval '5 minutes' then
    update public.queue_display_links set last_seen_at = now() where id = v_link.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'no',       q.no,
           'initials', q.initials,
           'doctor',   q.doctor,
           'time',     q.jam,
           'status',   q.status
         ) order by q.no), '[]'::jsonb)
  into v_rows
  from (
    select row_number() over (order by v.created_at, v.id) as no,
           public.queue_initials(public.decrypt_field(p.nama_lengkap::text)) as initials,
           u.full_name as doctor,
           to_char(v.jam_kunjungan, 'HH24:MI') as jam,
           case
             when v.status = 'ongoing' then 'ongoing'
             when v.status = 'completed' then 'completed'
             when v.status is null or v.status = 'scheduled' then 'waiting'
             else 'other'
           end as status
    from public.visits v
    left join public.patients p on p.id = v.patient_id
    left join public.users u on u.id = v.dokter_id
    where v.clinic_id = v_link.clinic_id
      and v.tanggal_kunjungan = v_today
      and v.deleted_at is null
  ) q;

  return jsonb_build_object('ok', true, 'clinic_name', v_name, 'date', v_today, 'visits', v_rows);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.id
  from public.clinics c
  join public.users u on u.clinic_id = c.id
  where c.id = nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '')::uuid
    and u.id = auth.uid()
    and c.status in ('trial', 'active')
    and u.status in ('invited', 'active');
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.status in ('invited', 'active');
$function$
;

CREATE OR REPLACE FUNCTION public.has_permission(p_permission_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  -- Check user_permissions explicitly granted
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid() 
      AND p.name = p_permission_name
      AND up.is_revoked = FALSE
  ) INTO v_has_access;

  IF v_has_access THEN RETURN TRUE; END IF;

  -- Check user_permissions explicitly revoked (overrides role)
  IF EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = auth.uid() 
      AND p.name = p_permission_name
      AND up.is_revoked = TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  -- Check role_permissions
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.role_permissions rp ON rp.role_id = u.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE u.id = auth.uid() AND p.name = p_permission_name
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_medical_reader()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_claims text := nullif(current_setting('request.jwt.claims', true), '');
  v_role text;
begin
  if v_claims is null then
    -- Bukan request PostgREST (migrasi, pg_cron, psql pemilik proyek)
    return session_user not in ('authenticator', 'anon', 'authenticated');
  end if;
  v_role := v_claims::jsonb ->> 'role';
  if v_role = 'service_role' then
    return true;
  end if;
  if v_role is distinct from 'authenticated' then
    return false;
  end if;
  return coalesce(public.get_user_role() = 'dokter', false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.master_bahan_kfa_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
begin
  if v_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.kfa_nama := null;
    new.kfa_bentuk_sediaan_nama := null;
    new.kfa_verified_at := null;
    return new;
  end if;

  if new.kode_kfa is distinct from old.kode_kfa then
    new.kfa_nama := null;
    new.kfa_bentuk_sediaan_nama := null;
    new.kfa_verified_at := null;
  else
    new.kfa_nama := old.kfa_nama;
    new.kfa_bentuk_sediaan_nama := old.kfa_bentuk_sediaan_nama;
    new.kfa_verified_at := old.kfa_verified_at;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.process_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    declare
      v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
      v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
      v_row jsonb := coalesce(v_new, v_old);
      v_patient_id uuid;
      v_visit_id uuid;
      v_clinic_id uuid;
      v_risk text := 'LOW';
    begin
      begin
        v_patient_id := nullif(v_row ->> 'patient_id', '')::uuid;
        v_visit_id := nullif(v_row ->> 'visit_id', '')::uuid;
      exception when others then
        null;
      end;

      if tg_table_name = 'patients' then
        v_patient_id := (v_row ->> 'id')::uuid;
      elsif tg_table_name = 'visits' then
        v_visit_id := (v_row ->> 'id')::uuid;
        v_patient_id := nullif(v_row ->> 'patient_id', '')::uuid;
      end if;

      if tg_table_name in ('visits', 'medical_history', 'clinical_data') then
        v_risk := 'MEDIUM';
      elsif tg_table_name = 'users' and tg_op = 'UPDATE' then
        v_risk := 'HIGH';
      end if;

      v_clinic_id := coalesce(
        nullif(v_row ->> 'clinic_id', '')::uuid,
        public.get_user_clinic_id()
      );
      if v_clinic_id is null then
        return coalesce(new, old);
      end if;

      insert into public.audit_logs (user_id, user_role, patient_id, visit_id, clinic_id, module, action,
                                     previous_value, new_value, risk_level)
      values (
        auth.uid(),
        coalesce(public.get_user_role(), 'system'),
        case when tg_op = 'DELETE' and tg_table_name = 'patients' then null else v_patient_id end,
        case when tg_op = 'DELETE' and tg_table_name = 'visits' then null else v_visit_id end,
        v_clinic_id,
        tg_table_name,
        tg_op,
        v_old,
        v_new,
        v_risk
      );

      return coalesce(new, old);
    end;
    $function$
;

CREATE OR REPLACE FUNCTION public.process_visit_versioning()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_version int;
  v_summary text := '';
  v_old jsonb;
  v_new jsonb := jsonb_build_object(
    'diagnosa', new.diagnosa, 'keluhan', new.keluhan, 'pemeriksaan_fisik', new.pemeriksaan_fisik,
    'terapi', new.terapi, 'catatan_dokter', new.catatan_dokter, 'kode_icd10', new.kode_icd10);
  v_reason text := nullif(current_setting('dentiva.change_reason', true), '');
  v_restored int := nullif(current_setting('dentiva.restored_from', true), '')::int;
begin
  if tg_op = 'INSERT' then
    v_version := 1;
    v_summary := 'Rekam medis dibuat';
  else
    v_old := jsonb_build_object(
      'diagnosa', old.diagnosa, 'keluhan', old.keluhan, 'pemeriksaan_fisik', old.pemeriksaan_fisik,
      'terapi', old.terapi, 'catatan_dokter', old.catatan_dokter, 'kode_icd10', old.kode_icd10);
    if v_old is not distinct from v_new then
      return new;
    end if;
    select coalesce(max(version), 0) + 1 into v_version
    from public.medical_record_versions where visit_id = new.id;
    if old.diagnosa is distinct from new.diagnosa then v_summary := v_summary || 'Diagnosa diubah. '; end if;
    if old.keluhan is distinct from new.keluhan then v_summary := v_summary || 'Keluhan diubah. '; end if;
    if old.pemeriksaan_fisik is distinct from new.pemeriksaan_fisik then v_summary := v_summary || 'Pemeriksaan fisik diubah. '; end if;
    if old.terapi is distinct from new.terapi then v_summary := v_summary || 'Terapi diubah. '; end if;
    if old.catatan_dokter is distinct from new.catatan_dokter then v_summary := v_summary || 'Catatan dokter diubah. '; end if;
    if old.kode_icd10 is distinct from new.kode_icd10 then v_summary := v_summary || 'Kode ICD-10 diubah. '; end if;
    if v_restored is not null then v_summary := format('Dipulihkan dari versi %s. ', v_restored) || v_summary; end if;
  end if;
  insert into public.medical_record_versions (
    visit_id, patient_id, version, diagnosa, keluhan, pemeriksaan_fisik, terapi, catatan_dokter, kode_icd10,
    changed_by, change_summary, previous_data, new_data, reason, restored_from, clinic_id)
  values (
    new.id, new.patient_id, v_version, new.diagnosa, new.keluhan, new.pemeriksaan_fisik, new.terapi,
    new.catatan_dokter, new.kode_icd10, coalesce(auth.uid(), new.dokter_id), trim(v_summary),
    v_old, v_new, v_reason, v_restored, new.clinic_id);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.protect_visit_medical_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if tg_op = 'UPDATE' and not public.is_medical_reader() then
    new.pemeriksaan_fisik := old.pemeriksaan_fisik;
    new.diagnosa := old.diagnosa;
    new.kode_icd10 := old.kode_icd10;
    new.terapi := old.terapi;
    new.catatan_dokter := old.catatan_dokter;
    return new;
  end if;

  if tg_op = 'INSERT' and not public.is_medical_reader() then
    new.pemeriksaan_fisik := null;
    new.diagnosa := null;
    new.kode_icd10 := null;
    new.terapi := null;
  end if;

  new.pemeriksaan_fisik := private.medical_reseal(new.pemeriksaan_fisik, case when tg_op = 'UPDATE' then old.pemeriksaan_fisik end);
  new.diagnosa := private.medical_reseal(new.diagnosa, case when tg_op = 'UPDATE' then old.diagnosa end);
  new.kode_icd10 := private.medical_reseal(new.kode_icd10, case when tg_op = 'UPDATE' then old.kode_icd10 end);
  new.terapi := private.medical_reseal(new.terapi, case when tg_op = 'UPDATE' then old.terapi end);
  new.catatan_dokter := private.medical_reseal(new.catatan_dokter, case when tg_op = 'UPDATE' then old.catatan_dokter end);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_initials(p_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    nullif(
      (select string_agg(upper(left(w, 1)) || '.', ' ' order by ord)
       from (select w, ord
             from regexp_split_to_table(trim(regexp_replace(coalesce(p_name, ''), '[^[:alpha:][:space:]]', '', 'g')), '\s+')
                  with ordinality as t(w, ord)
             where w <> ''
             order by ord
             limit 2) s),
      ''),
    '-');
$function$
;

CREATE OR REPLACE FUNCTION public.recall_candidates(p_bulan integer, p_limit integer DEFAULT 300)
 RETURNS TABLE(patient_id uuid, no_rm text, nama_lengkap text, no_wa text, wa_consent boolean, kunjungan_terakhir date, jumlah_kunjungan integer, terakhir_dihubungi timestamp with time zone, jumlah_dihubungi integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
#variable_conflict use_column
declare
  v_clinic uuid := public.recall_require_staff();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if p_bulan is null or p_bulan < 1 or p_bulan > 36 then
    raise exception 'Periode recall harus 1–36 bulan' using errcode = '22023';
  end if;
  return query
  with last_visit as (
    select v.patient_id, max(v.tanggal_kunjungan) terakhir, count(*)::int n
    from public.visits v
    where v.clinic_id = v_clinic and v.deleted_at is null and v.status = 'completed'
    group by 1
  ), contacts as (
    select rc.patient_id, max(rc.created_at) terakhir, count(*)::int n
    from public.recall_contacts rc where rc.clinic_id = v_clinic group by 1
  )
  select p.id, p.no_rm::text, p.nama_lengkap::text, p.no_wa, coalesce(p.wa_consent, false),
         lv.terakhir, lv.n, c.terakhir, coalesce(c.n, 0)
  from last_visit lv
  join public.patients p on p.id = lv.patient_id and p.clinic_id = v_clinic and p.deleted_at is null
  left join contacts c on c.patient_id = p.id
  where lv.terakhir <= (v_today - make_interval(months => p_bulan))::date
    and not exists (select 1 from public.visits f where f.patient_id = p.id and f.clinic_id = v_clinic
                    and f.deleted_at is null and f.status = 'scheduled' and f.tanggal_kunjungan >= v_today)
  order by (c.terakhir is not null and c.terakhir > now() - interval '30 days'), lv.terakhir desc
  limit least(greatest(coalesce(p_limit, 300), 1), 1000);
end $function$
;

CREATE OR REPLACE FUNCTION public.recall_mark_contacted(p_patient_id uuid, p_channel text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.recall_require_staff(); v_id uuid;
begin
  if p_channel not in ('wa', 'telepon', 'lainnya') then
    raise exception 'Saluran tidak valid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and clinic_id = v_clinic and deleted_at is null) then
    raise exception 'Pasien tidak ditemukan' using errcode = 'P0002';
  end if;
  insert into public.recall_contacts (clinic_id, patient_id, contacted_by, channel)
  values (v_clinic, p_patient_id, auth.uid(), p_channel) returning id into v_id;
  return v_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.recall_require_staff()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v_clinic uuid := public.get_user_clinic_id();
begin
  if public.get_user_role() not in ('admin', 'resepsionis') or v_clinic is null then
    raise exception 'Hanya admin atau resepsionis' using errcode = 'insufficient_privilege';
  end if;
  return v_clinic;
end $function$
;

CREATE OR REPLACE FUNCTION public.record_login()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  update public.users
  set last_login_at = now(),
      status = case when status = 'invited' then 'active' else status end
  where id = auth.uid()
    and status in ('invited', 'active');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.register_clinic(p_clinic_name text, p_clinic_phone text, p_city text, p_province text, p_owner_name text, p_owner_phone text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed timestamptz;
  v_base      text;
  v_slug      text;
  v_plan      uuid;
  v_clinic    uuid;
  v_name      text := trim(coalesce(p_clinic_name, ''));
  v_owner     text := trim(coalesce(p_owner_name, ''));
begin
  if v_uid is null then
    raise exception 'Silakan masuk terlebih dahulu' using errcode = 'insufficient_privilege';
  end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = v_uid;
  if v_confirmed is null then
    raise exception 'Verifikasi email Anda terlebih dahulu (cek kotak masuk / spam)' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.users where id = v_uid) then
    raise exception 'Akun ini sudah terhubung ke sebuah klinik' using errcode = 'unique_violation';
  end if;
  if exists (select 1 from platform.operators where user_id = v_uid) then
    raise exception 'Akun operator Dentiva tidak bisa mendaftarkan klinik' using errcode = 'check_violation';
  end if;

  if length(v_name) not between 3 and 100 then
    raise exception 'Nama klinik harus 3–100 karakter' using errcode = 'check_violation';
  end if;
  if length(v_owner) not between 3 and 100 then
    raise exception 'Nama pemilik harus 3–100 karakter' using errcode = 'check_violation';
  end if;
  if coalesce(p_clinic_phone, '') !~ '^[0-9+() -]{8,20}$' or coalesce(p_owner_phone, '') !~ '^[0-9+() -]{8,20}$' then
    raise exception 'Nomor telepon tidak valid' using errcode = 'check_violation';
  end if;

  if (select count(*) from public.clinics where status = 'pending' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Terlalu banyak pendaftaran saat ini. Coba lagi dalam satu jam.' using errcode = 'too_many_connections';
  end if;

  v_base := left(trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')), 40);
  if v_base = '' then
    v_base := 'klinik';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.clinics where slug = v_slug) loop
    v_slug := v_base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
  end loop;

  select id into v_plan from public.subscription_plans
  where coalesce(is_active, true)
  order by price_monthly asc nulls last
  limit 1;
  if v_plan is null then
    raise exception 'Belum ada paket langganan aktif' using errcode = 'no_data_found';
  end if;

  v_clinic := platform.provision_clinic(
    v_uid, v_email, v_owner, trim(p_owner_phone),
    v_name, v_slug, trim(p_clinic_phone), v_email, null,
    nullif(trim(coalesce(p_city, '')), ''), nullif(trim(coalesce(p_province, '')), ''),
    v_plan, 14, null
  );

  update public.clinics set status = 'pending', trial_ends_at = null where id = v_clinic;

  return v_clinic;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.replace_tooth_conditions(p_patient_id uuid, p_conditions jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if public.get_user_role() is distinct from 'dokter' then
    raise exception 'Unauthorized: only dokter can modify clinical data';
  end if;
  if not exists (
    select 1 from public.patients p
    where p.id = p_patient_id and p.clinic_id = public.get_user_clinic_id()
  ) then
    raise exception 'Pasien tidak ditemukan' using errcode = 'no_data_found';
  end if;

  delete from tooth_conditions where patient_id = p_patient_id;

  if jsonb_array_length(p_conditions) > 0 then
    insert into tooth_conditions (patient_id, tooth_number, condition_type, condition_code, surface, has_rct, notes, recorded_by)
    select
      p_patient_id,
      (elem->>'tooth_number')::integer,
      elem->>'condition_type',
      elem->>'condition_code',
      elem->>'surface',
      (elem->>'has_rct')::boolean,
      elem->>'notes',
      (elem->>'recorded_by')::uuid
    from jsonb_array_elements(p_conditions) as elem;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.replace_treatment_plans(p_patient_id uuid, p_plans jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if public.get_user_role() is distinct from 'dokter' then
    raise exception 'Unauthorized: only dokter can modify clinical data';
  end if;
  if not exists (
    select 1 from public.patients p
    where p.id = p_patient_id and p.clinic_id = public.get_user_clinic_id()
  ) then
    raise exception 'Pasien tidak ditemukan' using errcode = 'no_data_found';
  end if;

  delete from treatment_plans where patient_id = p_patient_id;

  if jsonb_array_length(p_plans) > 0 then
    insert into treatment_plans (patient_id, prioritas, tindakan, gigi, keterangan, status, created_by)
    select
      p_patient_id,
      (elem->>'prioritas')::integer,
      elem->>'tindakan',
      elem->>'gigi',
      elem->>'keterangan',
      elem->>'status',
      (elem->>'created_by')::uuid
    from jsonb_array_elements(p_plans) as elem;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.replace_visit_treatments(p_visit_id uuid, p_treatments jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if public.get_user_role() is null
     or public.get_user_role() not in ('admin', 'dokter', 'resepsionis') then
    raise exception 'Akses ditolak' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.visits v
    where v.id = p_visit_id
      and v.clinic_id = public.get_user_clinic_id()
      and v.deleted_at is null
  ) then
    raise exception 'Kunjungan tidak ditemukan' using errcode = 'no_data_found';
  end if;

  delete from visit_treatments where visit_id = p_visit_id;

  if jsonb_array_length(p_treatments) > 0 then
    insert into visit_treatments (visit_id, treatment_id, tooth_number, quantity, harga_satuan, subtotal, notes)
    select
      p_visit_id,
      (elem->>'treatment_id')::uuid,
      (elem->>'tooth_number')::integer,
      (elem->>'quantity')::integer,
      (elem->>'harga_satuan')::numeric,
      (elem->>'subtotal')::numeric,
      elem->>'notes'
    from jsonb_array_elements(p_treatments) as elem
    where exists (
      select 1 from public.treatments t
      where t.id = (elem->>'treatment_id')::uuid
        and t.clinic_id = public.get_user_clinic_id()
    );
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_emr_version(p_visit_id uuid, p_version integer, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_visit record;
  v_ver record;
begin
  if public.get_user_role() is distinct from 'dokter' then
    raise exception 'Hanya dokter yang dapat memulihkan rekam medis' using errcode = 'insufficient_privilege';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'Alasan pemulihan wajib diisi (minimal 5 karakter)' using errcode = 'check_violation';
  end if;
  select id, clinic_id, is_locked into v_visit from public.visits where id = p_visit_id;
  if not found or v_visit.clinic_id is distinct from public.get_user_clinic_id() then
    raise exception 'Kunjungan tidak ditemukan' using errcode = 'no_data_found';
  end if;
  if coalesce(v_visit.is_locked, false) then
    raise exception 'Rekam medis kunjungan ini sudah dikunci' using errcode = 'check_violation';
  end if;
  select * into v_ver from public.medical_record_versions where visit_id = p_visit_id and version = p_version;
  if not found then
    raise exception 'Versi % tidak ditemukan', p_version using errcode = 'no_data_found';
  end if;
  perform set_config('dentiva.change_reason', trim(p_reason), true);
  perform set_config('dentiva.restored_from', p_version::text, true);
  update public.visits set
    diagnosa          = coalesce(v_ver.diagnosa,          v_ver.new_data ->> 'diagnosa'),
    keluhan           = coalesce(v_ver.keluhan,           v_ver.new_data ->> 'keluhan'),
    pemeriksaan_fisik = coalesce(v_ver.pemeriksaan_fisik, v_ver.new_data ->> 'pemeriksaan_fisik'),
    terapi            = coalesce(v_ver.terapi,            v_ver.new_data ->> 'terapi'),
    catatan_dokter    = coalesce(v_ver.catatan_dokter,    v_ver.new_data ->> 'catatan_dokter'),
    kode_icd10        = coalesce(v_ver.kode_icd10,        v_ver.new_data ->> 'kode_icd10')
  where id = p_visit_id;
  perform set_config('dentiva.change_reason', '', true);
  perform set_config('dentiva.restored_from', '', true);
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_visit_version(p_visit_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_queue_display_link(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if public.get_user_clinic_id() is null or public.get_user_role() is distinct from 'admin' then
    raise exception 'Hanya admin klinik yang dapat mencabut tautan layar antrean' using errcode = 'insufficient_privilege';
  end if;

  update public.queue_display_links
  set revoked_at = coalesce(revoked_at, now())
  where id = p_id and clinic_id = public.get_user_clinic_id();

  if not found then
    raise exception 'Tautan tidak ditemukan' using errcode = 'no_data_found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_visit_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(visit_number), 0) + 1 INTO next_num
  FROM public.visits WHERE patient_id = NEW.patient_id;
  NEW.visit_number := next_num;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_patient()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.patients 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_patient_media()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.patient_media 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_patient_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.patient_referrals 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.soft_delete_visit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  UPDATE public.visits 
  SET deleted_at = NOW(), deleted_by = auth.uid() 
  WHERE id = OLD.id;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.storage_object_in_my_clinic(p_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with me as (select public.get_user_clinic_id() as cid)
  select case
    when me.cid is null then false
    when split_part(p_name, '/', 1) = me.cid::text then true
    when exists (select 1 from public.clinics c where c.id::text = split_part(p_name, '/', 1)) then false
    else me.cid = platform.legacy_clinic_id()
  end
  from me;
$function$
;

CREATE OR REPLACE FUNCTION public.submit_booking_request(p_slug text, p_dokter_id uuid, p_date date, p_time text, p_name text, p_phone text, p_complaint text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_clinic uuid;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_time time;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_hash text;
  v_sched record;
  v_ref text;
begin
  select c.id into v_clinic from public.clinics c
  where c.slug = lower(trim(p_slug)) and c.status in ('trial', 'active');
  if v_clinic is null or not exists (select 1 from public.clinic_settings
       where clinic_id = v_clinic and key = 'online_booking_enabled' and value = 'true') then
    raise exception 'Booking online tidak tersedia untuk klinik ini' using errcode = 'no_data_found';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 100 then
    raise exception 'Nama wajib diisi (2–100 karakter)' using errcode = 'check_violation';
  end if;
  if v_phone !~ '^(0|62)8[0-9]{7,12}$' then
    raise exception 'Nomor WhatsApp tidak valid' using errcode = 'check_violation';
  end if;
  if length(coalesce(p_complaint, '')) > 500 then
    raise exception 'Keluhan maksimal 500 karakter' using errcode = 'check_violation';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + 60 then
    raise exception 'Tanggal harus antara hari ini dan 60 hari ke depan' using errcode = 'check_violation';
  end if;
  begin
    v_time := p_time::time;
  exception when others then
    raise exception 'Jam tidak valid' using errcode = 'check_violation';
  end;
  if p_date = v_today and v_time <= (now() at time zone 'Asia/Jakarta')::time then
    raise exception 'Jam sudah lewat' using errcode = 'check_violation';
  end if;
  select s.* into v_sched
  from public.doctor_schedules s
  join public.users u on u.id = s.dokter_id
  where s.dokter_id = p_dokter_id and s.clinic_id = v_clinic and coalesce(s.is_active, true)
    and u.role = 'dokter' and u.status in ('invited', 'active')
    and s.hari = extract(dow from p_date)::int
    and v_time >= s.jam_mulai and v_time < s.jam_selesai
  limit 1;
  if not found then
    raise exception 'Dokter tidak praktik pada tanggal & jam tersebut' using errcode = 'check_violation';
  end if;
  if v_sched.kapasitas_pasien_per_hari is not null and (
       (select count(*) from public.booking_requests
        where clinic_id = v_clinic and dokter_id = p_dokter_id and requested_date = p_date and status in ('pending', 'confirmed'))
     + (select count(*) from public.visits
        where clinic_id = v_clinic and dokter_id = p_dokter_id and tanggal_kunjungan = p_date and deleted_at is null)
     ) >= v_sched.kapasitas_pasien_per_hari then
    raise exception 'Kuota dokter pada tanggal tersebut sudah penuh' using errcode = 'check_violation';
  end if;
  v_phone := regexp_replace(v_phone, '^62', '0');
  v_hash := encode(extensions.digest(v_clinic::text || ':' || v_phone, 'sha256'), 'hex');
  if (select count(*) from public.booking_requests
      where clinic_id = v_clinic and phone_hash = v_hash and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'Terlalu banyak permintaan dari nomor ini. Hubungi klinik langsung.' using errcode = 'too_many_connections';
  end if;
  if (select count(*) from public.booking_requests
      where clinic_id = v_clinic and created_at > now() - interval '24 hours') >= 150 then
    raise exception 'Booking online sedang penuh. Hubungi klinik langsung.' using errcode = 'too_many_connections';
  end if;
  v_ref := 'BK-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into public.booking_requests (clinic_id, dokter_id, requested_date, requested_time,
    patient_name, patient_phone, phone_hash, complaint, reference_code)
  values (v_clinic, p_dokter_id, p_date, v_time,
    public.encrypt_field(trim(p_name)), public.encrypt_field(v_phone), v_hash,
    public.encrypt_field(nullif(trim(coalesce(p_complaint, '')), '')), v_ref);
  return jsonb_build_object('ok', true, 'reference', v_ref);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tenant_fill_clinic_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r jsonb := to_jsonb(new);
  v uuid;
begin
  if new.clinic_id is not null then
    return new;
  end if;

  if v is null and (r ->> 'visit_id') is not null then
    select clinic_id into v from public.visits where id = (r ->> 'visit_id')::uuid;
  end if;
  if v is null and (r ->> 'visit_treatment_id') is not null then
    select clinic_id into v from public.visit_treatments where id = (r ->> 'visit_treatment_id')::uuid;
  end if;
  if v is null and (r ->> 'patient_id') is not null then
    select clinic_id into v from public.patients where id = (r ->> 'patient_id')::uuid;
  end if;
  if v is null and (r ->> 'treatment_id') is not null then
    select clinic_id into v from public.treatments where id = (r ->> 'treatment_id')::uuid;
  end if;
  if v is null and (r ->> 'material_id') is not null then
    select clinic_id into v from public.master_bahan where id = (r ->> 'material_id')::uuid;
  end if;

  if v is null then
    v := public.get_user_clinic_id();
  end if;

  new.clinic_id := v;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_purchase_update_stok()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_stok_sebelum NUMERIC;
  v_stok_sesudah NUMERIC;
  v_harga_lama   NUMERIC;
  v_harga_baru_rata2 NUMERIC;
BEGIN
  SELECT stok_saat_ini, harga_rata2 INTO v_stok_sebelum, v_harga_lama
  FROM public.master_bahan WHERE id = NEW.material_id;

  v_stok_sesudah := v_stok_sebelum + NEW.jumlah_dasar;

  -- Weighted average cost: (stok_lama*harga_lama + qty_masuk*harga_masuk) / stok_baru
  IF v_stok_sesudah > 0 THEN
    v_harga_baru_rata2 := ((v_stok_sebelum * v_harga_lama) + (NEW.jumlah_dasar * (NEW.total_harga / NULLIF(NEW.jumlah_dasar,0))))
                          / v_stok_sesudah;
  ELSE
    v_harga_baru_rata2 := v_harga_lama;
  END IF;

  UPDATE public.master_bahan
  SET stok_saat_ini = v_stok_sesudah, harga_rata2 = v_harga_baru_rata2, updated_at = NOW()
  WHERE id = NEW.material_id;

  INSERT INTO public.stok_movements
    (material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu)
  VALUES
    (NEW.material_id, 'masuk', NEW.jumlah_dasar, v_stok_sebelum, v_stok_sesudah,
     'purchase', NEW.id, NEW.total_harga / NULLIF(NEW.jumlah_dasar, 0));

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_visit_completed_process_costing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    FOR r IN
      SELECT vt.id AS visit_treatment_id
      FROM public.visit_treatments vt
      LEFT JOIN public.treatment_cost_snapshot cs ON cs.visit_treatment_id = vt.id
      WHERE vt.visit_id = NEW.id AND cs.id IS NULL
    LOOP
      PERFORM public.fn_proses_stok_dan_snapshot_visit_treatment(r.visit_treatment_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.users_guard_sensitive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
begin
  if v_actor is null then
    return new;
  end if;

  if new.clinic_id is distinct from old.clinic_id then
    raise exception 'clinic_id pengguna tidak boleh diubah dari aplikasi'
      using errcode = 'insufficient_privilege';
  end if;

  if old.status = 'suspended'
     and (new.status is distinct from old.status or new.is_active is distinct from old.is_active) then
    raise exception 'Akun ini ditangguhkan oleh tim Dentiva dan hanya bisa diaktifkan kembali oleh tim Dentiva'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status = 'suspended' and old.status is distinct from 'suspended' then
    raise exception 'Status "ditangguhkan" khusus untuk tim Dentiva; gunakan "nonaktif"'
      using errcode = 'insufficient_privilege';
  end if;

  if v_actor = old.id
     and old.status = 'invited' and new.status = 'active'
     and new.role is not distinct from old.role
     and new.role_id is not distinct from old.role_id
     and new.is_active is not distinct from old.is_active then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.role_id is distinct from old.role_id
     or new.status is distinct from old.status
     or new.is_active is distinct from old.is_active then
    select u.role into v_actor_role
    from public.users u
    where u.id = v_actor and u.status in ('invited', 'active');

    if v_actor_role is distinct from 'admin' then
      raise exception 'Hanya admin klinik yang boleh mengubah role atau status pengguna'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.users_sync_clinic_claim()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' or new.clinic_id is distinct from old.clinic_id then
    update auth.users au
    set raw_app_meta_data = coalesce(au.raw_app_meta_data, '{}'::jsonb)
                            || jsonb_build_object('clinic_id', new.clinic_id::text)
    where au.id = new.id;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.users_sync_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := case when new.is_active is false then 'deactivated' else 'active' end;
    end if;
  elsif new.status is distinct from old.status then
    null;
  elsif new.is_active is distinct from old.is_active then
    new.status := case when new.is_active then 'active' else 'deactivated' end;
  end if;

  new.is_active := new.status in ('invited', 'active');
  return new;
end;
$function$
;

CREATE OR REPLACE VIEW platform.clinic_overview WITH (security_invoker=true) AS  SELECT c.id,
    c.name,
    c.slug,
    c.status,
    c.city,
    c.province,
    c.phone,
    c.email,
    c.created_at,
    c.trial_ends_at,
    c.activated_at,
    c.suspended_at,
    s.id AS subscription_id,
    s.status AS subscription_status,
    s.billing_cycle,
    s.current_period_end,
    p.id AS plan_id,
    p.name AS plan_name,
    p.price_monthly,
    p.price_yearly,
    p.max_users,
    p.max_patients,
    COALESCE(uc.users_count, 0) AS users_count,
    uc.last_login_at AS last_activity_at,
    COALESCE(u.patients_total, 0) AS patients_total,
    u.date AS usage_date,
    u.visits_count,
    u.active_users,
    u.storage_bytes,
    u.wa_sent,
    u.satusehat_errors
   FROM clinics c
     LEFT JOIN LATERAL ( SELECT cs.id,
            cs.clinic_id,
            cs.plan_id,
            cs.status,
            cs.current_period_start,
            cs.current_period_end,
            cs.cancel_at_period_end,
            cs.created_at,
            cs.updated_at,
            cs.billing_cycle
           FROM clinic_subscriptions cs
          WHERE cs.clinic_id = c.id
          ORDER BY (cs.status::text = ANY (ARRAY['trialing'::character varying, 'active'::character varying, 'past_due'::character varying]::text[])) DESC, cs.current_period_end DESC
         LIMIT 1) s ON true
     LEFT JOIN subscription_plans p ON p.id = s.plan_id
     LEFT JOIN LATERAL ( SELECT count(*) FILTER (WHERE us.status = ANY (ARRAY['invited'::text, 'active'::text]))::integer AS users_count,
            max(us.last_login_at) AS last_login_at
           FROM users us
          WHERE us.clinic_id = c.id) uc ON true
     LEFT JOIN LATERAL ( SELECT ud.clinic_id,
            ud.date,
            ud.patients_total,
            ud.visits_count,
            ud.active_users,
            ud.storage_bytes,
            ud.wa_sent,
            ud.satusehat_errors,
            ud.collected_at
           FROM platform.usage_daily ud
          WHERE ud.clinic_id = c.id
          ORDER BY ud.date DESC
         LIMIT 1) u ON true;

CREATE OR REPLACE VIEW public.v_daily_revenue WITH (security_invoker=true) AS  SELECT date((tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text)) AS tanggal,
    count(*) AS total_transactions,
    COALESCE(sum(total_bayar), 0::numeric) AS total_revenue,
    COALESCE(avg(total_bayar), 0::numeric) AS avg_transaction
   FROM payments
  WHERE status_pembayaran::text = 'paid'::text
  GROUP BY (date((tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text)))
  ORDER BY (date((tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text))) DESC;

CREATE OR REPLACE VIEW public.v_monthly_revenue WITH (security_invoker=true) AS  SELECT date_trunc('month'::text, (tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text))::date AS bulan,
    to_char((tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text), 'Mon YY'::text) AS label_bulan,
    count(*) AS total_transactions,
    COALESCE(sum(total_bayar), 0::numeric) AS total_revenue,
    COALESCE(avg(total_bayar), 0::numeric) AS avg_transaction
   FROM payments
  WHERE status_pembayaran::text = 'paid'::text
  GROUP BY (date_trunc('month'::text, (tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text))), (to_char((tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text), 'Mon YY'::text))
  ORDER BY (date_trunc('month'::text, (tanggal_pembayaran AT TIME ZONE 'Asia/Jakarta'::text))::date) DESC;

CREATE OR REPLACE VIEW public.v_patient_summary WITH (security_invoker=true) AS  SELECT p.id,
    p.no_rm,
    p.nama_lengkap,
    p.jenis_kelamin,
    p.umur,
    p.no_wa,
    p.status,
    p.created_at,
    p.tempat_lahir,
    p.tanggal_lahir,
    p.agama,
    p.status_pernikahan,
    p.pendidikan_terakhir,
    p.pekerjaan,
    p.golongan_darah,
    p.berat_badan,
    p.tinggi_badan,
    p.alamat,
    p.alamat_detail,
    p.provinsi,
    p.kabupaten,
    p.kecamatan,
    p.desa,
    p.keluhan_awal,
    p.foto_profile,
    COALESCE(v.total_visits, 0::bigint) AS total_visits,
    v.last_visit,
    COALESCE(pay.total_spent, 0::numeric) AS total_spent
   FROM patients p
     LEFT JOIN ( SELECT visits.patient_id,
            count(*) AS total_visits,
            max(visits.tanggal_kunjungan) AS last_visit
           FROM visits
          GROUP BY visits.patient_id) v ON p.id = v.patient_id
     LEFT JOIN ( SELECT payments.patient_id,
            sum(payments.total_bayar) AS total_spent
           FROM payments
          WHERE payments.status_pembayaran::text = 'paid'::text
          GROUP BY payments.patient_id) pay ON p.id = pay.patient_id;

CREATE OR REPLACE VIEW public.v_popular_treatments WITH (security_invoker=true) AS  SELECT t.id AS treatment_id,
    t.nama_treatment,
    t.kategori,
    count(vt.id) AS usage_count,
    COALESCE(sum(vt.subtotal), 0::numeric) AS total_revenue
   FROM treatments t
     JOIN visit_treatments vt ON t.id = vt.treatment_id
  GROUP BY t.id, t.nama_treatment, t.kategori
  ORDER BY (count(vt.id)) DESC;

CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON platform.announcements FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON platform.audit_logs FOR EACH STATEMENT EXECUTE FUNCTION platform.block_audit_mutation();

CREATE TRIGGER trg_audit_no_update BEFORE DELETE OR UPDATE ON platform.audit_logs FOR EACH ROW EXECUTE FUNCTION platform.block_audit_mutation();

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON platform.invoices FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_operators_last_owner BEFORE DELETE OR UPDATE ON platform.operators FOR EACH ROW EXECUTE FUNCTION platform.guard_last_owner();

CREATE TRIGGER trg_operators_not_clinic_user BEFORE INSERT OR UPDATE OF user_id ON platform.operators FOR EACH ROW EXECUTE FUNCTION platform.guard_operator_not_clinic_user();

CREATE TRIGGER trg_operators_updated_at BEFORE UPDATE ON platform.operators FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON platform.payments FOR EACH ROW EXECUTE FUNCTION platform.touch_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.clinic_settings FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.clinical_data FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_clinical_data BEFORE UPDATE ON public.clinical_data FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clinics_touch BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION clinics_touch();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.data_subject_requests FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_doctor_schedules_updated_at BEFORE UPDATE ON public.doctor_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.doctor_schedules FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.extra_oral_data FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_extra_oral BEFORE UPDATE ON public.extra_oral_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.financial_reports FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.informed_consents FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_intra_oral_data_updated_at BEFORE UPDATE ON public.intra_oral_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.intra_oral_data FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.invoice_counters FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER master_bahan_kfa_guard BEFORE INSERT OR UPDATE ON public.master_bahan FOR EACH ROW EXECUTE FUNCTION master_bahan_kfa_guard();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.master_bahan FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.master_obat FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.material_batches FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_purchase_stok AFTER INSERT ON public.material_purchases FOR EACH ROW EXECUTE FUNCTION trg_purchase_update_stok();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.material_purchases FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.medical_history FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_medical_history BEFORE UPDATE ON public.medical_history FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.medical_record_versions FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.notification_logs FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_odontogram_meta_updated_at BEFORE UPDATE ON public.odontogram_meta FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.odontogram_meta FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.overhead_costs FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.overhead_monthly_target FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.patient_media FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_soft_delete_patient_media BEFORE DELETE ON public.patient_media FOR EACH ROW EXECUTE FUNCTION soft_delete_patient_media();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.patient_referrals FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_soft_delete_patient_referral BEFORE DELETE ON public.patient_referrals FOR EACH ROW EXECUTE FUNCTION soft_delete_patient_referral();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.patient_visits FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_audit_patients AFTER INSERT OR DELETE OR UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER trg_enforce_max_patients BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION check_max_patients_limit();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_generate_no_rm BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION generate_no_rm();

CREATE TRIGGER trigger_soft_delete_patient BEFORE DELETE ON public.patients FOR EACH ROW EXECUTE FUNCTION soft_delete_patient();

CREATE TRIGGER trigger_update_patients BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_generate_invoice BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

CREATE TRIGGER trigger_update_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.periodontal_data FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_periodontal BEFORE UPDATE ON public.periodontal_data FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.reminder_logs FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.satusehat_consents FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.satusehat_locations FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.satusehat_organizations FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.satusehat_outbox FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.soap_templates FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.stok_movements FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.stok_opname FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.tier_weights FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.tooth_conditions FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_tooth_conditions BEFORE UPDATE ON public.tooth_conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.treatment_cost_snapshot FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.treatment_education FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.treatment_education_templates FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.treatment_materials FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_treatment_plans BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.treatments FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trigger_update_treatments BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_audit_users AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER trg_users_guard_sensitive BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION users_guard_sensitive();

CREATE TRIGGER trg_users_sync_clinic_claim AFTER INSERT OR UPDATE OF clinic_id ON public.users FOR EACH ROW EXECUTE FUNCTION users_sync_clinic_claim();

CREATE TRIGGER trg_users_sync_status BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION users_sync_status();

CREATE TRIGGER trigger_update_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.visit_obat FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.visit_treatment_material_overrides FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.visit_treatments FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER a_protect_visit_medical_fields BEFORE INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION protect_visit_medical_fields();

CREATE TRIGGER trg_audit_visits AFTER INSERT OR DELETE OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER trg_tenant_fill_clinic_id BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION tenant_fill_clinic_id();

CREATE TRIGGER trg_visit_completed_costing AFTER UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION trg_visit_completed_process_costing();

CREATE TRIGGER trigger_set_visit_number BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION set_visit_number();

CREATE TRIGGER trigger_soft_delete_visit BEFORE DELETE ON public.visits FOR EACH ROW EXECUTE FUNCTION soft_delete_visit();

CREATE TRIGGER trigger_update_visits BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_visit_versioning AFTER INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION process_visit_versioning();

-- Storage engine trigger supplied by local Supabase.

-- Storage engine trigger supplied by local Supabase.

-- Storage engine trigger supplied by local Supabase.

-- Storage engine trigger supplied by local Supabase.

-- Storage engine trigger supplied by local Supabase.

-- Storage engine trigger supplied by local Supabase.

-- Storage engine trigger supplied by local Supabase.

ALTER TABLE platform.announcements ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform.clinic_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform.invoice_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform.invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform.operators ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE platform.usage_daily ENABLE ROW LEVEL SECURITY;

ALTER TABLE private.encryption_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_knowledge ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinic_rm_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinical_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.extra_oral_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.informed_consents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.intra_oral_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.master_bahan ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.master_obat ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.material_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.medical_record_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.odontogram_meta ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.overhead_costs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.overhead_monthly_target ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patient_media ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patient_referrals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.periodontal_data ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.queue_display_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recall_contacts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.satusehat_consents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.satusehat_locations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.satusehat_organizations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.satusehat_outbox ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.satusehat_token_cache ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.satusehat_verification_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.soap_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stok_movements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stok_opname ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tier_weights ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tooth_conditions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatment_cost_snapshot ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatment_education ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatment_education_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatment_materials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.visit_obat ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.visit_treatment_material_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.visit_treatments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_feedback_admin_select ON public.ai_feedback; CREATE POLICY ai_feedback_admin_select ON public.ai_feedback AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.ai_feedback; CREATE POLICY tenant_isolation ON public.ai_feedback AS RESTRICTIVE FOR ALL TO authenticated USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS ai_insights_admin_select ON public.ai_insights; CREATE POLICY ai_insights_admin_select ON public.ai_insights AS PERMISSIVE FOR SELECT TO authenticated USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (kind = 'staff_brief'::text))));

DROP POLICY IF EXISTS tenant_isolation ON public.ai_insights; CREATE POLICY tenant_isolation ON public.ai_insights AS RESTRICTIVE FOR ALL TO authenticated USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS ai_knowledge_admin_delete ON public.ai_knowledge; CREATE POLICY ai_knowledge_admin_delete ON public.ai_knowledge AS PERMISSIVE FOR DELETE TO authenticated USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS ai_knowledge_admin_select ON public.ai_knowledge; CREATE POLICY ai_knowledge_admin_select ON public.ai_knowledge AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.ai_knowledge; CREATE POLICY tenant_isolation ON public.ai_knowledge AS RESTRICTIVE FOR ALL TO authenticated USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS ai_usage_admin_read ON public.ai_usage; CREATE POLICY ai_usage_admin_read ON public.ai_usage AS PERMISSIVE FOR SELECT TO authenticated USING (((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)) AND (( SELECT get_user_role() AS get_user_role) = 'admin'::text)));

DROP POLICY IF EXISTS rls_insert_public ON public.audit_logs; CREATE POLICY rls_insert_public ON public.audit_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS rls_select_public ON public.audit_logs; CREATE POLICY rls_select_public ON public.audit_logs AS PERMISSIVE FOR SELECT TO public USING (( SELECT has_permission('dashboard.read'::text) AS has_permission));

DROP POLICY IF EXISTS tenant_isolation ON public.audit_logs; CREATE POLICY tenant_isolation ON public.audit_logs AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_select_booking ON public.booking_requests; CREATE POLICY rls_select_booking ON public.booking_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_update_booking ON public.booking_requests; CREATE POLICY rls_update_booking ON public.booking_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)) AND (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text])))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS tenant_isolation ON public.booking_requests; CREATE POLICY tenant_isolation ON public.booking_requests AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.clinic_settings; CREATE POLICY rls_delete_public ON public.clinic_settings AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_insert_public ON public.clinic_settings; CREATE POLICY rls_insert_public ON public.clinic_settings AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.clinic_settings; CREATE POLICY rls_select_public ON public.clinic_settings AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.clinic_settings; CREATE POLICY rls_update_public ON public.clinic_settings AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.clinic_settings; CREATE POLICY tenant_isolation ON public.clinic_settings AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Subscriptions_Clinic_SELECT" ON public.clinic_subscriptions; CREATE POLICY "Subscriptions_Clinic_SELECT" ON public.clinic_subscriptions AS PERMISSIVE FOR SELECT TO public USING (((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)) AND (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text]))));

DROP POLICY IF EXISTS tenant_isolation ON public.clinic_subscriptions; CREATE POLICY tenant_isolation ON public.clinic_subscriptions AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.clinical_data; CREATE POLICY medical_dokter_only ON public.clinical_data AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.clinical_data; CREATE POLICY rls_delete_public ON public.clinical_data AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.clinical_data; CREATE POLICY rls_insert_public ON public.clinical_data AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.clinical_data; CREATE POLICY rls_select_public ON public.clinical_data AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.clinical_data; CREATE POLICY rls_update_public ON public.clinical_data AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.clinical_data; CREATE POLICY tenant_isolation ON public.clinical_data AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS clinics_select_own ON public.clinics; CREATE POLICY clinics_select_own ON public.clinics AS PERMISSIVE FOR SELECT TO authenticated USING ((id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "DataSubjectRequests_Clinic_Isolation" ON public.data_subject_requests; CREATE POLICY "DataSubjectRequests_Clinic_Isolation" ON public.data_subject_requests AS PERMISSIVE FOR ALL TO public USING (((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)) AND (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text]))));

DROP POLICY IF EXISTS tenant_isolation ON public.data_subject_requests; CREATE POLICY tenant_isolation ON public.data_subject_requests AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.doctor_schedules; CREATE POLICY rls_delete_public ON public.doctor_schedules AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.doctor_schedules; CREATE POLICY rls_insert_public ON public.doctor_schedules AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.doctor_schedules; CREATE POLICY rls_select_public ON public.doctor_schedules AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_update_public ON public.doctor_schedules; CREATE POLICY rls_update_public ON public.doctor_schedules AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.doctor_schedules; CREATE POLICY tenant_isolation ON public.doctor_schedules AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.expenses; CREATE POLICY rls_delete_public ON public.expenses AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.expenses; CREATE POLICY rls_insert_public ON public.expenses AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.expenses; CREATE POLICY rls_select_public ON public.expenses AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_update_public ON public.expenses; CREATE POLICY rls_update_public ON public.expenses AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.expenses; CREATE POLICY tenant_isolation ON public.expenses AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.extra_oral_data; CREATE POLICY medical_dokter_only ON public.extra_oral_data AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.extra_oral_data; CREATE POLICY rls_delete_public ON public.extra_oral_data AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.extra_oral_data; CREATE POLICY rls_insert_public ON public.extra_oral_data AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.extra_oral_data; CREATE POLICY rls_select_public ON public.extra_oral_data AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.extra_oral_data; CREATE POLICY rls_update_public ON public.extra_oral_data AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.extra_oral_data; CREATE POLICY tenant_isolation ON public.extra_oral_data AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.financial_reports; CREATE POLICY rls_delete_public ON public.financial_reports AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.financial_reports; CREATE POLICY rls_insert_public ON public.financial_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.financial_reports; CREATE POLICY rls_select_public ON public.financial_reports AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text))))));

DROP POLICY IF EXISTS rls_update_public ON public.financial_reports; CREATE POLICY rls_update_public ON public.financial_reports AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.financial_reports; CREATE POLICY tenant_isolation ON public.financial_reports AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.informed_consents; CREATE POLICY rls_delete_public ON public.informed_consents AS PERMISSIVE FOR DELETE TO public USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

DROP POLICY IF EXISTS rls_insert_public ON public.informed_consents; CREATE POLICY rls_insert_public ON public.informed_consents AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT auth.role() AS role) = 'authenticated'::text));

DROP POLICY IF EXISTS rls_select_public ON public.informed_consents; CREATE POLICY rls_select_public ON public.informed_consents AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

DROP POLICY IF EXISTS rls_update_public ON public.informed_consents; CREATE POLICY rls_update_public ON public.informed_consents AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT auth.role() AS role) = 'authenticated'::text)) WITH CHECK ((( SELECT auth.role() AS role) = 'authenticated'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.informed_consents; CREATE POLICY tenant_isolation ON public.informed_consents AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.intra_oral_data; CREATE POLICY medical_dokter_only ON public.intra_oral_data AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.intra_oral_data; CREATE POLICY rls_delete_public ON public.intra_oral_data AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.intra_oral_data; CREATE POLICY rls_insert_public ON public.intra_oral_data AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.intra_oral_data; CREATE POLICY rls_select_public ON public.intra_oral_data AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.intra_oral_data; CREATE POLICY rls_update_public ON public.intra_oral_data AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.intra_oral_data; CREATE POLICY tenant_isolation ON public.intra_oral_data AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.invoice_counters; CREATE POLICY rls_delete_public ON public.invoice_counters AS PERMISSIVE FOR DELETE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text))))));

DROP POLICY IF EXISTS rls_insert_public ON public.invoice_counters; CREATE POLICY rls_insert_public ON public.invoice_counters AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text))))));

DROP POLICY IF EXISTS rls_select_public ON public.invoice_counters; CREATE POLICY rls_select_public ON public.invoice_counters AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text))))));

DROP POLICY IF EXISTS rls_update_public ON public.invoice_counters; CREATE POLICY rls_update_public ON public.invoice_counters AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text)))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text))))));

DROP POLICY IF EXISTS tenant_isolation ON public.invoice_counters; CREATE POLICY tenant_isolation ON public.invoice_counters AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access master_bahan" ON public.master_bahan; CREATE POLICY "Admin full access master_bahan" ON public.master_bahan AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.master_bahan; CREATE POLICY tenant_isolation ON public.master_bahan AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.master_obat; CREATE POLICY rls_delete_public ON public.master_obat AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.master_obat; CREATE POLICY rls_insert_public ON public.master_obat AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.master_obat; CREATE POLICY rls_select_public ON public.master_obat AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.master_obat; CREATE POLICY rls_update_public ON public.master_obat AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.master_obat; CREATE POLICY tenant_isolation ON public.master_obat AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access material_batches" ON public.material_batches; CREATE POLICY "Admin full access material_batches" ON public.material_batches AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.material_batches; CREATE POLICY tenant_isolation ON public.material_batches AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access material_purchases" ON public.material_purchases; CREATE POLICY "Admin full access material_purchases" ON public.material_purchases AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.material_purchases; CREATE POLICY tenant_isolation ON public.material_purchases AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.medical_history; CREATE POLICY medical_dokter_only ON public.medical_history AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.medical_history; CREATE POLICY rls_delete_public ON public.medical_history AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.medical_history; CREATE POLICY rls_insert_public ON public.medical_history AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.medical_history; CREATE POLICY rls_select_public ON public.medical_history AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.medical_history; CREATE POLICY rls_update_public ON public.medical_history AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.medical_history; CREATE POLICY tenant_isolation ON public.medical_history AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.medical_record_versions; CREATE POLICY medical_dokter_only ON public.medical_record_versions AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.medical_record_versions; CREATE POLICY rls_delete_public ON public.medical_record_versions AS PERMISSIVE FOR DELETE TO public USING (( SELECT has_permission('emr.delete'::text) AS has_permission));

DROP POLICY IF EXISTS rls_insert_public ON public.medical_record_versions; CREATE POLICY rls_insert_public ON public.medical_record_versions AS PERMISSIVE FOR INSERT TO public WITH CHECK (( SELECT has_permission('emr.create'::text) AS has_permission));

DROP POLICY IF EXISTS rls_select_public ON public.medical_record_versions; CREATE POLICY rls_select_public ON public.medical_record_versions AS PERMISSIVE FOR SELECT TO public USING (( SELECT has_permission('emr.read'::text) AS has_permission));

DROP POLICY IF EXISTS rls_update_public ON public.medical_record_versions; CREATE POLICY rls_update_public ON public.medical_record_versions AS PERMISSIVE FOR UPDATE TO public USING (( SELECT has_permission('emr.update'::text) AS has_permission)) WITH CHECK (( SELECT has_permission('emr.update'::text) AS has_permission));

DROP POLICY IF EXISTS tenant_isolation ON public.medical_record_versions; CREATE POLICY tenant_isolation ON public.medical_record_versions AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_insert_public ON public.notification_logs; CREATE POLICY rls_insert_public ON public.notification_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS rls_select_public ON public.notification_logs; CREATE POLICY rls_select_public ON public.notification_logs AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.notification_logs; CREATE POLICY tenant_isolation ON public.notification_logs AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.odontogram_meta; CREATE POLICY medical_dokter_only ON public.odontogram_meta AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.odontogram_meta; CREATE POLICY rls_delete_public ON public.odontogram_meta AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.odontogram_meta; CREATE POLICY rls_insert_public ON public.odontogram_meta AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.odontogram_meta; CREATE POLICY rls_select_public ON public.odontogram_meta AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.odontogram_meta; CREATE POLICY rls_update_public ON public.odontogram_meta AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.odontogram_meta; CREATE POLICY tenant_isolation ON public.odontogram_meta AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access overhead_costs" ON public.overhead_costs; CREATE POLICY "Admin full access overhead_costs" ON public.overhead_costs AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.overhead_costs; CREATE POLICY tenant_isolation ON public.overhead_costs AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access overhead_monthly_target" ON public.overhead_monthly_target; CREATE POLICY "Admin full access overhead_monthly_target" ON public.overhead_monthly_target AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.overhead_monthly_target; CREATE POLICY tenant_isolation ON public.overhead_monthly_target AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.patient_media; CREATE POLICY medical_dokter_only ON public.patient_media AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.patient_media; CREATE POLICY rls_delete_public ON public.patient_media AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.patient_media; CREATE POLICY rls_insert_public ON public.patient_media AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.patient_media; CREATE POLICY rls_select_public ON public.patient_media AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text])) AND (deleted_at IS NULL) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_update_public ON public.patient_media; CREATE POLICY rls_update_public ON public.patient_media AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.patient_media; CREATE POLICY tenant_isolation ON public.patient_media AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.patient_referrals; CREATE POLICY medical_dokter_only ON public.patient_referrals AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.patient_referrals; CREATE POLICY rls_delete_public ON public.patient_referrals AS PERMISSIVE FOR DELETE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_insert_public ON public.patient_referrals; CREATE POLICY rls_insert_public ON public.patient_referrals AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.patient_referrals; CREATE POLICY rls_select_public ON public.patient_referrals AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (deleted_at IS NULL) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.patient_referrals; CREATE POLICY rls_update_public ON public.patient_referrals AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.patient_referrals; CREATE POLICY tenant_isolation ON public.patient_referrals AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Allow authenticated users to manage patient_visits" ON public.patient_visits; CREATE POLICY "Allow authenticated users to manage patient_visits" ON public.patient_visits AS PERMISSIVE FOR ALL TO public USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.patient_visits; CREATE POLICY tenant_isolation ON public.patient_visits AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.patients; CREATE POLICY rls_delete_public ON public.patients AS PERMISSIVE FOR DELETE TO public USING ((( SELECT has_permission('patient.delete'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_insert_public ON public.patients; CREATE POLICY rls_insert_public ON public.patients AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT has_permission('patient.create'::text) AS has_permission) OR (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text])) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.patients; CREATE POLICY rls_select_public ON public.patients AS PERMISSIVE FOR SELECT TO public USING ((( SELECT has_permission('patient.read'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (deleted_at IS NULL) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.patients; CREATE POLICY rls_update_public ON public.patients AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT has_permission('patient.update'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((( SELECT has_permission('patient.update'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.patients; CREATE POLICY tenant_isolation ON public.patients AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.payments; CREATE POLICY rls_delete_public ON public.payments AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.payments; CREATE POLICY rls_insert_public ON public.payments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT has_permission('finance.payment'::text) AS has_permission) OR (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text])) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.payments; CREATE POLICY rls_select_public ON public.payments AS PERMISSIVE FOR SELECT TO public USING ((( SELECT has_permission('finance.read'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.payments; CREATE POLICY rls_update_public ON public.payments AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT has_permission('finance.update'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((( SELECT has_permission('finance.update'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.payments; CREATE POLICY tenant_isolation ON public.payments AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.periodontal_data; CREATE POLICY medical_dokter_only ON public.periodontal_data AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.periodontal_data; CREATE POLICY rls_delete_public ON public.periodontal_data AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.periodontal_data; CREATE POLICY rls_insert_public ON public.periodontal_data AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.periodontal_data; CREATE POLICY rls_select_public ON public.periodontal_data AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.periodontal_data; CREATE POLICY rls_update_public ON public.periodontal_data AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.periodontal_data; CREATE POLICY tenant_isolation ON public.periodontal_data AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS queue_display_links_admin_select ON public.queue_display_links; CREATE POLICY queue_display_links_admin_select ON public.queue_display_links AS PERMISSIVE FOR SELECT TO authenticated USING (((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)) AND (( SELECT get_user_role() AS get_user_role) = 'admin'::text)));

DROP POLICY IF EXISTS tenant_isolation ON public.queue_display_links; CREATE POLICY tenant_isolation ON public.queue_display_links AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS recall_contacts_select ON public.recall_contacts; CREATE POLICY recall_contacts_select ON public.recall_contacts AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text])));

DROP POLICY IF EXISTS tenant_isolation ON public.recall_contacts; CREATE POLICY tenant_isolation ON public.recall_contacts AS RESTRICTIVE FOR ALL TO authenticated USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Staff read reminder_logs" ON public.reminder_logs; CREATE POLICY "Staff read reminder_logs" ON public.reminder_logs AS PERMISSIVE FOR SELECT TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.reminder_logs; CREATE POLICY tenant_isolation ON public.reminder_logs AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.satusehat_consents; CREATE POLICY rls_delete_public ON public.satusehat_consents AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))))));

DROP POLICY IF EXISTS rls_insert_public ON public.satusehat_consents; CREATE POLICY rls_insert_public ON public.satusehat_consents AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))))));

DROP POLICY IF EXISTS rls_select_public ON public.satusehat_consents; CREATE POLICY rls_select_public ON public.satusehat_consents AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))))));

DROP POLICY IF EXISTS rls_update_public ON public.satusehat_consents; CREATE POLICY rls_update_public ON public.satusehat_consents AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (EXISTS ( SELECT 1
   FROM patients p
  WHERE ((p.id = satusehat_consents.patient_id) AND (p.clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))))));

DROP POLICY IF EXISTS tenant_isolation ON public.satusehat_consents; CREATE POLICY tenant_isolation ON public.satusehat_consents AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.satusehat_locations; CREATE POLICY rls_delete_public ON public.satusehat_locations AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.satusehat_locations; CREATE POLICY rls_insert_public ON public.satusehat_locations AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.satusehat_locations; CREATE POLICY rls_select_public ON public.satusehat_locations AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.satusehat_locations; CREATE POLICY rls_update_public ON public.satusehat_locations AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.satusehat_locations; CREATE POLICY tenant_isolation ON public.satusehat_locations AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.satusehat_organizations; CREATE POLICY rls_delete_public ON public.satusehat_organizations AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.satusehat_organizations; CREATE POLICY rls_insert_public ON public.satusehat_organizations AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.satusehat_organizations; CREATE POLICY rls_select_public ON public.satusehat_organizations AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.satusehat_organizations; CREATE POLICY rls_update_public ON public.satusehat_organizations AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.satusehat_organizations; CREATE POLICY tenant_isolation ON public.satusehat_organizations AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Outbox_Clinic_Isolation" ON public.satusehat_outbox; CREATE POLICY "Outbox_Clinic_Isolation" ON public.satusehat_outbox AS PERMISSIVE FOR ALL TO public USING (((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)) AND (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text]))));

DROP POLICY IF EXISTS tenant_isolation ON public.satusehat_outbox; CREATE POLICY tenant_isolation ON public.satusehat_outbox AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.soap_templates; CREATE POLICY rls_delete_public ON public.soap_templates AS PERMISSIVE FOR DELETE TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS rls_insert_public ON public.soap_templates; CREATE POLICY rls_insert_public ON public.soap_templates AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS rls_select_public ON public.soap_templates; CREATE POLICY rls_select_public ON public.soap_templates AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text]))));

DROP POLICY IF EXISTS rls_update_public ON public.soap_templates; CREATE POLICY rls_update_public ON public.soap_templates AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text)) WITH CHECK ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.soap_templates; CREATE POLICY tenant_isolation ON public.soap_templates AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access stok_movements" ON public.stok_movements; CREATE POLICY "Admin full access stok_movements" ON public.stok_movements AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.stok_movements; CREATE POLICY tenant_isolation ON public.stok_movements AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access stok_opname" ON public.stok_opname; CREATE POLICY "Admin full access stok_opname" ON public.stok_opname AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.stok_opname; CREATE POLICY tenant_isolation ON public.stok_opname AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Plans_Public_SELECT" ON public.subscription_plans; CREATE POLICY "Plans_Public_SELECT" ON public.subscription_plans AS PERMISSIVE FOR SELECT TO public USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

DROP POLICY IF EXISTS "Admin full access tier_weights" ON public.tier_weights; CREATE POLICY "Admin full access tier_weights" ON public.tier_weights AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.tier_weights; CREATE POLICY tenant_isolation ON public.tier_weights AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.tooth_conditions; CREATE POLICY medical_dokter_only ON public.tooth_conditions AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.tooth_conditions; CREATE POLICY rls_delete_public ON public.tooth_conditions AS PERMISSIVE FOR DELETE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_insert_public ON public.tooth_conditions; CREATE POLICY rls_insert_public ON public.tooth_conditions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.tooth_conditions; CREATE POLICY rls_select_public ON public.tooth_conditions AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.tooth_conditions; CREATE POLICY rls_update_public ON public.tooth_conditions AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.tooth_conditions; CREATE POLICY tenant_isolation ON public.tooth_conditions AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access treatment_cost_snapshot" ON public.treatment_cost_snapshot; CREATE POLICY "Admin full access treatment_cost_snapshot" ON public.treatment_cost_snapshot AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.treatment_cost_snapshot; CREATE POLICY tenant_isolation ON public.treatment_cost_snapshot AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.treatment_education; CREATE POLICY rls_delete_public ON public.treatment_education AS PERMISSIVE FOR DELETE TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS rls_insert_public ON public.treatment_education; CREATE POLICY rls_insert_public ON public.treatment_education AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = 'dokter'::text)));

DROP POLICY IF EXISTS rls_select_public ON public.treatment_education; CREATE POLICY rls_select_public ON public.treatment_education AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text]))));

DROP POLICY IF EXISTS rls_update_public ON public.treatment_education; CREATE POLICY rls_update_public ON public.treatment_education AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = 'dokter'::text))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = 'dokter'::text)));

DROP POLICY IF EXISTS tenant_isolation ON public.treatment_education; CREATE POLICY tenant_isolation ON public.treatment_education AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.treatment_education_templates; CREATE POLICY rls_delete_public ON public.treatment_education_templates AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.treatment_education_templates; CREATE POLICY rls_insert_public ON public.treatment_education_templates AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.treatment_education_templates; CREATE POLICY rls_select_public ON public.treatment_education_templates AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.treatment_education_templates; CREATE POLICY rls_update_public ON public.treatment_education_templates AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.treatment_education_templates; CREATE POLICY tenant_isolation ON public.treatment_education_templates AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access treatment_materials" ON public.treatment_materials; CREATE POLICY "Admin full access treatment_materials" ON public.treatment_materials AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.treatment_materials; CREATE POLICY tenant_isolation ON public.treatment_materials AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS medical_dokter_only ON public.treatment_plans; CREATE POLICY medical_dokter_only ON public.treatment_plans AS RESTRICTIVE FOR ALL TO authenticated USING (( SELECT is_medical_reader() AS is_medical_reader)) WITH CHECK (( SELECT is_medical_reader() AS is_medical_reader));

DROP POLICY IF EXISTS rls_delete_public ON public.treatment_plans; CREATE POLICY rls_delete_public ON public.treatment_plans AS PERMISSIVE FOR DELETE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_insert_public ON public.treatment_plans; CREATE POLICY rls_insert_public ON public.treatment_plans AS PERMISSIVE FOR INSERT TO public WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.treatment_plans; CREATE POLICY rls_select_public ON public.treatment_plans AS PERMISSIVE FOR SELECT TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.treatment_plans; CREATE POLICY rls_update_public ON public.treatment_plans AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.treatment_plans; CREATE POLICY tenant_isolation ON public.treatment_plans AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.treatments; CREATE POLICY rls_delete_public ON public.treatments AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text)))));

DROP POLICY IF EXISTS rls_insert_public ON public.treatments; CREATE POLICY rls_insert_public ON public.treatments AS PERMISSIVE FOR INSERT TO public WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text)))));

DROP POLICY IF EXISTS rls_select_public ON public.treatments; CREATE POLICY rls_select_public ON public.treatments AS PERMISSIVE FOR SELECT TO public USING (((( SELECT auth.role() AS role) = 'authenticated'::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text))))));

DROP POLICY IF EXISTS rls_update_public ON public.treatments; CREATE POLICY rls_update_public ON public.treatments AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = ( SELECT auth.uid() AS uid)) AND ((users.role)::text = 'admin'::text)))));

DROP POLICY IF EXISTS tenant_isolation ON public.treatments; CREATE POLICY tenant_isolation ON public.treatments AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Authenticated can view users" ON public.users; CREATE POLICY "Authenticated can view users" ON public.users AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS rls_delete_public ON public.users; CREATE POLICY rls_delete_public ON public.users AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.users; CREATE POLICY rls_insert_public ON public.users AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_select_public ON public.users; CREATE POLICY rls_select_public ON public.users AS PERMISSIVE FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = id) OR ((( SELECT auth.uid() AS uid) = id) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['dokter'::text, 'resepsionis'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR true));

DROP POLICY IF EXISTS rls_update_public ON public.users; CREATE POLICY rls_update_public ON public.users AS PERMISSIVE FOR UPDATE TO public USING ((((( SELECT auth.uid() AS uid) = id) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((((( SELECT auth.uid() AS uid) = id) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.users; CREATE POLICY tenant_isolation ON public.users AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.visit_obat; CREATE POLICY rls_delete_public ON public.visit_obat AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_insert_public ON public.visit_obat; CREATE POLICY rls_insert_public ON public.visit_obat AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text])) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.visit_obat; CREATE POLICY rls_select_public ON public.visit_obat AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS rls_update_public ON public.visit_obat; CREATE POLICY rls_update_public ON public.visit_obat AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))));

DROP POLICY IF EXISTS tenant_isolation ON public.visit_obat; CREATE POLICY tenant_isolation ON public.visit_obat AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Admin full access visit_treatment_material_overrides" ON public.visit_treatment_material_overrides; CREATE POLICY "Admin full access visit_treatment_material_overrides" ON public.visit_treatment_material_overrides AS PERMISSIVE FOR ALL TO public USING ((( SELECT get_user_role() AS get_user_role) = 'admin'::text));

DROP POLICY IF EXISTS tenant_isolation ON public.visit_treatment_material_overrides; CREATE POLICY tenant_isolation ON public.visit_treatment_material_overrides AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.visit_treatments; CREATE POLICY rls_delete_public ON public.visit_treatments AS PERMISSIVE FOR DELETE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = 'dokter'::text)));

DROP POLICY IF EXISTS rls_insert_public ON public.visit_treatments; CREATE POLICY rls_insert_public ON public.visit_treatments AS PERMISSIVE FOR INSERT TO public WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = 'dokter'::text)));

DROP POLICY IF EXISTS rls_select_public ON public.visit_treatments; CREATE POLICY rls_select_public ON public.visit_treatments AS PERMISSIVE FOR SELECT TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text]))));

DROP POLICY IF EXISTS rls_update_public ON public.visit_treatments; CREATE POLICY rls_update_public ON public.visit_treatments AS PERMISSIVE FOR UPDATE TO public USING (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = 'dokter'::text))) WITH CHECK (((( SELECT get_user_role() AS get_user_role) = 'admin'::text) OR (( SELECT get_user_role() AS get_user_role) = 'dokter'::text)));

DROP POLICY IF EXISTS tenant_isolation ON public.visit_treatments; CREATE POLICY tenant_isolation ON public.visit_treatments AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS rls_delete_public ON public.visits; CREATE POLICY rls_delete_public ON public.visits AS PERMISSIVE FOR DELETE TO public USING ((( SELECT has_permission('appointment.delete'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_insert_public ON public.visits; CREATE POLICY rls_insert_public ON public.visits AS PERMISSIVE FOR INSERT TO public WITH CHECK ((( SELECT has_permission('appointment.create'::text) AS has_permission) OR (( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text])) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_select_public ON public.visits; CREATE POLICY rls_select_public ON public.visits AS PERMISSIVE FOR SELECT TO public USING ((( SELECT has_permission('appointment.read'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = ANY (ARRAY['admin'::text, 'resepsionis'::text, 'dokter'::text])) AND (deleted_at IS NULL) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS rls_update_public ON public.visits; CREATE POLICY rls_update_public ON public.visits AS PERMISSIVE FOR UPDATE TO public USING ((( SELECT has_permission('appointment.update'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))))) WITH CHECK ((( SELECT has_permission('appointment.update'::text) AS has_permission) OR ((( SELECT get_user_role() AS get_user_role) = 'admin'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'dokter'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) OR ((( SELECT get_user_role() AS get_user_role) = 'resepsionis'::text) AND (clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)))));

DROP POLICY IF EXISTS tenant_isolation ON public.visits; CREATE POLICY tenant_isolation ON public.visits AS RESTRICTIVE FOR ALL TO public USING ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id))) WITH CHECK ((clinic_id = ( SELECT get_user_clinic_id() AS get_user_clinic_id)));

DROP POLICY IF EXISTS "Auth Delete for avatars" ON storage.objects; CREATE POLICY "Auth Delete for avatars" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Delete for klinik" ON storage.objects; CREATE POLICY "Auth Delete for klinik" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'klinik'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Delete for radiologi" ON storage.objects; CREATE POLICY "Auth Delete for radiologi" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING (((bucket_id = 'radiologi'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Insert for avatars" ON storage.objects; CREATE POLICY "Auth Insert for avatars" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Insert for klinik" ON storage.objects; CREATE POLICY "Auth Insert for klinik" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'klinik'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Insert for radiologi" ON storage.objects; CREATE POLICY "Auth Insert for radiologi" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'radiologi'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Read for klinik" ON storage.objects; CREATE POLICY "Auth Read for klinik" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'klinik'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Read for radiologi" ON storage.objects; CREATE POLICY "Auth Read for radiologi" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING (((bucket_id = 'radiologi'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Auth Update for avatars" ON storage.objects; CREATE POLICY "Auth Update for avatars" ON storage.objects AS PERMISSIVE FOR UPDATE TO public USING (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));

DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects; CREATE POLICY "Public Access for avatars" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));

DROP POLICY IF EXISTS avatars_own_folder_delete ON storage.objects; CREATE POLICY avatars_own_folder_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING (((bucket_id <> 'avatars'::text) OR (split_part(name, '/'::text, 1) = (( SELECT auth.uid() AS uid))::text)));

DROP POLICY IF EXISTS avatars_own_folder_insert ON storage.objects; CREATE POLICY avatars_own_folder_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK (((bucket_id <> 'avatars'::text) OR (split_part(name, '/'::text, 1) = (( SELECT auth.uid() AS uid))::text)));

DROP POLICY IF EXISTS avatars_own_folder_update ON storage.objects; CREATE POLICY avatars_own_folder_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING (((bucket_id <> 'avatars'::text) OR (split_part(name, '/'::text, 1) = (( SELECT auth.uid() AS uid))::text))) WITH CHECK (((bucket_id <> 'avatars'::text) OR (split_part(name, '/'::text, 1) = (( SELECT auth.uid() AS uid))::text)));

DROP POLICY IF EXISTS downloads_public_list ON storage.objects; CREATE POLICY downloads_public_list ON storage.objects AS PERMISSIVE FOR SELECT TO anon,authenticated USING ((bucket_id = 'downloads'::text));

DROP POLICY IF EXISTS patient_photos_delete ON storage.objects; CREATE POLICY patient_photos_delete ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = 'patient-photos'::text));

DROP POLICY IF EXISTS patient_photos_insert ON storage.objects; CREATE POLICY patient_photos_insert ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'patient-photos'::text));

DROP POLICY IF EXISTS patient_photos_read ON storage.objects; CREATE POLICY patient_photos_read ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'patient-photos'::text));

DROP POLICY IF EXISTS patient_photos_update ON storage.objects; CREATE POLICY patient_photos_update ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING ((bucket_id = 'patient-photos'::text)) WITH CHECK ((bucket_id = 'patient-photos'::text));

DROP POLICY IF EXISTS tenant_clinical_files_delete ON storage.objects; CREATE POLICY tenant_clinical_files_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING (((bucket_id <> ALL (ARRAY['radiologi'::text, 'klinik'::text, 'patient-photos'::text])) OR storage_object_in_my_clinic(name)));

DROP POLICY IF EXISTS tenant_clinical_files_insert ON storage.objects; CREATE POLICY tenant_clinical_files_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK (((bucket_id <> ALL (ARRAY['radiologi'::text, 'klinik'::text, 'patient-photos'::text])) OR (split_part(name, '/'::text, 1) = (( SELECT get_user_clinic_id() AS get_user_clinic_id))::text)));

DROP POLICY IF EXISTS tenant_clinical_files_select ON storage.objects; CREATE POLICY tenant_clinical_files_select ON storage.objects AS RESTRICTIVE FOR SELECT TO public USING (((bucket_id <> ALL (ARRAY['radiologi'::text, 'klinik'::text, 'patient-photos'::text])) OR storage_object_in_my_clinic(name)));

DROP POLICY IF EXISTS tenant_clinical_files_update ON storage.objects; CREATE POLICY tenant_clinical_files_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING (((bucket_id <> ALL (ARRAY['radiologi'::text, 'klinik'::text, 'patient-photos'::text])) OR storage_object_in_my_clinic(name))) WITH CHECK (((bucket_id <> ALL (ARRAY['radiologi'::text, 'klinik'::text, 'patient-photos'::text])) OR (split_part(name, '/'::text, 1) = (( SELECT get_user_clinic_id() AS get_user_clinic_id))::text)));

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE platform.announcements TO service_role;

GRANT INSERT, SELECT ON TABLE platform.audit_logs TO service_role;

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE platform.clinic_notes TO service_role;

GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE platform.clinic_overview TO service_role;

GRANT INSERT, UPDATE, DELETE, SELECT ON TABLE platform.invoice_counters TO service_role;

GRANT INSERT, UPDATE, SELECT ON TABLE platform.invoices TO service_role;

GRANT INSERT, DELETE, UPDATE, SELECT ON TABLE platform.operators TO service_role;

GRANT SELECT, UPDATE, INSERT ON TABLE platform.payments TO service_role;

GRANT SELECT, UPDATE, INSERT, DELETE ON TABLE platform.usage_daily TO service_role;

GRANT REFERENCES, SELECT, TRUNCATE, TRIGGER, MAINTAIN ON TABLE public.ai_feedback TO anon;

GRANT MAINTAIN, TRUNCATE, SELECT, TRIGGER, REFERENCES ON TABLE public.ai_feedback TO authenticated;

GRANT TRUNCATE, TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, REFERENCES ON TABLE public.ai_feedback TO service_role;

GRANT MAINTAIN, SELECT, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.ai_insights TO anon;

GRANT TRIGGER, SELECT, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.ai_insights TO authenticated;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.ai_insights TO service_role;

GRANT TRUNCATE, DELETE, SELECT, MAINTAIN, TRIGGER, REFERENCES ON TABLE public.ai_knowledge TO anon;

GRANT DELETE, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, SELECT ON TABLE public.ai_knowledge TO authenticated;

GRANT TRUNCATE, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRIGGER, REFERENCES ON TABLE public.ai_knowledge TO service_role;

GRANT TRIGGER, TRUNCATE, SELECT, REFERENCES, MAINTAIN ON TABLE public.ai_usage TO anon;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE ON TABLE public.ai_usage TO authenticated;

GRANT UPDATE, INSERT, SELECT, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.ai_usage TO service_role;

GRANT TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE public.audit_logs TO anon;

GRANT DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE ON TABLE public.audit_logs TO authenticated;

GRANT UPDATE, DELETE, REFERENCES, MAINTAIN, TRIGGER, INSERT, SELECT, TRUNCATE ON TABLE public.audit_logs TO service_role;

GRANT TRIGGER, REFERENCES, MAINTAIN, UPDATE, SELECT ON TABLE public.booking_requests TO authenticated;

GRANT TRUNCATE, UPDATE, SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, DELETE ON TABLE public.booking_requests TO service_role;

GRANT UPDATE, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT ON TABLE public.clinic_rm_counters TO service_role;

GRANT UPDATE, SELECT, INSERT, TRIGGER, TRUNCATE, DELETE, MAINTAIN, REFERENCES ON TABLE public.clinic_settings TO anon;

GRANT MAINTAIN, DELETE, TRUNCATE, UPDATE, REFERENCES, SELECT, INSERT, TRIGGER ON TABLE public.clinic_settings TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.clinic_settings TO service_role;

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE public.clinic_subscriptions TO anon;

GRANT TRIGGER, SELECT, REFERENCES, MAINTAIN ON TABLE public.clinic_subscriptions TO authenticated;

GRANT UPDATE, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT, INSERT ON TABLE public.clinic_subscriptions TO service_role;

GRANT UPDATE, SELECT, INSERT, REFERENCES, MAINTAIN, TRIGGER, TRUNCATE, DELETE ON TABLE public.clinical_data TO anon;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, INSERT, SELECT, UPDATE, DELETE ON TABLE public.clinical_data TO authenticated;

GRANT INSERT, DELETE, REFERENCES, TRIGGER, MAINTAIN, UPDATE, SELECT, TRUNCATE ON TABLE public.clinical_data TO service_role;

GRANT TRIGGER, REFERENCES, SELECT, MAINTAIN ON TABLE public.clinics TO anon;

GRANT TRIGGER, MAINTAIN, SELECT, REFERENCES ON TABLE public.clinics TO authenticated;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.clinics TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.data_subject_requests TO anon;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.data_subject_requests TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.data_subject_requests TO service_role;

GRANT REFERENCES, UPDATE, TRIGGER, MAINTAIN, TRUNCATE, DELETE, INSERT, SELECT ON TABLE public.doctor_schedules TO anon;

GRANT TRUNCATE, UPDATE, SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, DELETE ON TABLE public.doctor_schedules TO authenticated;

GRANT DELETE, UPDATE, TRIGGER, REFERENCES, SELECT, INSERT, MAINTAIN, TRUNCATE ON TABLE public.doctor_schedules TO service_role;

GRANT DELETE, SELECT, UPDATE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT ON TABLE public.expenses TO anon;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.expenses TO authenticated;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.expenses TO service_role;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.extra_oral_data TO anon;

GRANT REFERENCES, MAINTAIN, TRIGGER, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.extra_oral_data TO authenticated;

GRANT TRUNCATE, REFERENCES, UPDATE, TRIGGER, DELETE, MAINTAIN, SELECT, INSERT ON TABLE public.extra_oral_data TO service_role;

GRANT INSERT, REFERENCES, TRIGGER, MAINTAIN, TRUNCATE, UPDATE, DELETE, SELECT ON TABLE public.financial_reports TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.financial_reports TO authenticated;

GRANT DELETE, TRUNCATE, INSERT, SELECT, UPDATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.financial_reports TO service_role;

GRANT TRIGGER, TRUNCATE, DELETE, INSERT, SELECT, UPDATE, MAINTAIN, REFERENCES ON TABLE public.informed_consents TO anon;

GRANT SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE ON TABLE public.informed_consents TO authenticated;

GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT, DELETE, UPDATE ON TABLE public.informed_consents TO service_role;

GRANT REFERENCES, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.intra_oral_data TO anon;

GRANT TRIGGER, UPDATE, SELECT, MAINTAIN, INSERT, DELETE, TRUNCATE, REFERENCES ON TABLE public.intra_oral_data TO authenticated;

GRANT TRIGGER, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, REFERENCES, MAINTAIN ON TABLE public.intra_oral_data TO service_role;

GRANT TRUNCATE, INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.invoice_counters TO anon;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.invoice_counters TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.invoice_counters TO service_role;

GRANT UPDATE, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT ON TABLE public.master_bahan TO anon;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.master_bahan TO authenticated;

GRANT TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, MAINTAIN ON TABLE public.master_bahan TO service_role;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.master_obat TO anon;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.master_obat TO authenticated;

GRANT INSERT, TRIGGER, REFERENCES, MAINTAIN, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.master_obat TO service_role;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.material_batches TO anon;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.material_batches TO authenticated;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.material_batches TO service_role;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.material_purchases TO anon;

GRANT UPDATE, SELECT, INSERT, REFERENCES, TRIGGER, MAINTAIN, TRUNCATE, DELETE ON TABLE public.material_purchases TO authenticated;

GRANT REFERENCES, UPDATE, DELETE, TRUNCATE, TRIGGER, MAINTAIN, INSERT, SELECT ON TABLE public.material_purchases TO service_role;

GRANT INSERT, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, TRIGGER, MAINTAIN ON TABLE public.medical_history TO anon;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, INSERT, UPDATE ON TABLE public.medical_history TO authenticated;

GRANT DELETE, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, UPDATE, SELECT, INSERT ON TABLE public.medical_history TO service_role;

GRANT UPDATE, SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE ON TABLE public.medical_record_versions TO anon;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.medical_record_versions TO authenticated;

GRANT INSERT, TRIGGER, REFERENCES, TRUNCATE, MAINTAIN, DELETE, UPDATE, SELECT ON TABLE public.medical_record_versions TO service_role;

GRANT REFERENCES, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.notification_logs TO anon;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.notification_logs TO authenticated;

GRANT INSERT, TRIGGER, MAINTAIN, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE public.notification_logs TO service_role;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.odontogram_meta TO anon;

GRANT TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.odontogram_meta TO authenticated;

GRANT TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE public.odontogram_meta TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.overhead_costs TO anon;

GRANT TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE public.overhead_costs TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.overhead_costs TO service_role;

GRANT TRIGGER, MAINTAIN, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, INSERT ON TABLE public.overhead_monthly_target TO anon;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.overhead_monthly_target TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.overhead_monthly_target TO service_role;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.patient_media TO anon;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.patient_media TO authenticated;

GRANT TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.patient_media TO service_role;

GRANT SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE ON TABLE public.patient_referrals TO anon;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.patient_referrals TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.patient_referrals TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.patient_visits TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.patient_visits TO authenticated;

GRANT UPDATE, SELECT, INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.patient_visits TO service_role;

GRANT TRUNCATE, MAINTAIN, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT, INSERT ON TABLE public.patients TO anon;

GRANT MAINTAIN, INSERT, UPDATE, SELECT, TRIGGER, REFERENCES, TRUNCATE, DELETE ON TABLE public.patients TO authenticated;

GRANT DELETE, SELECT, INSERT, UPDATE, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE ON TABLE public.patients TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.payments TO anon;

GRANT SELECT, REFERENCES, TRIGGER, MAINTAIN, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.payments TO authenticated;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.payments TO service_role;

GRANT TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.periodontal_data TO anon;

GRANT INSERT, TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.periodontal_data TO authenticated;

GRANT INSERT, MAINTAIN, DELETE, UPDATE, SELECT, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.periodontal_data TO service_role;

GRANT MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, TRIGGER ON TABLE public.permissions TO anon;

GRANT TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.permissions TO authenticated;

GRANT DELETE, UPDATE, SELECT, TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, INSERT ON TABLE public.permissions TO service_role;

GRANT SELECT, REFERENCES, MAINTAIN, TRIGGER ON TABLE public.queue_display_links TO authenticated;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.queue_display_links TO service_role;

GRANT REFERENCES, SELECT, TRUNCATE, MAINTAIN, TRIGGER ON TABLE public.recall_contacts TO anon;

GRANT TRUNCATE, SELECT, MAINTAIN, TRIGGER, REFERENCES ON TABLE public.recall_contacts TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.recall_contacts TO service_role;

GRANT INSERT, MAINTAIN, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.reminder_logs TO anon;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.reminder_logs TO authenticated;

GRANT MAINTAIN, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, INSERT ON TABLE public.reminder_logs TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.role_permissions TO anon;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.role_permissions TO authenticated;

GRANT UPDATE, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT ON TABLE public.role_permissions TO service_role;

GRANT TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE public.roles TO anon;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.roles TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.roles TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.satusehat_consents TO anon;

GRANT REFERENCES, MAINTAIN, TRIGGER, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.satusehat_consents TO authenticated;

GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT ON TABLE public.satusehat_consents TO service_role;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.satusehat_locations TO anon;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.satusehat_locations TO authenticated;

GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT ON TABLE public.satusehat_locations TO service_role;

GRANT MAINTAIN, TRIGGER, REFERENCES, INSERT, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.satusehat_organizations TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.satusehat_organizations TO authenticated;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.satusehat_organizations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.satusehat_outbox TO anon;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.satusehat_outbox TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.satusehat_outbox TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.satusehat_token_cache TO anon;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.satusehat_token_cache TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.satusehat_token_cache TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.satusehat_verification_runs TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.soap_templates TO anon;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.soap_templates TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.soap_templates TO service_role;

GRANT SELECT, TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.stok_movements TO anon;

GRANT REFERENCES, TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE ON TABLE public.stok_movements TO authenticated;

GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT ON TABLE public.stok_movements TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.stok_opname TO anon;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.stok_opname TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.stok_opname TO service_role;

GRANT SELECT, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.subscription_plans TO anon;

GRANT REFERENCES, MAINTAIN, TRIGGER, SELECT ON TABLE public.subscription_plans TO authenticated;

GRANT SELECT, TRIGGER, MAINTAIN, REFERENCES, INSERT, TRUNCATE, DELETE, UPDATE ON TABLE public.subscription_plans TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.tier_weights TO anon;

GRANT REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, TRIGGER, MAINTAIN ON TABLE public.tier_weights TO authenticated;

GRANT TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.tier_weights TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.tooth_conditions TO anon;

GRANT MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT, TRIGGER ON TABLE public.tooth_conditions TO authenticated;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.tooth_conditions TO service_role;

GRANT TRUNCATE, INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.treatment_cost_snapshot TO anon;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.treatment_cost_snapshot TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.treatment_cost_snapshot TO service_role;

GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, INSERT, TRIGGER, MAINTAIN ON TABLE public.treatment_education TO anon;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.treatment_education TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.treatment_education TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.treatment_education_templates TO anon;

GRANT MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.treatment_education_templates TO authenticated;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.treatment_education_templates TO service_role;

GRANT MAINTAIN, INSERT, TRIGGER, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE public.treatment_materials TO anon;

GRANT UPDATE, TRUNCATE, REFERENCES, TRIGGER, INSERT, MAINTAIN, SELECT, DELETE ON TABLE public.treatment_materials TO authenticated;

GRANT UPDATE, SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE ON TABLE public.treatment_materials TO service_role;

GRANT DELETE, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, UPDATE, SELECT, INSERT ON TABLE public.treatment_plans TO anon;

GRANT SELECT, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, MAINTAIN ON TABLE public.treatment_plans TO authenticated;

GRANT UPDATE, SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE ON TABLE public.treatment_plans TO service_role;

GRANT REFERENCES, TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE ON TABLE public.treatments TO anon;

GRANT TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON TABLE public.treatments TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.treatments TO service_role;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.user_permissions TO anon;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_permissions TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.user_permissions TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.users TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.users TO authenticated;

GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, MAINTAIN ON TABLE public.users TO service_role;

GRANT SELECT, INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE ON TABLE public.v_daily_revenue TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.v_daily_revenue TO service_role;

GRANT REFERENCES, MAINTAIN, TRIGGER, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.v_monthly_revenue TO authenticated;

GRANT INSERT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT ON TABLE public.v_monthly_revenue TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.v_patient_summary TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.v_patient_summary TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.v_popular_treatments TO authenticated;

GRANT MAINTAIN, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.v_popular_treatments TO service_role;

GRANT REFERENCES, MAINTAIN, DELETE, UPDATE, SELECT, INSERT, TRUNCATE, TRIGGER ON TABLE public.visit_obat TO anon;

GRANT DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, INSERT, SELECT, UPDATE ON TABLE public.visit_obat TO authenticated;

GRANT DELETE, SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, INSERT, UPDATE ON TABLE public.visit_obat TO service_role;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.visit_treatment_material_overrides TO anon;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.visit_treatment_material_overrides TO authenticated;

GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.visit_treatment_material_overrides TO service_role;

GRANT SELECT, MAINTAIN, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON TABLE public.visit_treatments TO anon;

GRANT UPDATE, INSERT, SELECT, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.visit_treatments TO authenticated;

GRANT INSERT, REFERENCES, TRUNCATE, DELETE, SELECT, UPDATE, MAINTAIN, TRIGGER ON TABLE public.visit_treatments TO service_role;

GRANT TRUNCATE, REFERENCES, MAINTAIN, TRIGGER, INSERT, SELECT, UPDATE, DELETE ON TABLE public.visits TO anon;

GRANT UPDATE, TRUNCATE, MAINTAIN, TRIGGER, INSERT, REFERENCES, SELECT, DELETE ON TABLE public.visits TO authenticated;

GRANT TRIGGER, MAINTAIN, REFERENCES, TRUNCATE, DELETE, UPDATE, SELECT, INSERT ON TABLE public.visits TO service_role;

REVOKE ALL ON FUNCTION platform.block_audit_mutation() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.clinic_health(p_limit integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.collect_usage_daily(p_date date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.confirm_manual_payment(p_invoice_id uuid, p_amount_idr bigint, p_paid_at timestamp with time zone, p_reference text, p_notes text, p_operator_id uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.create_invoice(p_clinic_id uuid, p_period_start date, p_period_end date, p_amount_idr bigint, p_tax_idr bigint, p_due_date date, p_notes text, p_operator_id uuid, p_source text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.dashboard_summary(p_churn_days integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.guard_last_owner() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.guard_operator_not_clinic_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.legacy_clinic_id() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.make_unique_per_clinic(p_table text, p_column text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.mark_overdue_invoices() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.next_invoice_number(p_at timestamp with time zone) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.provision_clinic(p_owner_user_id uuid, p_owner_email text, p_owner_name text, p_owner_phone text, p_name text, p_slug text, p_phone text, p_email text, p_address text, p_city text, p_province text, p_plan_id uuid, p_trial_days integer, p_operator_id uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.register_midtrans_order(p_order_id text, p_clinic_id uuid, p_plan_id uuid, p_billing_cycle text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.revoke_user_sessions(p_user_id uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.rls_consolidate() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.settle_midtrans_order(p_order_id text, p_outcome text, p_gross_amount bigint, p_raw jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.touch_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.wrap_policy_expr(expr text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION platform.write_audit(p_operator_id uuid, p_action text, p_target_type text, p_target_id text, p_clinic_id uuid, p_reason text, p_before jsonb, p_after jsonb, p_ip text, p_user_agent text, p_request_id text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.get_encryption_key() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.medical_plain(p text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.medical_reseal(p_new text, p_old text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.medical_seal(p text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.medical_seal_json(j jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION private.rotate_master_key(p_new_key_hex text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_answer_feedback(p_usage_id uuid, p_correct boolean, p_note text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_break_even(p_bulan integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_cashflow_projection(p_bulan_historis integer, p_bulan_ke_depan integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_check_range(p_from date, p_to date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_doctor_performance(p_from date, p_to date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_doctor_schedule_load(p_minggu integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_expense_summary(p_from date, p_to date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_knowledge_hit(p_id uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_knowledge_match(p_norm text, p_limit integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_price_simulation(p_nama text, p_perubahan_persen numeric, p_bulan integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_recall_stats(p_bulan integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_require_admin() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_revenue_summary(p_from date, p_to date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_service_clinics() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_service_snapshots(p_clinic uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_set_enabled(p_enabled boolean) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_snapshot() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_staff_snapshot() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_staff_status() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_status() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_stock_alerts() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_today_summary() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_treatment_performance(p_from date, p_to date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_unbilled_visits(p_days integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.ai_visit_stats(p_from date, p_to date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.audit_emr_update() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.billing_register_midtrans_order(p_order_id text, p_clinic_id uuid, p_plan_id uuid, p_billing_cycle text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.billing_settle_midtrans_order(p_order_id text, p_outcome text, p_gross_amount bigint, p_raw jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.check_max_patients_limit() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.clinics_touch() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_queue_display_link(p_label text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.decrypt_batch(p_payloads text[]) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.decrypt_field(p_ciphertext text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.dynamic_audit_trigger() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.encrypt_batch(p_payloads text[]) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.encrypt_field(p_plaintext text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.fn_proses_stok_dan_snapshot_visit_treatment(p_visit_treatment_id uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.generate_no_rm() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_active_announcements() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_audit_logs() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_booking_page(p_slug text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_my_account_status() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_onboarding_status() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_patient_media_paths(p_patient_id uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_queue_display(p_token text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_clinic_id() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_permission(p_permission_name text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_medical_reader() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.master_bahan_kfa_guard() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.process_audit_log() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.process_visit_versioning() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.protect_visit_medical_fields() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.queue_initials(p_name text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.recall_candidates(p_bulan integer, p_limit integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.recall_mark_contacted(p_patient_id uuid, p_channel text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.recall_require_staff() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.record_login() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.register_clinic(p_clinic_name text, p_clinic_phone text, p_city text, p_province text, p_owner_name text, p_owner_phone text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.replace_tooth_conditions(p_patient_id uuid, p_conditions jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.replace_treatment_plans(p_patient_id uuid, p_plans jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.replace_visit_treatments(p_visit_id uuid, p_treatments jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.restore_emr_version(p_visit_id uuid, p_version integer, p_reason text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.restore_visit_version(p_visit_id uuid, p_version integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.revoke_queue_display_link(p_id uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.set_visit_number() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.soft_delete_patient() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.soft_delete_patient_media() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.soft_delete_patient_referral() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.soft_delete_visit() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.storage_object_in_my_clinic(p_name text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_booking_request(p_slug text, p_dokter_id uuid, p_date date, p_time text, p_name text, p_phone text, p_complaint text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.tenant_fill_clinic_id() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.trg_purchase_update_stok() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.trg_visit_completed_process_costing() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.users_guard_sensitive() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.users_sync_clinic_claim() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.users_sync_status() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION platform.block_audit_mutation() TO service_role;

GRANT EXECUTE ON FUNCTION platform.clinic_health(p_limit integer) TO service_role;

GRANT EXECUTE ON FUNCTION platform.collect_usage_daily(p_date date) TO service_role;

GRANT EXECUTE ON FUNCTION platform.confirm_manual_payment(p_invoice_id uuid, p_amount_idr bigint, p_paid_at timestamp with time zone, p_reference text, p_notes text, p_operator_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION platform.create_invoice(p_clinic_id uuid, p_period_start date, p_period_end date, p_amount_idr bigint, p_tax_idr bigint, p_due_date date, p_notes text, p_operator_id uuid, p_source text) TO service_role;

GRANT EXECUTE ON FUNCTION platform.dashboard_summary(p_churn_days integer) TO service_role;

GRANT EXECUTE ON FUNCTION platform.guard_last_owner() TO service_role;

GRANT EXECUTE ON FUNCTION platform.guard_operator_not_clinic_user() TO service_role;

GRANT EXECUTE ON FUNCTION platform.legacy_clinic_id() TO service_role;

GRANT EXECUTE ON FUNCTION platform.mark_overdue_invoices() TO service_role;

GRANT EXECUTE ON FUNCTION platform.next_invoice_number(p_at timestamp with time zone) TO service_role;

GRANT EXECUTE ON FUNCTION platform.provision_clinic(p_owner_user_id uuid, p_owner_email text, p_owner_name text, p_owner_phone text, p_name text, p_slug text, p_phone text, p_email text, p_address text, p_city text, p_province text, p_plan_id uuid, p_trial_days integer, p_operator_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION platform.register_midtrans_order(p_order_id text, p_clinic_id uuid, p_plan_id uuid, p_billing_cycle text) TO service_role;

GRANT EXECUTE ON FUNCTION platform.revoke_user_sessions(p_user_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION platform.settle_midtrans_order(p_order_id text, p_outcome text, p_gross_amount bigint, p_raw jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION platform.touch_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION platform.write_audit(p_operator_id uuid, p_action text, p_target_type text, p_target_id text, p_clinic_id uuid, p_reason text, p_before jsonb, p_after jsonb, p_ip text, p_user_agent text, p_request_id text) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_answer_feedback(p_usage_id uuid, p_correct boolean, p_note text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_answer_feedback(p_usage_id uuid, p_correct boolean, p_note text) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_break_even(p_bulan integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_break_even(p_bulan integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_cashflow_projection(p_bulan_historis integer, p_bulan_ke_depan integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_cashflow_projection(p_bulan_historis integer, p_bulan_ke_depan integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_check_range(p_from date, p_to date) TO anon;

GRANT EXECUTE ON FUNCTION public.ai_check_range(p_from date, p_to date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_check_range(p_from date, p_to date) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_doctor_performance(p_from date, p_to date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_doctor_performance(p_from date, p_to date) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_doctor_schedule_load(p_minggu integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_doctor_schedule_load(p_minggu integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_expense_summary(p_from date, p_to date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_expense_summary(p_from date, p_to date) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_knowledge_hit(p_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_knowledge_match(p_norm text, p_limit integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_knowledge_match(p_norm text, p_limit integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_price_simulation(p_nama text, p_perubahan_persen numeric, p_bulan integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_price_simulation(p_nama text, p_perubahan_persen numeric, p_bulan integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_recall_stats(p_bulan integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_recall_stats(p_bulan integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_require_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_require_admin() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_revenue_summary(p_from date, p_to date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_revenue_summary(p_from date, p_to date) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_service_clinics() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_service_snapshots(p_clinic uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_set_enabled(p_enabled boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_set_enabled(p_enabled boolean) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_snapshot() TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_snapshot() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_staff_snapshot() TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_staff_snapshot() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_staff_status() TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_staff_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_status() TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_stock_alerts() TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_stock_alerts() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_today_summary() TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_today_summary() TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_treatment_performance(p_from date, p_to date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_treatment_performance(p_from date, p_to date) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_unbilled_visits(p_days integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_unbilled_visits(p_days integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.ai_visit_stats(p_from date, p_to date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.ai_visit_stats(p_from date, p_to date) TO service_role;

GRANT EXECUTE ON FUNCTION public.audit_emr_update() TO service_role;

GRANT EXECUTE ON FUNCTION public.billing_register_midtrans_order(p_order_id text, p_clinic_id uuid, p_plan_id uuid, p_billing_cycle text) TO service_role;

GRANT EXECUTE ON FUNCTION public.billing_settle_midtrans_order(p_order_id text, p_outcome text, p_gross_amount bigint, p_raw jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.check_max_patients_limit() TO service_role;

GRANT EXECUTE ON FUNCTION public.clinics_touch() TO anon;

GRANT EXECUTE ON FUNCTION public.clinics_touch() TO authenticated;

GRANT EXECUTE ON FUNCTION public.clinics_touch() TO service_role;

GRANT EXECUTE ON FUNCTION public.create_queue_display_link(p_label text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_queue_display_link(p_label text) TO service_role;

GRANT EXECUTE ON FUNCTION public.decrypt_batch(p_payloads text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.decrypt_batch(p_payloads text[]) TO service_role;

GRANT EXECUTE ON FUNCTION public.decrypt_field(p_ciphertext text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.decrypt_field(p_ciphertext text) TO service_role;

GRANT EXECUTE ON FUNCTION public.dynamic_audit_trigger() TO service_role;

GRANT EXECUTE ON FUNCTION public.encrypt_batch(p_payloads text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.encrypt_batch(p_payloads text[]) TO service_role;

GRANT EXECUTE ON FUNCTION public.encrypt_field(p_plaintext text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.encrypt_field(p_plaintext text) TO service_role;

GRANT EXECUTE ON FUNCTION public.fn_proses_stok_dan_snapshot_visit_treatment(p_visit_treatment_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO service_role;

GRANT EXECUTE ON FUNCTION public.generate_no_rm() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_active_announcements() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_active_announcements() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_audit_logs() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_audit_logs() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_booking_page(p_slug text) TO anon;

GRANT EXECUTE ON FUNCTION public.get_booking_page(p_slug text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_booking_page(p_slug text) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_account_status() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_account_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_patient_media_paths(p_patient_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_patient_media_paths(p_patient_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_queue_display(p_token text) TO anon;

GRANT EXECUTE ON FUNCTION public.get_queue_display(p_token text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_queue_display(p_token text) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_user_clinic_id() TO anon;

GRANT EXECUTE ON FUNCTION public.get_user_clinic_id() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_clinic_id() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO service_role;

GRANT EXECUTE ON FUNCTION public.has_permission(p_permission_name text) TO anon;

GRANT EXECUTE ON FUNCTION public.has_permission(p_permission_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.has_permission(p_permission_name text) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_medical_reader() TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_medical_reader() TO service_role;

GRANT EXECUTE ON FUNCTION public.master_bahan_kfa_guard() TO service_role;

GRANT EXECUTE ON FUNCTION public.process_audit_log() TO service_role;

GRANT EXECUTE ON FUNCTION public.process_visit_versioning() TO service_role;

GRANT EXECUTE ON FUNCTION public.protect_visit_medical_fields() TO service_role;

GRANT EXECUTE ON FUNCTION public.queue_initials(p_name text) TO service_role;

GRANT EXECUTE ON FUNCTION public.recall_candidates(p_bulan integer, p_limit integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.recall_candidates(p_bulan integer, p_limit integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.recall_mark_contacted(p_patient_id uuid, p_channel text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.recall_mark_contacted(p_patient_id uuid, p_channel text) TO service_role;

GRANT EXECUTE ON FUNCTION public.recall_require_staff() TO authenticated;

GRANT EXECUTE ON FUNCTION public.recall_require_staff() TO service_role;

GRANT EXECUTE ON FUNCTION public.record_login() TO authenticated;

GRANT EXECUTE ON FUNCTION public.record_login() TO service_role;

GRANT EXECUTE ON FUNCTION public.register_clinic(p_clinic_name text, p_clinic_phone text, p_city text, p_province text, p_owner_name text, p_owner_phone text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_clinic(p_clinic_name text, p_clinic_phone text, p_city text, p_province text, p_owner_name text, p_owner_phone text) TO service_role;

GRANT EXECUTE ON FUNCTION public.replace_tooth_conditions(p_patient_id uuid, p_conditions jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.replace_tooth_conditions(p_patient_id uuid, p_conditions jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.replace_treatment_plans(p_patient_id uuid, p_plans jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.replace_treatment_plans(p_patient_id uuid, p_plans jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.replace_visit_treatments(p_visit_id uuid, p_treatments jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.replace_visit_treatments(p_visit_id uuid, p_treatments jsonb) TO service_role;

GRANT EXECUTE ON FUNCTION public.restore_emr_version(p_visit_id uuid, p_version integer, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.restore_emr_version(p_visit_id uuid, p_version integer, p_reason text) TO service_role;

GRANT EXECUTE ON FUNCTION public.restore_visit_version(p_visit_id uuid, p_version integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.revoke_queue_display_link(p_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.revoke_queue_display_link(p_id uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

GRANT EXECUTE ON FUNCTION public.set_updated_at() TO anon;

GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.set_visit_number() TO anon;

GRANT EXECUTE ON FUNCTION public.set_visit_number() TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_visit_number() TO service_role;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient() TO anon;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient() TO authenticated;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient() TO service_role;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient_media() TO anon;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient_media() TO authenticated;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient_media() TO service_role;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient_referral() TO anon;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient_referral() TO authenticated;

GRANT EXECUTE ON FUNCTION public.soft_delete_patient_referral() TO service_role;

GRANT EXECUTE ON FUNCTION public.soft_delete_visit() TO anon;

GRANT EXECUTE ON FUNCTION public.soft_delete_visit() TO authenticated;

GRANT EXECUTE ON FUNCTION public.soft_delete_visit() TO service_role;

GRANT EXECUTE ON FUNCTION public.storage_object_in_my_clinic(p_name text) TO anon;

GRANT EXECUTE ON FUNCTION public.storage_object_in_my_clinic(p_name text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.storage_object_in_my_clinic(p_name text) TO service_role;

GRANT EXECUTE ON FUNCTION public.submit_booking_request(p_slug text, p_dokter_id uuid, p_date date, p_time text, p_name text, p_phone text, p_complaint text) TO anon;

GRANT EXECUTE ON FUNCTION public.submit_booking_request(p_slug text, p_dokter_id uuid, p_date date, p_time text, p_name text, p_phone text, p_complaint text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_booking_request(p_slug text, p_dokter_id uuid, p_date date, p_time text, p_name text, p_phone text, p_complaint text) TO service_role;

GRANT EXECUTE ON FUNCTION public.tenant_fill_clinic_id() TO service_role;

GRANT EXECUTE ON FUNCTION public.trg_purchase_update_stok() TO service_role;

GRANT EXECUTE ON FUNCTION public.trg_visit_completed_process_costing() TO service_role;

GRANT EXECUTE ON FUNCTION public.update_updated_at() TO anon;

GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_updated_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon;

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

GRANT EXECUTE ON FUNCTION public.users_guard_sensitive() TO service_role;

GRANT EXECUTE ON FUNCTION public.users_sync_clinic_claim() TO service_role;

GRANT EXECUTE ON FUNCTION public.users_sync_status() TO anon;

GRANT EXECUTE ON FUNCTION public.users_sync_status() TO authenticated;

GRANT EXECUTE ON FUNCTION public.users_sync_status() TO service_role;
CREATE INDEX idx_announcements_window ON platform.announcements USING btree (starts_at, ends_at);
CREATE INDEX idx_announcements_created_by ON platform.announcements USING btree (created_by);
CREATE INDEX idx_platform_audit_created ON platform.audit_logs USING btree (created_at DESC);
CREATE INDEX idx_platform_audit_operator ON platform.audit_logs USING btree (operator_id, created_at DESC);
CREATE INDEX idx_platform_audit_clinic ON platform.audit_logs USING btree (clinic_id, created_at DESC);
CREATE INDEX idx_platform_audit_action ON platform.audit_logs USING btree (action, created_at DESC);
CREATE INDEX idx_clinic_notes_clinic ON platform.clinic_notes USING btree (clinic_id, created_at DESC);
CREATE INDEX idx_clinic_notes_operator_id ON platform.clinic_notes USING btree (operator_id);
CREATE INDEX idx_invoices_clinic ON platform.invoices USING btree (clinic_id, created_at DESC);
CREATE INDEX idx_invoices_status_due ON platform.invoices USING btree (status, due_date);
CREATE INDEX idx_invoices_created_by ON platform.invoices USING btree (created_by);
CREATE INDEX idx_operators_invited_by ON platform.operators USING btree (invited_by);
CREATE UNIQUE INDEX uq_payments_provider_ref ON platform.payments USING btree (provider, provider_ref) WHERE (provider_ref IS NOT NULL);
CREATE INDEX idx_payments_invoice ON platform.payments USING btree (invoice_id);
CREATE INDEX idx_payments_clinic ON platform.payments USING btree (clinic_id, created_at DESC);
CREATE INDEX idx_payments_confirmed_by ON platform.payments USING btree (confirmed_by);
CREATE INDEX idx_usage_daily_date ON platform.usage_daily USING btree (date DESC);
CREATE INDEX ai_feedback_clinic_idx ON public.ai_feedback USING btree (clinic_id, created_at DESC);
CREATE INDEX ai_knowledge_norm_trgm ON public.ai_knowledge USING gin (question_norm gin_trgm_ops);
CREATE INDEX idx_ai_usage_clinic_created ON public.ai_usage USING btree (clinic_id, created_at DESC);
CREATE INDEX idx_ai_usage_user ON public.ai_usage USING btree (user_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp" DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX idx_audit_logs_patient_id ON public.audit_logs USING btree (patient_id);
CREATE INDEX idx_audit_logs_visit_id ON public.audit_logs USING btree (visit_id);
CREATE INDEX booking_requests_clinic_status_idx ON public.booking_requests USING btree (clinic_id, status, created_at DESC);
CREATE INDEX idx_booking_requests_dokter_id ON public.booking_requests USING btree (dokter_id);
CREATE INDEX idx_booking_requests_handled_by ON public.booking_requests USING btree (handled_by);
CREATE INDEX idx_clinic_settings_key ON public.clinic_settings USING btree (key);
CREATE UNIQUE INDEX uq_clinic_subscriptions_current ON public.clinic_subscriptions USING btree (clinic_id) WHERE ((status)::text = ANY ((ARRAY['trialing'::character varying, 'active'::character varying, 'past_due'::character varying])::text[]));
CREATE INDEX idx_clinic_subscriptions_plan_id ON public.clinic_subscriptions USING btree (plan_id);
CREATE INDEX idx_clinical_data_clinic_id ON public.clinical_data USING btree (clinic_id);
CREATE INDEX idx_clinics_status ON public.clinics USING btree (status);
CREATE INDEX idx_clinics_trial_ends ON public.clinics USING btree (trial_ends_at) WHERE (status = 'trial'::text);
CREATE INDEX idx_clinics_owner_user_id ON public.clinics USING btree (owner_user_id);
CREATE INDEX idx_data_subject_requests_clinic ON public.data_subject_requests USING btree (clinic_id);
CREATE INDEX idx_data_subject_requests_patient ON public.data_subject_requests USING btree (patient_id);
CREATE INDEX idx_data_subject_requests_status ON public.data_subject_requests USING btree (status);
CREATE INDEX idx_data_subject_requests_handled_by ON public.data_subject_requests USING btree (handled_by);
CREATE INDEX idx_doctor_schedules_hari ON public.doctor_schedules USING btree (hari, is_active);
CREATE INDEX idx_doctor_schedules_dokter ON public.doctor_schedules USING btree (dokter_id);
CREATE INDEX idx_doctor_schedules_clinic_id ON public.doctor_schedules USING btree (clinic_id);
CREATE INDEX idx_expenses_date ON public.expenses USING btree (tanggal_expense);
CREATE INDEX idx_expenses_kategori ON public.expenses USING btree (kategori);
CREATE INDEX idx_expenses_recorded_by ON public.expenses USING btree (recorded_by);
CREATE INDEX idx_expenses_clinic_id ON public.expenses USING btree (clinic_id);
CREATE INDEX expenses_clinic_tanggal_idx ON public.expenses USING btree (clinic_id, tanggal_expense DESC);
CREATE INDEX idx_extra_oral_patient ON public.extra_oral_data USING btree (patient_id);
CREATE INDEX idx_extra_oral_data_clinic_id ON public.extra_oral_data USING btree (clinic_id);
CREATE INDEX idx_financial_reports_date ON public.financial_reports USING btree (report_date);
CREATE INDEX idx_financial_reports_generated_by ON public.financial_reports USING btree (generated_by);
CREATE INDEX idx_financial_reports_clinic_id ON public.financial_reports USING btree (clinic_id);
CREATE INDEX idx_informed_consents_patient_id ON public.informed_consents USING btree (patient_id);
CREATE INDEX idx_informed_consents_visit_id ON public.informed_consents USING btree (visit_id);
CREATE INDEX idx_informed_consents_clinic ON public.informed_consents USING btree (clinic_id);
CREATE INDEX idx_intra_oral_data_patient_id ON public.intra_oral_data USING btree (patient_id);
CREATE INDEX idx_intra_oral_data_clinic_id ON public.intra_oral_data USING btree (clinic_id);
CREATE INDEX idx_invoice_counters_month ON public.invoice_counters USING btree (month_key);
CREATE INDEX idx_invoice_counters_clinic_id ON public.invoice_counters USING btree (clinic_id);
CREATE INDEX idx_master_bahan_kategori ON public.master_bahan USING btree (kategori);
CREATE INDEX idx_master_bahan_aktif ON public.master_bahan USING btree (is_active);
CREATE INDEX idx_master_bahan_clinic ON public.master_bahan USING btree (clinic_id);
CREATE INDEX idx_master_obat_clinic_id ON public.master_obat USING btree (clinic_id);
CREATE INDEX idx_material_batches_material ON public.material_batches USING btree (material_id);
CREATE INDEX idx_material_batches_expiry ON public.material_batches USING btree (tanggal_kadaluarsa) WHERE (tanggal_kadaluarsa IS NOT NULL);
CREATE INDEX idx_material_batches_clinic ON public.material_batches USING btree (clinic_id);
CREATE INDEX idx_material_purchases_material ON public.material_purchases USING btree (material_id);
CREATE INDEX idx_material_purchases_tanggal ON public.material_purchases USING btree (tanggal DESC);
CREATE INDEX idx_material_purchases_clinic ON public.material_purchases USING btree (clinic_id);
CREATE INDEX idx_material_purchases_recorded_by ON public.material_purchases USING btree (recorded_by);
CREATE INDEX idx_medical_history_clinic_id ON public.medical_history USING btree (clinic_id);
CREATE INDEX idx_mrv_visit_version ON public.medical_record_versions USING btree (visit_id, version DESC);
CREATE INDEX idx_mrv_patient ON public.medical_record_versions USING btree (patient_id);
CREATE INDEX idx_medical_record_versions_changed_by ON public.medical_record_versions USING btree (changed_by);
CREATE INDEX idx_medical_record_versions_clinic_id ON public.medical_record_versions USING btree (clinic_id);
CREATE INDEX idx_notification_logs_patient_id ON public.notification_logs USING btree (patient_id);
CREATE INDEX idx_notification_logs_visit_id ON public.notification_logs USING btree (visit_id);
CREATE INDEX idx_notification_logs_triggered_by ON public.notification_logs USING btree (triggered_by);
CREATE INDEX idx_notification_logs_clinic_id ON public.notification_logs USING btree (clinic_id);
CREATE INDEX idx_odontogram_meta_patient_id ON public.odontogram_meta USING btree (patient_id);
CREATE INDEX idx_odontogram_meta_clinic_id ON public.odontogram_meta USING btree (clinic_id);
CREATE INDEX idx_overhead_costs_clinic ON public.overhead_costs USING btree (clinic_id);
CREATE INDEX idx_overhead_target_periode ON public.overhead_monthly_target USING btree (periode DESC);
CREATE INDEX idx_overhead_monthly_target_clinic ON public.overhead_monthly_target USING btree (clinic_id);
CREATE INDEX idx_overhead_monthly_target_created_by ON public.overhead_monthly_target USING btree (created_by);
CREATE INDEX idx_patient_media_patient_id ON public.patient_media USING btree (patient_id);
CREATE INDEX idx_patient_media_visit_id ON public.patient_media USING btree (visit_id);
CREATE INDEX idx_patient_media_deleted_by ON public.patient_media USING btree (deleted_by);
CREATE INDEX idx_patient_media_clinic_id ON public.patient_media USING btree (clinic_id);
CREATE INDEX idx_patient_referrals_patient_id ON public.patient_referrals USING btree (patient_id);
CREATE INDEX idx_patient_referrals_visit_id ON public.patient_referrals USING btree (visit_id);
CREATE INDEX idx_patient_referrals_deleted_by ON public.patient_referrals USING btree (deleted_by);
CREATE INDEX idx_patient_referrals_clinic_id ON public.patient_referrals USING btree (clinic_id);
CREATE INDEX idx_patient_visits_patient_id ON public.patient_visits USING btree (patient_id);
CREATE INDEX idx_patient_visits_clinic ON public.patient_visits USING btree (clinic_id);
CREATE UNIQUE INDEX idx_patients_satusehat_id ON public.patients USING btree (satusehat_patient_id) WHERE (satusehat_patient_id IS NOT NULL);
CREATE INDEX idx_patients_registered_by ON public.patients USING btree (registered_by);
CREATE INDEX idx_patients_deleted_by ON public.patients USING btree (deleted_by);
CREATE INDEX idx_payments_patient ON public.payments USING btree (patient_id);
CREATE INDEX idx_payments_date ON public.payments USING btree (tanggal_pembayaran);
CREATE INDEX idx_payments_status ON public.payments USING btree (status_pembayaran);
CREATE INDEX idx_payments_status_date ON public.payments USING btree (status_pembayaran, tanggal_pembayaran);
CREATE INDEX idx_payments_visit_id ON public.payments USING btree (visit_id);
CREATE INDEX idx_payments_processed_by ON public.payments USING btree (processed_by);
CREATE INDEX idx_payments_clinic_id ON public.payments USING btree (clinic_id);
CREATE INDEX idx_periodontal_patient ON public.periodontal_data USING btree (patient_id);
CREATE INDEX idx_periodontal_data_clinic_id ON public.periodontal_data USING btree (clinic_id);
CREATE INDEX queue_display_links_clinic_idx ON public.queue_display_links USING btree (clinic_id);
CREATE INDEX idx_queue_display_links_created_by ON public.queue_display_links USING btree (created_by);
CREATE INDEX recall_contacts_clinic_patient_idx ON public.recall_contacts USING btree (clinic_id, patient_id, created_at DESC);
CREATE INDEX idx_reminder_logs_visit_id ON public.reminder_logs USING btree (visit_id);
CREATE INDEX idx_reminder_logs_type_sent ON public.reminder_logs USING btree (visit_id, reminder_type);
CREATE INDEX idx_reminder_logs_clinic ON public.reminder_logs USING btree (clinic_id);
CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);
CREATE INDEX idx_satusehat_consents_clinic ON public.satusehat_consents USING btree (clinic_id);
CREATE INDEX idx_satusehat_consents_patient_id ON public.satusehat_consents USING btree (patient_id);
CREATE INDEX idx_satusehat_consents_recorded_by ON public.satusehat_consents USING btree (recorded_by);
CREATE INDEX idx_satusehat_locations_clinic_id ON public.satusehat_locations USING btree (clinic_id);
CREATE INDEX idx_outbox_status_retry ON public.satusehat_outbox USING btree (status, next_retry_at);
CREATE INDEX idx_outbox_visit ON public.satusehat_outbox USING btree (related_visit_id);
CREATE INDEX idx_outbox_clinic ON public.satusehat_outbox USING btree (clinic_id);
CREATE INDEX idx_satusehat_outbox_triggered_by ON public.satusehat_outbox USING btree (triggered_by);
CREATE INDEX idx_satusehat_outbox_related_patient_id ON public.satusehat_outbox USING btree (related_patient_id);
CREATE INDEX idx_soap_templates_clinic ON public.soap_templates USING btree (clinic_id);
CREATE INDEX idx_stok_movements_material ON public.stok_movements USING btree (material_id, created_at DESC);
CREATE INDEX idx_stok_movements_referensi ON public.stok_movements USING btree (referensi_tipe, referensi_id);
CREATE INDEX idx_stok_movements_clinic ON public.stok_movements USING btree (clinic_id);
CREATE INDEX idx_stok_movements_created_by ON public.stok_movements USING btree (created_by);
CREATE INDEX idx_stok_opname_material ON public.stok_opname USING btree (material_id, tanggal DESC);
CREATE INDEX idx_stok_opname_clinic ON public.stok_opname USING btree (clinic_id);
CREATE INDEX idx_stok_opname_dilakukan_oleh ON public.stok_opname USING btree (dilakukan_oleh);
CREATE INDEX idx_tier_weights_clinic ON public.tier_weights USING btree (clinic_id);
CREATE INDEX idx_tier_weights_updated_by ON public.tier_weights USING btree (updated_by);
CREATE INDEX idx_tooth_conditions_patient ON public.tooth_conditions USING btree (patient_id);
CREATE INDEX idx_tooth_conditions_tooth ON public.tooth_conditions USING btree (tooth_number);
CREATE INDEX idx_tooth_conditions_recorded_by ON public.tooth_conditions USING btree (recorded_by);
CREATE INDEX idx_tooth_conditions_clinic_id ON public.tooth_conditions USING btree (clinic_id);
CREATE INDEX idx_cost_snapshot_visit_treatment ON public.treatment_cost_snapshot USING btree (visit_treatment_id);
CREATE INDEX idx_cost_snapshot_created ON public.treatment_cost_snapshot USING btree (created_at DESC);
CREATE INDEX idx_treatment_cost_snapshot_clinic ON public.treatment_cost_snapshot USING btree (clinic_id);
CREATE INDEX idx_treatment_education_clinic ON public.treatment_education USING btree (clinic_id);
CREATE INDEX idx_treatment_education_templates_last_updated_by ON public.treatment_education_templates USING btree (last_updated_by);
CREATE INDEX idx_treatment_education_templates_clinic_id ON public.treatment_education_templates USING btree (clinic_id);
CREATE INDEX idx_treatment_materials_treatment ON public.treatment_materials USING btree (treatment_id);
CREATE INDEX idx_treatment_materials_material ON public.treatment_materials USING btree (material_id);
CREATE INDEX idx_treatment_materials_clinic ON public.treatment_materials USING btree (clinic_id);
CREATE INDEX idx_treatment_plans_patient ON public.treatment_plans USING btree (patient_id);
CREATE INDEX idx_treatment_plans_patient_prio ON public.treatment_plans USING btree (patient_id, prioritas);
CREATE INDEX idx_treatment_plans_created_by ON public.treatment_plans USING btree (created_by);
CREATE INDEX idx_treatment_plans_clinic_id ON public.treatment_plans USING btree (clinic_id);
CREATE INDEX idx_treatments_clinic ON public.treatments USING btree (clinic_id);
CREATE INDEX idx_user_permissions_permission_id ON public.user_permissions USING btree (permission_id);
CREATE UNIQUE INDEX idx_users_satusehat_practitioner_id ON public.users USING btree (satusehat_practitioner_id) WHERE (satusehat_practitioner_id IS NOT NULL);
CREATE INDEX idx_users_clinic_status ON public.users USING btree (clinic_id, status);
CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);
CREATE INDEX idx_users_invited_by ON public.users USING btree (invited_by);
CREATE INDEX idx_visit_obat_visit_id ON public.visit_obat USING btree (visit_id);
CREATE INDEX idx_visit_obat_obat_id ON public.visit_obat USING btree (obat_id);
CREATE INDEX idx_visit_obat_master_bahan_id ON public.visit_obat USING btree (master_bahan_id);
CREATE INDEX idx_visit_obat_clinic_id ON public.visit_obat USING btree (clinic_id);
CREATE INDEX idx_visit_treatment_material_overrides_clinic ON public.visit_treatment_material_overrides USING btree (clinic_id);
CREATE INDEX idx_visit_treatment_material_overrides_material_id ON public.visit_treatment_material_overrides USING btree (material_id);
CREATE INDEX idx_visit_treatment_material_overrides_created_by ON public.visit_treatment_material_overrides USING btree (created_by);
CREATE INDEX idx_visit_treatments_visit ON public.visit_treatments USING btree (visit_id);
CREATE INDEX idx_visit_treatments_treatment ON public.visit_treatments USING btree (treatment_id);
CREATE INDEX idx_visit_treatments_clinic ON public.visit_treatments USING btree (clinic_id);
CREATE INDEX idx_visits_date ON public.visits USING btree (tanggal_kunjungan);
CREATE INDEX idx_visits_date_status ON public.visits USING btree (tanggal_kunjungan, status);
CREATE INDEX idx_visits_dokter_tanggal ON public.visits USING btree (dokter_id, tanggal_kunjungan DESC);
CREATE INDEX idx_visits_tanggal_desc ON public.visits USING btree (tanggal_kunjungan DESC);
CREATE INDEX idx_visits_patient_number ON public.visits USING btree (patient_id, visit_number);
CREATE INDEX idx_visits_dokter_date ON public.visits USING btree (dokter_id, tanggal_kunjungan);
CREATE INDEX idx_visits_date_jam ON public.visits USING btree (tanggal_kunjungan, jam_kunjungan) WHERE (jam_kunjungan IS NOT NULL);
CREATE INDEX idx_visits_patient_id ON public.visits USING btree (patient_id);
CREATE INDEX idx_visits_is_locked ON public.visits USING btree (is_locked);
CREATE UNIQUE INDEX visits_unique_slot_idx ON public.visits USING btree (dokter_id, tanggal_kunjungan, jam_kunjungan) WHERE ((status)::text <> 'cancelled'::text);
CREATE INDEX idx_visits_deleted_by ON public.visits USING btree (deleted_by);
CREATE INDEX idx_visits_locked_by ON public.visits USING btree (locked_by);
CREATE INDEX idx_visits_clinic_id ON public.visits USING btree (clinic_id);
set check_function_bodies=on;
-- Fresh LOCAL test key. It is never exported from production.
insert into private.encryption_keys(key_name,key_value) values('master_key',encode(extensions.gen_random_bytes(32),'hex')) on conflict do nothing;
insert into storage.buckets(id,name,public) values('radiologi','radiologi',false),('klinik','klinik',false),('patient-photos','patient-photos',false),('avatars','avatars',true) on conflict do nothing;
grant usage on schema private to service_role;

-- Fixture catalog only, generated locally (not production rows).
insert into public.clinics(id,name,slug,status) values('d0000000-0000-0000-0000-000000000000','Fixture default','fixture-default','active');
insert into public.tier_weights(clinic_id,tier,label,bobot) values('d0000000-0000-0000-0000-000000000000','ringan','Ringan',1),('d0000000-0000-0000-0000-000000000000','sedang','Sedang',2),('d0000000-0000-0000-0000-000000000000','berat','Berat',3);
insert into public.subscription_plans(name,price_monthly,price_yearly,max_users,max_patients,features) values('Starter',299000,2990000,3,1000,'{}'),('Pro',599000,5990000,10,5000,'{"ai_assistant":true}');
