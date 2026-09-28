-- ============================================================
--  NeuroDent — Migration Part 5A-1
--  Tabel: doctor_schedules
--  Dibuat: 2026
-- ============================================================

-- ------------------------------------------------------------
--  1. BUAT TABEL
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    dokter_id     UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
    hari          SMALLINT      NOT NULL CHECK (hari BETWEEN 0 AND 6),

    jam_mulai     TIME          NOT NULL,
    jam_selesai   TIME          NOT NULL,

    -- Pastikan jam_selesai lebih besar dari jam_mulai
    CONSTRAINT chk_jam CHECK (jam_selesai > jam_mulai),

    -- Keterangan tambahan (opsional), mis. "Poli Ortodonsi"
    keterangan    TEXT,

    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,

    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Satu dokter tidak boleh punya dua jadwal di hari yang sama
    UNIQUE (dokter_id, hari)
);

-- ------------------------------------------------------------
--  2. INDEX — untuk query getActiveSchedulesByDay()
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_hari
    ON public.doctor_schedules (hari, is_active);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_dokter
    ON public.doctor_schedules (dokter_id);

-- ------------------------------------------------------------
--  3. TRIGGER — auto-update updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Hapus trigger lama jika sudah ada (safe re-run)
DROP TRIGGER IF EXISTS trg_doctor_schedules_updated_at ON public.doctor_schedules;

CREATE TRIGGER trg_doctor_schedules_updated_at
    BEFORE UPDATE ON public.doctor_schedules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
--  4. AKTIFKAN ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama agar migration bisa dijalankan ulang
DROP POLICY IF EXISTS "schedules_select_all_staff"  ON public.doctor_schedules;
DROP POLICY IF EXISTS "schedules_insert_admin"       ON public.doctor_schedules;
DROP POLICY IF EXISTS "schedules_update_admin"       ON public.doctor_schedules;
DROP POLICY IF EXISTS "schedules_delete_admin"       ON public.doctor_schedules;

-- 4a. SELECT — semua staff (admin, dokter, resepsionis) boleh membaca jadwal
CREATE POLICY "schedules_select_all_staff"
    ON public.doctor_schedules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id   = auth.uid()
              AND role IN ('admin', 'dokter', 'resepsionis')
              AND is_active = TRUE
        )
    );

-- 4b. INSERT — hanya admin yang boleh menambah jadwal
CREATE POLICY "schedules_insert_admin"
    ON public.doctor_schedules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id   = auth.uid()
              AND role = 'admin'
              AND is_active = TRUE
        )
    );

-- 4c. UPDATE — hanya admin yang boleh mengubah jadwal
CREATE POLICY "schedules_update_admin"
    ON public.doctor_schedules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id   = auth.uid()
              AND role = 'admin'
              AND is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id   = auth.uid()
              AND role = 'admin'
              AND is_active = TRUE
        )
    );

-- 4d. DELETE — hanya admin yang boleh menghapus jadwal
CREATE POLICY "schedules_delete_admin"
    ON public.doctor_schedules
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id   = auth.uid()
              AND role = 'admin'
              AND is_active = TRUE
        )
    );

-- ------------------------------------------------------------
--  5. DATA SEED (opsional — hapus jika tidak perlu)
--     Contoh: isi jadwal setelah tabel dokter sudah ada data.
--     Uncomment dan sesuaikan UUID dokter jika ingin seed awal.
-- ------------------------------------------------------------

-- INSERT INTO public.doctor_schedules (dokter_id, hari, jam_mulai, jam_selesai, keterangan)
-- VALUES
--   ('UUID-DOKTER-1', 1, '08:00', '12:00', 'Poli Umum'),
--   ('UUID-DOKTER-1', 3, '13:00', '17:00', 'Poli Umum'),
--   ('UUID-DOKTER-2', 2, '09:00', '15:00', 'Ortodonsi'),
--   ('UUID-DOKTER-2', 4, '09:00', '15:00', 'Ortodonsi')
-- ON CONFLICT (dokter_id, hari) DO NOTHING;

-- ------------------------------------------------------------
--  6. VERIFIKASI (jalankan setelah migration untuk cek)
-- ------------------------------------------------------------
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'doctor_schedules'
-- ORDER BY ordinal_position;

-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'doctor_schedules';
