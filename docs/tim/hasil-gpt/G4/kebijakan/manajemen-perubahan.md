# Manajemen Perubahan

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Kode, database, infrastruktur, token desain dan rilis. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Satu worktree/cabang per anggota; hanya Ketua menyetujui merge/deploy.
2. Catat tujuan, risiko, diff, tes, bukti visual bila relevan, rollback dan pemilik perubahan.
3. Migrasi/infra/rahasia tidak diubah anggota; draf usulan direview Ketua.
4. Perubahan darurat dicatat saat kejadian dan ditinjau retrospektif; tidak menonaktifkan RLS/CSP untuk mempercepat rilis.

## Keadaan nyata dan rencana
03 aturan tim; CI sumber, bukan bukti semua rilis mematuhinya. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Ketua penanggung jawab rilis. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
PR/commit, persetujuan, log build, hasil rollback drill dan catatan rilis. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
