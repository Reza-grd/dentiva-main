-- Log transaksi API SATUSEHAT (Security Self-Assessment SATUSEHAT poin 15; OWASP A09).
-- Satu baris per panggilan ke SATUSEHAT (OAuth & FHIR): waktu, metode, endpoint, identitas client, status, durasi.
-- TIDAK menyimpan data sensitif: tanpa query string (bisa berisi NIK), tanpa isi permintaan/jawaban, tanpa token.
-- Hanya service role (fungsi edge) yang menulis/membaca; disimpan 1 tahun (syarat minimal 90 hari).

create table if not exists public.satusehat_log_api (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  lingkungan text not null,                 -- sandbox | production
  metode text not null,                     -- GET | POST | PUT
  endpoint text not null,                   -- mis. "fhir-r4/v1/Encounter" atau "oauth2/v1/accesstoken" (tanpa query)
  parameter text[] not null default '{}',   -- NAMA parameter query saja (nilainya tidak disimpan)
  client_id text,                           -- identitas client SATUSEHAT (bukan rahasia)
  organization_id text,                     -- Organization ID SATUSEHAT
  status int not null,                      -- kode HTTP; 0 = gagal jaringan
  percobaan int not null default 1,
  durasi_ms int not null,
  kode_galat text                           -- kode OperationOutcome/galat singkat bila gagal (tanpa isi pesan)
);

comment on table public.satusehat_log_api is
  'Log transaksi API SATUSEHAT: waktu, endpoint, client, status. Tanpa data sensitif. Retensi 365 hari.';

create index if not exists idx_satusehat_log_api_waktu on public.satusehat_log_api (waktu desc);

alter table public.satusehat_log_api enable row level security;
-- Tanpa kebijakan: pengguna aplikasi tidak bisa membaca/menulis; fungsi edge memakai service role.
revoke all on table public.satusehat_log_api from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'cron' and p.proname = 'schedule') then
    perform cron.schedule('hapus-log-api-satusehat-lama', '35 17 * * *',
      $cmd$ delete from public.satusehat_log_api where waktu < now() - interval '365 days' $cmd$);
  end if;
end $$;
