# Pengembangan Aman

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Frontend, RPC, edge, integrasi, desktop. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Validasi input dan izin di server; SECURITY DEFINER memakai scope tenant dan search_path yang dikunci.
2. Teks AI/nota/nama bahan tidak dipercaya sebagai instruksi atau HTML; sanitasi sesuai konteks.
3. Fixture sintetis; dilarang mengirim data pasien nyata ke model/pengujian desain.
4. RENCANA secret scan, SBOM, dependency review dan analisis statis di CI; dependency baru perlu alasan/lisensi.

## Keadaan nyata dan rencana
E01/E09/E10; pemindaian penuh masih rencana. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Ketua backend; Antigravity aplikasi/usulan CI. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
Negative tests, injeksi prompt G6, SAST/SCA hasil rilis dan daftar lisensi. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
