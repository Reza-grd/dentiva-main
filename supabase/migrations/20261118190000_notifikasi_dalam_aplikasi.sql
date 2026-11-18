-- =============================================================================
-- Notifikasi dalam aplikasi (ikon lonceng)
-- -----------------------------------------------------------------------------
-- * public.notifikasi        : satu baris per pemberitahuan. Sasaran: satu orang
--                              (penerima_id), satu peran (penerima_role), atau
--                              seluruh staf klinik (keduanya NULL).
-- * public.notifikasi_dibaca : tanda "sudah dibaca" per pengguna (pesan ke peran /
--                              seluruh staf dibaca masing-masing orang).
-- * Klien hanya boleh mengirim jenis 'pesan' (komunikasi antar-staf klinik yang sama).
--   Jenis 'langganan' & 'sistem' dibuat server: trigger clinic_subscriptions dan
--   jadwal harian pengingat akhir masa uji coba.
-- * Realtime: tabel masuk publikasi supabase_realtime; RLS menyaring penerima.
-- =============================================================================

create table if not exists public.notifikasi (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null default public.get_user_clinic_id() references public.clinics (id) on delete cascade,
  pengirim_id   uuid default auth.uid() references public.users (id) on delete set null,
  penerima_id   uuid references public.users (id) on delete cascade,
  penerima_role text check (penerima_role in ('admin', 'dokter', 'resepsionis')),
  jenis         text not null default 'pesan' check (jenis in ('pesan', 'langganan', 'sistem')),
  judul         text not null check (char_length(judul) between 1 and 120),
  isi           text check (char_length(isi) <= 1000),
  tautan        text check (tautan is null or tautan ~ '^/[A-Za-z0-9/_?=&%.-]*$'),
  kunci         text,               -- pencegah duplikat untuk notifikasi otomatis
  created_at    timestamptz not null default now(),
  constraint notifikasi_satu_sasaran check (penerima_id is null or penerima_role is null)
);

create index if not exists notifikasi_klinik_terbaru on public.notifikasi (clinic_id, created_at desc);
create index if not exists notifikasi_penerima on public.notifikasi (penerima_id) where penerima_id is not null;
create unique index if not exists notifikasi_kunci_unik on public.notifikasi (clinic_id, kunci) where kunci is not null;

create table if not exists public.notifikasi_dibaca (
  notifikasi_id uuid not null references public.notifikasi (id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.users (id) on delete cascade,
  dibaca_at     timestamptz not null default now(),
  primary key (notifikasi_id, user_id)
);
create index if not exists notifikasi_dibaca_user on public.notifikasi_dibaca (user_id);

alter table public.notifikasi enable row level security;
alter table public.notifikasi_dibaca enable row level security;

-- Isolasi klinik (sama seperti tabel ber-clinic_id lain).
drop policy if exists tenant_isolation on public.notifikasi;
create policy tenant_isolation on public.notifikasi
  as restrictive for all to authenticated
  using (clinic_id = (select public.get_user_clinic_id()))
  with check (clinic_id = (select public.get_user_clinic_id()));

-- Baca: ditujukan ke saya, ke peran saya, ke semua staf, atau saya pengirimnya.
drop policy if exists notifikasi_baca on public.notifikasi;
create policy notifikasi_baca on public.notifikasi
  for select to authenticated
  using (
    penerima_id = (select auth.uid())
    or pengirim_id = (select auth.uid())
    or (penerima_id is null and (penerima_role is null or penerima_role = (select public.get_user_role())))
  );

-- Kirim: hanya pesan, atas nama sendiri, penerima harus staf klinik yang sama.
drop policy if exists notifikasi_kirim on public.notifikasi;
create policy notifikasi_kirim on public.notifikasi
  for insert to authenticated
  with check (
    jenis = 'pesan'
    and kunci is null
    and pengirim_id = (select auth.uid())
    and (select public.get_user_role()) is not null
    and (penerima_id is null or exists (
      select 1 from public.users u
      where u.id = penerima_id and u.clinic_id = (select public.get_user_clinic_id())
    ))
  );

-- Pengirim boleh menghapus pesannya sendiri.
drop policy if exists notifikasi_hapus_milik_sendiri on public.notifikasi;
create policy notifikasi_hapus_milik_sendiri on public.notifikasi
  for delete to authenticated
  using (jenis = 'pesan' and pengirim_id = (select auth.uid()));

revoke all on public.notifikasi from anon;
revoke update, truncate on public.notifikasi from authenticated;
grant select, insert, delete on public.notifikasi to authenticated;

-- Tanda dibaca: hanya milik sendiri, untuk notifikasi yang memang terlihat.
drop policy if exists notifikasi_dibaca_milik_sendiri on public.notifikasi_dibaca;
create policy notifikasi_dibaca_milik_sendiri on public.notifikasi_dibaca
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notifikasi n where n.id = notifikasi_id)
  );

revoke all on public.notifikasi_dibaca from anon;
revoke update, truncate on public.notifikasi_dibaca from authenticated;
grant select, insert, delete on public.notifikasi_dibaca to authenticated;

-- Tandai semua yang terlihat sebagai dibaca (satu panggilan dari tombol "Tandai semua").
create or replace function public.tandai_semua_notifikasi_dibaca()
returns integer
language sql
security invoker
set search_path = ''
as $$
  with baru as (
    insert into public.notifikasi_dibaca (notifikasi_id, user_id)
    select n.id, auth.uid() from public.notifikasi n
    where not exists (select 1 from public.notifikasi_dibaca d where d.notifikasi_id = n.id and d.user_id = auth.uid())
    on conflict do nothing
    returning 1
  )
  select count(*)::int from baru;
$$;
revoke all on function public.tandai_semua_notifikasi_dibaca() from public, anon;
grant execute on function public.tandai_semua_notifikasi_dibaca() to authenticated;

-- Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifikasi') then
    alter publication supabase_realtime add table public.notifikasi;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Notifikasi langganan otomatis (untuk Manajer Klinik)
-- -----------------------------------------------------------------------------
create or replace function public.notifikasi_perubahan_langganan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paket text;
  v_sampai text;
begin
  select sp.name into v_paket from public.subscription_plans sp where sp.id = new.plan_id;
  v_sampai := to_char(new.current_period_end at time zone 'Asia/Jakarta', 'DD-MM-YYYY');

  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active'
       or old.current_period_end is distinct from new.current_period_end
       or old.plan_id is distinct from new.plan_id) then
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, jenis, judul, isi, tautan, kunci)
    values (new.clinic_id, null, 'admin', 'langganan',
            'Langganan aktif: Paket ' || coalesce(v_paket, '-'),
            'Terima kasih! Paket ' || coalesce(v_paket, '-') || ' berlaku hingga ' || coalesce(v_sampai, '-') || '.',
            '/pricing', 'aktif:' || new.id || ':' || coalesce(new.current_period_end::text, ''))
    on conflict do nothing;
  elsif new.status = 'past_due' and (tg_op = 'INSERT' or old.status is distinct from 'past_due') then
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, jenis, judul, isi, tautan, kunci)
    values (new.clinic_id, null, 'admin', 'langganan',
            'Pembayaran langganan tertunda',
            'Selesaikan pembayaran agar rekam medis, jadwal, dan kasir tetap berjalan tanpa jeda.',
            '/pricing', 'tunggak:' || new.id || ':' || coalesce(new.current_period_end::text, ''))
    on conflict do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.notifikasi_perubahan_langganan() from public, anon, authenticated;

drop trigger if exists trg_notifikasi_langganan on public.clinic_subscriptions;
create trigger trg_notifikasi_langganan
  after insert or update of status, plan_id, current_period_end on public.clinic_subscriptions
  for each row execute function public.notifikasi_perubahan_langganan();

-- Pengingat akhir masa uji coba: H-7, H-3, H-1 dan hari terakhir (dijalankan harian).
create or replace function public.notifikasi_pengingat_trial()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  with sasaran as (
    select s.clinic_id, s.id,
           greatest(0, ceil(extract(epoch from (s.current_period_end - now())) / 86400))::int as sisa
    from public.clinic_subscriptions s
    join public.clinics c on c.id = s.clinic_id and c.status in ('trial', 'active')
    where s.status = 'trialing' and s.current_period_end > now() - interval '1 day'
  ), baru as (
    insert into public.notifikasi (clinic_id, pengirim_id, penerima_role, jenis, judul, isi, tautan, kunci)
    select clinic_id, null, 'admin', 'langganan',
           case when sisa = 0 then 'Masa uji coba berakhir hari ini'
                else 'Masa uji coba tersisa ' || sisa || ' hari' end,
           'Pilih paket langganan agar data dan pengaturan klinik tetap berjalan tanpa jeda.',
           '/pricing', 'trial:' || id || ':' || sisa
    from sasaran where sisa in (7, 3, 1, 0)
    on conflict do nothing
    returning 1
  )
  select count(*)::int into v_n from baru;
  return v_n;
end;
$$;
revoke all on function public.notifikasi_pengingat_trial() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron tidak tersedia — jadwal pengingat trial dilewati';
    return;
  end if;
  if exists (select 1 from cron.job where jobname = 'notifikasi-pengingat-trial') then
    perform cron.unschedule('notifikasi-pengingat-trial');
  end if;
  -- 01:00 UTC = 08:00 WIB
  perform cron.schedule('notifikasi-pengingat-trial', '0 1 * * *', 'select public.notifikasi_pengingat_trial()');
end $$;
