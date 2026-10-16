-- Audit log TAMBAH-SAJA & BERANTAI HASH (17 Okt 2026) — keamanan tingkat tinggi untuk jejak akses data medis.
--
-- Sebelumnya: baris audit_logs tidak bisa diubah klien lewat RLS, tetapi (a) role authenticated/service_role masih memegang UPDATE/DELETE/TRUNCATE,
-- (b) service role/superuser dapat mengubah/menghapus tanpa jejak, dan (c) tak ada cara membuktikan log utuh.
--
-- Sekarang:
--  1. Setiap baris baru masuk rantai hash per klinik: row_hash = SHA-256(prev_hash | seq | isi baris). Mengubah/menyisipkan/menghapus baris mana pun memutus rantai.
--  2. UPDATE/DELETE/TRUNCATE diblokir oleh trigger untuk SEMUA peran (juga service role). Satu-satunya perubahan yang diizinkan: patient_id / visit_id menjadi NULL
--     (hasil ON DELETE SET NULL saat pasien dihapus — hak penghapusan UU PDP). Kolom itu SENGAJA tidak ikut hash agar penghapusan pasien tidak memutus rantai.
--  3. Hak UPDATE/DELETE/TRUNCATE dicabut dari authenticated & service_role.
--  4. audit_verify_chain() (khusus admin klinik) memeriksa seluruh rantai kliniknya dan memberi kepala rantai (seq + hash) yang bisa dijangkarkan di luar sistem.
-- Catatan: pelaku dengan akses superuser database tetap bisa MENONAKTIFKAN trigger, tetapi perubahan isi akan tertangkap verifikasi rantai.

alter table public.audit_logs add column if not exists seq bigint;
alter table public.audit_logs add column if not exists prev_hash text;
alter table public.audit_logs add column if not exists row_hash text;

-- Hash kanonik. Tidak memuat patient_id / visit_id (boleh menjadi NULL saat pasien dihapus).
create or replace function private.audit_row_hash(p_prev text, p_seq bigint, r public.audit_logs)
returns text language sql immutable set search_path = public, extensions
as $$
  select encode(extensions.digest(
    coalesce(p_prev, 'GENESIS') || '|' || p_seq::text || '|' ||
    jsonb_build_object(
      'id', r.id, 'ts', to_char(r."timestamp" at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'), 'clinic', r.clinic_id, 'user', r.user_id,
      'role', r.user_role, 'module', r.module, 'action', r.action, 'prev', r.previous_value, 'new', r.new_value, 'risk', r.risk_level
    )::text, 'sha256'), 'hex')
$$;

-- Penghapusan pasien/kunjungan: referensi dikosongkan, baris audit tetap ada (sebelumnya ikut terhapus oleh CASCADE).
alter table public.audit_logs drop constraint if exists audit_logs_patient_id_fkey;
alter table public.audit_logs add constraint audit_logs_patient_id_fkey foreign key (patient_id) references public.patients (id) on delete set null;
alter table public.audit_logs drop constraint if exists audit_logs_visit_id_fkey;
alter table public.audit_logs add constraint audit_logs_visit_id_fkey foreign key (visit_id) references public.visits (id) on delete set null;

-- Rantai baris lama (urut waktu per klinik) — dikerjakan SEBELUM trigger pemblokir dipasang.
do $$
declare c record; r public.audit_logs; v_prev text; v_seq bigint; v_hash text;
begin
  for c in select distinct clinic_id from public.audit_logs where row_hash is null loop
    v_prev := null; v_seq := 0;
    for r in select * from public.audit_logs where clinic_id = c.clinic_id order by "timestamp", id loop
      v_seq := v_seq + 1;
      v_hash := private.audit_row_hash(v_prev, v_seq, r);
      update public.audit_logs set seq = v_seq, prev_hash = v_prev, row_hash = v_hash where id = r.id;
      v_prev := v_hash;
    end loop;
  end loop;
end $$;
create unique index if not exists audit_logs_klinik_seq on public.audit_logs (clinic_id, seq);

-- Rantai untuk baris baru (setelah a_audit_log_integrity yang menetapkan aktor & waktu dari server).
create or replace function public.audit_log_rantai()
returns trigger language plpgsql security definer set search_path = public, extensions
as $$
declare v_last_seq bigint; v_last_hash text;
begin
  perform pg_advisory_xact_lock(hashtextextended('audit:' || new.clinic_id::text, 0));
  select seq, row_hash into v_last_seq, v_last_hash from public.audit_logs where clinic_id = new.clinic_id and seq is not null order by seq desc limit 1;
  new.seq := coalesce(v_last_seq, 0) + 1;
  new.prev_hash := v_last_hash;
  new.row_hash := private.audit_row_hash(v_last_hash, new.seq, new);
  return new;
end $$;
drop trigger if exists zz_audit_hash_chain on public.audit_logs;
create trigger zz_audit_hash_chain before insert on public.audit_logs for each row execute function public.audit_log_rantai();

-- Tambah-saja untuk semua peran. Pengecualian sempit: pengosongan patient_id/visit_id (efek ON DELETE SET NULL).
create or replace function public.audit_log_tolak_ubah()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'patient_id' - 'visit_id') = (to_jsonb(old) - 'patient_id' - 'visit_id')
     and (new.patient_id is null or new.patient_id is not distinct from old.patient_id)
     and (new.visit_id is null or new.visit_id is not distinct from old.visit_id) then
    return new;
  end if;
  raise exception 'audit_logs bersifat tambah-saja: % tidak diizinkan', tg_op using errcode = '42501';
end $$;
drop trigger if exists zz_audit_tolak_ubah on public.audit_logs;
create trigger zz_audit_tolak_ubah before update or delete on public.audit_logs for each row execute function public.audit_log_tolak_ubah();
drop trigger if exists zz_audit_tolak_truncate on public.audit_logs;
create trigger zz_audit_tolak_truncate before truncate on public.audit_logs for each statement execute function public.audit_log_tolak_ubah();

revoke update, delete, truncate on public.audit_logs from authenticated, service_role;

-- Verifikasi rantai (admin klinik). Membaca seluruh baris kliniknya (SECURITY DEFINER); hanya mengembalikan ringkasan.
create or replace function public.audit_verify_chain(p_limit integer default 500000)
returns jsonb language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  v_clinic uuid := public.get_user_clinic_id(); r public.audit_logs; v_prev text; v_seq bigint := 0; v_n bigint := 0;
  v_bad jsonb; v_hash text; v_legacy bigint;
begin
  if public.get_user_role() is distinct from 'admin' or v_clinic is null then
    raise exception 'Hanya admin klinik yang dapat memeriksa integritas audit log' using errcode = 'insufficient_privilege';
  end if;
  select count(*) into v_legacy from public.audit_logs where clinic_id = v_clinic and row_hash is null;
  for r in select * from public.audit_logs where clinic_id = v_clinic and row_hash is not null order by seq limit greatest(coalesce(p_limit, 500000), 1) loop
    v_n := v_n + 1; v_seq := v_seq + 1;
    v_hash := private.audit_row_hash(v_prev, r.seq, r);
    if r.seq is distinct from v_seq then
      v_bad := jsonb_build_object('seq', v_seq, 'id', r.id, 'alasan', 'urutan terputus (baris hilang atau disisipkan)'); exit;
    elsif r.prev_hash is distinct from v_prev then
      v_bad := jsonb_build_object('seq', r.seq, 'id', r.id, 'alasan', 'tautan ke baris sebelumnya tidak cocok'); exit;
    elsif r.row_hash is distinct from v_hash then
      v_bad := jsonb_build_object('seq', r.seq, 'id', r.id, 'alasan', 'isi baris berubah (hash tidak cocok)'); exit;
    end if;
    v_prev := r.row_hash;
  end loop;
  return jsonb_build_object('ok', v_bad is null and v_legacy = 0, 'diperiksa', v_n, 'tanpa_rantai', v_legacy, 'pertama_rusak', v_bad,
    'kepala_rantai', jsonb_build_object('seq', v_seq, 'hash', v_prev), 'diperiksa_pada', now());
end $$;

revoke all on function public.audit_verify_chain(integer) from public, anon;
grant execute on function public.audit_verify_chain(integer) to authenticated, service_role;
revoke all on function public.audit_log_rantai(), public.audit_log_tolak_ubah() from public, anon, authenticated;
revoke all on function private.audit_row_hash(text, bigint, public.audit_logs) from public, anon, authenticated;
