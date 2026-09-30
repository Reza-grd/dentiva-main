-- =============================================================================
-- Resep: master_bahan satu-satunya sumber data obat
-- -----------------------------------------------------------------------------
-- Aplikasi sudah membaca daftar obat dari master_bahan (kategori 'Obat') dan
-- menulis visit_obat.obat_id = visit_obat.master_bahan_id = master_bahan.id.
-- Namun visit_obat.obat_id masih ber-FK ke tabel lama master_obat, sehingga
-- meresepkan obat yang ditambahkan setelah migrasi SELALU ditolak:
--   23503 violates foreign key constraint "visit_obat_obat_id_fkey"
-- (diverifikasi di produksi 30 Sep 2026, transaksi di-rollback).
--
-- master_bahan_id tetap dijaga FK ke master_bahan. obat_id dipertahankan
-- sebagai kolom warisan (dibaca kasir) tanpa FK. master_obat tidak lagi dipakai.
-- =============================================================================

do $$
begin
  if to_regclass('public.visit_obat') is not null then
    alter table public.visit_obat drop constraint if exists visit_obat_obat_id_fkey;
    comment on column public.visit_obat.obat_id is
      'Warisan: sama dengan master_bahan_id. Tidak lagi ber-FK ke master_obat (tabel usang).';
  end if;

  if to_regclass('public.master_obat') is not null then
    comment on table public.master_obat is
      'USANG sejak 30 Sep 2026 — data obat ada di master_bahan (kategori Obat). Jangan dipakai untuk fitur baru.';
  end if;
end $$;
