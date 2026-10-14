-- Denti Agen (14 Okt 2026): Asisten AI yang bisa MENGUSULKAN dan, setelah disetujui admin, MENJALANKAN
-- tindakan pengelolaan keuangan & bahan (catat pengeluaran, stok masuk, opname, bahan baru, overhead, harga tindakan, resep bahan).
--
-- Prinsip keamanan:
--   * Model AI TIDAK PERNAH menulis data. Ia hanya memanggil ai_agent_propose(), yang memvalidasi & menyimpan USULAN (status pending).
--   * Data baru berubah hanya saat admin menekan "Setujui" → ai_agent_apply(), yang memvalidasi ulang kondisi terbaru.
--   * Semua fungsi memeriksa admin + klinik (ai_require_admin). Usulan hanya bisa dijalankan oleh admin yang membuatnya, ≤ 30 menit.
--   * Setiap usulan tercatat di ai_actions (siapa, apa, hasil, kondisi sebelum) → jejak audit + tombol "Batalkan" untuk yang aman dibatalkan.

-- ── Sumber pengeluaran: tambah 'ai_agen' ────────────────────────────────────
alter table public.expenses drop constraint if exists expenses_sumber_check;
alter table public.expenses add constraint expenses_sumber_check check (sumber in ('manual', 'ai_nota', 'ai_agen'));

-- ── Tabel usulan / jejak tindakan agen ───────────────────────────────────────
create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null,
  kind text not null,
  args jsonb not null,
  preview jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'applied', 'rejected', 'expired', 'failed', 'undone')),
  result jsonb,
  before jsonb,
  undoable boolean not null default false,
  error text,
  group_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  decided_at timestamptz
);
create index if not exists ai_actions_klinik_waktu on public.ai_actions (clinic_id, created_at desc);
create index if not exists ai_actions_user_id_idx on public.ai_actions (user_id);
alter table public.ai_actions enable row level security;
drop policy if exists ai_actions_admin_baca on public.ai_actions;
create policy ai_actions_admin_baca on public.ai_actions for select to authenticated
  using (clinic_id = (select public.get_user_clinic_id()) and (select public.get_user_role()) = 'admin');
drop policy if exists tenant_isolation on public.ai_actions;
create policy tenant_isolation on public.ai_actions as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id())) with check (clinic_id = (select public.get_user_clinic_id()));
revoke all on public.ai_actions from anon, authenticated;
grant select on public.ai_actions to authenticated;

-- ── Pembantu validasi (galat "AG001" = pesan yang aman & berguna bagi model/admin) ──
create or replace function public.ai_agent_fail(p_msg text, p_detail jsonb default null)
returns void language plpgsql set search_path = public
as $$ begin raise exception '%', p_msg using errcode = 'AG001', detail = coalesce(p_detail::text, ''); end $$;

create or replace function public.ai_agent_today() returns date language sql stable
as $$ select (now() at time zone 'Asia/Jakarta')::date $$;

create or replace function public.ai_agent_norm(t text) returns text language sql immutable
as $$ select lower(btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g'))) $$;

create or replace function public.ai_agent_rp(n numeric) returns text language sql immutable
as $$ select 'Rp ' || case when n < 0 then '-' else '' end || regexp_replace(round(abs(n))::text, '(\d)(?=(\d{3})+$)', '\1.', 'g') $$;

create or replace function public.ai_agent_q(n numeric) returns text language sql immutable
as $$ select trim_scale(round(n, 3))::text $$;

create or replace function public.ai_agent_num(p jsonb, k text, lo numeric, hi numeric, req boolean default false, def numeric default null)
returns numeric language plpgsql immutable set search_path = public
as $$
declare t text := nullif(btrim(p ->> k), ''); n numeric;
begin
  if t is null then
    if req then perform public.ai_agent_fail(format('Isian "%s" wajib diisi', k)); end if;
    return def;
  end if;
  if t !~ '^-?[0-9]+(\.[0-9]+)?$' then
    perform public.ai_agent_fail(format('Isian "%s" harus berupa angka polos tanpa titik/koma ribuan (mis. 125000)', k));
  end if;
  n := t::numeric;
  if n < lo or n > hi then perform public.ai_agent_fail(format('Isian "%s" harus antara %s dan %s', k, lo, hi)); end if;
  return n;
end $$;

create or replace function public.ai_agent_txt(p jsonb, k text, maxlen int, req boolean default false)
returns text language plpgsql immutable set search_path = public
as $$
declare t text := nullif(btrim(regexp_replace(coalesce(p ->> k, ''), '[[:cntrl:]]', ' ', 'g')), '');
begin
  if t is null then
    if req then perform public.ai_agent_fail(format('Isian "%s" wajib diisi', k)); end if;
    return null;
  end if;
  if length(t) > maxlen then perform public.ai_agent_fail(format('Isian "%s" maksimal %s karakter', k, maxlen)); end if;
  return t;
end $$;

create or replace function public.ai_agent_bool(p jsonb, k text, def boolean default null)
returns boolean language plpgsql immutable set search_path = public
as $$
declare t text := lower(nullif(btrim(p ->> k), ''));
begin
  if t is null then return def; end if;
  if t in ('true', 't', 'ya', 'yes', '1') then return true; end if;
  if t in ('false', 'f', 'tidak', 'no', '0') then return false; end if;
  perform public.ai_agent_fail(format('Isian "%s" harus true atau false', k));
  return def;
end $$;

create or replace function public.ai_agent_date(p jsonb, k text, def date, lo date, hi date)
returns date language plpgsql immutable set search_path = public
as $$
declare t text := nullif(btrim(p ->> k), ''); d date;
begin
  if t is null then return def; end if;
  if t !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then perform public.ai_agent_fail(format('Isian "%s" harus berformat YYYY-MM-DD', k)); end if;
  begin d := t::date; exception when others then perform public.ai_agent_fail(format('Isian "%s" bukan tanggal yang valid', k)); end;
  if d < lo or d > hi then perform public.ai_agent_fail(format('Isian "%s" harus antara %s dan %s', k, lo, hi)); end if;
  return d;
end $$;

create or replace function public.ai_agent_uuid(p jsonb, k text, req boolean default true)
returns uuid language plpgsql immutable set search_path = public
as $$
declare t text := nullif(btrim(p ->> k), '');
begin
  if t is null then
    if req then perform public.ai_agent_fail(format('Isian "%s" wajib diisi', k)); end if;
    return null;
  end if;
  if t !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform public.ai_agent_fail(format('Isian "%s" harus berupa id (UUID) dari hasil pencarian', k));
  end if;
  return t::uuid;
end $$;

-- ── Pencarian bahan / tindakan berdasarkan nama (tegas bila ambigu) ──────────
create or replace function public.ai_agent_bahan(p_clinic uuid, p_ref text)
returns public.master_bahan language plpgsql stable security definer set search_path = public, extensions
as $$
declare r public.master_bahan; n text := public.ai_agent_norm(p_ref); cnt int; cands jsonb; top numeric; second numeric;
begin
  if n = '' then perform public.ai_agent_fail('Nama bahan kosong'); end if;
  if n ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into r from public.master_bahan where id = n::uuid and clinic_id = p_clinic;
    if found then return r; end if;
  end if;
  select count(*) into cnt from public.master_bahan
   where clinic_id = p_clinic and (public.ai_agent_norm(nama_bahan) = n or lower(kode_bahan) = n);
  if cnt = 1 then
    select * into r from public.master_bahan where clinic_id = p_clinic and (public.ai_agent_norm(nama_bahan) = n or lower(kode_bahan) = n);
    return r;
  end if;
  if cnt = 0 then
    -- mengandung kata yang dicari (bahan aktif dulu)
    select count(*) into cnt from public.master_bahan where clinic_id = p_clinic and is_active and position(n in public.ai_agent_norm(nama_bahan)) > 0;
    if cnt = 1 then
      select * into r from public.master_bahan where clinic_id = p_clinic and is_active and position(n in public.ai_agent_norm(nama_bahan)) > 0;
      return r;
    end if;
    if cnt = 0 then
      select count(*) into cnt from public.master_bahan where clinic_id = p_clinic and position(n in public.ai_agent_norm(nama_bahan)) > 0;
      if cnt = 1 then
        select * into r from public.master_bahan where clinic_id = p_clinic and position(n in public.ai_agent_norm(nama_bahan)) > 0;
        return r;
      end if;
    end if;
  end if;
  -- kemiripan nama (salah ketik)
  select jsonb_agg(jsonb_build_object('id', id, 'nama', nama_bahan, 'satuan', satuan_dasar, 'stok', stok_saat_ini) order by s desc),
         max(s), (array_agg(s order by s desc))[2]
    into cands, top, second
    from (select b.*, greatest(similarity(public.ai_agent_norm(nama_bahan), n), case when position(n in public.ai_agent_norm(nama_bahan)) > 0 then 0.6 else 0 end) s
            from public.master_bahan b where clinic_id = p_clinic) x
   where s >= 0.25;
  if cands is null then perform public.ai_agent_fail(format('Bahan "%s" tidak ditemukan. Gunakan alat cari_bahan atau tambahkan sebagai bahan baru.', p_ref)); end if;
  if top >= 0.55 and (second is null or top - second >= 0.15) and jsonb_array_length(cands) >= 1 then
    select * into r from public.master_bahan where id = ((cands -> 0) ->> 'id')::uuid;
    return r;
  end if;
  perform public.ai_agent_fail(format('Nama bahan "%s" ambigu atau belum pasti. Pilih salah satu kandidat (pakai id-nya) atau tanyakan admin.', p_ref),
                               (select jsonb_agg(c) from (select c from jsonb_array_elements(cands) c limit 5) q));
  return r;
end $$;

create or replace function public.ai_agent_tindakan(p_clinic uuid, p_ref text)
returns public.treatments language plpgsql stable security definer set search_path = public, extensions
as $$
declare r public.treatments; n text := public.ai_agent_norm(p_ref); cnt int; cands jsonb; top numeric; second numeric;
begin
  if n = '' then perform public.ai_agent_fail('Nama tindakan kosong'); end if;
  if n ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into r from public.treatments where id = n::uuid and clinic_id = p_clinic;
    if found then return r; end if;
  end if;
  select count(*) into cnt from public.treatments
   where clinic_id = p_clinic and (public.ai_agent_norm(nama_treatment) = n or lower(kode_treatment) = n);
  if cnt = 1 then
    select * into r from public.treatments where clinic_id = p_clinic and (public.ai_agent_norm(nama_treatment) = n or lower(kode_treatment) = n);
    return r;
  end if;
  if cnt = 0 then
    select count(*) into cnt from public.treatments where clinic_id = p_clinic and is_active and position(n in public.ai_agent_norm(nama_treatment)) > 0;
    if cnt = 1 then
      select * into r from public.treatments where clinic_id = p_clinic and is_active and position(n in public.ai_agent_norm(nama_treatment)) > 0;
      return r;
    end if;
  end if;
  select jsonb_agg(jsonb_build_object('id', id, 'nama', nama_treatment, 'kode', kode_treatment, 'harga', harga_dasar) order by s desc),
         max(s), (array_agg(s order by s desc))[2]
    into cands, top, second
    from (select t.*, greatest(similarity(public.ai_agent_norm(nama_treatment), n), case when position(n in public.ai_agent_norm(nama_treatment)) > 0 then 0.6 else 0 end) s
            from public.treatments t where clinic_id = p_clinic) x
   where s >= 0.25;
  if cands is null then perform public.ai_agent_fail(format('Tindakan "%s" tidak ditemukan. Gunakan alat cari_tindakan.', p_ref)); end if;
  if top >= 0.55 and (second is null or top - second >= 0.15) then
    select * into r from public.treatments where id = ((cands -> 0) ->> 'id')::uuid;
    return r;
  end if;
  perform public.ai_agent_fail(format('Nama tindakan "%s" ambigu atau belum pasti. Pilih salah satu kandidat (pakai id-nya).', p_ref),
                               (select jsonb_agg(c) from (select c from jsonb_array_elements(cands) c limit 5) q));
  return r;
end $$;

-- ═════════════ USULAN (propose): validasi + normalisasi + pratinjau ═════════════
-- Setiap fungsi p_<jenis> mengembalikan {args, preview}; args sudah dinormalisasi (id terselesaikan) dan itulah yang dijalankan nanti.
create or replace function public.ai_agent_p_bahan_tambah(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  nama text := public.ai_agent_txt(a, 'nama', 120, true); sat text := public.ai_agent_txt(a, 'satuan_dasar', 30, true);
  kat text := public.ai_agent_txt(a, 'kategori', 60); sup text := public.ai_agent_txt(a, 'supplier', 120);
  sbeli text := public.ai_agent_txt(a, 'satuan_beli', 30); kode text := public.ai_agent_txt(a, 'kode_bahan', 50);
  stok numeric := public.ai_agent_num(a, 'stok_awal', 0, 1000000000, false, 0);
  hrg numeric := public.ai_agent_num(a, 'harga_per_satuan', 0, 1000000000, false, null);
  smin numeric := public.ai_agent_num(a, 'stok_minimum', 0, 1000000000, false, 0);
  fk numeric := public.ai_agent_num(a, 'faktor_konversi', 0.0001, 100000, false, 1);
  ex public.master_bahan; sim record; warn jsonb := '[]'; rinc jsonb := '[]';
begin
  select * into ex from public.master_bahan where clinic_id = v_clinic and public.ai_agent_norm(nama_bahan) = public.ai_agent_norm(nama);
  if found then
    perform public.ai_agent_fail(format('Bahan "%s" sudah ada (stok %s %s). Untuk menambah stok pakai stok_masuk; untuk mengubah data pakai bahan_ubah.',
      ex.nama_bahan, public.ai_agent_q(ex.stok_saat_ini), ex.satuan_dasar), jsonb_build_array(jsonb_build_object('id', ex.id, 'nama', ex.nama_bahan)));
  end if;
  if kode is not null and exists (select 1 from public.master_bahan where clinic_id = v_clinic and lower(kode_bahan) = lower(kode)) then
    perform public.ai_agent_fail(format('Kode bahan "%s" sudah dipakai', kode));
  end if;
  select nama_bahan, similarity(public.ai_agent_norm(nama_bahan), public.ai_agent_norm(nama)) s into sim
    from public.master_bahan where clinic_id = v_clinic and similarity(public.ai_agent_norm(nama_bahan), public.ai_agent_norm(nama)) >= 0.6
   order by 2 desc limit 1;
  if found then warn := warn || to_jsonb(format('Mirip dengan bahan yang sudah ada: "%s". Pastikan ini bukan bahan yang sama.', sim.nama_bahan)); end if;
  if stok > 0 and hrg is null then
    warn := warn || to_jsonb('Harga per satuan belum diisi: HPP bahan ini dihitung Rp 0 sampai ada pembelian dengan harga.'::text);
  end if;
  rinc := rinc || to_jsonb(format('Satuan: %s%s', sat, case when sbeli is not null then format(' (beli per %s, 1 %s = %s %s)', sbeli, sbeli, public.ai_agent_q(fk), sat) else '' end));
  if kat is not null then rinc := rinc || to_jsonb('Kategori: ' || kat); end if;
  rinc := rinc || to_jsonb(format('Stok awal: %s %s%s', public.ai_agent_q(stok), sat, case when hrg is not null and stok > 0 then format(' @ %s (nilai %s)', public.ai_agent_rp(hrg), public.ai_agent_rp(hrg * stok)) else '' end));
  rinc := rinc || to_jsonb(format('Stok minimum: %s %s', public.ai_agent_q(smin), sat));
  if sup is not null then rinc := rinc || to_jsonb('Pemasok: ' || sup); end if;
  return jsonb_build_object(
    'args', jsonb_strip_nulls(jsonb_build_object('nama', nama, 'satuan_dasar', sat, 'kategori', kat, 'supplier', sup, 'satuan_beli', sbeli,
      'kode_bahan', kode, 'stok_awal', stok, 'harga_per_satuan', hrg, 'stok_minimum', smin, 'faktor_konversi', fk)),
    'preview', jsonb_build_object('judul', 'Tambah bahan baru: ' || nama, 'rincian', rinc, 'peringatan', warn, 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_bahan_ubah(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  b public.master_bahan := public.ai_agent_bahan(v_clinic, a ->> 'bahan');
  ch jsonb := '{}'; rinc jsonb := '[]'; warn jsonb := '[]'; v text; nn numeric; bb boolean;
begin
  if a ? 'nama' then
    v := public.ai_agent_txt(a, 'nama', 120, true);
    if public.ai_agent_norm(v) <> public.ai_agent_norm(b.nama_bahan) then
      if exists (select 1 from public.master_bahan where clinic_id = v_clinic and id <> b.id and public.ai_agent_norm(nama_bahan) = public.ai_agent_norm(v)) then
        perform public.ai_agent_fail(format('Sudah ada bahan lain bernama "%s"', v));
      end if;
      ch := ch || jsonb_build_object('nama_bahan', v); rinc := rinc || to_jsonb(format('Nama: %s → %s', b.nama_bahan, v));
    end if;
  end if;
  if a ? 'satuan_dasar' then
    v := public.ai_agent_txt(a, 'satuan_dasar', 30, true);
    if v <> b.satuan_dasar then
      ch := ch || jsonb_build_object('satuan_dasar', v); rinc := rinc || to_jsonb(format('Satuan dasar: %s → %s', b.satuan_dasar, v));
      if b.stok_saat_ini <> 0 then warn := warn || to_jsonb(format('Mengubah satuan dasar TIDAK mengonversi stok yang ada (%s %s sekarang). Gunakan stok opname bila angkanya perlu disesuaikan.', public.ai_agent_q(b.stok_saat_ini), b.satuan_dasar)); end if;
    end if;
  end if;
  if a ? 'kategori' then v := public.ai_agent_txt(a, 'kategori', 60);
    if v is distinct from b.kategori then ch := ch || jsonb_build_object('kategori', v); rinc := rinc || to_jsonb(format('Kategori: %s → %s', coalesce(b.kategori, '-'), coalesce(v, '-'))); end if; end if;
  if a ? 'supplier' then v := public.ai_agent_txt(a, 'supplier', 120);
    if v is distinct from b.supplier then ch := ch || jsonb_build_object('supplier', v); rinc := rinc || to_jsonb(format('Pemasok: %s → %s', coalesce(b.supplier, '-'), coalesce(v, '-'))); end if; end if;
  if a ? 'satuan_beli' then v := public.ai_agent_txt(a, 'satuan_beli', 30);
    if v is distinct from b.satuan_beli then ch := ch || jsonb_build_object('satuan_beli', v); rinc := rinc || to_jsonb(format('Satuan beli: %s → %s', coalesce(b.satuan_beli, '-'), coalesce(v, '-'))); end if; end if;
  if a ? 'faktor_konversi' then nn := public.ai_agent_num(a, 'faktor_konversi', 0.0001, 100000, true);
    if nn is distinct from b.faktor_konversi then ch := ch || jsonb_build_object('faktor_konversi', nn); rinc := rinc || to_jsonb(format('Faktor konversi: %s → %s', public.ai_agent_q(b.faktor_konversi), public.ai_agent_q(nn))); end if; end if;
  if a ? 'stok_minimum' then nn := public.ai_agent_num(a, 'stok_minimum', 0, 1000000000, true);
    if nn is distinct from b.stok_minimum then ch := ch || jsonb_build_object('stok_minimum', nn); rinc := rinc || to_jsonb(format('Stok minimum: %s → %s %s', public.ai_agent_q(b.stok_minimum), public.ai_agent_q(nn), b.satuan_dasar)); end if; end if;
  if a ? 'is_active' then bb := public.ai_agent_bool(a, 'is_active');
    if bb is distinct from b.is_active then ch := ch || jsonb_build_object('is_active', bb); rinc := rinc || to_jsonb(case when bb then 'Diaktifkan kembali' else 'Dinonaktifkan (tidak muncul di pilihan baru; riwayat tetap)' end); end if; end if;
  if ch = '{}'::jsonb then perform public.ai_agent_fail(format('Tidak ada yang berubah pada "%s" (nilainya sudah sama).', b.nama_bahan)); end if;
  return jsonb_build_object('args', jsonb_build_object('bahan_id', b.id, 'bahan_nama', b.nama_bahan, 'perubahan', ch),
    'preview', jsonb_build_object('judul', 'Ubah data bahan: ' || b.nama_bahan, 'rincian', rinc, 'peringatan', warn, 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_stok_masuk(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  b public.master_bahan := public.ai_agent_bahan(v_clinic, a ->> 'bahan');
  jb numeric := public.ai_agent_num(a, 'jumlah_beli', 0.001, 1000000000, true);
  jd numeric; hrg numeric := public.ai_agent_num(a, 'harga_satuan_beli', 0, 1000000000, true);
  tgl date := public.ai_agent_date(a, 'tanggal', public.ai_agent_today(), date '2000-01-01', public.ai_agent_today());
  sup text := coalesce(public.ai_agent_txt(a, 'supplier', 120), null); faktur text := public.ai_agent_txt(a, 'no_faktur', 60);
  exp date; total numeric; per_dasar numeric; warn jsonb := '[]'; rinc jsonb := '[]';
begin
  jd := public.ai_agent_num(a, 'jumlah_dasar', 0.001, 1000000000, false, round(jb * coalesce(b.faktor_konversi, 1), 3));
  exp := public.ai_agent_date(a, 'tanggal_kadaluarsa', null, tgl, date '2100-01-01');
  total := jb * hrg;
  if total > 9000000000000 then perform public.ai_agent_fail('Total pembelian terlalu besar. Periksa jumlah dan harga.'); end if;
  per_dasar := total / nullif(jd, 0);
  if sup is null then sup := b.supplier; end if;
  if b.harga_rata2 > 0 and per_dasar > 0 and (per_dasar > b.harga_rata2 * 1.4 or per_dasar < b.harga_rata2 * 0.6) then
    warn := warn || to_jsonb(format('Harga per %s (%s) berbeda jauh dari harga rata-rata sekarang (%s). Pastikan harga & jumlah sudah benar.',
      b.satuan_dasar, public.ai_agent_rp(per_dasar), public.ai_agent_rp(b.harga_rata2)));
  end if;
  if faktur is not null and exists (select 1 from public.material_purchases where clinic_id = v_clinic and material_id = b.id and lower(no_faktur) = lower(faktur)) then
    warn := warn || to_jsonb(format('Faktur "%s" untuk bahan ini sudah pernah dicatat — kemungkinan duplikat.', faktur));
  elsif exists (select 1 from public.material_purchases where clinic_id = v_clinic and material_id = b.id and tanggal = tgl and jumlah_beli = jb and harga_satuan_beli = hrg) then
    warn := warn || to_jsonb('Pembelian dengan tanggal, jumlah, dan harga yang sama sudah ada — kemungkinan duplikat.'::text);
  end if;
  rinc := rinc || to_jsonb(format('Jumlah: %s %s → +%s %s ke stok', public.ai_agent_q(jb), coalesce(b.satuan_beli, b.satuan_dasar), public.ai_agent_q(jd), b.satuan_dasar));
  rinc := rinc || to_jsonb(format('Harga: %s per %s → total %s', public.ai_agent_rp(hrg), coalesce(b.satuan_beli, b.satuan_dasar), public.ai_agent_rp(total)));
  rinc := rinc || to_jsonb(format('Stok: %s → %s %s', public.ai_agent_q(b.stok_saat_ini), public.ai_agent_q(b.stok_saat_ini + jd), b.satuan_dasar));
  rinc := rinc || to_jsonb(format('Tanggal: %s%s%s', tgl, case when sup is not null then ' · Pemasok: ' || sup else '' end, case when faktur is not null then ' · Faktur: ' || faktur else '' end));
  if exp is not null then rinc := rinc || to_jsonb('Kadaluarsa: ' || exp); end if;
  return jsonb_build_object(
    'args', jsonb_strip_nulls(jsonb_build_object('bahan_id', b.id, 'bahan_nama', b.nama_bahan, 'jumlah_beli', jb, 'jumlah_dasar', jd,
      'harga_satuan_beli', hrg, 'tanggal', tgl, 'supplier', sup, 'no_faktur', faktur, 'tanggal_kadaluarsa', exp)),
    'preview', jsonb_build_object('judul', 'Stok masuk: ' || b.nama_bahan, 'rincian', rinc, 'peringatan', warn, 'risiko', 'sedang'));
end $$;

create or replace function public.ai_agent_p_stok_opname(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  b public.master_bahan := public.ai_agent_bahan(v_clinic, a ->> 'bahan');
  fisik numeric := public.ai_agent_num(a, 'stok_fisik', 0, 1000000000, true);
  cat text := public.ai_agent_txt(a, 'catatan', 300); sel numeric; warn jsonb := '[]'; rinc jsonb := '[]';
begin
  sel := fisik - b.stok_saat_ini;
  if sel = 0 then perform public.ai_agent_fail(format('Stok "%s" sudah %s %s — tidak ada selisih, opname tidak perlu.', b.nama_bahan, public.ai_agent_q(fisik), b.satuan_dasar)); end if;
  if b.stok_saat_ini > 0 and abs(sel) > b.stok_saat_ini * 0.5 then
    warn := warn || to_jsonb(format('Selisih besar (%s%% dari stok sistem). Pastikan hitungan fisik benar sebelum menyetujui.', round(abs(sel) / b.stok_saat_ini * 100)));
  end if;
  rinc := rinc || to_jsonb(format('Stok sistem: %s → fisik: %s %s (selisih %s%s)', public.ai_agent_q(b.stok_saat_ini), public.ai_agent_q(fisik), b.satuan_dasar, case when sel > 0 then '+' else '' end, public.ai_agent_q(sel)));
  rinc := rinc || to_jsonb(format('Perkiraan nilai selisih: %s (harga rata-rata %s)', public.ai_agent_rp(sel * b.harga_rata2), public.ai_agent_rp(b.harga_rata2)));
  if cat is not null then rinc := rinc || to_jsonb('Catatan: ' || cat); end if;
  return jsonb_build_object('args', jsonb_strip_nulls(jsonb_build_object('bahan_id', b.id, 'bahan_nama', b.nama_bahan, 'stok_fisik', fisik, 'stok_sistem_saat_usul', b.stok_saat_ini, 'catatan', cat)),
    'preview', jsonb_build_object('judul', 'Stok opname: ' || b.nama_bahan, 'rincian', rinc, 'peringatan', warn, 'risiko', 'sedang'));
end $$;

create or replace function public.ai_agent_p_pengeluaran_catat(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  cats text[] := array['Bahan & Alat Habis Pakai', 'Alat Medis', 'Lab Gigi', 'Gaji', 'Sewa', 'Utilitas', 'Pemeliharaan', 'Marketing', 'Administrasi', 'Lainnya'];
  tgl date := public.ai_agent_date(a, 'tanggal', public.ai_agent_today(), date '2000-01-01', public.ai_agent_today());
  kat text := public.ai_agent_txt(a, 'kategori', 100, true); des text := public.ai_agent_txt(a, 'deskripsi', 300, true);
  jml numeric := public.ai_agent_num(a, 'jumlah', 1, 10000000000, true);
  pem text := public.ai_agent_txt(a, 'pemasok', 120); nota text := public.ai_agent_txt(a, 'nomor_nota', 60);
  warn jsonb := '[]'; rinc jsonb := '[]'; dup record;
begin
  if not kat = any (cats) then
    warn := warn || to_jsonb(format('Kategori "%s" tidak dikenal; dicatat sebagai "Lainnya".', kat)); kat := 'Lainnya';
  end if;
  select tanggal_expense, jumlah, deskripsi into dup from public.expenses
   where clinic_id = v_clinic and ((nota is not null and lower(nomor_nota) = lower(nota))
      or (jumlah = jml and abs(tanggal_expense - tgl) <= 3)) order by tanggal_expense desc limit 1;
  if found then warn := warn || to_jsonb(format('Mirip dengan pengeluaran yang sudah ada: %s, %s, "%s" — kemungkinan dicatat dua kali.', dup.tanggal_expense, public.ai_agent_rp(dup.jumlah), left(dup.deskripsi, 60))); end if;
  rinc := rinc || to_jsonb(format('%s · %s · %s', tgl, kat, public.ai_agent_rp(jml)));
  rinc := rinc || to_jsonb(des);
  if pem is not null or nota is not null then rinc := rinc || to_jsonb(concat_ws(' · ', case when pem is not null then 'Pemasok: ' || pem end, case when nota is not null then 'Nota: ' || nota end)); end if;
  return jsonb_build_object('args', jsonb_strip_nulls(jsonb_build_object('tanggal', tgl, 'kategori', kat, 'deskripsi', des, 'jumlah', jml, 'pemasok', pem, 'nomor_nota', nota)),
    'preview', jsonb_build_object('judul', 'Catat pengeluaran ' || public.ai_agent_rp(jml), 'rincian', rinc, 'peringatan', warn, 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_pengeluaran_ubah(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  cats text[] := array['Bahan & Alat Habis Pakai', 'Alat Medis', 'Lab Gigi', 'Gaji', 'Sewa', 'Utilitas', 'Pemeliharaan', 'Marketing', 'Administrasi', 'Lainnya'];
  id_ uuid := public.ai_agent_uuid(a, 'id'); e public.expenses; ch jsonb := '{}'; rinc jsonb := '[]'; v text; d date; n numeric;
begin
  select * into e from public.expenses where id = id_ and clinic_id = v_clinic;
  if not found then perform public.ai_agent_fail('Pengeluaran tidak ditemukan. Cari dulu dengan alat cari_pengeluaran.'); end if;
  if a ? 'tanggal' then d := public.ai_agent_date(a, 'tanggal', null, date '2000-01-01', public.ai_agent_today());
    if d is distinct from e.tanggal_expense then ch := ch || jsonb_build_object('tanggal_expense', d); rinc := rinc || to_jsonb(format('Tanggal: %s → %s', e.tanggal_expense, d)); end if; end if;
  if a ? 'kategori' then v := public.ai_agent_txt(a, 'kategori', 100, true);
    if not v = any (cats) then perform public.ai_agent_fail(format('Kategori "%s" tidak dikenal. Pilihan: %s', v, array_to_string(cats, '; '))); end if;
    if v is distinct from e.kategori then ch := ch || jsonb_build_object('kategori', v); rinc := rinc || to_jsonb(format('Kategori: %s → %s', e.kategori, v)); end if; end if;
  if a ? 'deskripsi' then v := public.ai_agent_txt(a, 'deskripsi', 300, true);
    if v is distinct from e.deskripsi then ch := ch || jsonb_build_object('deskripsi', v); rinc := rinc || to_jsonb(format('Deskripsi: "%s" → "%s"', left(e.deskripsi, 60), left(v, 60))); end if; end if;
  if a ? 'jumlah' then n := public.ai_agent_num(a, 'jumlah', 1, 10000000000, true);
    if n is distinct from e.jumlah then ch := ch || jsonb_build_object('jumlah', n); rinc := rinc || to_jsonb(format('Jumlah: %s → %s', public.ai_agent_rp(e.jumlah), public.ai_agent_rp(n))); end if; end if;
  if a ? 'pemasok' then v := public.ai_agent_txt(a, 'pemasok', 120);
    if v is distinct from e.pemasok then ch := ch || jsonb_build_object('pemasok', v); rinc := rinc || to_jsonb(format('Pemasok: %s → %s', coalesce(e.pemasok, '-'), coalesce(v, '-'))); end if; end if;
  if a ? 'nomor_nota' then v := public.ai_agent_txt(a, 'nomor_nota', 60);
    if v is distinct from e.nomor_nota then ch := ch || jsonb_build_object('nomor_nota', v); rinc := rinc || to_jsonb(format('Nomor nota: %s → %s', coalesce(e.nomor_nota, '-'), coalesce(v, '-'))); end if; end if;
  if ch = '{}'::jsonb then perform public.ai_agent_fail('Tidak ada yang berubah (nilainya sudah sama).'); end if;
  return jsonb_build_object('args', jsonb_build_object('id', e.id, 'perubahan', ch),
    'preview', jsonb_build_object('judul', format('Ubah pengeluaran %s (%s)', public.ai_agent_rp(e.jumlah), e.tanggal_expense), 'rincian', rinc, 'peringatan', '[]'::jsonb, 'risiko', 'sedang'));
end $$;

create or replace function public.ai_agent_p_pengeluaran_hapus(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare id_ uuid := public.ai_agent_uuid(a, 'id'); e public.expenses;
begin
  select * into e from public.expenses where id = id_ and clinic_id = v_clinic;
  if not found then perform public.ai_agent_fail('Pengeluaran tidak ditemukan. Cari dulu dengan alat cari_pengeluaran.'); end if;
  return jsonb_build_object('args', jsonb_build_object('id', e.id),
    'preview', jsonb_build_object('judul', format('Hapus pengeluaran %s', public.ai_agent_rp(e.jumlah)),
      'rincian', jsonb_build_array(format('%s · %s · %s', e.tanggal_expense, e.kategori, public.ai_agent_rp(e.jumlah)), e.deskripsi),
      'peringatan', jsonb_build_array('Pengeluaran ini akan hilang dari laporan laba. Bisa dibatalkan (dikembalikan) setelah dihapus.'), 'risiko', 'tinggi'));
end $$;

create or replace function public.ai_agent_p_overhead_atur(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  nama text := public.ai_agent_txt(a, 'nama_biaya', 120, true); o public.overhead_costs; rinc jsonb := '[]'; ch jsonb := '{}';
  jml numeric := public.ai_agent_num(a, 'jumlah_bulanan', 0, 1000000000000, false, null);
  kat text; cat text; akt boolean := public.ai_agent_bool(a, 'aktif', null);
begin
  select * into o from public.overhead_costs where clinic_id = v_clinic and public.ai_agent_norm(nama_biaya) = public.ai_agent_norm(nama) limit 1;
  if not found then
    if jml is null then perform public.ai_agent_fail('Overhead baru perlu "jumlah_bulanan".'); end if;
    kat := public.ai_agent_txt(a, 'kategori', 60); cat := public.ai_agent_txt(a, 'catatan', 300);
    return jsonb_build_object('args', jsonb_strip_nulls(jsonb_build_object('nama_biaya', nama, 'jumlah_bulanan', jml, 'kategori', kat, 'catatan', cat, 'aktif', coalesce(akt, true), 'baru', true)),
      'preview', jsonb_build_object('judul', 'Tambah biaya overhead: ' || nama,
        'rincian', jsonb_build_array(format('%s per bulan%s', public.ai_agent_rp(jml), case when kat is not null then ' · ' || kat else '' end)),
        'peringatan', '[]'::jsonb, 'risiko', 'rendah'));
  end if;
  if jml is not null and jml is distinct from o.jumlah_bulanan then ch := ch || jsonb_build_object('jumlah_bulanan', jml); rinc := rinc || to_jsonb(format('Jumlah/bulan: %s → %s', public.ai_agent_rp(o.jumlah_bulanan), public.ai_agent_rp(jml))); end if;
  if a ? 'kategori' then kat := public.ai_agent_txt(a, 'kategori', 60); if kat is distinct from o.kategori then ch := ch || jsonb_build_object('kategori', kat); rinc := rinc || to_jsonb(format('Kategori: %s → %s', coalesce(o.kategori, '-'), coalesce(kat, '-'))); end if; end if;
  if a ? 'catatan' then cat := public.ai_agent_txt(a, 'catatan', 300); if cat is distinct from o.catatan then ch := ch || jsonb_build_object('catatan', cat); rinc := rinc || to_jsonb('Catatan diperbarui'::text); end if; end if;
  if akt is not null and akt is distinct from o.aktif then ch := ch || jsonb_build_object('aktif', akt); rinc := rinc || to_jsonb(case when akt then 'Diaktifkan' else 'Dinonaktifkan (tidak dihitung ke overhead bulanan)' end); end if;
  if ch = '{}'::jsonb then perform public.ai_agent_fail(format('Tidak ada yang berubah pada overhead "%s".', o.nama_biaya)); end if;
  return jsonb_build_object('args', jsonb_build_object('id', o.id, 'nama_biaya', o.nama_biaya, 'perubahan', ch, 'baru', false),
    'preview', jsonb_build_object('judul', 'Ubah biaya overhead: ' || o.nama_biaya, 'rincian', rinc, 'peringatan', '[]'::jsonb, 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_overhead_target(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  per date := date_trunc('month', public.ai_agent_date(a, 'periode', public.ai_agent_today(), date '2000-01-01', date '2100-01-01'))::date;
  cur public.overhead_monthly_target; total numeric; bobot numeric; cat text := public.ai_agent_txt(a, 'catatan', 300); rinc jsonb := '[]';
begin
  select * into cur from public.overhead_monthly_target where clinic_id = v_clinic and periode = per;
  total := public.ai_agent_num(a, 'total_overhead_bulanan', 0, 1000000000000, false,
            (select coalesce(sum(jumlah_bulanan), 0) from public.overhead_costs where clinic_id = v_clinic and aktif));
  bobot := public.ai_agent_num(a, 'total_bobot_estimasi', 0.01, 100000000, false, cur.total_bobot_estimasi);
  if bobot is null then perform public.ai_agent_fail('Target bulan ini belum ada: isi "total_bobot_estimasi" (estimasi jumlah bobot tindakan sebulan).'); end if;
  rinc := rinc || to_jsonb(format('Periode: %s', to_char(per, 'YYYY-MM')));
  rinc := rinc || to_jsonb(format('Total overhead: %s%s', public.ai_agent_rp(total), case when cur.id is not null then format(' (sebelumnya %s)', public.ai_agent_rp(cur.total_overhead_bulanan)) else '' end));
  rinc := rinc || to_jsonb(format('Bobot estimasi: %s → overhead per bobot %s', public.ai_agent_q(bobot), public.ai_agent_rp(total / bobot)));
  return jsonb_build_object('args', jsonb_strip_nulls(jsonb_build_object('periode', per, 'total_overhead_bulanan', total, 'total_bobot_estimasi', bobot, 'catatan', cat)),
    'preview', jsonb_build_object('judul', 'Atur target overhead ' || to_char(per, 'YYYY-MM'), 'rincian', rinc,
      'peringatan', jsonb_build_array('Target ini dipakai menghitung HPP (biaya overhead per tindakan) untuk kunjungan yang selesai sesudahnya.'), 'risiko', 'sedang'));
end $$;

create or replace function public.ai_agent_p_tindakan_harga(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  t public.treatments := public.ai_agent_tindakan(v_clinic, a ->> 'tindakan');
  baru numeric := public.ai_agent_num(a, 'harga_baru', 0, 1000000000, false, null);
  pct numeric := public.ai_agent_num(a, 'perubahan_persen', -90, 300, false, null);
  pembulatan numeric := public.ai_agent_num(a, 'pembulatan', 1, 1000000, false, 1);
  warn jsonb := '[]'; hpp numeric; rinc jsonb := '[]';
begin
  if baru is null and pct is null then perform public.ai_agent_fail('Isi "harga_baru" atau "perubahan_persen".'); end if;
  if baru is not null and pct is not null then perform public.ai_agent_fail('Isi salah satu saja: "harga_baru" atau "perubahan_persen".'); end if;
  if baru is null then baru := round(t.harga_dasar * (1 + pct / 100) / pembulatan) * pembulatan; end if;
  if baru = t.harga_dasar then perform public.ai_agent_fail(format('Harga "%s" sudah %s.', t.nama_treatment, public.ai_agent_rp(t.harga_dasar))); end if;
  select coalesce(sum(m.qty_rata2 * (1 + coalesce(m.wastage_percent, 0) / 100) * b.harga_rata2), 0) into hpp
    from public.treatment_materials m join public.master_bahan b on b.id = m.material_id where m.treatment_id = t.id;
  if hpp > 0 and baru < hpp then warn := warn || to_jsonb(format('Harga baru di bawah perkiraan biaya bahan (%s) — tindakan ini akan rugi bahan.', public.ai_agent_rp(hpp))); end if;
  if t.harga_dasar > 0 and abs(baru - t.harga_dasar) / t.harga_dasar > 0.3 then warn := warn || to_jsonb(format('Perubahan besar (%s%%). Pastikan ini disengaja.', round((baru - t.harga_dasar) / t.harga_dasar * 100))); end if;
  rinc := rinc || to_jsonb(format('%s → %s (%s%s%%)', public.ai_agent_rp(t.harga_dasar), public.ai_agent_rp(baru), case when baru > t.harga_dasar then '+' else '' end, round((baru - t.harga_dasar) / nullif(t.harga_dasar, 0) * 100, 1)));
  rinc := rinc || to_jsonb('Berlaku untuk kunjungan BARU; tagihan yang sudah tercatat tidak berubah.'::text);
  return jsonb_build_object('args', jsonb_build_object('tindakan_id', t.id, 'tindakan_nama', t.nama_treatment, 'harga_lama', t.harga_dasar, 'harga_baru', baru),
    'preview', jsonb_build_object('judul', 'Ubah harga: ' || t.nama_treatment, 'rincian', rinc, 'peringatan', warn, 'risiko', 'sedang'));
end $$;

create or replace function public.ai_agent_p_tindakan_harga_massal(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  pct numeric := public.ai_agent_num(a, 'perubahan_persen', -50, 100, true);
  pembulatan numeric := public.ai_agent_num(a, 'pembulatan', 1, 1000000, false, 1000);
  kat text := public.ai_agent_txt(a, 'kategori', 100);
  items jsonb; n int; rinc jsonb := '[]';
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nama', nama_treatment, 'harga_lama', harga_dasar,
           'harga_baru', round(harga_dasar * (1 + pct / 100) / pembulatan) * pembulatan) order by nama_treatment), '[]'::jsonb)
    into items from public.treatments
   where clinic_id = v_clinic and is_active and harga_dasar > 0 and (kat is null or public.ai_agent_norm(kategori) = public.ai_agent_norm(kat));
  -- buang yang tidak berubah setelah pembulatan
  select coalesce(jsonb_agg(i), '[]'::jsonb) into items from jsonb_array_elements(items) i where (i ->> 'harga_lama')::numeric <> (i ->> 'harga_baru')::numeric;
  n := jsonb_array_length(items);
  if n = 0 then perform public.ai_agent_fail('Tidak ada tindakan aktif yang harganya berubah dengan pengaturan ini.'); end if;
  if n > 200 then perform public.ai_agent_fail('Terlalu banyak tindakan (maks 200) dalam satu usulan. Sempitkan dengan kategori.'); end if;
  select jsonb_agg(format('%s: %s → %s', i ->> 'nama', public.ai_agent_rp((i ->> 'harga_lama')::numeric), public.ai_agent_rp((i ->> 'harga_baru')::numeric)))
    into rinc from (select i from jsonb_array_elements(items) i limit 12) q;
  if n > 12 then rinc := rinc || to_jsonb(format('… dan %s tindakan lainnya', n - 12)); end if;
  return jsonb_build_object('args', jsonb_build_object('items', items, 'perubahan_persen', pct, 'pembulatan', pembulatan, 'kategori', kat),
    'preview', jsonb_build_object('judul', format('Ubah harga %s tindakan (%s%s%%)', n, case when pct > 0 then '+' else '' end, pct), 'rincian', rinc,
      'peringatan', jsonb_build_array('Berlaku untuk kunjungan BARU; tagihan yang sudah tercatat tidak berubah. Pembulatan ke ' || public.ai_agent_rp(pembulatan) || '.'), 'risiko', 'tinggi'));
end $$;

create or replace function public.ai_agent_p_tindakan_tambah(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  nama text := public.ai_agent_txt(a, 'nama', 200, true); kode text := public.ai_agent_txt(a, 'kode', 50);
  harga numeric := public.ai_agent_num(a, 'harga_dasar', 0, 1000000000, true);
  tier text := coalesce(public.ai_agent_txt(a, 'tier', 10), 'sedang'); kat text := public.ai_agent_txt(a, 'kategori', 100);
  dur numeric := public.ai_agent_num(a, 'durasi_menit', 1, 1440, false, null); ex public.treatments;
begin
  if tier not in ('ringan', 'sedang', 'berat') then perform public.ai_agent_fail('Tier harus ringan, sedang, atau berat.'); end if;
  select * into ex from public.treatments where clinic_id = v_clinic and public.ai_agent_norm(nama_treatment) = public.ai_agent_norm(nama);
  if found then perform public.ai_agent_fail(format('Tindakan "%s" sudah ada (%s). Pakai tindakan_harga untuk mengubah harganya.', ex.nama_treatment, public.ai_agent_rp(ex.harga_dasar))); end if;
  if kode is not null and exists (select 1 from public.treatments where clinic_id = v_clinic and lower(kode_treatment) = lower(kode)) then
    perform public.ai_agent_fail(format('Kode tindakan "%s" sudah dipakai', kode)); end if;
  return jsonb_build_object('args', jsonb_strip_nulls(jsonb_build_object('nama', nama, 'kode', kode, 'harga_dasar', harga, 'tier', tier, 'kategori', kat, 'durasi_menit', dur)),
    'preview', jsonb_build_object('judul', 'Tambah tindakan baru: ' || nama,
      'rincian', jsonb_build_array(format('Harga %s · tier %s%s%s', public.ai_agent_rp(harga), tier, case when kat is not null then ' · ' || kat else '' end, case when dur is not null then format(' · %s menit', dur) else '' end)),
      'peringatan', jsonb_build_array('Tindakan baru belum punya resep bahan; atur dengan resep_bahan_atur agar HPP terhitung.'), 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_tindakan_ubah(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  t public.treatments := public.ai_agent_tindakan(v_clinic, a ->> 'tindakan'); ch jsonb := '{}'; rinc jsonb := '[]'; v text; n numeric; bb boolean;
begin
  if a ? 'nama' then v := public.ai_agent_txt(a, 'nama', 200, true);
    if public.ai_agent_norm(v) <> public.ai_agent_norm(t.nama_treatment) then
      if exists (select 1 from public.treatments where clinic_id = v_clinic and id <> t.id and public.ai_agent_norm(nama_treatment) = public.ai_agent_norm(v)) then
        perform public.ai_agent_fail(format('Sudah ada tindakan lain bernama "%s"', v)); end if;
      ch := ch || jsonb_build_object('nama_treatment', v); rinc := rinc || to_jsonb(format('Nama: %s → %s', t.nama_treatment, v)); end if; end if;
  if a ? 'kategori' then v := public.ai_agent_txt(a, 'kategori', 100);
    if v is distinct from t.kategori then ch := ch || jsonb_build_object('kategori', v); rinc := rinc || to_jsonb(format('Kategori: %s → %s', coalesce(t.kategori, '-'), coalesce(v, '-'))); end if; end if;
  if a ? 'tier' then v := public.ai_agent_txt(a, 'tier', 10, true);
    if v not in ('ringan', 'sedang', 'berat') then perform public.ai_agent_fail('Tier harus ringan, sedang, atau berat.'); end if;
    if v is distinct from t.tier then ch := ch || jsonb_build_object('tier', v); rinc := rinc || to_jsonb(format('Tier: %s → %s', t.tier, v)); end if; end if;
  if a ? 'durasi_menit' then n := public.ai_agent_num(a, 'durasi_menit', 1, 1440, true);
    if n is distinct from t.durasi_menit::numeric then ch := ch || jsonb_build_object('durasi_menit', n); rinc := rinc || to_jsonb(format('Durasi: %s → %s menit', coalesce(t.durasi_menit::text, '-'), n)); end if; end if;
  if a ? 'is_active' then bb := public.ai_agent_bool(a, 'is_active');
    if bb is distinct from t.is_active then ch := ch || jsonb_build_object('is_active', bb); rinc := rinc || to_jsonb(case when bb then 'Diaktifkan kembali' else 'Dinonaktifkan (tidak muncul di pilihan tindakan baru)' end); end if; end if;
  if ch = '{}'::jsonb then perform public.ai_agent_fail(format('Tidak ada yang berubah pada "%s".', t.nama_treatment)); end if;
  return jsonb_build_object('args', jsonb_build_object('tindakan_id', t.id, 'tindakan_nama', t.nama_treatment, 'perubahan', ch),
    'preview', jsonb_build_object('judul', 'Ubah tindakan: ' || t.nama_treatment, 'rincian', rinc, 'peringatan', '[]'::jsonb, 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_resep_atur(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  t public.treatments := public.ai_agent_tindakan(v_clinic, a ->> 'tindakan');
  b public.master_bahan := public.ai_agent_bahan(v_clinic, a ->> 'bahan');
  qty numeric := public.ai_agent_num(a, 'qty_rata2', 0.0001, 1000000, true);
  wajib boolean := public.ai_agent_bool(a, 'wajib', true); was numeric := public.ai_agent_num(a, 'wastage_percent', 0, 100, false, 0);
  cat text := public.ai_agent_txt(a, 'catatan', 300); cur public.treatment_materials; warn jsonb := '[]'; rinc jsonb := '[]';
begin
  select * into cur from public.treatment_materials where treatment_id = t.id and material_id = b.id;
  if not b.is_active then warn := warn || to_jsonb('Bahan ini nonaktif.'::text); end if;
  rinc := rinc || to_jsonb(format('%s memakai %s %s %s%s per tindakan%s', t.nama_treatment, public.ai_agent_q(qty), b.satuan_dasar, b.nama_bahan,
            case when was > 0 then format(' (+%s%% susut)', public.ai_agent_q(was)) else '' end, case when wajib then '' else ' (opsional)' end));
  rinc := rinc || to_jsonb(format('Perkiraan biaya bahan: %s per tindakan (harga rata-rata %s)', public.ai_agent_rp(qty * (1 + was / 100) * b.harga_rata2), public.ai_agent_rp(b.harga_rata2)));
  if cur.id is not null then rinc := rinc || to_jsonb(format('Sebelumnya: %s %s', public.ai_agent_q(cur.qty_rata2), b.satuan_dasar)); end if;
  return jsonb_build_object('args', jsonb_strip_nulls(jsonb_build_object('tindakan_id', t.id, 'tindakan_nama', t.nama_treatment, 'bahan_id', b.id, 'bahan_nama', b.nama_bahan,
      'qty_rata2', qty, 'wajib', wajib, 'wastage_percent', was, 'catatan', cat)),
    'preview', jsonb_build_object('judul', case when cur.id is null then 'Tambah resep bahan: ' else 'Ubah resep bahan: ' end || t.nama_treatment, 'rincian', rinc, 'peringatan', warn, 'risiko', 'rendah'));
end $$;

create or replace function public.ai_agent_p_resep_hapus(v_clinic uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  t public.treatments := public.ai_agent_tindakan(v_clinic, a ->> 'tindakan');
  b public.master_bahan := public.ai_agent_bahan(v_clinic, a ->> 'bahan'); cur public.treatment_materials;
begin
  select * into cur from public.treatment_materials where treatment_id = t.id and material_id = b.id;
  if not found then perform public.ai_agent_fail(format('"%s" tidak ada di resep "%s".', b.nama_bahan, t.nama_treatment)); end if;
  return jsonb_build_object('args', jsonb_build_object('tindakan_id', t.id, 'tindakan_nama', t.nama_treatment, 'bahan_id', b.id, 'bahan_nama', b.nama_bahan),
    'preview', jsonb_build_object('judul', format('Hapus %s dari resep %s', b.nama_bahan, t.nama_treatment),
      'rincian', jsonb_build_array(format('%s %s per tindakan akan dihapus dari perhitungan HPP', public.ai_agent_q(cur.qty_rata2), b.satuan_dasar)),
      'peringatan', '[]'::jsonb, 'risiko', 'sedang'));
end $$;

-- ═════════════ EKSEKUSI (apply) — kondisi dibaca ulang saat disetujui ═════════════
-- Mengembalikan {hasil, sebelum, bisa_batal}.
create or replace function public.ai_agent_x_bahan_tambah(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  nama text := a ->> 'nama'; stok numeric := coalesce((a ->> 'stok_awal')::numeric, 0); hrg numeric := (a ->> 'harga_per_satuan')::numeric;
  kode text := a ->> 'kode_bahan'; v_id uuid; v_pid uuid; n int;
begin
  if exists (select 1 from public.master_bahan where clinic_id = v_clinic and public.ai_agent_norm(nama_bahan) = public.ai_agent_norm(nama)) then
    perform public.ai_agent_fail(format('Bahan "%s" sudah ada (mungkin baru ditambahkan). Usulan dibatalkan.', nama));
  end if;
  if kode is null then
    select coalesce(max(substring(kode_bahan from '^BHN-([0-9]+)$')::int), 0) + 1 into n from public.master_bahan where clinic_id = v_clinic;
    loop
      kode := 'BHN-' || lpad(n::text, 4, '0');
      exit when not exists (select 1 from public.master_bahan where clinic_id = v_clinic and kode_bahan = kode);
      n := n + 1;
    end loop;
  elsif exists (select 1 from public.master_bahan where clinic_id = v_clinic and lower(kode_bahan) = lower(kode)) then
    perform public.ai_agent_fail(format('Kode bahan "%s" sudah dipakai', kode));
  end if;
  insert into public.master_bahan (clinic_id, kode_bahan, nama_bahan, kategori, satuan_dasar, satuan_beli, faktor_konversi, stok_minimum, supplier, harga_rata2, stok_saat_ini)
  values (v_clinic, kode, nama, a ->> 'kategori', a ->> 'satuan_dasar', a ->> 'satuan_beli', coalesce((a ->> 'faktor_konversi')::numeric, 1),
          coalesce((a ->> 'stok_minimum')::numeric, 0), a ->> 'supplier', 0, 0)
  returning id into v_id;
  if stok > 0 then
    insert into public.material_purchases (clinic_id, material_id, tanggal, jumlah_beli, jumlah_dasar, harga_satuan_beli, supplier, no_faktur, recorded_by)
    values (v_clinic, v_id, public.ai_agent_today(), stok, stok, coalesce(hrg, 0), a ->> 'supplier', 'Stok awal', v_user) returning id into v_pid;
  end if;
  return jsonb_build_object('hasil', jsonb_build_object('bahan_id', v_id, 'kode_bahan', kode, 'purchase_id', v_pid), 'sebelum', null, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_bahan_ubah(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare b public.master_bahan; ch jsonb := a -> 'perubahan'; old jsonb := '{}'; k text;
begin
  select * into b from public.master_bahan where id = (a ->> 'bahan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Bahan sudah tidak ada.'); end if;
  for k in select jsonb_object_keys(ch) loop old := old || jsonb_build_object(k, to_jsonb(b) -> k); end loop;
  update public.master_bahan set
    nama_bahan = coalesce(ch ->> 'nama_bahan', nama_bahan), satuan_dasar = coalesce(ch ->> 'satuan_dasar', satuan_dasar),
    kategori = case when ch ? 'kategori' then ch ->> 'kategori' else kategori end,
    supplier = case when ch ? 'supplier' then ch ->> 'supplier' else supplier end,
    satuan_beli = case when ch ? 'satuan_beli' then ch ->> 'satuan_beli' else satuan_beli end,
    faktor_konversi = coalesce((ch ->> 'faktor_konversi')::numeric, faktor_konversi),
    stok_minimum = coalesce((ch ->> 'stok_minimum')::numeric, stok_minimum),
    is_active = coalesce((ch ->> 'is_active')::boolean, is_active), updated_at = now()
  where id = b.id;
  return jsonb_build_object('hasil', jsonb_build_object('bahan_id', b.id), 'sebelum', old, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_stok_masuk(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare b public.master_bahan; v_pid uuid; v_bid uuid; jb numeric := (a ->> 'jumlah_beli')::numeric; jd numeric := (a ->> 'jumlah_dasar')::numeric; hrg numeric := (a ->> 'harga_satuan_beli')::numeric;
begin
  select * into b from public.master_bahan where id = (a ->> 'bahan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Bahan sudah tidak ada.'); end if;
  if not b.is_active then perform public.ai_agent_fail(format('Bahan "%s" nonaktif. Aktifkan dulu dengan bahan_ubah.', b.nama_bahan)); end if;
  insert into public.material_purchases (clinic_id, material_id, tanggal, jumlah_beli, jumlah_dasar, harga_satuan_beli, supplier, no_faktur, tanggal_kadaluarsa, recorded_by)
  values (v_clinic, b.id, (a ->> 'tanggal')::date, jb, jd, hrg, a ->> 'supplier', a ->> 'no_faktur', (a ->> 'tanggal_kadaluarsa')::date, v_user)
  returning id into v_pid;
  if a ->> 'tanggal_kadaluarsa' is not null then
    insert into public.material_batches (clinic_id, material_id, no_batch, tanggal_masuk, tanggal_kadaluarsa, qty_awal, qty_sisa, harga_satuan)
    values (v_clinic, b.id, coalesce(a ->> 'no_faktur', 'AI-' || to_char(now(), 'YYMMDDHH24MISS')), (a ->> 'tanggal')::date, (a ->> 'tanggal_kadaluarsa')::date, jd, jd, (jb * hrg) / nullif(jd, 0))
    returning id into v_bid;
  end if;
  return jsonb_build_object('hasil', jsonb_build_object('bahan_id', b.id, 'purchase_id', v_pid, 'batch_id', v_bid,
    'stok_baru', (select stok_saat_ini from public.master_bahan where id = b.id)), 'sebelum', jsonb_build_object('stok', b.stok_saat_ini, 'harga_rata2', b.harga_rata2), 'bisa_batal', false);
end $$;

create or replace function public.ai_agent_x_stok_opname(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare b public.master_bahan; fisik numeric := (a ->> 'stok_fisik')::numeric; sel numeric; v_oid uuid; v_mid uuid;
begin
  select * into b from public.master_bahan where id = (a ->> 'bahan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Bahan sudah tidak ada.'); end if;
  sel := fisik - b.stok_saat_ini;
  if sel = 0 then perform public.ai_agent_fail('Stok sistem sudah sama dengan stok fisik — tidak ada yang perlu disesuaikan.'); end if;
  insert into public.stok_opname (clinic_id, tanggal, material_id, stok_sistem, stok_fisik, catatan, dilakukan_oleh)
  values (v_clinic, public.ai_agent_today(), b.id, b.stok_saat_ini, fisik, coalesce(a ->> 'catatan', 'Opname lewat Denti Agen'), v_user) returning id into v_oid;
  update public.master_bahan set stok_saat_ini = fisik, updated_at = now() where id = b.id;
  insert into public.stok_movements (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, referensi_tipe, referensi_id, harga_saat_itu, catatan, created_by)
  values (v_clinic, b.id, 'opname', sel, b.stok_saat_ini, fisik, 'opname', v_oid, b.harga_rata2, coalesce(a ->> 'catatan', 'Penyesuaian stok opname (Denti Agen)'), v_user) returning id into v_mid;
  return jsonb_build_object('hasil', jsonb_build_object('bahan_id', b.id, 'opname_id', v_oid, 'movement_id', v_mid, 'selisih', sel),
    'sebelum', jsonb_build_object('stok', b.stok_saat_ini), 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_pengeluaran_catat(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_id uuid;
begin
  insert into public.expenses (clinic_id, tanggal_expense, kategori, deskripsi, jumlah, pemasok, nomor_nota, sumber, recorded_by)
  values (v_clinic, (a ->> 'tanggal')::date, a ->> 'kategori', a ->> 'deskripsi', (a ->> 'jumlah')::numeric, a ->> 'pemasok', a ->> 'nomor_nota', 'ai_agen', v_user)
  returning id into v_id;
  return jsonb_build_object('hasil', jsonb_build_object('expense_id', v_id), 'sebelum', null, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_pengeluaran_ubah(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare e public.expenses; ch jsonb := a -> 'perubahan'; old jsonb := '{}'; k text;
begin
  select * into e from public.expenses where id = (a ->> 'id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Pengeluaran sudah tidak ada.'); end if;
  for k in select jsonb_object_keys(ch) loop old := old || jsonb_build_object(k, to_jsonb(e) -> k); end loop;
  update public.expenses set
    tanggal_expense = coalesce((ch ->> 'tanggal_expense')::date, tanggal_expense), kategori = coalesce(ch ->> 'kategori', kategori),
    deskripsi = coalesce(ch ->> 'deskripsi', deskripsi), jumlah = coalesce((ch ->> 'jumlah')::numeric, jumlah),
    pemasok = case when ch ? 'pemasok' then ch ->> 'pemasok' else pemasok end,
    nomor_nota = case when ch ? 'nomor_nota' then ch ->> 'nomor_nota' else nomor_nota end, updated_at = now()
  where id = e.id;
  return jsonb_build_object('hasil', jsonb_build_object('expense_id', e.id), 'sebelum', old, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_pengeluaran_hapus(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare e public.expenses;
begin
  select * into e from public.expenses where id = (a ->> 'id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Pengeluaran sudah tidak ada.'); end if;
  delete from public.expenses where id = e.id;
  return jsonb_build_object('hasil', jsonb_build_object('expense_id', e.id), 'sebelum', to_jsonb(e), 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_overhead_atur(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare o public.overhead_costs; v_id uuid; ch jsonb := a -> 'perubahan'; old jsonb := '{}'; k text;
begin
  if coalesce((a ->> 'baru')::boolean, false) then
    if exists (select 1 from public.overhead_costs where clinic_id = v_clinic and public.ai_agent_norm(nama_biaya) = public.ai_agent_norm(a ->> 'nama_biaya')) then
      perform public.ai_agent_fail('Biaya overhead dengan nama itu sudah ada. Usulan dibatalkan.'); end if;
    insert into public.overhead_costs (clinic_id, nama_biaya, kategori, jumlah_bulanan, aktif, catatan)
    values (v_clinic, a ->> 'nama_biaya', a ->> 'kategori', (a ->> 'jumlah_bulanan')::numeric, coalesce((a ->> 'aktif')::boolean, true), a ->> 'catatan') returning id into v_id;
    return jsonb_build_object('hasil', jsonb_build_object('overhead_id', v_id, 'baru', true), 'sebelum', null, 'bisa_batal', true);
  end if;
  select * into o from public.overhead_costs where id = (a ->> 'id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Biaya overhead sudah tidak ada.'); end if;
  for k in select jsonb_object_keys(ch) loop old := old || jsonb_build_object(k, to_jsonb(o) -> k); end loop;
  update public.overhead_costs set jumlah_bulanan = coalesce((ch ->> 'jumlah_bulanan')::numeric, jumlah_bulanan),
    kategori = case when ch ? 'kategori' then ch ->> 'kategori' else kategori end,
    catatan = case when ch ? 'catatan' then ch ->> 'catatan' else catatan end,
    aktif = coalesce((ch ->> 'aktif')::boolean, aktif), updated_at = now() where id = o.id;
  return jsonb_build_object('hasil', jsonb_build_object('overhead_id', o.id, 'baru', false), 'sebelum', old, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_overhead_target(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare cur public.overhead_monthly_target; v_id uuid;
begin
  select * into cur from public.overhead_monthly_target where clinic_id = v_clinic and periode = (a ->> 'periode')::date for update;
  insert into public.overhead_monthly_target (clinic_id, periode, total_overhead_bulanan, total_bobot_estimasi, catatan)
  values (v_clinic, (a ->> 'periode')::date, (a ->> 'total_overhead_bulanan')::numeric, (a ->> 'total_bobot_estimasi')::numeric, a ->> 'catatan')
  on conflict (clinic_id, periode) do update set total_overhead_bulanan = excluded.total_overhead_bulanan,
    total_bobot_estimasi = excluded.total_bobot_estimasi, catatan = coalesce(excluded.catatan, public.overhead_monthly_target.catatan)
  returning id into v_id;
  return jsonb_build_object('hasil', jsonb_build_object('target_id', v_id), 'sebelum', case when cur.id is null then null else jsonb_build_object(
    'total_overhead_bulanan', cur.total_overhead_bulanan, 'total_bobot_estimasi', cur.total_bobot_estimasi, 'catatan', cur.catatan) end, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_tindakan_harga(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare t public.treatments;
begin
  select * into t from public.treatments where id = (a ->> 'tindakan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Tindakan sudah tidak ada.'); end if;
  if t.harga_dasar <> (a ->> 'harga_lama')::numeric then
    perform public.ai_agent_fail(format('Harga "%s" sudah berubah sejak usulan dibuat (sekarang %s). Minta usulan baru.', t.nama_treatment, public.ai_agent_rp(t.harga_dasar))); end if;
  update public.treatments set harga_dasar = (a ->> 'harga_baru')::numeric, updated_at = now() where id = t.id;
  return jsonb_build_object('hasil', jsonb_build_object('tindakan_id', t.id), 'sebelum', jsonb_build_object('harga_dasar', t.harga_dasar), 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_tindakan_harga_massal(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare i jsonb; t public.treatments; old jsonb := '[]'; n int := 0;
begin
  for i in select * from jsonb_array_elements(a -> 'items') loop
    select * into t from public.treatments where id = (i ->> 'id')::uuid and clinic_id = v_clinic for update;
    if not found then perform public.ai_agent_fail(format('Tindakan "%s" sudah tidak ada. Minta usulan baru.', i ->> 'nama')); end if;
    if t.harga_dasar <> (i ->> 'harga_lama')::numeric then
      perform public.ai_agent_fail(format('Harga "%s" sudah berubah sejak usulan dibuat. Minta usulan baru.', t.nama_treatment)); end if;
    update public.treatments set harga_dasar = (i ->> 'harga_baru')::numeric, updated_at = now() where id = t.id;
    old := old || jsonb_build_array(jsonb_build_object('id', t.id, 'harga_dasar', t.harga_dasar)); n := n + 1;
  end loop;
  return jsonb_build_object('hasil', jsonb_build_object('jumlah_tindakan', n), 'sebelum', jsonb_build_object('items', old), 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_tindakan_tambah(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare kode text := a ->> 'kode'; n int; v_id uuid;
begin
  if exists (select 1 from public.treatments where clinic_id = v_clinic and public.ai_agent_norm(nama_treatment) = public.ai_agent_norm(a ->> 'nama')) then
    perform public.ai_agent_fail('Tindakan dengan nama itu sudah ada. Usulan dibatalkan.'); end if;
  if kode is null then
    select coalesce(max(substring(kode_treatment from '^TND-([0-9]+)$')::int), 0) + 1 into n from public.treatments where clinic_id = v_clinic;
    loop
      kode := 'TND-' || lpad(n::text, 4, '0');
      exit when not exists (select 1 from public.treatments where clinic_id = v_clinic and kode_treatment = kode);
      n := n + 1;
    end loop;
  elsif exists (select 1 from public.treatments where clinic_id = v_clinic and lower(kode_treatment) = lower(kode)) then
    perform public.ai_agent_fail(format('Kode tindakan "%s" sudah dipakai', kode));
  end if;
  insert into public.treatments (clinic_id, kode_treatment, nama_treatment, kategori, harga_dasar, durasi_menit, tier, is_active)
  values (v_clinic, kode, a ->> 'nama', a ->> 'kategori', (a ->> 'harga_dasar')::numeric, (a ->> 'durasi_menit')::int, coalesce(a ->> 'tier', 'sedang'), true) returning id into v_id;
  return jsonb_build_object('hasil', jsonb_build_object('tindakan_id', v_id, 'kode', kode), 'sebelum', null, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_tindakan_ubah(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare t public.treatments; ch jsonb := a -> 'perubahan'; old jsonb := '{}'; k text;
begin
  select * into t from public.treatments where id = (a ->> 'tindakan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Tindakan sudah tidak ada.'); end if;
  for k in select jsonb_object_keys(ch) loop old := old || jsonb_build_object(k, to_jsonb(t) -> k); end loop;
  update public.treatments set nama_treatment = coalesce(ch ->> 'nama_treatment', nama_treatment),
    kategori = case when ch ? 'kategori' then ch ->> 'kategori' else kategori end,
    tier = coalesce(ch ->> 'tier', tier), durasi_menit = coalesce((ch ->> 'durasi_menit')::int, durasi_menit),
    is_active = coalesce((ch ->> 'is_active')::boolean, is_active), updated_at = now() where id = t.id;
  return jsonb_build_object('hasil', jsonb_build_object('tindakan_id', t.id), 'sebelum', old, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_resep_atur(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare cur public.treatment_materials; v_id uuid;
begin
  if not exists (select 1 from public.treatments where id = (a ->> 'tindakan_id')::uuid and clinic_id = v_clinic)
     or not exists (select 1 from public.master_bahan where id = (a ->> 'bahan_id')::uuid and clinic_id = v_clinic) then
    perform public.ai_agent_fail('Tindakan atau bahan sudah tidak ada.'); end if;
  select * into cur from public.treatment_materials where treatment_id = (a ->> 'tindakan_id')::uuid and material_id = (a ->> 'bahan_id')::uuid for update;
  insert into public.treatment_materials (clinic_id, treatment_id, material_id, qty_rata2, wajib, wastage_percent, catatan)
  values (v_clinic, (a ->> 'tindakan_id')::uuid, (a ->> 'bahan_id')::uuid, (a ->> 'qty_rata2')::numeric, coalesce((a ->> 'wajib')::boolean, true),
          coalesce((a ->> 'wastage_percent')::numeric, 0), a ->> 'catatan')
  on conflict (treatment_id, material_id) do update set qty_rata2 = excluded.qty_rata2, wajib = excluded.wajib,
    wastage_percent = excluded.wastage_percent, catatan = excluded.catatan, updated_at = now()
  returning id into v_id;
  return jsonb_build_object('hasil', jsonb_build_object('resep_id', v_id), 'sebelum', case when cur.id is null then null else to_jsonb(cur) end, 'bisa_batal', true);
end $$;

create or replace function public.ai_agent_x_resep_hapus(v_clinic uuid, v_user uuid, a jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare cur public.treatment_materials;
begin
  select * into cur from public.treatment_materials where treatment_id = (a ->> 'tindakan_id')::uuid and material_id = (a ->> 'bahan_id')::uuid and clinic_id = v_clinic for update;
  if not found then perform public.ai_agent_fail('Bahan itu sudah tidak ada di resep.'); end if;
  delete from public.treatment_materials where id = cur.id;
  return jsonb_build_object('hasil', jsonb_build_object('resep_id', cur.id), 'sebelum', to_jsonb(cur), 'bisa_batal', true);
end $$;

-- ═════════════ PEMBATALAN (undo) ═════════════
create or replace function public.ai_agent_u_bahan_tambah(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare bid uuid := (r.result ->> 'bahan_id')::uuid; pid uuid := nullif(r.result ->> 'purchase_id', '')::uuid; extra int;
begin
  select count(*) into extra from public.stok_movements where material_id = bid and (pid is null or coalesce(referensi_id, gen_random_uuid()) <> pid);
  if extra > 0 or exists (select 1 from public.treatment_materials where material_id = bid) or exists (select 1 from public.visit_obat where master_bahan_id = bid) then
    update public.master_bahan set is_active = false, updated_at = now() where id = bid and clinic_id = v_clinic;
    return;
  end if;
  delete from public.stok_movements where material_id = bid;
  delete from public.material_batches where material_id = bid;
  delete from public.material_purchases where material_id = bid;
  delete from public.master_bahan where id = bid and clinic_id = v_clinic;
end $$;

create or replace function public.ai_agent_u_bahan_ubah(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare ch jsonb := r.before;
begin
  update public.master_bahan set
    nama_bahan = coalesce(ch ->> 'nama_bahan', nama_bahan), satuan_dasar = coalesce(ch ->> 'satuan_dasar', satuan_dasar),
    kategori = case when ch ? 'kategori' then ch ->> 'kategori' else kategori end,
    supplier = case when ch ? 'supplier' then ch ->> 'supplier' else supplier end,
    satuan_beli = case when ch ? 'satuan_beli' then ch ->> 'satuan_beli' else satuan_beli end,
    faktor_konversi = coalesce((ch ->> 'faktor_konversi')::numeric, faktor_konversi),
    stok_minimum = coalesce((ch ->> 'stok_minimum')::numeric, stok_minimum),
    is_active = coalesce((ch ->> 'is_active')::boolean, is_active), updated_at = now()
  where id = (r.result ->> 'bahan_id')::uuid and clinic_id = v_clinic;
end $$;

create or replace function public.ai_agent_u_stok_opname(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare bid uuid := (r.result ->> 'bahan_id')::uuid; mid uuid := (r.result ->> 'movement_id')::uuid; oid uuid := (r.result ->> 'opname_id')::uuid; mt timestamptz;
begin
  select created_at into mt from public.stok_movements where id = mid;
  if mt is null then perform public.ai_agent_fail('Catatan pergerakan stok opname tidak ditemukan; tidak bisa dibatalkan.'); end if;
  if exists (select 1 from public.stok_movements where material_id = bid and id <> mid and created_at >= mt) then
    perform public.ai_agent_fail('Sudah ada pergerakan stok sesudah opname ini, jadi tidak bisa dibatalkan otomatis. Lakukan opname baru dengan stok fisik yang benar.');
  end if;
  update public.master_bahan set stok_saat_ini = (r.before ->> 'stok')::numeric, updated_at = now() where id = bid and clinic_id = v_clinic;
  delete from public.stok_movements where id = mid;
  delete from public.stok_opname where id = oid;
end $$;

create or replace function public.ai_agent_u_pengeluaran_catat(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$ begin delete from public.expenses where id = (r.result ->> 'expense_id')::uuid and clinic_id = v_clinic; end $$;

create or replace function public.ai_agent_u_pengeluaran_ubah(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare ch jsonb := r.before;
begin
  update public.expenses set
    tanggal_expense = coalesce((ch ->> 'tanggal_expense')::date, tanggal_expense), kategori = coalesce(ch ->> 'kategori', kategori),
    deskripsi = coalesce(ch ->> 'deskripsi', deskripsi), jumlah = coalesce((ch ->> 'jumlah')::numeric, jumlah),
    pemasok = case when ch ? 'pemasok' then ch ->> 'pemasok' else pemasok end,
    nomor_nota = case when ch ? 'nomor_nota' then ch ->> 'nomor_nota' else nomor_nota end, updated_at = now()
  where id = (r.result ->> 'expense_id')::uuid and clinic_id = v_clinic;
end $$;

create or replace function public.ai_agent_u_pengeluaran_hapus(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare e jsonb := r.before;
begin
  insert into public.expenses (id, clinic_id, tanggal_expense, kategori, deskripsi, jumlah, bukti_url, recorded_by, created_at, pemasok, nomor_nota, sumber)
  values ((e ->> 'id')::uuid, v_clinic, (e ->> 'tanggal_expense')::date, e ->> 'kategori', e ->> 'deskripsi', (e ->> 'jumlah')::numeric, e ->> 'bukti_url',
          nullif(e ->> 'recorded_by', '')::uuid, coalesce((e ->> 'created_at')::timestamptz, now()), e ->> 'pemasok', e ->> 'nomor_nota', coalesce(e ->> 'sumber', 'manual'));
end $$;

create or replace function public.ai_agent_u_overhead_atur(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare ch jsonb := r.before; oid uuid := (r.result ->> 'overhead_id')::uuid;
begin
  if coalesce((r.result ->> 'baru')::boolean, false) then
    delete from public.overhead_costs where id = oid and clinic_id = v_clinic; return;
  end if;
  update public.overhead_costs set jumlah_bulanan = coalesce((ch ->> 'jumlah_bulanan')::numeric, jumlah_bulanan),
    kategori = case when ch ? 'kategori' then ch ->> 'kategori' else kategori end,
    catatan = case when ch ? 'catatan' then ch ->> 'catatan' else catatan end,
    aktif = coalesce((ch ->> 'aktif')::boolean, aktif), updated_at = now() where id = oid and clinic_id = v_clinic;
end $$;

create or replace function public.ai_agent_u_overhead_target(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  if r.before is null then delete from public.overhead_monthly_target where id = (r.result ->> 'target_id')::uuid and clinic_id = v_clinic;
  else update public.overhead_monthly_target set total_overhead_bulanan = (r.before ->> 'total_overhead_bulanan')::numeric,
         total_bobot_estimasi = (r.before ->> 'total_bobot_estimasi')::numeric, catatan = r.before ->> 'catatan'
       where id = (r.result ->> 'target_id')::uuid and clinic_id = v_clinic; end if;
end $$;

create or replace function public.ai_agent_u_tindakan_harga(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  update public.treatments set harga_dasar = (r.before ->> 'harga_dasar')::numeric, updated_at = now()
   where id = (r.result ->> 'tindakan_id')::uuid and clinic_id = v_clinic;
end $$;

create or replace function public.ai_agent_u_tindakan_harga_massal(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare i jsonb;
begin
  for i in select * from jsonb_array_elements(r.before -> 'items') loop
    update public.treatments set harga_dasar = (i ->> 'harga_dasar')::numeric, updated_at = now() where id = (i ->> 'id')::uuid and clinic_id = v_clinic;
  end loop;
end $$;

create or replace function public.ai_agent_u_tindakan_tambah(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare tid uuid := (r.result ->> 'tindakan_id')::uuid;
begin
  if exists (select 1 from public.visit_treatments where treatment_id = tid) or exists (select 1 from public.treatment_materials where treatment_id = tid) then
    update public.treatments set is_active = false, updated_at = now() where id = tid and clinic_id = v_clinic;
  else delete from public.treatments where id = tid and clinic_id = v_clinic; end if;
end $$;

create or replace function public.ai_agent_u_tindakan_ubah(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare ch jsonb := r.before;
begin
  update public.treatments set nama_treatment = coalesce(ch ->> 'nama_treatment', nama_treatment),
    kategori = case when ch ? 'kategori' then ch ->> 'kategori' else kategori end,
    tier = coalesce(ch ->> 'tier', tier), durasi_menit = coalesce((ch ->> 'durasi_menit')::int, durasi_menit),
    is_active = coalesce((ch ->> 'is_active')::boolean, is_active), updated_at = now()
  where id = (r.result ->> 'tindakan_id')::uuid and clinic_id = v_clinic;
end $$;

create or replace function public.ai_agent_u_resep_atur(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
begin
  if r.before is null then delete from public.treatment_materials where id = (r.result ->> 'resep_id')::uuid and clinic_id = v_clinic;
  else update public.treatment_materials set qty_rata2 = (r.before ->> 'qty_rata2')::numeric, wajib = coalesce((r.before ->> 'wajib')::boolean, true),
         wastage_percent = coalesce((r.before ->> 'wastage_percent')::numeric, 0), catatan = r.before ->> 'catatan', updated_at = now()
       where id = (r.result ->> 'resep_id')::uuid and clinic_id = v_clinic; end if;
end $$;

create or replace function public.ai_agent_u_resep_hapus(v_clinic uuid, v_user uuid, r public.ai_actions)
returns void language plpgsql security definer set search_path = public, extensions
as $$
declare e jsonb := r.before;
begin
  insert into public.treatment_materials (id, clinic_id, treatment_id, material_id, qty_rata2, wajib, wastage_percent, catatan)
  values ((e ->> 'id')::uuid, v_clinic, (e ->> 'treatment_id')::uuid, (e ->> 'material_id')::uuid, (e ->> 'qty_rata2')::numeric,
          coalesce((e ->> 'wajib')::boolean, true), coalesce((e ->> 'wastage_percent')::numeric, 0), e ->> 'catatan')
  on conflict (treatment_id, material_id) do nothing;
end $$;

-- ═════════════ Pintu masuk (dipanggil aplikasi / edge function dengan JWT admin) ═════════════
create or replace function public.ai_agent_kinds() returns text[] language sql immutable
as $$ select array['bahan_tambah', 'bahan_ubah', 'stok_masuk', 'stok_opname', 'pengeluaran_catat', 'pengeluaran_ubah', 'pengeluaran_hapus',
                   'overhead_atur', 'overhead_target', 'tindakan_harga', 'tindakan_harga_massal', 'tindakan_tambah', 'tindakan_ubah', 'resep_atur', 'resep_hapus'] $$;

create or replace function public.ai_agent_propose(p_kind text, p_args jsonb, p_group uuid default null)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); v_user uuid := auth.uid(); r jsonb; v_id uuid; v_detail text;
begin
  if not p_kind = any (public.ai_agent_kinds()) then
    return jsonb_build_object('ok', false, 'error', format('Jenis tindakan "%s" tidak dikenal.', p_kind));
  end if;
  if p_args is null or jsonb_typeof(p_args) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Argumen harus berupa objek.');
  end if;
  if (select count(*) from public.ai_actions where clinic_id = v_clinic and user_id = v_user and status = 'pending' and expires_at > now()) >= 60 then
    return jsonb_build_object('ok', false, 'error', 'Terlalu banyak usulan yang belum diputuskan (maks 60). Setujui atau tolak dulu.');
  end if;
  begin
    execute format('select public.ai_agent_p_%s($1, $2)', p_kind) into r using v_clinic, p_args;
  exception when sqlstate 'AG001' then
    get stacked diagnostics v_detail = pg_exception_detail;
    return jsonb_build_object('ok', false, 'error', sqlerrm, 'kandidat', nullif(v_detail, '')::jsonb);
  end;
  insert into public.ai_actions (clinic_id, user_id, kind, args, preview, group_id)
  values (v_clinic, v_user, p_kind, r -> 'args', r -> 'preview', p_group) returning id into v_id;
  return jsonb_build_object('ok', true, 'action_id', v_id, 'jenis', p_kind, 'pratinjau', r -> 'preview');
end $$;

create or replace function public.ai_agent_apply(p_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_clinic uuid := public.ai_require_admin(); v_user uuid := auth.uid(); r public.ai_actions; x jsonb; out jsonb := '[]'; n int := 0; v_id uuid;
begin
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) > 60 then
    raise exception 'Pilih 1–60 usulan' using errcode = 'AG001';
  end if;
  for r in select * from public.ai_actions where id = any (p_ids) order by created_at, id for update loop
    if r.clinic_id <> v_clinic or r.user_id <> v_user then
      raise exception 'Usulan ini bukan milik Anda' using errcode = 'insufficient_privilege';
    end if;
    if r.status <> 'pending' then raise exception 'Usulan "%" sudah % — tidak bisa dijalankan lagi.', r.preview ->> 'judul', r.status using errcode = 'AG001'; end if;
    if r.expires_at <= now() then
      update public.ai_actions set status = 'expired', decided_at = now() where id = r.id;
      raise exception 'Usulan "%" sudah kedaluwarsa (lebih dari 30 menit). Minta Denti membuatnya lagi.', r.preview ->> 'judul' using errcode = 'AG001';
    end if;
    begin
      execute format('select public.ai_agent_x_%s($1, $2, $3)', r.kind) into x using v_clinic, v_user, r.args;
    exception when sqlstate 'AG001' then
      raise exception '%: %', r.preview ->> 'judul', sqlerrm using errcode = 'AG001';
    when check_violation or not_null_violation or numeric_value_out_of_range or unique_violation or foreign_key_violation or invalid_text_representation then
      raise exception '%: data tidak dapat disimpan (%)', r.preview ->> 'judul', sqlerrm using errcode = 'AG001';
    end;
    update public.ai_actions set status = 'applied', result = x -> 'hasil', before = nullif(x -> 'sebelum', 'null'::jsonb), undoable = coalesce((x ->> 'bisa_batal')::boolean, false), decided_at = now()
     where id = r.id;
    out := out || jsonb_build_array(jsonb_build_object('id', r.id, 'judul', r.preview ->> 'judul', 'hasil', x -> 'hasil', 'bisa_batal', coalesce((x ->> 'bisa_batal')::boolean, false)));
    n := n + 1;
  end loop;
  if n <> cardinality(p_ids) then raise exception 'Sebagian usulan tidak ditemukan' using errcode = 'AG001'; end if;
  return jsonb_build_object('ok', true, 'dijalankan', n, 'tindakan', out);
end $$;

create or replace function public.ai_agent_reject(p_ids uuid[])
returns integer language plpgsql security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); n int;
begin
  update public.ai_actions set status = 'rejected', decided_at = now()
   where id = any (p_ids) and clinic_id = v_clinic and user_id = auth.uid() and status = 'pending';
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.ai_agent_undo(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); r public.ai_actions;
begin
  select * into r from public.ai_actions where id = p_id and clinic_id = v_clinic for update;
  if not found then raise exception 'Tindakan tidak ditemukan' using errcode = 'AG001'; end if;
  if r.status <> 'applied' or not r.undoable then raise exception 'Tindakan ini tidak dapat dibatalkan (status: %).', r.status using errcode = 'AG001'; end if;
  begin
    execute format('select public.ai_agent_u_%s($1, $2, $3)', r.kind) using v_clinic, auth.uid(), r;
  exception when sqlstate 'AG001' then
    raise exception '%', sqlerrm using errcode = 'AG001';
  end;
  update public.ai_actions set status = 'undone', decided_at = now() where id = r.id;
  return jsonb_build_object('ok', true, 'id', r.id, 'judul', r.preview ->> 'judul');
end $$;

-- ═════════════ Alat BACA untuk agen (admin saja; ringkas & terbatas) ═════════════
create or replace function public.ai_cari_bahan(p_kata text default '', p_aktif boolean default true, p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); n text := public.ai_agent_norm(p_kata); r jsonb; lim int := least(greatest(coalesce(p_limit, 30), 1), 60);
begin
  select coalesce(jsonb_agg(x), '[]'::jsonb) into r from (
    select jsonb_build_object('id', id, 'kode', kode_bahan, 'nama', nama_bahan, 'kategori', kategori, 'satuan', satuan_dasar, 'satuan_beli', satuan_beli,
      'faktor_konversi', faktor_konversi, 'stok', stok_saat_ini, 'stok_minimum', stok_minimum, 'harga_rata2', round(harga_rata2, 2),
      'nilai_stok', round(stok_saat_ini * harga_rata2), 'pemasok', supplier, 'aktif', is_active,
      'status', case when stok_saat_ini <= 0 then 'habis' when stok_saat_ini <= stok_minimum then 'menipis' else 'aman' end) x
      from public.master_bahan
     where clinic_id = v_clinic and (not coalesce(p_aktif, true) or is_active)
       and (n = '' or position(n in public.ai_agent_norm(nama_bahan)) > 0 or position(n in public.ai_agent_norm(coalesce(kategori, ''))) > 0
            or lower(kode_bahan) = n or similarity(public.ai_agent_norm(nama_bahan), n) >= 0.35)
     order by nama_bahan limit lim) q;
  return jsonb_build_object('jumlah', jsonb_array_length(r), 'bahan', r);
end $$;

create or replace function public.ai_kartu_stok(p_bahan text, p_hari integer default 60)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); b public.master_bahan; d int := least(greatest(coalesce(p_hari, 60), 1), 365); r jsonb;
begin
  b := public.ai_agent_bahan(v_clinic, p_bahan);
  select coalesce(jsonb_agg(jsonb_build_object('waktu', to_char(created_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI'), 'tipe', tipe, 'jumlah', jumlah,
           'stok_sesudah', stok_sesudah, 'catatan', catatan) order by created_at desc), '[]'::jsonb) into r
    from (select * from public.stok_movements where clinic_id = v_clinic and material_id = b.id and created_at >= now() - make_interval(days => d)
           order by created_at desc limit 80) m;
  return jsonb_build_object('bahan', jsonb_build_object('id', b.id, 'nama', b.nama_bahan, 'satuan', b.satuan_dasar, 'stok', b.stok_saat_ini, 'stok_minimum', b.stok_minimum, 'harga_rata2', round(b.harga_rata2, 2)),
    'hari', d,
    'total_masuk', (select coalesce(sum(jumlah), 0) from public.stok_movements where clinic_id = v_clinic and material_id = b.id and tipe = 'masuk' and created_at >= now() - make_interval(days => d)),
    'total_keluar', (select coalesce(-sum(jumlah), 0) from public.stok_movements where clinic_id = v_clinic and material_id = b.id and tipe = 'keluar' and created_at >= now() - make_interval(days => d)),
    'pergerakan', r);
end $$;

create or replace function public.ai_saran_pemesanan(p_hari_riwayat integer default 30, p_hari_cakupan integer default 14)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); h int := least(greatest(coalesce(p_hari_riwayat, 30), 7), 180); c int := least(greatest(coalesce(p_hari_cakupan, 14), 3), 90); r jsonb;
begin
  select coalesce(jsonb_agg(x order by (x ->> 'hari_tersisa')::numeric nulls last), '[]'::jsonb) into r from (
    select jsonb_build_object('id', b.id, 'nama', b.nama_bahan, 'satuan', b.satuan_dasar, 'stok', b.stok_saat_ini, 'stok_minimum', b.stok_minimum,
      'pakai_per_hari', round(u.per_hari, 3),
      'hari_tersisa', case when u.per_hari > 0 then round(greatest(b.stok_saat_ini, 0) / u.per_hari, 1) end,
      'saran_beli', greatest(ceil(greatest(u.per_hari * c + b.stok_minimum - b.stok_saat_ini, 0)), 0),
      'perkiraan_biaya', round(greatest(ceil(greatest(u.per_hari * c + b.stok_minimum - b.stok_saat_ini, 0)), 0) * b.harga_rata2),
      'pemasok', b.supplier,
      'alasan', case when b.stok_saat_ini <= 0 then 'stok habis' when b.stok_saat_ini <= b.stok_minimum then 'di bawah minimum'
                     when u.per_hari > 0 and b.stok_saat_ini / u.per_hari < c then 'tidak cukup untuk ' || c || ' hari' end) x
      from public.master_bahan b
      left join lateral (select coalesce(-sum(m.jumlah), 0) / h::numeric per_hari from public.stok_movements m
                          where m.material_id = b.id and m.clinic_id = v_clinic and m.tipe = 'keluar' and m.created_at >= now() - make_interval(days => h)) u on true
     where b.clinic_id = v_clinic and b.is_active
       and (b.stok_saat_ini <= b.stok_minimum or (u.per_hari > 0 and b.stok_saat_ini / u.per_hari < c))
     limit 40) q;
  return jsonb_build_object('hari_riwayat', h, 'hari_cakupan', c, 'jumlah', jsonb_array_length(r), 'bahan', r);
end $$;

create or replace function public.ai_cari_pengeluaran(p_dari date default null, p_sampai date default null, p_kata text default '', p_kategori text default '', p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); n text := public.ai_agent_norm(p_kata); r jsonb; lim int := least(greatest(coalesce(p_limit, 25), 1), 50);
  d1 date := coalesce(p_dari, public.ai_agent_today() - 90); d2 date := coalesce(p_sampai, public.ai_agent_today());
begin
  perform public.ai_check_range(d1, d2);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into r from (
    select jsonb_build_object('id', id, 'tanggal', tanggal_expense, 'kategori', kategori, 'deskripsi', deskripsi, 'jumlah', jumlah, 'pemasok', pemasok, 'nomor_nota', nomor_nota, 'sumber', sumber) x
      from public.expenses where clinic_id = v_clinic and tanggal_expense between d1 and d2
       and (n = '' or position(n in public.ai_agent_norm(deskripsi)) > 0 or position(n in public.ai_agent_norm(coalesce(pemasok, ''))) > 0 or lower(coalesce(nomor_nota, '')) = n)
       and (coalesce(p_kategori, '') = '' or kategori = p_kategori)
     order by tanggal_expense desc, created_at desc limit lim) q;
  return jsonb_build_object('dari', d1, 'sampai', d2, 'jumlah', jsonb_array_length(r),
    'total', (select coalesce(sum(jumlah), 0) from public.expenses where clinic_id = v_clinic and tanggal_expense between d1 and d2
               and (n = '' or position(n in public.ai_agent_norm(deskripsi)) > 0 or position(n in public.ai_agent_norm(coalesce(pemasok, ''))) > 0 or lower(coalesce(nomor_nota, '')) = n)
               and (coalesce(p_kategori, '') = '' or kategori = p_kategori)),
    'pengeluaran', r);
end $$;

create or replace function public.ai_daftar_overhead()
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); per date := date_trunc('month', public.ai_agent_today())::date;
begin
  return jsonb_build_object(
    'overhead', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nama', nama_biaya, 'kategori', kategori, 'per_bulan', jumlah_bulanan, 'aktif', aktif, 'catatan', catatan) order by nama_biaya), '[]'::jsonb)
                   from public.overhead_costs where clinic_id = v_clinic),
    'total_aktif_per_bulan', (select coalesce(sum(jumlah_bulanan), 0) from public.overhead_costs where clinic_id = v_clinic and aktif),
    'target_bulan_ini', (select to_jsonb(t) - 'clinic_id' - 'id' from public.overhead_monthly_target t where clinic_id = v_clinic and periode = per));
end $$;

create or replace function public.ai_cari_tindakan(p_kata text default '', p_limit integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); n text := public.ai_agent_norm(p_kata); r jsonb; lim int := least(greatest(coalesce(p_limit, 30), 1), 60);
begin
  select coalesce(jsonb_agg(x), '[]'::jsonb) into r from (
    select jsonb_build_object('id', t.id, 'kode', t.kode_treatment, 'nama', t.nama_treatment, 'kategori', t.kategori, 'harga', t.harga_dasar, 'tier', t.tier, 'durasi_menit', t.durasi_menit,
      'aktif', t.is_active, 'jumlah_bahan_resep', (select count(*) from public.treatment_materials m where m.treatment_id = t.id),
      'biaya_bahan', (select round(coalesce(sum(m.qty_rata2 * (1 + coalesce(m.wastage_percent, 0) / 100) * b.harga_rata2), 0))
                        from public.treatment_materials m join public.master_bahan b on b.id = m.material_id where m.treatment_id = t.id)) x
      from public.treatments t
     where t.clinic_id = v_clinic and (n = '' or position(n in public.ai_agent_norm(t.nama_treatment)) > 0 or position(n in public.ai_agent_norm(coalesce(t.kategori, ''))) > 0
            or lower(t.kode_treatment) = n or similarity(public.ai_agent_norm(t.nama_treatment), n) >= 0.35)
     order by t.nama_treatment limit lim) q;
  return jsonb_build_object('jumlah', jsonb_array_length(r), 'tindakan', r);
end $$;

create or replace function public.ai_resep_tindakan(p_tindakan text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin(); t public.treatments; r jsonb;
begin
  t := public.ai_agent_tindakan(v_clinic, p_tindakan);
  select coalesce(jsonb_agg(jsonb_build_object('bahan_id', b.id, 'bahan', b.nama_bahan, 'satuan', b.satuan_dasar, 'qty', m.qty_rata2, 'susut_persen', m.wastage_percent, 'wajib', m.wajib,
           'harga_rata2', round(b.harga_rata2, 2), 'biaya', round(m.qty_rata2 * (1 + coalesce(m.wastage_percent, 0) / 100) * b.harga_rata2)) order by b.nama_bahan), '[]'::jsonb) into r
    from public.treatment_materials m join public.master_bahan b on b.id = m.material_id where m.treatment_id = t.id;
  return jsonb_build_object('tindakan', jsonb_build_object('id', t.id, 'nama', t.nama_treatment, 'harga', t.harga_dasar), 'resep', r,
    'total_biaya_bahan', (select coalesce(sum((x ->> 'biaya')::numeric), 0) from jsonb_array_elements(r) x));
end $$;

create or replace function public.ai_riwayat_agen(p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare v_clinic uuid := public.ai_require_admin();
begin
  return jsonb_build_object('tindakan', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select jsonb_build_object('id', a.id, 'waktu', to_char(a.created_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI'), 'jenis', a.kind, 'judul', a.preview ->> 'judul', 'status', a.status,
      'oleh', (select full_name from public.users u where u.id = a.user_id)) x
      from public.ai_actions a where a.clinic_id = v_clinic order by a.created_at desc limit least(greatest(coalesce(p_limit, 20), 1), 50)) q));
end $$;

-- ═════════════ Hak eksekusi ═════════════
revoke all on function
  public.ai_agent_fail(text, jsonb), public.ai_agent_today(), public.ai_agent_norm(text), public.ai_agent_rp(numeric), public.ai_agent_q(numeric),
  public.ai_agent_num(jsonb, text, numeric, numeric, boolean, numeric), public.ai_agent_txt(jsonb, text, int, boolean), public.ai_agent_bool(jsonb, text, boolean),
  public.ai_agent_date(jsonb, text, date, date, date), public.ai_agent_uuid(jsonb, text, boolean),
  public.ai_agent_bahan(uuid, text), public.ai_agent_tindakan(uuid, text), public.ai_agent_kinds()
  from public, anon, authenticated;
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'public'::regnamespace and (p.proname like 'ai\_agent\_p\_%' or p.proname like 'ai\_agent\_x\_%' or p.proname like 'ai\_agent\_u\_%') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
revoke all on function public.ai_agent_propose(text, jsonb, uuid), public.ai_agent_apply(uuid[]), public.ai_agent_reject(uuid[]), public.ai_agent_undo(uuid),
  public.ai_cari_bahan(text, boolean, integer), public.ai_kartu_stok(text, integer), public.ai_saran_pemesanan(integer, integer),
  public.ai_cari_pengeluaran(date, date, text, text, integer), public.ai_daftar_overhead(), public.ai_cari_tindakan(text, integer),
  public.ai_resep_tindakan(text), public.ai_riwayat_agen(integer) from public, anon;
grant execute on function public.ai_agent_propose(text, jsonb, uuid), public.ai_agent_apply(uuid[]), public.ai_agent_reject(uuid[]), public.ai_agent_undo(uuid),
  public.ai_cari_bahan(text, boolean, integer), public.ai_kartu_stok(text, integer), public.ai_saran_pemesanan(integer, integer),
  public.ai_cari_pengeluaran(date, date, text, text, integer), public.ai_daftar_overhead(), public.ai_cari_tindakan(text, integer),
  public.ai_resep_tindakan(text), public.ai_riwayat_agen(integer) to authenticated, service_role;
