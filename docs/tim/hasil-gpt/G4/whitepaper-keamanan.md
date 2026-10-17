# Keamanan Dentiva — Materi untuk Calon Klien

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Ringkasan yang boleh dibagikan setelah ditinjau
Dentiva memisahkan akses operasional klinik, pelayanan dokter dan administrasi.
Pada kode yang ditinjau, isolasi klinik ditegakkan di database, dan admin bisnis
tidak diberi isi rekam medis pasien (E01/E02). Denti Agen menyiapkan usulan;
perubahan memerlukan persetujuan admin dan pemeriksaan server (E10).

## Perlindungan dan batasnya
- Sumber konfigurasi menyediakan TOTP dan pemeriksaan sandi bocor; pemaksaan AAL2
  klinik belum selesai menurut laporan Ketua (E03). Ini tidak berarti semua staf
  sudah memakai MFA.
- Audit berantai membantu memeriksa integritas catatan (E04). Tanpa jangkar luar,
  jangan menyebut log kebal perubahan administrator database yang sangat berhak.
- Backup lokal harian terenkripsi tersedia menurut runbook (E05); penyimpanan
  offsite belum aktif (E06). Kehilangan server tetap risiko kesinambungan utama.
- Server inti dilaporkan di Indonesia (E08); AI, frontend, error monitoring dan
  komunikasi dapat melibatkan penyedia luar. Lokasi seluruh pemrosesan perlu
  pemetaan kontrak, bukan slogan “semua data selalu di Indonesia”.

## Tanggung jawab bersama
Klinik menentukan staf, tujuan pelayanan, dasar pemrosesan, dan pengungkapan
RME yang sah. Dentiva menjalankan kontrol teknis dan instruksi dalam DPA yang
disepakati. Staf melindungi perangkat, tidak membagikan akun dan memeriksa usulan
sebelum menyetujui. Penggunaan AI tidak menggantikan keputusan klinis dokter.

## Pekerjaan yang masih berjalan
Offsite/latihan terukur, SMTP, AAL2 klinik, rate-limit gateway, penandatanganan
desktop, pemindaian rantai pasok, pemantauan eksternal dan pentest independen.
Tidak ada klaim sertifikasi ISO/SOC2 atau kepatuhan menyeluruh. Calon klien dapat
meminta register bukti dengan scope dan tanggal melalui kontak yang disahkan.

## Lampiran teknis
E01 restrictive clinic_id; E02 peran; E03 GoTrue; E04 SHA-256 per tenant;
E05 snapshot+age+manifest; E09 header sumber; E10 propose/apply/expiry30 menit.
Rujukan lengkap sumber-dan-bukti.md. Angka target DR bukan SLA terukur saat ini.
