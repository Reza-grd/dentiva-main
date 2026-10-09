-- Asisten AI fase C (nota → pengeluaran), D (simulasi & perencanaan), E (asisten manajemen).
-- Semua fungsi baca: SECURITY DEFINER, klinik pemanggil saja, hanya angka agregat
-- (kecuali recall_candidates yang dipakai halaman Recall, bukan dikirim ke AI).

-- ============ Fase C: kolom tambahan pengeluaran ============
do $$ begin
  if to_regclass('public.expenses') is null then return; end if; -- baseline uji sintetis tidak punya tabel ini
  alter table public.expenses
    add column if not exists pemasok text,
    add column if not exists nomor_nota text,
    add column if not exists sumber text not null default 'manual';
  begin
    alter table public.expenses add constraint expenses_sumber_check check (sumber in ('manual', 'ai_nota'));
  exception when duplicate_object then null; end;
  begin
    alter table public.expenses add constraint expenses_jumlah_positive check (jumlah is null or jumlah >= 0) not valid;
  exception when duplicate_object then null; end;
  create index if not exists expenses_clinic_tanggal_idx on public.expenses (clinic_id, tanggal_expense desc);
end $$;

-- ============ Fase D: simulasi harga ============
create or replace function public.ai_price_simulation(p_nama text, p_perubahan_persen numeric, p_bulan int)
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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

-- ============ Fase D: proyeksi arus kas ============
create or replace function public.ai_cashflow_projection(p_bulan_historis int, p_bulan_ke_depan int)
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
declare
  v_clinic uuid := public.ai_require_admin();
  v_month_start date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date;
  v_from date;
  v_hist jsonb; v_proj jsonb;
  v_n int; v_avg_in numeric; v_avg_out numeric; v_slope_in numeric; v_slope_out numeric;
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

  -- Tren linier dari rata-rata (titik tengah historis), tidak negatif
  select jsonb_agg(jsonb_build_object('bulan', to_char(b, 'YYYY-MM'),
           'kas_masuk', pin, 'kas_keluar', pout, 'arus_kas_bersih', pin - pout,
           'kumulatif', kum) order by k)
    into v_proj
    from (
      select k, b, pin, pout, sum(pin - pout) over (order by k) kum from (
        select k, (v_month_start + make_interval(months => k - 1))::date b,
               greatest(round(v_avg_in + v_slope_in * (v_n + k - (v_n + 1) / 2.0)), 0) pin,
               greatest(round(v_avg_out + v_slope_out * (v_n + k - (v_n + 1) / 2.0)), 0) pout
        from generate_series(1, p_bulan_ke_depan) k
      ) y
    ) x;

  return jsonb_build_object(
    'metode', 'Tren linier dari data bulan penuh historis (kas masuk = pembayaran lunas; kas keluar = pengeluaran tercatat + pembelian bahan). Bulan berjalan termasuk proyeksi bulan pertama.',
    'historis', coalesce(v_hist, '[]'),
    'rata_rata_kas_masuk', round(coalesce(v_avg_in, 0)),
    'rata_rata_kas_keluar', round(coalesce(v_avg_out, 0)),
    'tren_kas_masuk_per_bulan', round(v_slope_in),
    'tren_kas_keluar_per_bulan', round(v_slope_out),
    'total_overhead_bulanan_tercatat', v_overhead,
    'catatan', case when v_overhead > coalesce(v_avg_out, 0) then 'Overhead bulanan tercatat lebih besar dari rata-rata pengeluaran yang dicatat; kemungkinan sebagian biaya belum dicatat di Pengeluaran.' end,
    'proyeksi', coalesce(v_proj, '[]')
  );
end $$;

-- ============ Fase E: ringkasan hari ini ============
create or replace function public.ai_today_summary()
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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
end $$;

-- ============ Fase E: beban jadwal dokter per hari ============
create or replace function public.ai_doctor_schedule_load(p_minggu int)
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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
end $$;

-- ============ Fase E: recall pasien ============
create table if not exists public.recall_contacts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  contacted_by uuid references public.users(id) on delete set null,
  channel text not null default 'wa' check (channel in ('wa', 'telepon', 'lainnya')),
  created_at timestamptz not null default now()
);
create index if not exists recall_contacts_clinic_patient_idx on public.recall_contacts (clinic_id, patient_id, created_at desc);
alter table public.recall_contacts enable row level security;
drop policy if exists tenant_isolation on public.recall_contacts;
create policy tenant_isolation on public.recall_contacts as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id())) with check (clinic_id = (select public.get_user_clinic_id()));
drop policy if exists recall_contacts_select on public.recall_contacts;
create policy recall_contacts_select on public.recall_contacts for select to authenticated
  using ((select public.get_user_role()) in ('admin', 'resepsionis'));
revoke insert, update, delete on public.recall_contacts from anon, authenticated;
grant select on public.recall_contacts to authenticated;

create or replace function public.recall_require_staff()
returns uuid language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
declare v_clinic uuid := public.get_user_clinic_id();
begin
  if public.get_user_role() not in ('admin', 'resepsionis') or v_clinic is null then
    raise exception 'Hanya admin atau resepsionis' using errcode = 'insufficient_privilege';
  end if;
  return v_clinic;
end $$;

-- Daftar pasien yang perlu dihubungi kembali. Nama/WA dikembalikan apa adanya (terenkripsi PGP:)
-- dan dibuka di aplikasi lewat decrypt_batch. Tidak dipakai oleh AI.
create or replace function public.recall_candidates(p_bulan int, p_limit int default 300)
returns table (
  patient_id uuid, no_rm text, nama_lengkap text, no_wa text, wa_consent boolean,
  kunjungan_terakhir date, jumlah_kunjungan int, terakhir_dihubungi timestamptz, jumlah_dihubungi int
) language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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
end $$;

create or replace function public.recall_mark_contacted(p_patient_id uuid, p_channel text)
returns uuid language plpgsql volatile security definer set search_path = 'public', 'extensions' as $$
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
end $$;

-- Hitungan recall untuk AI (tanpa identitas pasien)
create or replace function public.ai_recall_stats(p_bulan int)
returns jsonb language plpgsql stable security definer set search_path = 'public', 'extensions' as $$
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
end $$;

-- ============ hak akses ============
revoke all on function public.ai_price_simulation(text, numeric, int) from public, anon;
revoke all on function public.ai_break_even(int) from public, anon;
revoke all on function public.ai_cashflow_projection(int, int) from public, anon;
revoke all on function public.ai_today_summary() from public, anon;
revoke all on function public.ai_doctor_schedule_load(int) from public, anon;
revoke all on function public.ai_recall_stats(int) from public, anon;
revoke all on function public.recall_require_staff() from public, anon;
revoke all on function public.recall_candidates(int, int) from public, anon;
revoke all on function public.recall_mark_contacted(uuid, text) from public, anon;
grant execute on function public.ai_price_simulation(text, numeric, int) to authenticated, service_role;
grant execute on function public.ai_break_even(int) to authenticated, service_role;
grant execute on function public.ai_cashflow_projection(int, int) to authenticated, service_role;
grant execute on function public.ai_today_summary() to authenticated, service_role;
grant execute on function public.ai_doctor_schedule_load(int) to authenticated, service_role;
grant execute on function public.ai_recall_stats(int) to authenticated, service_role;
grant execute on function public.recall_require_staff() to authenticated, service_role;
grant execute on function public.recall_candidates(int, int) to authenticated, service_role;
grant execute on function public.recall_mark_contacted(uuid, text) to authenticated, service_role;
