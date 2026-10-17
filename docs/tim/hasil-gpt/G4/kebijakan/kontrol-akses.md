# Kontrol Akses dan Peran

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Data klinis, administrasi, keuangan, operator dan akses darurat. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Berikan izin berdasarkan tugas dan clinic_id; admin tidak memperoleh data pasien karena status pemilik.
2. Dokter melakukan perubahan klinis; resepsionis memproses kasir; service_role tidak ada di frontend.
3. RENCANA: joiner/mover/leaver dengan permintaan, persetujuan, waktu berlaku dan pencabutan; tinjauan hak tiap kuartal.
4. Akses darurat Ketua bersifat sementara, alasan tercatat, scope minimal dan review setelah kejadian.

## Keadaan nyata dan rencana
E01/E02/E12; izin UI RME perlu diselaraskan. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Pemilik klinik menyetujui hak staf; Ketua memasang kontrol backend. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
Sampel dua tenant/tiap peran, bukti persetujuan dan pencabutan sesi. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
