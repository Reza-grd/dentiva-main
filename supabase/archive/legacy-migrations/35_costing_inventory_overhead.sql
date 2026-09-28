-- ============================================================================
-- MIGRATION 35: SISTEM COSTING PERAWATAN & GUDANG BAHAN HABIS PAKAI
-- ============================================================================
-- Tujuan:
--   1. Alokasi biaya operasional (overhead) ke tiap perawatan berbasis tier/bobot
--   2. Resep bahan (BOM) per perawatan
--   3. Gudang bahan habis pakai dengan kartu stok & sinkronisasi otomatis
--   4. Snapshot modal per transaksi (tidak berubah walau harga/bobot diedit nanti)
--
-- Keputusan desain yang sudah disepakati (lihat diskusi produk):
--   - Alokasi overhead: berbasis tier (Ringan/Sedang/Berat), bobot dikonfigurasi admin
--   - Target total bobot bulanan di-set manual per periode (tidak dihitung ulang real-time)
--   - Potong stok: saat kunjungan dicatat SELESAI, dengan opsi override qty aktual
--   - Metode harga stok: rata-rata tertimbang (weighted average cost)
--   - Histori biaya: pakai snapshot per visit_treatment
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TIER & BOBOT ALOKASI OVERHEAD
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tier_weights (
  tier        TEXT PRIMARY KEY CHECK (tier IN ('ringan', 'sedang', 'berat')),
  label       TEXT NOT NULL,
  bobot       NUMERIC(10,2) NOT NULL CHECK (bobot > 0),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES public.users(id)
);

INSERT INTO public.tier_weights (tier, label, bobot) VALUES
  ('ringan', 'Ringan', 1),
  ('sedang', 'Sedang', 2),
  ('berat',  'Berat',  4)
ON CONFLICT (tier) DO NOTHING;

-- Tambahkan kolom tier ke master treatments yang sudah ada
ALTER TABLE public.treatments
  ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('ringan', 'sedang', 'berat')) DEFAULT 'sedang';


-- ----------------------------------------------------------------------------
-- 2. BIAYA OPERASIONAL (OVERHEAD) BULANAN
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.overhead_costs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_biaya     TEXT NOT NULL,                 -- "Listrik", "Sewa Gedung", dst
  kategori       TEXT,                          -- "Utilitas", "Sewa", "Gaji Non-Medis", dst
  jumlah_bulanan NUMERIC(15,2) NOT NULL DEFAULT 0,
  aktif          BOOLEAN DEFAULT true,
  catatan        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Target bobot & total overhead per periode (dikunci per bulan, admin kalibrasi tiap awal bulan)
CREATE TABLE IF NOT EXISTS public.overhead_monthly_target (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periode                 DATE NOT NULL,        -- selalu tanggal 1, mis. '2026-08-01'
  total_overhead_bulanan  NUMERIC(15,2) NOT NULL,   -- boleh override manual dari SUM(overhead_costs)
  total_bobot_estimasi    NUMERIC(10,2) NOT NULL,   -- hasil estimasi jumlah treatment x bobot tier
  overhead_per_unit_bobot NUMERIC(15,4) GENERATED ALWAYS AS
    (CASE WHEN total_bobot_estimasi > 0 THEN total_overhead_bulanan / total_bobot_estimasi ELSE 0 END) STORED,
  catatan                 TEXT,
  created_by              UUID REFERENCES public.users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (periode)
);

CREATE INDEX IF NOT EXISTS idx_overhead_target_periode ON public.overhead_monthly_target(periode DESC);


-- ----------------------------------------------------------------------------
-- 3. MASTER BAHAN & GUDANG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.master_bahan (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_bahan        VARCHAR(50) UNIQUE NOT NULL,
  nama_bahan        TEXT NOT NULL,
  kategori          TEXT,                         -- "Consumable", "Obat", "Alat Sekali Pakai"
  satuan_dasar      TEXT NOT NULL,                 -- satuan pemakaian, mis. "pcs", "ml", "gr"
  satuan_beli       TEXT,                          -- satuan pembelian, mis. "box"
  faktor_konversi   NUMERIC(10,4) DEFAULT 1,        -- 1 satuan_beli = berapa satuan_dasar
  harga_rata2       NUMERIC(15,4) NOT NULL DEFAULT 0,  -- weighted average cost per satuan_dasar (auto-update)
  stok_saat_ini     NUMERIC(12,3) NOT NULL DEFAULT 0,  -- dalam satuan_dasar
  stok_minimum      NUMERIC(12,3) DEFAULT 0,           -- ambang alert reorder
  supplier          TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_bahan_kategori ON public.master_bahan(kategori);
CREATE INDEX IF NOT EXISTS idx_master_bahan_aktif ON public.master_bahan(is_active);

-- Batch/kadaluarsa bahan (opsional tapi disarankan untuk bahan medis) — FEFO
CREATE TABLE IF NOT EXISTS public.material_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id       UUID NOT NULL REFERENCES public.master_bahan(id) ON DELETE CASCADE,
  no_batch          TEXT,
  tanggal_masuk     DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_kadaluarsa DATE,
  qty_awal          NUMERIC(12,3) NOT NULL,
  qty_sisa          NUMERIC(12,3) NOT NULL,
  harga_satuan      NUMERIC(15,4) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_batches_material ON public.material_batches(material_id);
CREATE INDEX IF NOT EXISTS idx_material_batches_expiry ON public.material_batches(tanggal_kadaluarsa)
  WHERE tanggal_kadaluarsa IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. RESEP BAHAN PER PERAWATAN (BILL OF MATERIALS / BOM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_materials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id     UUID NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  material_id      UUID NOT NULL REFERENCES public.master_bahan(id) ON DELETE RESTRICT,
  qty_rata2        NUMERIC(12,4) NOT NULL CHECK (qty_rata2 > 0),  -- dalam satuan_dasar bahan
  wajib            BOOLEAN DEFAULT true,           -- false = opsional, tidak auto-potong
  wastage_percent  NUMERIC(5,2) DEFAULT 0 CHECK (wastage_percent >= 0 AND wastage_percent < 100),
  catatan          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (treatment_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_treatment_materials_treatment ON public.treatment_materials(treatment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_materials_material ON public.treatment_materials(material_id);

-- Override qty aktual per kunjungan (opsional — kalau kosong, pakai qty_rata2 dari BOM)
CREATE TABLE IF NOT EXISTS public.visit_treatment_material_overrides (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_treatment_id UUID NOT NULL REFERENCES public.visit_treatments(id) ON DELETE CASCADE,
  material_id        UUID NOT NULL REFERENCES public.master_bahan(id),
  qty_aktual         NUMERIC(12,4) NOT NULL CHECK (qty_aktual >= 0),
  catatan            TEXT,
  created_by         UUID REFERENCES public.users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (visit_treatment_id, material_id)
);


-- ----------------------------------------------------------------------------
-- 5. PEMBELIAN BAHAN (STOK MASUK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.material_purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id       UUID NOT NULL REFERENCES public.master_bahan(id),
  tanggal           DATE NOT NULL DEFAULT CURRENT_DATE,
  jumlah_beli       NUMERIC(12,3) NOT NULL CHECK (jumlah_beli > 0),  -- dalam satuan_beli
  jumlah_dasar      NUMERIC(12,3) NOT NULL,        -- hasil konversi ke satuan_dasar (jumlah_beli * faktor_konversi)
  harga_satuan_beli NUMERIC(15,2) NOT NULL,        -- harga per satuan_beli
  total_harga       NUMERIC(15,2) GENERATED ALWAYS AS (jumlah_beli * harga_satuan_beli) STORED,
  supplier          TEXT,
  no_faktur         TEXT,
  tanggal_kadaluarsa DATE,
  recorded_by       UUID REFERENCES public.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_purchases_material ON public.material_purchases(material_id);
CREATE INDEX IF NOT EXISTS idx_material_purchases_tanggal ON public.material_purchases(tanggal DESC);


-- ----------------------------------------------------------------------------
-- 6. KARTU STOK (LOG SEMUA PERGERAKAN — AUDIT TRAIL)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stok_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id    UUID NOT NULL REFERENCES public.master_bahan(id),
  tipe           TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar', 'penyesuaian', 'opname')),
  jumlah         NUMERIC(12,3) NOT NULL,   -- signed: masuk/penyesuaian(+) positif, keluar negatif
  stok_sebelum   NUMERIC(12,3) NOT NULL,
  stok_sesudah   NUMERIC(12,3) NOT NULL,
  referensi_tipe TEXT,                     -- 'purchase' | 'visit_treatment' | 'opname' | 'manual'
  referensi_id   UUID,                     -- id ke tabel terkait (purchase_id / visit_treatment_id / opname_id)
  harga_saat_itu NUMERIC(15,4),            -- dipakai untuk update rata-rata tertimbang saat masuk
  catatan        TEXT,
  created_by     UUID REFERENCES public.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stok_movements_material ON public.stok_movements(material_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stok_movements_referensi ON public.stok_movements(referensi_tipe, referensi_id);


-- ----------------------------------------------------------------------------
-- 7. STOK OPNAME (REKONSILIASI FISIK VS SISTEM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stok_opname (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
  material_id     UUID NOT NULL REFERENCES public.master_bahan(id),
  stok_sistem     NUMERIC(12,3) NOT NULL,
  stok_fisik      NUMERIC(12,3) NOT NULL,
  selisih         NUMERIC(12,3) GENERATED ALWAYS AS (stok_fisik - stok_sistem) STORED,
  catatan         TEXT,
  dilakukan_oleh  UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stok_opname_material ON public.stok_opname(material_id, tanggal DESC);


-- ----------------------------------------------------------------------------
-- 8. SNAPSHOT MODAL PER TREATMENT (HASIL AKHIR UNTUK LAPORAN PROFITABILITAS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treatment_cost_snapshot (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_treatment_id          UUID NOT NULL UNIQUE REFERENCES public.visit_treatments(id) ON DELETE CASCADE,
  tier_saat_itu               TEXT NOT NULL,
  bobot_saat_itu              NUMERIC(10,2) NOT NULL,
  overhead_per_unit_bobot     NUMERIC(15,4) NOT NULL,
  overhead_allocated          NUMERIC(15,2) NOT NULL,       -- bobot_saat_itu * overhead_per_unit_bobot
  total_biaya_bahan           NUMERIC(15,2) NOT NULL DEFAULT 0,
  detail_bahan                JSONB,                          -- breakdown: [{material_id, nama, qty, harga_satuan, subtotal}, ...]
  total_modal                 NUMERIC(15,2) GENERATED ALWAYS AS (overhead_allocated + total_biaya_bahan) STORED,
  harga_jual_saat_itu         NUMERIC(15,2) NOT NULL,
  margin                      NUMERIC(15,2) GENERATED ALWAYS AS
    (harga_jual_saat_itu - (overhead_allocated + total_biaya_bahan)) STORED,
  margin_percent              NUMERIC(6,2) GENERATED ALWAYS AS
    (CASE WHEN harga_jual_saat_itu > 0
      THEN ((harga_jual_saat_itu - (overhead_allocated + total_biaya_bahan)) / harga_jual_saat_itu) * 100
      ELSE 0 END) STORED,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_snapshot_visit_treatment ON public.treatment_cost_snapshot(visit_treatment_id);
CREATE INDEX IF NOT EXISTS idx_cost_snapshot_created ON public.treatment_cost_snapshot(created_at DESC);


-- ============================================================================
-- 9. FUNGSI & TRIGGER: OTOMATISASI SAAT KUNJUNGAN DICATAT SELESAI
-- ============================================================================
-- CATATAN PENTING: fungsi ini KOMPLEKS dan menyentuh data finansial + stok.
-- WAJIB diuji di environment staging dengan data dummy sebelum dipakai di
-- production. Beberapa keputusan bisnis yang masih perlu divalidasi manual:
--   - Apakah stok boleh minus (backorder) atau harus di-block? (saat ini: DIIZINKAN
--     minus dengan warning di log, TIDAK di-block, supaya operasional klinik
--     tidak terhenti hanya karena data gudang belum lengkap)
--   - Snapshot hanya dibuat SEKALI per visit_treatment (tidak akan re-generate
--     kalau visit_treatment diedit setelah completed — perlu keputusan terpisah
--     apakah edit setelah selesai diizinkan dan bagaimana penanganannya)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_proses_stok_dan_snapshot_visit_treatment(p_visit_treatment_id UUID)
RETURNS VOID AS $$
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
  v_qty_pakai          NUMERIC;
  v_stok_sebelum       NUMERIC;
  v_stok_sesudah       NUMERIC;
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

  -- Loop tiap bahan di BOM treatment ini, potong stok, hitung total biaya bahan
  FOR r IN
    SELECT tm.material_id, tm.qty_rata2, tm.wastage_percent, tm.wajib,
           mb.nama_bahan, mb.harga_rata2, mb.stok_saat_ini
    FROM public.treatment_materials tm
    JOIN public.master_bahan mb ON mb.id = tm.material_id
    WHERE tm.treatment_id = v_treatment_id AND tm.wajib = true
  LOOP
    -- Cek apakah ada override qty aktual untuk visit_treatment ini
    SELECT qty_aktual INTO v_qty_pakai
    FROM public.visit_treatment_material_overrides
    WHERE visit_treatment_id = p_visit_treatment_id AND material_id = r.material_id;

    IF v_qty_pakai IS NULL THEN
      v_qty_pakai := r.qty_rata2 * (1 + COALESCE(r.wastage_percent, 0) / 100.0);
    END IF;

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

  -- Simpan snapshot modal (idempotent: kalau sudah ada, jangan duplikat)
  INSERT INTO public.treatment_cost_snapshot
    (visit_treatment_id, tier_saat_itu, bobot_saat_itu, overhead_per_unit_bobot,
     overhead_allocated, total_biaya_bahan, detail_bahan, harga_jual_saat_itu)
  VALUES
    (p_visit_treatment_id, v_tier, v_bobot, v_overhead_per_unit,
     v_overhead_allocated, v_total_bahan, v_detail_bahan, COALESCE(v_harga_jual, 0))
  ON CONFLICT (visit_treatment_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Trigger di level visits: saat status berubah jadi 'completed', proses semua
-- visit_treatments di kunjungan tsb yang belum punya snapshot.
CREATE OR REPLACE FUNCTION public.trg_visit_completed_process_costing()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_visit_completed_costing ON public.visits;
CREATE TRIGGER trg_visit_completed_costing
  AFTER UPDATE ON public.visits
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_visit_completed_process_costing();


-- Trigger di material_purchases: update stok + harga rata-rata tertimbang saat stok masuk
CREATE OR REPLACE FUNCTION public.trg_purchase_update_stok()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_purchase_stok ON public.material_purchases;
CREATE TRIGGER trg_purchase_stok
  AFTER INSERT ON public.material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_purchase_update_stok();


-- ============================================================================
-- 10. ROW LEVEL SECURITY (mengikuti pola public.get_user_role() yang sudah ada)
-- ============================================================================
ALTER TABLE public.tier_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overhead_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overhead_monthly_target ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_bahan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_treatment_material_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_cost_snapshot ENABLE ROW LEVEL SECURITY;

-- Modul ini murni data finansial/operasional internal → HANYA admin yang boleh akses.
-- (Dokter/resepsionis tidak perlu melihat modal/harga beli bahan.)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tier_weights', 'overhead_costs', 'overhead_monthly_target', 'master_bahan',
    'material_batches', 'treatment_materials', 'visit_treatment_material_overrides',
    'material_purchases', 'stok_movements', 'stok_opname', 'treatment_cost_snapshot'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Admin full access %1$s" ON public.%1$s;',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Admin full access %1$s" ON public.%1$s FOR ALL USING (public.get_user_role() = ''admin'')',
      tbl
    );
  END LOOP;
END $$;

-- Fungsi berjalan sebagai SECURITY DEFINER agar trigger tetap bisa menulis stok/snapshot
-- walau dipicu oleh user dokter yang RLS-nya tidak punya akses langsung ke tabel gudang.
