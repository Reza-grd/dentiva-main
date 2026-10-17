# Kriptografi dan Rahasia

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Kunci enkripsi, token layanan, backup dan sertifikat. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Rahasia hanya di pengelola/server yang disetujui; dilarang di git, prompt, log, screenshot atau artefak tes.
2. Pisahkan kredensial per layanan/lingkungan, akses paling rendah; pencatatan penggunaan tanpa nilai secret.
3. Backup age memakai kunci publik; simpan salinan pembuka di dua lokasi aman dengan pemilik/pengganti.
4. RENCANA rotasi kunci envelope: inventaris versi, uji dekripsi data lama, rewrap terkontrol, prosedur kompromi dan rollback; jangan sekadar mengganti env.

## Keadaan nyata dan rencana
E05; enkripsi medis menurut 00 perlu bukti algoritme/cakupan dan rotasi. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Ketua kustodian; pemilik menyetujui recovery key. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
Daftar key ID tanpa nilai, latihan pulih/dekripsi, tanggal rotasi dan pemusnahan. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
