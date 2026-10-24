-- Enkripsi data pasien lama (dibuat sebelum enkripsi kolom aktif, Mei–Juni 2026).
-- Kolom & format sama dengan aplikasi (encryptionService.js → public.encrypt_field → private.encrypt_envelope(…, false)):
--   patients: nama_lengkap, no_wa, alamat, nik, nik_ibu · users: nik · visits: keluhan
-- Isi klinis TIDAK berubah, hanya cara simpannya. Karena itu trigger (versi rekam medis, audit, updated_at)
-- dimatikan sementara dalam transaksi ini agar teks polos lama tidak tersalin ke tabel versi/audit.
--
-- Butuh superuser (session_replication_role) → jalankan sebagai supabase_admin:
-- Uji (ROLLBACK):   docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 -v terapkan=false < enkripsi-data-lama.sql
-- Terapkan (COMMIT): … -v terapkan=true …
\set ON_ERROR_STOP 1
begin;
set local session_replication_role = replica;

create temp table _sebelum on commit drop as
select 'patients' t, count(*) filter (where coalesce(nama_lengkap,'')<>'' and nama_lengkap !~ '^PGPM?:')
                   + count(*) filter (where coalesce(no_wa,'')<>'' and no_wa !~ '^PGPM?:')
                   + count(*) filter (where coalesce(alamat,'')<>'' and alamat !~ '^PGPM?:')
                   + count(*) filter (where coalesce(nik,'')<>'' and nik !~ '^PGPM?:')
                   + count(*) filter (where coalesce(nik_ibu,'')<>'' and nik_ibu !~ '^PGPM?:') polos from public.patients
union all select 'users', count(*) filter (where coalesce(nik,'')<>'' and nik !~ '^PGPM?:') from public.users
union all select 'visits', count(*) filter (where coalesce(keluhan,'')<>'' and keluhan !~ '^PGPM?:') from public.visits;

update public.patients set
  nama_lengkap = case when coalesce(nama_lengkap,'')<>'' and nama_lengkap !~ '^PGPM?:' then private.encrypt_envelope(nama_lengkap, clinic_id, false) else nama_lengkap end,
  no_wa        = case when coalesce(no_wa,'')<>''        and no_wa        !~ '^PGPM?:' then private.encrypt_envelope(no_wa, clinic_id, false)        else no_wa end,
  alamat       = case when coalesce(alamat,'')<>''       and alamat       !~ '^PGPM?:' then private.encrypt_envelope(alamat, clinic_id, false)       else alamat end,
  nik          = case when coalesce(nik,'')<>''          and nik          !~ '^PGPM?:' then private.encrypt_envelope(nik, clinic_id, false)          else nik end,
  nik_ibu      = case when coalesce(nik_ibu,'')<>''      and nik_ibu      !~ '^PGPM?:' then private.encrypt_envelope(nik_ibu, clinic_id, false)      else nik_ibu end
where (coalesce(nama_lengkap,'')<>'' and nama_lengkap !~ '^PGPM?:') or (coalesce(no_wa,'')<>'' and no_wa !~ '^PGPM?:')
   or (coalesce(alamat,'')<>'' and alamat !~ '^PGPM?:') or (coalesce(nik,'')<>'' and nik !~ '^PGPM?:')
   or (coalesce(nik_ibu,'')<>'' and nik_ibu !~ '^PGPM?:');

update public.users set nik = private.encrypt_envelope(nik, clinic_id, false)
where coalesce(nik,'')<>'' and nik !~ '^PGPM?:' and clinic_id is not null;

update public.visits set keluhan = private.encrypt_envelope(keluhan, clinic_id, false)
where coalesce(keluhan,'')<>'' and keluhan !~ '^PGPM?:';

-- Verifikasi: tidak ada teks polos tersisa, dan setiap ciphertext baru terbaca kembali utuh.
select s.t as tabel, s.polos as polos_sebelum,
  case s.t
    when 'patients' then (select count(*) filter (where coalesce(nama_lengkap,'')<>'' and nama_lengkap !~ '^PGPM?:')
                              + count(*) filter (where coalesce(no_wa,'')<>'' and no_wa !~ '^PGPM?:')
                              + count(*) filter (where coalesce(alamat,'')<>'' and alamat !~ '^PGPM?:') from public.patients)
    when 'users' then (select count(*) filter (where coalesce(nik,'')<>'' and nik !~ '^PGPM?:' and clinic_id is not null) from public.users)
    else (select count(*) filter (where coalesce(keluhan,'')<>'' and keluhan !~ '^PGPM?:') from public.visits)
  end as polos_sesudah
from _sebelum s order by 1;
select 'ciphertext gagal dibaca: ' || count(*) from public.patients
 where (alamat ~ '^PGPM?:' and private.medical_plain(alamat) is null) or (nama_lengkap ~ '^PGPM?:' and private.medical_plain(nama_lengkap) is null);

\if :terapkan
commit;
\echo '✓ DITERAPKAN (COMMIT)'
\else
rollback;
\echo '✓ UJI SAJA (ROLLBACK) — tidak ada yang berubah'
\endif
