-- =============================================================================
-- Dokter & resepsionis boleh MEMBACA master_bahan di kliniknya sendiri
-- -----------------------------------------------------------------------------
-- Sebelumnya satu-satunya policy permissive di master_bahan adalah
-- "Admin full access master_bahan" (role admin). Akibatnya:
--   * E-Prescription (dokter) selalu kosong — getActiveObat() tidak
--     mengembalikan satu baris pun, sehingga resep & MedicationRequest
--     SATUSEHAT tidak bisa dibuat.
--   * Daftar obat di form pembayaran (resepsionis/kasir) juga kosong.
-- Policy ini hanya SELECT; tambah/ubah/hapus tetap khusus admin.
-- Isolasi klinik tetap dijaga policy RESTRICTIVE tenant_isolation.
-- =============================================================================

drop policy if exists master_bahan_baca_dokter_resepsionis on public.master_bahan;
create policy master_bahan_baca_dokter_resepsionis on public.master_bahan
  as permissive for select to authenticated
  using ((select public.get_user_role()) in ('dokter', 'resepsionis'));
