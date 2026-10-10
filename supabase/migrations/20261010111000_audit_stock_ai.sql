-- Preserve cost snapshots, isolate tenant costing and serialize inventory changes.
CREATE OR REPLACE FUNCTION public.fn_proses_stok_dan_snapshot_visit_treatment(p_visit_treatment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_treatment_id      UUID;
  v_clinic UUID; v_quantity INTEGER;
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
  SELECT vt.treatment_id, t.tier, vt.harga_satuan * vt.quantity, vt.clinic_id, vt.quantity
    INTO v_treatment_id, v_tier, v_harga_jual, v_clinic, v_quantity
  FROM public.visit_treatments vt
  JOIN public.treatments t ON t.id = vt.treatment_id
  WHERE vt.id = p_visit_treatment_id AND t.clinic_id=vt.clinic_id FOR UPDATE OF vt;
  IF EXISTS (SELECT 1 FROM public.treatment_cost_snapshot WHERE visit_treatment_id=p_visit_treatment_id) THEN RETURN; END IF;
  IF v_quantity IS NULL OR v_quantity < 1 THEN RAISE EXCEPTION 'Jumlah tindakan tidak valid'; END IF;

  IF v_treatment_id IS NULL THEN
    RAISE EXCEPTION 'visit_treatment_id % tidak ditemukan', p_visit_treatment_id;
  END IF;

  -- Ambil bobot tier
  SELECT bobot INTO v_bobot FROM public.tier_weights WHERE tier = v_tier AND clinic_id=v_clinic;
  v_bobot := COALESCE(v_bobot, 1);

  -- Ambil overhead_per_unit_bobot dari target bulan berjalan
  SELECT overhead_per_unit_bobot INTO v_overhead_per_unit
  FROM public.overhead_monthly_target
  WHERE periode = date_trunc('month', now() at time zone 'Asia/Jakarta')::DATE AND clinic_id=v_clinic;

  v_overhead_per_unit := COALESCE(v_overhead_per_unit, 0);
  v_overhead_allocated := v_bobot * v_overhead_per_unit * v_quantity;

  -- Loop tiap bahan di BOM treatment ini
  FOR r IN
    SELECT tm.material_id, tm.qty_rata2, tm.wastage_percent, tm.wajib,
           mb.nama_bahan, mb.harga_rata2, mb.stok_saat_ini
    FROM public.treatment_materials tm
    JOIN public.master_bahan mb ON mb.id = tm.material_id
    WHERE tm.treatment_id = v_treatment_id AND tm.wajib = true AND tm.clinic_id=v_clinic AND mb.clinic_id=v_clinic
    ORDER BY mb.id FOR UPDATE OF mb
  LOOP
    -- Cek qty aktual
    SELECT qty_aktual INTO v_qty_pakai
    FROM public.visit_treatment_material_overrides
    WHERE visit_treatment_id = p_visit_treatment_id AND material_id = r.material_id AND clinic_id=v_clinic;

    IF v_qty_pakai IS NULL THEN
      v_qty_pakai := r.qty_rata2 * (1 + COALESCE(r.wastage_percent, 0) / 100.0) * v_quantity;
    END IF;

    IF v_qty_pakai < 0 THEN RAISE EXCEPTION 'Kuantitas bahan tidak valid'; END IF;
    -- Potong FEFO pada material_batches
    v_sisa_potong := v_qty_pakai;
    FOR batch_r IN 
      SELECT id, qty_sisa FROM public.material_batches 
      WHERE material_id = r.material_id AND clinic_id=v_clinic AND qty_sisa > 0 
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
      (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu, catatan)
    VALUES
      (v_clinic, r.material_id, 'keluar', -v_qty_pakai, v_stok_sebelum, v_stok_sesudah,
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
    (clinic_id, visit_treatment_id, tier_saat_itu, bobot_saat_itu, overhead_per_unit_bobot,
     overhead_allocated, total_biaya_bahan, detail_bahan, harga_jual_saat_itu)
  VALUES
    (v_clinic, p_visit_treatment_id, v_tier, v_bobot, v_overhead_per_unit,
     v_overhead_allocated, v_total_bahan, v_detail_bahan, COALESCE(v_harga_jual, 0))
  ON CONFLICT (visit_treatment_id) DO NOTHING;
END;
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
  FROM public.master_bahan WHERE id = NEW.material_id AND clinic_id=NEW.clinic_id FOR UPDATE;
  IF NOT FOUND OR NEW.jumlah_dasar <= 0 THEN RAISE EXCEPTION 'Pembelian bahan tidak valid'; END IF;

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
    (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu)
  VALUES
    (NEW.clinic_id, NEW.material_id, 'masuk', NEW.jumlah_dasar, v_stok_sebelum, v_stok_sesudah,
     'purchase', NEW.id, NEW.total_harga / NULLIF(NEW.jumlah_dasar, 0));

  RETURN NEW;
END;
$function$
;
revoke all on function public.fn_proses_stok_dan_snapshot_visit_treatment(uuid),public.trg_purchase_update_stok() from public,anon,authenticated;

-- Only deterministic static guides can be reused without checking current data.
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
      when cardinality(u.tools_used) = 0 and u.model like 'jawaban-cepat:panduan:%'
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
update public.ai_knowledge k set kind='data' where kind='panduan' and not exists(select 1 from public.ai_usage u where u.id=k.source_usage_id and u.model like 'jawaban-cepat:panduan:%' and cardinality(u.tools_used)=0);
