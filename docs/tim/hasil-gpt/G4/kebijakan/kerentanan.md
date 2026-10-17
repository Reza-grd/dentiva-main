# Manajemen Kerentanan

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Paket, OS, gateway, browser wrapper dan integrasi. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Inventaris versi/owner; triase dampak dan eksploitabilitas, bukan skor otomatis saja.
2. USULAN target awal: kritis triase hari yang sama dan containment ≤24 jam; tinggi rencana ≤7 hari, sedang ≤30; bukan SLA kontraktual.
3. Patch diuji staging, review dan rollback; reboot kernel tertunda T3 dijadwalkan Ketua.
4. Pentest independen dan retest belum dilakukan; terima laporan aman melalui kontak keamanan yang ditetapkan.

## Keadaan nyata dan rencana
E08 dan papan L4/L6/L10. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Ketua menerima risiko dan jadwal; vendor pentest independen. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
Tiket temuan, bukti patch/retest, pengecualian dengan tanggal kedaluwarsa. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
