-- =============================================================================
-- Kolom PII terenkripsi harus muat ciphertext
-- -----------------------------------------------------------------------------
-- Aplikasi klinik mengenkripsi nama_lengkap, no_wa, alamat, nik, nik_ibu lewat
-- public.encrypt_batch() → nilai 'PGP:<base64>' (±100+ karakter). Kolom
-- patients.no_wa masih varchar(20), sehingga SETIAP simpan/ubah pasien yang
-- memiliki nomor WA gagal: "value too long for type character varying(20)".
-- (Tidak terlihat sebelumnya karena semua penulisan sudah gagal lebih dulu
-- oleh process_audit_log sejak 18 Jul 2026.)
--
-- Perbaikan: no_wa → text (sama seperti alamat/nik/nik_ibu). View
-- v_patient_summary bergantung pada kolom ini sehingga dibangun ulang dengan
-- definisi & pengaturan keamanan yang sama (security_invoker, tanpa anon).
-- =============================================================================

do $$
declare
  v_def text;
begin
  -- Lewati bila kolom tidak ada atau sudah text (idempoten).
  if coalesce((select data_type from information_schema.columns
               where table_schema = 'public' and table_name = 'patients' and column_name = 'no_wa'), 'text') = 'text' then
    return;
  end if;

  if to_regclass('public.v_patient_summary') is not null then
    v_def := pg_get_viewdef('public.v_patient_summary'::regclass, true);
    drop view public.v_patient_summary;
  end if;

  alter table public.patients alter column no_wa type text;

  if v_def is not null then
    execute 'create view public.v_patient_summary with (security_invoker = true) as ' || v_def;
    revoke all on public.v_patient_summary from anon, public;
    grant select on public.v_patient_summary to authenticated, service_role;
  end if;
end $$;
