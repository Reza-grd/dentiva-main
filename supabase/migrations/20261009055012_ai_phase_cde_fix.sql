-- Perbaikan fase C–E: proyeksi arus kas memakai rata-rata 3 bulan (bukan tren linier yang
-- mudah terdistorsi satu bulan ekstrem) dan catatan BEP saat biaya tetap belum tercatat.

-- ============ Fase D: proyeksi arus kas ============
create or replace function public.ai_cashflow_projection(p_bulan_historis int, p_bulan_ke_depan int)
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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
end $$;


-- ============ Fase D: titik impas (BEP) ============
create or replace function public.ai_break_even(p_bulan int)
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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
end $$;
