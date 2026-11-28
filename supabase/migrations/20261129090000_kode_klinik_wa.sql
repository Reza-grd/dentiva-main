-- =============================================================================
-- Fase 2 — Identitas pesan WhatsApp (satu nomor untuk semua klinik)
-- docs/rencana/RENCANA-RECALL-SOP-DAN-BOOKING-WA.md §2
-- * clinics.kode_wa: kode singkat 3–5 huruf kapital, unik di seluruh Dentiva.
--   Dibuat otomatis dari nama klinik (klinik baru & yang sudah ada), bisa diubah manajer klinik.
-- * Dipakai sebagai baris pembuka setiap pesan ke pasien:  SMLE · RM-000123 · Budi S.
-- =============================================================================

alter table public.clinics add column if not exists kode_wa text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clinics_kode_wa_format') then
    alter table public.clinics add constraint clinics_kode_wa_format check (kode_wa is null or kode_wa ~ '^[A-Z]{3,5}$');
  end if;
end $$;
create unique index if not exists clinics_kode_wa_unik on public.clinics (kode_wa) where kode_wa is not null;

/** Usulan dasar dari nama: kata umum (klinik, dental, gigi, …) diabaikan. Belum dicek keunikannya. */
create or replace function public.kode_klinik_dasar(p_nama text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v_teks text := upper(regexp_replace(translate(coalesce(p_nama, ''), 'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÑñÇç',
                                                'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'), '[^A-Za-z]+', ' ', 'g'));
  v_umum text[] := array['KLINIK','CLINIC','DENTAL','DENTIST','DENTISTRY','GIGI','DRG','DR','DOKTER','CARE','CENTER','CENTRE',
                         'HOUSE','STUDIO','THE','DAN','AND','PT','CV','PRAKTIK','PRAKTEK','MANDIRI','SPKG','ORAL','HEALTH','KESEHATAN'];
  v_kata text[];
  v_hasil text := '';
  k text;
begin
  select coalesce(array_agg(w order by n), '{}') into v_kata
  from unnest(string_to_array(btrim(v_teks), ' ')) with ordinality as t(w, n)
  where w <> '' and not (w = any (v_umum));
  if cardinality(v_kata) = 0 then
    select coalesce(array_agg(w order by n), '{}') into v_kata
    from unnest(string_to_array(btrim(v_teks), ' ')) with ordinality as t(w, n) where w <> '';
  end if;
  if cardinality(v_kata) = 0 then
    return 'KLN';
  end if;

  if cardinality(v_kata) >= 3 then
    foreach k in array v_kata loop v_hasil := v_hasil || left(k, 1); end loop;
  else
    -- Satu/dua kata: huruf awal + konsonan kata pertama (SENYUM → SNYM), lalu huruf awal kata kedua.
    v_hasil := left(v_kata[1], 1) || regexp_replace(substr(v_kata[1], 2), '[AEIOU]', '', 'g');
    if cardinality(v_kata) = 2 then
      v_hasil := left(v_hasil, 3) || left(v_kata[2], 1);
    end if;
    if length(v_hasil) < 3 then
      v_hasil := v_hasil || substr(v_kata[1], 2);
    end if;
  end if;
  v_hasil := left(v_hasil, 4);
  if length(v_hasil) < 3 then
    v_hasil := rpad(v_hasil, 3, 'X');
  end if;
  return v_hasil;
end $$;

/** Kode unik: dasar 4 huruf; bila dipakai, 3 huruf + A–Z, lalu 4 huruf + A–Z. */
create or replace function public.kode_klinik_usulan(p_nama text, p_kecuali uuid default null)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_dasar text := public.kode_klinik_dasar(p_nama);
  v_calon text;
  i int;
begin
  if not exists (select 1 from public.clinics where kode_wa = v_dasar and id is distinct from p_kecuali) then
    return v_dasar;
  end if;
  for i in 0..25 loop
    v_calon := left(v_dasar, 3) || chr(65 + i);
    if not exists (select 1 from public.clinics where kode_wa = v_calon and id is distinct from p_kecuali) then
      return v_calon;
    end if;
  end loop;
  for i in 0..25 loop
    v_calon := rpad(left(v_dasar, 4), 4, 'X') || chr(65 + i);
    if not exists (select 1 from public.clinics where kode_wa = v_calon and id is distinct from p_kecuali) then
      return v_calon;
    end if;
  end loop;
  loop
    v_calon := left(v_dasar, 2) || chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int);
    exit when not exists (select 1 from public.clinics where kode_wa = v_calon);
  end loop;
  return v_calon;
end $$;
revoke all on function public.kode_klinik_usulan(text, uuid) from public, anon, authenticated;

create or replace function public.clinics_isi_kode_wa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kode_wa is null then
    new.kode_wa := public.kode_klinik_usulan(new.name, new.id);
  else
    new.kode_wa := upper(btrim(new.kode_wa));
  end if;
  return new;
end $$;
revoke all on function public.clinics_isi_kode_wa() from public, anon, authenticated;

drop trigger if exists trg_clinics_isi_kode_wa on public.clinics;
create trigger trg_clinics_isi_kode_wa before insert on public.clinics
  for each row execute function public.clinics_isi_kode_wa();

-- Klinik yang sudah ada (urut paling lama → kode terbaik untuk klinik paling awal).
do $$
declare c record;
begin
  for c in select id, name from public.clinics where kode_wa is null order by created_at, id loop
    update public.clinics set kode_wa = public.kode_klinik_usulan(c.name, c.id) where id = c.id;
  end loop;
end $$;

/** Kode klinik pengguna saat ini (semua staf). */
create or replace function public.kode_klinik_saya()
returns text language sql stable security definer set search_path = '' as $$
  select kode_wa from public.clinics where id = public.get_user_clinic_id()
$$;
revoke all on function public.kode_klinik_saya() from public, anon;
grant execute on function public.kode_klinik_saya() to authenticated;

/** Manajer klinik mengubah kode. 3–5 huruf A–Z, unik di seluruh Dentiva. */
create or replace function public.kode_klinik_ubah(p_kode text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_clinic uuid := public.get_user_clinic_id();
  v_kode text := upper(btrim(coalesce(p_kode, '')));
begin
  if public.get_user_role() <> 'admin' or v_clinic is null then
    raise exception 'Hanya manajer klinik yang dapat mengubah kode klinik' using errcode = 'insufficient_privilege';
  end if;
  if v_kode !~ '^[A-Z]{3,5}$' then
    raise exception 'Kode klinik harus 3–5 huruf (A–Z), tanpa angka atau spasi' using errcode = '22023';
  end if;
  if exists (select 1 from public.clinics where kode_wa = v_kode and id <> v_clinic) then
    raise exception 'Kode % sudah dipakai klinik lain. Pilih kode lain.', v_kode using errcode = '23505';
  end if;
  update public.clinics set kode_wa = v_kode where id = v_clinic;
  return v_kode;
end $$;
revoke all on function public.kode_klinik_ubah(text) from public, anon;
grant execute on function public.kode_klinik_ubah(text) to authenticated;
