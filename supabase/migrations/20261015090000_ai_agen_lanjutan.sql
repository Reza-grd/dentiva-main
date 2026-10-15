-- Denti Agen — kemampuan lanjutan (15 Okt 2026):
--   • Tindakan massal  : bahan_tambah_banyak (impor daftar), stok_masuk_banyak (satu nota/faktur banyak barang) — satu kartu, atomik.
--   • Buang stok       : batch_buang (kadaluarsa/rusak/hilang) → kartu stok 'penyesuaian' + batch dikurangi (FEFO), bisa dibatalkan.
--   • Analitik         : ringkasan_gudang, bahan_kadaluarsa, riwayat_harga_bahan (perbandingan pemasok), analisis_margin (HPP + overhead),
--                        anomali_pengeluaran (lonjakan, biaya rutin belum tercatat, kemungkinan ganda).
-- Semua tetap lewat usulan → persetujuan admin (lihat 20261014090000_ai_agen.sql). Fungsi baca hanya admin.

-- ═════════════ USULAN massal ═════════════
create or replace function public.ai_agent_p_bahan_tambah_banyak(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  it jsonb; i int := 0; r jsonb; errs jsonb := '[]'; items jsonb := '[]'; rinc jsonb := '[]'; warn jsonb := '[]'; names text[] := '{}'; nm text; n int; total_nilai numeric := 0;
begin
  if jsonb_typeof(a -> 'items') is distinct from 'array' then perform public.ai_agent_fail('"items" harus berupa daftar bahan.'); end if;
  n := jsonb_array_length(a -> 'items');
  if n = 0 or n > 100 then perform public.ai_agent_fail('Jumlah bahan per usulan harus 1–100.'); end if;
  for it in select * from jsonb_array_elements(a -> 'items') loop
    i := i + 1;
    begin
      if jsonb_typeof(it) <> 'object' then raise exception 'Baris harus berupa objek' using errcode = 'AG001'; end if;
      r := public.ai_agent_p_bahan_tambah(v_clinic, it);
      nm := public.ai_agent_norm(r -> 'args' ->> 'nama');
      if nm = any (names) then raise exception 'Nama ganda dalam daftar' using errcode = 'AG001'; end if;
      names := names || nm;
      items := items || jsonb_build_array(r -> 'args');
      total_nilai := total_nilai + coalesce((r -> 'args' ->> 'stok_awal')::numeric, 0) * coalesce((r -> 'args' ->> 'harga_per_satuan')::numeric, 0);
      warn := warn || coalesce((select jsonb_agg(format('Baris %s: %s', i, w)) from jsonb_array_elements_text(r -> 'preview' -> 'peringatan') w), '[]'::jsonb);
    exception when sqlstate 'AG001' then
      errs := errs || to_jsonb(format('Baris %s (%s): %s', i, left(coalesce(it ->> 'nama', '?'), 40), sqlerrm));
    end;
  end loop;
  if jsonb_array_length(errs) > 0 then
    perform public.ai_agent_fail(format('%s dari %s baris bermasalah — perbaiki lalu ajukan ulang SELURUH daftar. %s', jsonb_array_length(errs), n,
      (select string_agg(e, ' | ') from (select e from jsonb_array_elements_text(errs) e limit 8) q)));
  end if;
  select coalesce(jsonb_agg(format('%s · %s%s', x ->> 'nama', x ->> 'satuan_dasar',
           case when coalesce((x ->> 'stok_awal')::numeric, 0) > 0 then format(' · stok %s%s', public.ai_agent_q((x ->> 'stok_awal')::numeric),
             case when x ->> 'harga_per_satuan' is not null then ' @ ' || public.ai_agent_rp((x ->> 'harga_per_satuan')::numeric) else '' end) else '' end)), '[]'::jsonb)
    into rinc from (select x from jsonb_array_elements(items) x limit 15) q;
  if n > 15 then rinc := rinc || to_jsonb(format('… dan %s bahan lainnya', n - 15)); end if;
  if total_nilai > 0 then rinc := rinc || to_jsonb('Nilai stok awal seluruhnya: ' || public.ai_agent_rp(total_nilai)); end if;
  return jsonb_build_object('args', jsonb_build_object('items', items),
    'preview', jsonb_build_object('judul', format('Tambah %s bahan baru sekaligus', n), 'rincian', rinc, 'peringatan', warn, 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_stok_masuk_banyak(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  it jsonb; i int := 0; r jsonb; errs jsonb := '[]'; items jsonb := '[]'; rinc jsonb := '[]'; warn jsonb := '[]'; n int; grand numeric := 0; detail text;
  defaults jsonb := jsonb_strip_nulls(jsonb_build_object('tanggal', a -> 'tanggal', 'supplier', a -> 'supplier', 'no_faktur', a -> 'no_faktur'));
begin
  if jsonb_typeof(a -> 'items') is distinct from 'array' then perform public.ai_agent_fail('"items" harus berupa daftar barang.'); end if;
  n := jsonb_array_length(a -> 'items');
  if n = 0 or n > 60 then perform public.ai_agent_fail('Jumlah barang per usulan harus 1–60.'); end if;
  for it in select * from jsonb_array_elements(a -> 'items') loop
    i := i + 1;
    begin
      if jsonb_typeof(it) <> 'object' then raise exception 'Baris harus berupa objek' using errcode = 'AG001'; end if;
      r := public.ai_agent_p_stok_masuk(v_clinic, defaults || it);
      items := items || jsonb_build_array(r -> 'args');
      grand := grand + (r -> 'args' ->> 'jumlah_beli')::numeric * (r -> 'args' ->> 'harga_satuan_beli')::numeric;
      rinc := rinc || to_jsonb(format('%s: +%s %s @ %s', r -> 'args' ->> 'bahan_nama', public.ai_agent_q((r -> 'args' ->> 'jumlah_dasar')::numeric),
        (select satuan_dasar from public.master_bahan where id = (r -> 'args' ->> 'bahan_id')::uuid),
        public.ai_agent_rp((r -> 'args' ->> 'harga_satuan_beli')::numeric)));
      warn := warn || coalesce((select jsonb_agg(format('Baris %s: %s', i, w)) from jsonb_array_elements_text(r -> 'preview' -> 'peringatan') w), '[]'::jsonb);
    exception when sqlstate 'AG001' then
      get stacked diagnostics detail = pg_exception_detail;
      errs := errs || to_jsonb(format('Baris %s (%s): %s%s', i, left(coalesce(it ->> 'bahan', '?'), 40), sqlerrm,
        case when coalesce(detail, '') <> '' then ' Kandidat: ' || (select string_agg(c ->> 'nama', ', ') from jsonb_array_elements(detail::jsonb) c) else '' end));
    end;
  end loop;
  if jsonb_array_length(errs) > 0 then
    perform public.ai_agent_fail(format('%s dari %s baris bermasalah — perbaiki lalu ajukan ulang SELURUH daftar. %s', jsonb_array_length(errs), n,
      (select string_agg(e, ' | ') from (select e from jsonb_array_elements_text(errs) e limit 8) q)));
  end if;
  if jsonb_array_length(rinc) > 15 then
    rinc := (select jsonb_agg(x) from (select x from jsonb_array_elements(rinc) x limit 15) q) || to_jsonb(format('… dan %s barang lainnya', n - 15));
  end if;
  rinc := rinc || to_jsonb('Total pembelian: ' || public.ai_agent_rp(grand));
  return jsonb_build_object('args', jsonb_build_object('items', items),
    'preview', jsonb_build_object('judul', format('Stok masuk %s barang (%s)', n, public.ai_agent_rp(grand)), 'rincian', rinc, 'peringatan', warn, 'risiko', 'sedang'));
end $$;

create or replace function public.ai_agent_p_batch_buang(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  b public.master_bahan := public.ai_agent_bahan(v_clinic, a ->> 'bahan');
  jml numeric := public.ai_agent_num(a, 'jumlah', 0.001, 1000000000, true);
  alasan text := coalesce(public.ai_agent_txt(a, 'alasan', 20), 'kadaluarsa');
  nobatch text := public.ai_agent_txt(a, 'no_batch', 60); cat text := public.ai_agent_txt(a, 'catatan', 300);
  warn jsonb := '[]'; rinc jsonb := '[]'; bt record;
begin
  if alasan not in ('kadaluarsa', 'rusak', 'hilang', 'lainnya') then perform public.ai_agent_fail('Alasan harus kadaluarsa, rusak, hilang, atau lainnya.'); end if;
  if jml > b.stok_saat_ini then
    perform public.ai_agent_fail(format('Stok "%s" hanya %s %s; tidak bisa membuang %s. Lakukan opname dulu bila stok sistem keliru.', b.nama_bahan, public.ai_agent_q(b.stok_saat_ini), b.satuan_dasar, public.ai_agent_q(jml)));
  end if;
  if nobatch is not null then
    select * into bt from public.material_batches where clinic_id = v_clinic and material_id = b.id and lower(no_batch) = lower(nobatch);
    if not found then perform public.ai_agent_fail(format('Batch "%s" tidak ditemukan untuk %s.', nobatch, b.nama_bahan)); end if;
    if bt.qty_sisa < jml then warn := warn || to_jsonb(format('Batch %s hanya tersisa %s; selisihnya diambil dari batch lain berurutan kadaluarsa.', bt.no_batch, public.ai_agent_q(bt.qty_sisa))); end if;
  elsif alasan = 'kadaluarsa' and not exists (select 1 from public.material_batches where clinic_id = v_clinic and material_id = b.id and qty_sisa > 0 and tanggal_kadaluarsa < public.ai_agent_today()) then
    warn := warn || to_jsonb('Tidak ada batch berstatus kadaluarsa tercatat untuk bahan ini; pastikan benar sebelum membuang.'::text);
  end if;
  rinc := rinc || to_jsonb(format('Buang %s %s %s (alasan: %s)', public.ai_agent_q(jml), b.satuan_dasar, b.nama_bahan, alasan));
  rinc := rinc || to_jsonb(format('Stok: %s → %s %s', public.ai_agent_q(b.stok_saat_ini), public.ai_agent_q(b.stok_saat_ini - jml), b.satuan_dasar));
  rinc := rinc || to_jsonb(format('Kerugian persediaan ± %s (harga rata-rata %s)', public.ai_agent_rp(jml * b.harga_rata2), public.ai_agent_rp(b.harga_rata2)));
  return jsonb_build_object('args', jsonb_strip_nulls(jsonb_build_object('bahan_id', b.id, 'bahan_nama', b.nama_bahan, 'jumlah', jml, 'alasan', alasan, 'no_batch', nobatch, 'catatan', cat)),
    'preview', jsonb_build_object('judul', 'Buang stok: ' || b.nama_bahan, 'rincian', rinc, 'peringatan', warn, 'risiko', 'sedang'));
end $$;

-- ═════════════ EKSEKUSI ═════════════
create or replace function public.ai_agent_x_bahan_tambah_banyak(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare it jsonb; x jsonb; bids jsonb := '[]'; pids jsonb := '[]';
begin
  for it in select * from jsonb_array_elements(a -> 'items') loop
    x := public.ai_agent_x_bahan_tambah(v_clinic, v_user, it);
    bids := bids || jsonb_build_array(x -> 'hasil' -> 'bahan_id');
    pids := pids || jsonb_build_array(x -> 'hasil' -> 'purchase_id');
  end loop;
  return jsonb_build_object('hasil', jsonb_build_object('bahan_ids', bids, 'purchase_ids', pids, 'jumlah', jsonb_array_length(bids)), 'sebelum', null, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_stok_masuk_banyak(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare it jsonb; x jsonb; pids jsonb := '[]'; total numeric := 0;
begin
  for it in select * from jsonb_array_elements(a -> 'items') loop
    x := public.ai_agent_x_stok_masuk(v_clinic, v_user, it);
    pids := pids || jsonb_build_array(x -> 'hasil' -> 'purchase_id');
    total := total + (it ->> 'jumlah_beli')::numeric * (it ->> 'harga_satuan_beli')::numeric;
  end loop;
  return jsonb_build_object('hasil', jsonb_build_object('purchase_ids', pids, 'jumlah', jsonb_array_length(pids), 'total', total), 'sebelum', null, 'bisa_batal', false);
end $$;

create or replace function public.ai_agent_x_batch_buang(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare b public.master_bahan; jml numeric := (a ->> 'jumlah')::numeric; sisa numeric; take numeric; bt record; old_b jsonb := '[]'; v_mid uuid; baru numeric;
begin
  select * into b from public.master_bahan where id = (a ->> 'bahan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Bahan sudah tidak ada.'); end if;
  if jml > b.stok_saat_ini then
    perform public.ai_agent_fail(format('Stok "%s" kini hanya %s %s; tidak bisa membuang %s. Minta usulan baru.', b.nama_bahan, public.ai_agent_q(b.stok_saat_ini), b.satuan_dasar, public.ai_agent_q(jml)));
  end if;
  baru := b.stok_saat_ini - jml;
  update public.master_bahan set stok_saat_ini = baru, updated_at = now() where id = b.id;
  insert into public.stok_movements (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, harga_saat_itu, catatan, created_by)
  values (v_clinic, b.id, 'penyesuaian', -jml, b.stok_saat_ini, baru, 'buang_stok', b.harga_rata2,
          format('Buang stok (%s)%s', a ->> 'alasan', coalesce(' — ' || (a ->> 'catatan'), '')), v_user) returning id into v_mid;
  sisa := jml;
  for bt in select * from public.material_batches where clinic_id = v_clinic and material_id = b.id and qty_sisa > 0
              and (a ->> 'no_batch' is null or lower(no_batch) = lower(a ->> 'no_batch'))
            order by (tanggal_kadaluarsa is null), tanggal_kadaluarsa, tanggal_masuk for update loop
    exit when sisa <= 0;
    take := least(bt.qty_sisa, sisa);
    old_b := old_b || jsonb_build_array(jsonb_build_object('id', bt.id, 'qty_sisa', bt.qty_sisa));
    update public.material_batches set qty_sisa = qty_sisa - take where id = bt.id;
    sisa := sisa - take;
  end loop;
  return jsonb_build_object('hasil', jsonb_build_object('bahan_id', b.id, 'movement_id', v_mid, 'kerugian', round(jml * b.harga_rata2)),
    'sebelum', jsonb_build_object('stok', b.stok_saat_ini, 'batch', old_b), 'bisa_batal', true);
end $$;

-- ═════════════ PEMBATALAN ═════════════
create or replace function public.ai_agent_u_bahan_tambah_banyak(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare i int; n int := jsonb_array_length(r.result -> 'bahan_ids');
begin
  for i in 0 .. n - 1 loop
    perform public.ai_agent_u_bahan_tambah(v_clinic, v_user, jsonb_populate_record(null::public.ai_actions, jsonb_build_object('result',
      jsonb_build_object('bahan_id', r.result -> 'bahan_ids' -> i, 'purchase_id', r.result -> 'purchase_ids' -> i))));
  end loop;
end $$;

create or replace function public.ai_agent_u_batch_buang(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare bid uuid := (r.result ->> 'bahan_id')::uuid; mid uuid := (r.result ->> 'movement_id')::uuid; mt timestamptz; bt jsonb;
begin
  select created_at into mt from public.stok_movements where id = mid;
  if mt is null then perform public.ai_agent_fail('Catatan pergerakan stok tidak ditemukan; tidak bisa dibatalkan.'); end if;
  if exists (select 1 from public.stok_movements where material_id = bid and id <> mid and created_at >= mt) then
    perform public.ai_agent_fail('Sudah ada pergerakan stok sesudah pembuangan ini, jadi tidak bisa dibatalkan otomatis. Catat stok masuk/opname untuk mengoreksi.');
  end if;
  update public.master_bahan set stok_saat_ini = (r.before ->> 'stok')::numeric, updated_at = now() where id = bid and clinic_id = v_clinic;
  for bt in select * from jsonb_array_elements(r.before -> 'batch') loop
    update public.material_batches set qty_sisa = (bt ->> 'qty_sisa')::numeric where id = (bt ->> 'id')::uuid and clinic_id = v_clinic;
  end loop;
  delete from public.stok_movements where id = mid;
end $$;

create or replace function public.ai_agent_kinds() returns text[] language sql immutable
as $$ select array['bahan_tambah', 'bahan_ubah', 'stok_masuk', 'stok_opname', 'pengeluaran_catat', 'pengeluaran_ubah', 'pengeluaran_hapus',
                   'overhead_atur', 'overhead_target', 'tindakan_harga', 'tindakan_harga_massal', 'tindakan_tambah', 'tindakan_ubah', 'resep_atur', 'resep_hapus',
                   'bahan_tambah_banyak', 'stok_masuk_banyak', 'batch_buang'] $$;

-- ═════════════ ALAT BACA ANALITIK ═════════════
create or replace function public.ai_ringkasan_gudang()
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); today date := public.ai_agent_today();
begin
  return jsonb_build_object(
    'bahan_aktif', (select count(*) from public.master_bahan where clinic_id = v_clinic and is_active),
    'nilai_stok_total', (select coalesce(round(sum(greatest(stok_saat_ini, 0) * harga_rata2)), 0) from public.master_bahan where clinic_id = v_clinic and is_active),
    'habis', (select count(*) from public.master_bahan where clinic_id = v_clinic and is_active and stok_saat_ini <= 0),
    'menipis', (select count(*) from public.master_bahan where clinic_id = v_clinic and is_active and stok_saat_ini > 0 and stok_saat_ini <= stok_minimum),
    'tanpa_harga', (select count(*) from public.master_bahan where clinic_id = v_clinic and is_active and stok_saat_ini > 0 and harga_rata2 <= 0),
    'batch_kadaluarsa', (select jsonb_build_object('sudah_lewat', count(*) filter (where tanggal_kadaluarsa < today), 'dalam_30_hari', count(*) filter (where tanggal_kadaluarsa >= today and tanggal_kadaluarsa <= today + 30),
        'nilai_sudah_lewat', coalesce(round(sum(qty_sisa * harga_satuan) filter (where tanggal_kadaluarsa < today)), 0))
        from public.material_batches where clinic_id = v_clinic and qty_sisa > 0 and tanggal_kadaluarsa is not null),
    'nilai_terbesar', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select jsonb_build_object('nama', nama_bahan, 'stok', stok_saat_ini, 'satuan', satuan_dasar, 'nilai', round(stok_saat_ini * harga_rata2)) x
                         from public.master_bahan where clinic_id = v_clinic and is_active and stok_saat_ini > 0 order by stok_saat_ini * harga_rata2 desc limit 5) q),
    'per_kategori', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (select jsonb_build_object('kategori', coalesce(kategori, 'Tanpa kategori'), 'jumlah', count(*), 'nilai', round(sum(greatest(stok_saat_ini, 0) * harga_rata2))) x
                       from public.master_bahan where clinic_id = v_clinic and is_active group by coalesce(kategori, 'Tanpa kategori') order by sum(greatest(stok_saat_ini, 0) * harga_rata2) desc limit 8) q));
end $$;

create or replace function public.ai_bahan_kadaluarsa(p_hari integer default 90)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); today date := public.ai_agent_today(); d int := least(greatest(coalesce(p_hari, 90), 1), 730); r jsonb;
begin
  select coalesce(jsonb_agg(x order by (x ->> 'kadaluarsa')), '[]'::jsonb) into r from (
    select jsonb_build_object('bahan_id', m.id, 'bahan', m.nama_bahan, 'no_batch', b.no_batch, 'kadaluarsa', b.tanggal_kadaluarsa, 'hari_lagi', b.tanggal_kadaluarsa - today,
      'sisa', b.qty_sisa, 'satuan', m.satuan_dasar, 'nilai', round(b.qty_sisa * b.harga_satuan), 'status', case when b.tanggal_kadaluarsa < today then 'sudah lewat' when b.tanggal_kadaluarsa <= today + 30 then 'segera' else 'mendekati' end) x
      from public.material_batches b join public.master_bahan m on m.id = b.material_id
     where b.clinic_id = v_clinic and b.qty_sisa > 0 and b.tanggal_kadaluarsa is not null and b.tanggal_kadaluarsa <= today + d
     order by b.tanggal_kadaluarsa limit 50) q;
  return jsonb_build_object('hari', d, 'jumlah_batch', jsonb_array_length(r), 'batch', r,
    'nilai_sudah_lewat', (select coalesce(round(sum(qty_sisa * harga_satuan)), 0) from public.material_batches where clinic_id = v_clinic and qty_sisa > 0 and tanggal_kadaluarsa < today));
end $$;

create or replace function public.ai_riwayat_harga_bahan(p_bahan text, p_bulan integer default 12)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); b public.master_bahan; m int := least(greatest(coalesce(p_bulan, 12), 1), 36); pembelian jsonb; pemasok jsonb;
begin
  b := public.ai_agent_bahan(v_clinic, p_bahan);
  select coalesce(jsonb_agg(x order by (x ->> 'tanggal') desc), '[]'::jsonb) into pembelian from (
    select jsonb_build_object('tanggal', tanggal, 'pemasok', supplier, 'jumlah_dasar', jumlah_dasar, 'harga_per_satuan_dasar', round(total_harga / nullif(jumlah_dasar, 0), 2), 'no_faktur', no_faktur) x
      from public.material_purchases where clinic_id = v_clinic and material_id = b.id and tanggal >= public.ai_agent_today() - (m * 30) order by tanggal desc limit 40) q;
  select coalesce(jsonb_agg(x order by (x ->> 'harga_rata2')::numeric), '[]'::jsonb) into pemasok from (
    select jsonb_build_object('pemasok', coalesce(supplier, 'Tanpa pemasok'), 'pembelian', count(*), 'harga_rata2', round(sum(total_harga) / nullif(sum(jumlah_dasar), 0), 2),
      'harga_terakhir', (array_agg(round(total_harga / nullif(jumlah_dasar, 0), 2) order by tanggal desc))[1],
      'termurah', min(round(total_harga / nullif(jumlah_dasar, 0), 2)), 'termahal', max(round(total_harga / nullif(jumlah_dasar, 0), 2)), 'terakhir_beli', max(tanggal)) x
      from public.material_purchases where clinic_id = v_clinic and material_id = b.id and tanggal >= public.ai_agent_today() - (m * 30) group by coalesce(supplier, 'Tanpa pemasok')) q;
  return jsonb_build_object('bahan', jsonb_build_object('id', b.id, 'nama', b.nama_bahan, 'satuan', b.satuan_dasar, 'harga_rata2_sekarang', round(b.harga_rata2, 2)), 'bulan', m, 'per_pemasok', pemasok, 'pembelian', pembelian);
end $$;

create or replace function public.ai_analisis_margin(p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); today date := public.ai_agent_today(); per date := date_trunc('month', public.ai_agent_today())::date;
  opu numeric; lim int := least(greatest(coalesce(p_limit, 30), 1), 60); r jsonb;
begin
  select overhead_per_unit_bobot into opu from public.overhead_monthly_target where clinic_id = v_clinic and periode = per;
  select coalesce(jsonb_agg(x order by (x ->> 'margin_persen')::numeric nulls last), '[]'::jsonb) into r from (select x from (
    select jsonb_build_object('id', t.id, 'nama', t.nama_treatment, 'harga', t.harga_dasar, 'tier', t.tier,
      'biaya_bahan', bom.biaya, 'bahan_di_resep', bom.n, 'overhead_per_tindakan', case when opu is null then null else round(coalesce(w.bobot, 1) * opu) end,
      'hpp', round(bom.biaya + coalesce(w.bobot, 1) * coalesce(opu, 0)),
      'margin_rp', round(t.harga_dasar - bom.biaya - coalesce(w.bobot, 1) * coalesce(opu, 0)),
      'margin_persen', case when t.harga_dasar > 0 then round((t.harga_dasar - bom.biaya - coalesce(w.bobot, 1) * coalesce(opu, 0)) / t.harga_dasar * 100, 1) end,
      'volume_90_hari', coalesce(v.qty, 0),
      'status', case when bom.n = 0 then 'resep belum diisi' when t.harga_dasar <= 0 then 'harga 0'
                     when t.harga_dasar - bom.biaya - coalesce(w.bobot, 1) * coalesce(opu, 0) < 0 then 'rugi'
                     when (t.harga_dasar - bom.biaya - coalesce(w.bobot, 1) * coalesce(opu, 0)) / t.harga_dasar < 0.2 then 'tipis' else 'sehat' end) x
      from public.treatments t
      left join public.tier_weights w on w.clinic_id = t.clinic_id and w.tier = t.tier
      left join lateral (select count(*) n, coalesce(round(sum(m.qty_rata2 * (1 + coalesce(m.wastage_percent, 0) / 100) * mb.harga_rata2)), 0) biaya
                           from public.treatment_materials m join public.master_bahan mb on mb.id = m.material_id where m.treatment_id = t.id) bom on true
      left join lateral (select sum(vt.quantity) qty from public.visit_treatments vt join public.visits vi on vi.id = vt.visit_id
                          where vt.treatment_id = t.id and vt.clinic_id = v_clinic and vi.status = 'completed' and vi.deleted_at is null and vi.tanggal_kunjungan >= today - 90) v on true
     where t.clinic_id = v_clinic and t.is_active) b order by (x ->> 'margin_persen')::numeric nulls last limit lim) q;
  return jsonb_build_object('overhead_per_bobot', opu, 'catatan', case when opu is null then 'Target overhead bulan ini belum diatur: margin belum memuat overhead.' end, 'tindakan', r);
end $$;

create or replace function public.ai_anomali_pengeluaran()
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); today date := public.ai_agent_today(); bulan date := date_trunc('month', public.ai_agent_today())::date;
  hari_ke int := extract(day from public.ai_agent_today())::int; lonjakan jsonb; belum jsonb; besar jsonb; ganda jsonb;
begin
  -- bulan berjalan (sampai hari ini) vs rata-rata 3 bulan penuh sebelumnya, per kategori
  select coalesce(jsonb_agg(x order by (x ->> 'selisih')::numeric desc), '[]'::jsonb) into lonjakan from (
    select jsonb_build_object('kategori', c.kategori, 'bulan_ini', c.cur, 'rata_rata_3_bulan', round(c.avg3), 'rasio', round(c.cur / nullif(c.avg3, 0), 2), 'selisih', round(c.cur - c.avg3)) x
      from (select kategori, sum(jumlah) filter (where tanggal_expense >= bulan) cur,
                   sum(jumlah) filter (where tanggal_expense >= bulan - interval '3 months' and tanggal_expense < bulan) / 3.0 avg3
              from public.expenses where clinic_id = v_clinic and tanggal_expense >= bulan - interval '3 months' group by kategori) c
     where c.avg3 > 0 and c.cur > c.avg3 * 1.5 and c.cur - c.avg3 > 100000) q;
  -- biaya rutin (muncul tiap bulan dalam 3 bulan terakhir) yang belum tercatat bulan ini
  select coalesce(jsonb_agg(x), '[]'::jsonb) into belum from (
    select jsonb_build_object('kategori', kategori, 'rata_rata_per_bulan', round(sum(jumlah) / 3.0)) x
      from public.expenses where clinic_id = v_clinic and kategori in ('Sewa', 'Gaji', 'Utilitas') and tanggal_expense >= bulan - interval '3 months' and tanggal_expense < bulan
       and not exists (select 1 from public.expenses e2 where e2.clinic_id = v_clinic and e2.kategori = expenses.kategori and e2.tanggal_expense >= bulan)
     group by kategori having count(distinct date_trunc('month', tanggal_expense)) = 3) q;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into besar from (
    select jsonb_build_object('id', e.id, 'tanggal', e.tanggal_expense, 'kategori', e.kategori, 'deskripsi', e.deskripsi, 'jumlah', e.jumlah) x
      from public.expenses e where e.clinic_id = v_clinic and e.tanggal_expense >= bulan
       and e.jumlah > greatest(2000000, 3 * coalesce((select percentile_cont(0.5) within group (order by jumlah) from public.expenses where clinic_id = v_clinic and tanggal_expense >= bulan - interval '3 months'), 0))
     order by e.jumlah desc limit 5) q;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into ganda from (
    select jsonb_build_object('id_a', a.id, 'id_b', b.id, 'jumlah', a.jumlah, 'kategori', a.kategori, 'tanggal_a', a.tanggal_expense, 'tanggal_b', b.tanggal_expense, 'deskripsi_a', left(a.deskripsi, 50), 'deskripsi_b', left(b.deskripsi, 50)) x
      from public.expenses a join public.expenses b on b.clinic_id = a.clinic_id and b.id > a.id and b.jumlah = a.jumlah and b.kategori = a.kategori and abs(b.tanggal_expense - a.tanggal_expense) <= 3
     where a.clinic_id = v_clinic and a.tanggal_expense >= today - 60 and a.jumlah >= 50000 order by a.tanggal_expense desc limit 8) q;
  return jsonb_build_object('hari_ke', hari_ke, 'lonjakan_kategori', lonjakan, 'biaya_rutin_belum_tercatat', belum, 'pengeluaran_besar_bulan_ini', besar, 'kemungkinan_ganda_60_hari', ganda);
end $$;

-- ═════════════ Hak eksekusi ═════════════
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace
              and (p.proname like 'ai\_agent\_p\_%' or p.proname like 'ai\_agent\_x\_%' or p.proname like 'ai\_agent\_u\_%') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
revoke all on function public.ai_agent_kinds() from public, anon, authenticated;
revoke all on function public.ai_ringkasan_gudang(), public.ai_bahan_kadaluarsa(integer), public.ai_riwayat_harga_bahan(text, integer),
  public.ai_analisis_margin(integer), public.ai_anomali_pengeluaran() from public, anon;
grant execute on function public.ai_ringkasan_gudang(), public.ai_bahan_kadaluarsa(integer), public.ai_riwayat_harga_bahan(text, integer),
  public.ai_analisis_margin(integer), public.ai_anomali_pengeluaran() to authenticated, service_role;
