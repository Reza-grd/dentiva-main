-- =============================================================================
-- Laporan uji sandbox SATUSEHAT (Edge Function satusehat-sandbox-verify)
-- -----------------------------------------------------------------------------
-- Bukti bahwa satu kunjungan lengkap (Encounter → Condition → Procedure →
-- MedicationRequest → Composition) lulus di sandbox sebelum pengiriman ke
-- SATUSEHAT produksi dibuka (secret SATUSEHAT_PRODUCTION_APPROVED=true).
-- Hanya service_role; tidak terbaca dari aplikasi klinik.
-- =============================================================================

create table if not exists public.satusehat_verification_runs (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid,
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  passed      boolean not null,
  report      jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.satusehat_verification_runs enable row level security;
revoke all on public.satusehat_verification_runs from anon, authenticated, public;
grant all on public.satusehat_verification_runs to service_role;

comment on table public.satusehat_verification_runs is
  'Hasil satusehat-sandbox-verify. Lihat docs/satusehat-sandbox-runbook.md.';
