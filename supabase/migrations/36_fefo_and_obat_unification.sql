-- ============================================================================
-- MIGRATION 36: FEFO & Obat Unification
-- ============================================================================

-- 1. Tambahkan kolom pendukung obat ke master_bahan
ALTER TABLE public.master_bahan 
  ADD COLUMN IF NOT EXISTS dosis_default TEXT,
  ADD COLUMN IF NOT EXISTS frekuensi_default TEXT,
  ADD COLUMN IF NOT EXISTS education_text TEXT;

-- 2. Memigrasi data dari master_obat ke master_bahan
-- Kita generate kode bahan khusus agar tidak bentrok (misal OBT-[id_awal])
INSERT INTO public.master_bahan (
  id, kode_bahan, nama_bahan, kategori, satuan_dasar, satuan_beli, 
  faktor_konversi, stok_minimum, stok_saat_ini, harga_rata2, 
  dosis_default, frekuensi_default, education_text, is_active
)
SELECT 
  id, -- Pertahankan ID asli agar relasi yang akan dibangun (visit_obat) tetap sinkron
  'OBT-' || SUBSTRING(id::TEXT, 1, 6),
  nama_obat, 
  'Obat', 
  COALESCE(satuan, 'pcs'), 
  COALESCE(satuan, 'pcs'), 
  1, 
  5, 
  0, -- Stok default 0 (karena master_obat lama tidak mencatat stok real-time)
  COALESCE(harga_satuan, 0),
  dosis_default, 
  frekuensi_default, 
  education_text, 
  is_active
FROM public.master_obat
ON CONFLICT (id) DO NOTHING;

-- 3. Modifikasi tabel visit_obat agar merujuk ke master_bahan
ALTER TABLE public.visit_obat 
  ADD COLUMN IF NOT EXISTS master_bahan_id UUID REFERENCES public.master_bahan(id);

-- Salin referensi dari obat_id ke master_bahan_id (karena ID-nya dipertahankan sama)
UPDATE public.visit_obat SET master_bahan_id = obat_id WHERE master_bahan_id IS NULL;

-- 4. Perbarui RLS untuk visit_obat agar menyesuaikan jika diperlukan
-- RLS tidak perlu diubah signifikan karena role yang mengaksesnya sama.
-- Tapi kita bisa drop FK ke master_obat
-- ALTER TABLE public.visit_obat DROP CONSTRAINT IF EXISTS visit_obat_obat_id_fkey;
-- Kita biarkan dulu kolom obat_id (sebagai legacy) atau boleh didelete kalau FE sudah fully migrated.
-- Amannya biarkan saja, tapi aplikasi diarahkan pakai master_bahan_id.

-- 5. Perbarui fungsi `fn_proses_stok_dan_snapshot_visit_treatment` untuk FEFO
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
