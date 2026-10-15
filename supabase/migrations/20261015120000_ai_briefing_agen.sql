-- Denti Agen — briefing harian TERURUT (15 Okt 2026).
-- Model AI yang lebih kecil sulit memanggil 6 alat lalu memprioritaskannya sendiri. Fungsi ini mengumpulkan semua sinyal operasional
-- (gudang, kadaluarsa, pemesanan, biaya rutin, lonjakan & duplikat pengeluaran, margin, resep, tagihan) di database, memberi skor berdasarkan
-- dampak (rupiah/risiko), dan mengembalikan prioritas siap pakai. Model hanya merangkai kalimat & menyiapkan usulan dari petunjuk "lanjut".
create or replace function public.ai_briefing_agen()
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  v_clinic uuid := public.ai_require_admin(); items jsonb := '[]'; g jsonb; k jsonb; o jsonb; an jsonb; m jsonb; u jsonb; n int; nilai numeric; x jsonb;
  proses text := '';
begin
  g := public.ai_ringkasan_gudang();
  k := public.ai_bahan_kadaluarsa(30);
  o := public.ai_saran_pemesanan(30, 7);
  an := public.ai_anomali_pengeluaran();
  m := public.ai_analisis_margin(60);
  u := public.ai_unbilled_visits(7);

  -- 1. Batch sudah kadaluarsa tapi masih tercatat di stok
  nilai := coalesce((k ->> 'nilai_sudah_lewat')::numeric, 0);
  select count(*) into n from jsonb_array_elements(k -> 'batch') b where b ->> 'status' = 'sudah lewat';
  if n > 0 then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'kadaluarsa_lewat', 'skor', 60 + least(nilai / 100000, 30),
      'judul', format('%s batch bahan sudah kadaluarsa (±%s) tapi masih tercatat di stok', n, public.ai_agent_rp(nilai)),
      'angka', jsonb_build_object('batch', n, 'nilai', nilai), 'lanjut', 'bahan_kadaluarsa → usulkan_buang_stok'));
  end if;
  -- 2. Segera kadaluarsa (≤ 30 hari)
  select count(*), coalesce(sum((b ->> 'nilai')::numeric), 0) into n, nilai from jsonb_array_elements(k -> 'batch') b where b ->> 'status' = 'segera';
  if n > 0 then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'kadaluarsa_segera', 'skor', 35 + least(nilai / 100000, 20),
      'judul', format('%s batch bahan kadaluarsa dalam 30 hari (±%s) — pakai dulu atau tukar', n, public.ai_agent_rp(nilai)),
      'angka', jsonb_build_object('batch', n, 'nilai', nilai), 'lanjut', 'bahan_kadaluarsa'));
  end if;
  -- 3. Bahan yang biasa dipakai sudah habis
  select count(*) into n from jsonb_array_elements(o -> 'bahan') b where (b ->> 'alasan') = 'stok habis' and coalesce((b ->> 'pakai_per_hari')::numeric, 0) > 0;
  if n > 0 then
    select string_agg(b ->> 'nama', ', ') into proses from (select b from jsonb_array_elements(o -> 'bahan') b
      where (b ->> 'alasan') = 'stok habis' and coalesce((b ->> 'pakai_per_hari')::numeric, 0) > 0 limit 4) q;
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'stok_habis', 'skor', 75 + least(n, 10),
      'judul', format('%s bahan yang biasa dipakai sudah HABIS (%s)', n, proses), 'angka', jsonb_build_object('bahan', n),
      'lanjut', 'saran_pemesanan → draf_pesan_pemasok / usulkan_stok_masuk'));
  end if;
  -- 4. Stok akan habis ≤ 7 hari
  select count(*) into n from jsonb_array_elements(o -> 'bahan') b where (b ->> 'hari_tersisa') is not null and (b ->> 'hari_tersisa')::numeric > 0 and (b ->> 'hari_tersisa')::numeric <= 7;
  if n > 0 then
    select string_agg(format('%s (±%s hari)', b ->> 'nama', trim_scale((b ->> 'hari_tersisa')::numeric)), ', ') into proses from (
      select b from jsonb_array_elements(o -> 'bahan') b where (b ->> 'hari_tersisa') is not null and (b ->> 'hari_tersisa')::numeric > 0 and (b ->> 'hari_tersisa')::numeric <= 7
       order by (b ->> 'hari_tersisa')::numeric limit 4) q;
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'stok_menipis', 'skor', 55 + least(n, 10),
      'judul', format('%s bahan akan habis dalam ≤ 7 hari: %s', n, proses), 'angka', jsonb_build_object('bahan', n),
      'lanjut', 'saran_pemesanan → riwayat_harga_bahan → draf_pesan_pemasok'));
  end if;
  -- 5. Biaya rutin belum tercatat bulan ini
  select count(*) into n from jsonb_array_elements(an -> 'biaya_rutin_belum_tercatat');
  if n > 0 then
    select string_agg(format('%s (biasanya %s)', b ->> 'kategori', public.ai_agent_rp((b ->> 'rata_rata_per_bulan')::numeric)), ', '),
           coalesce(sum((b ->> 'rata_rata_per_bulan')::numeric), 0) into proses, nilai from jsonb_array_elements(an -> 'biaya_rutin_belum_tercatat') b;
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'biaya_rutin_belum', 'skor', 50 + least(nilai / 1000000, 15),
      'judul', format('Biaya rutin belum tercatat bulan ini: %s', proses), 'angka', jsonb_build_object('perkiraan', nilai),
      'lanjut', 'cari_pengeluaran → usulkan_pengeluaran_catat (tanyakan jumlah pastinya)'));
  end if;
  -- 6. Lonjakan pengeluaran per kategori
  select (b) into x from jsonb_array_elements(an -> 'lonjakan_kategori') b limit 1;
  if x is not null then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'lonjakan_pengeluaran', 'skor', 45 + least(coalesce((x ->> 'selisih')::numeric, 0) / 500000, 15),
      'judul', format('Pengeluaran %s bulan ini %s — %sx rata-rata 3 bulan (%s)', x ->> 'kategori', public.ai_agent_rp((x ->> 'bulan_ini')::numeric), x ->> 'rasio', public.ai_agent_rp((x ->> 'rata_rata_3_bulan')::numeric)),
      'angka', x, 'lanjut', 'cari_pengeluaran(kategori) untuk melihat rinciannya'));
  end if;
  -- 7. Kemungkinan pengeluaran ganda
  select count(*) into n from jsonb_array_elements(an -> 'kemungkinan_ganda_60_hari');
  if n > 0 then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'pengeluaran_ganda', 'skor', 38 + least(n, 7),
      'judul', format('%s pasangan pengeluaran kemungkinan tercatat dua kali', n), 'angka', jsonb_build_object('pasangan', n),
      'lanjut', 'anomali_pengeluaran → usulkan_pengeluaran_hapus (setelah admin memastikan)'));
  end if;
  -- 8. Tindakan rugi / margin tipis / resep belum diisi
  select count(*) into n from jsonb_array_elements(m -> 'tindakan') b where b ->> 'status' = 'rugi';
  if n > 0 then
    select string_agg(b ->> 'nama', ', ') into proses from (select b from jsonb_array_elements(m -> 'tindakan') b where b ->> 'status' = 'rugi' limit 3) q;
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'tindakan_rugi', 'skor', 65 + least(n, 10),
      'judul', format('%s tindakan dijual di bawah biaya (HPP): %s', n, proses), 'angka', jsonb_build_object('tindakan', n),
      'lanjut', 'analisis_margin → simulasi_harga → usulkan_harga_tindakan'));
  end if;
  select count(*) into n from jsonb_array_elements(m -> 'tindakan') b where b ->> 'status' = 'tipis';
  if n > 0 then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'margin_tipis', 'skor', 40, 'judul', format('%s tindakan bermargin tipis (< 20%%)', n),
      'angka', jsonb_build_object('tindakan', n), 'lanjut', 'analisis_margin'));
  end if;
  select count(*) into n from jsonb_array_elements(m -> 'tindakan') b where b ->> 'status' = 'resep belum diisi';
  if n > 0 then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'resep_kosong', 'skor', 30, 'judul', format('%s tindakan belum punya resep bahan — HPP belum akurat', n),
      'angka', jsonb_build_object('tindakan', n), 'lanjut', 'cari_tindakan → usulkan_resep_atur (tanyakan bahan & jumlahnya)'));
  end if;
  -- 9. Kunjungan selesai belum dibayar (7 hari)
  n := coalesce((u ->> 'jumlah_kunjungan')::int, 0); nilai := coalesce((u ->> 'perkiraan_nilai')::numeric, 0);
  if n > 0 then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'belum_dibayar', 'skor', 58 + least(nilai / 500000, 20),
      'judul', format('%s kunjungan selesai 7 hari terakhir belum dibayar (±%s) — tugas kasir/resepsionis', n, public.ai_agent_rp(nilai)),
      'angka', jsonb_build_object('kunjungan', n, 'nilai', nilai), 'lanjut', 'kunjungan_belum_dibayar (agen tidak bisa memproses pembayaran)'));
  end if;
  -- 10. Bahan berstok tanpa harga
  n := coalesce((g ->> 'tanpa_harga')::int, 0);
  if n > 0 then
    items := items || jsonb_build_array(jsonb_build_object('tipe', 'tanpa_harga', 'skor', 25, 'judul', format('%s bahan berstok belum punya harga — HPP dihitung Rp 0', n),
      'angka', jsonb_build_object('bahan', n), 'lanjut', 'cari_bahan → usulkan_stok_masuk dengan harga'));
  end if;

  return jsonb_build_object(
    'tanggal', public.ai_agent_today(),
    'jumlah_temuan', jsonb_array_length(items),
    'prioritas', (select coalesce(jsonb_agg(jsonb_set(i, '{peringkat}', to_jsonb(rn)) - 'skor' order by rn), '[]'::jsonb)
                    from (select i, row_number() over (order by (i ->> 'skor')::numeric desc) rn from jsonb_array_elements(items) i) r where rn <= 6),
    'gudang', jsonb_build_object('bahan_aktif', g -> 'bahan_aktif', 'nilai_stok_total', g -> 'nilai_stok_total', 'habis', g -> 'habis', 'menipis', g -> 'menipis'),
    'catatan', case when jsonb_array_length(items) = 0 then 'Tidak ada temuan mendesak. Data gudang/biaya mungkin masih sedikit — sarankan melengkapi bahan, resep, dan overhead.' end);
end $$;

revoke all on function public.ai_briefing_agen() from public, anon;
grant execute on function public.ai_briefing_agen() to authenticated, service_role;
