# Respons Insiden

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Komando dan tingkat keparahan
Incident commander: Ketua; pengganti [ISI]. Pemilik bisnis memberi keputusan layanan;
fungsi privasi/advokat menilai pemberitahuan; klinik pengendali menentukan komunikasi
pasien. Juru bicara tunggal [ISI], kanal aman dan telepon alternatif [ISI].
SEV1: dugaan lintas tenant, data klinis terbuka, kunci bocor, kehilangan VPS/backup;
SEV2: layanan utama terganggu atau akses akun mencurigakan terbatas; SEV3: gangguan
lokal tanpa indikasi paparan. SEV1 diperlakukan segera walau lingkup belum pasti.

## Alur tindakan
1. Deteksi: catat waktu sadar, sumber, layanan, tenant terdampak sementara dan fakta
   yang belum pasti; jangan menyimpulkan “tidak bocor” karena log kosong.
2. Pembatasan: Ketua mencabut sesi/kunci atau mengisolasi layanan secara terukur,
   menjaga pelayanan alternatif klinik dan menghindari penghapusan bukti.
3. Bukti: salinan log/artefak bertanda waktu dan hash, pembatasan akses, catatan
   siapa mengambil/menyerahkan; tanpa memindahkan data pasien ke chat tim.
4. Pemberantasan: perbaiki akar penyebab, rotasi key terpapar dan tinjau akses lain.
5. Pemulihan: pulihkan terisolasi, uji integritas/RLS/Storage/Auth, rekonsiliasi
   tindakan selama downtime, buka bertahap dengan persetujuan commander.
6. Pasca-insiden: kronologi, cakupan, sebab, pembelajaran, pemilik tindakan dan retest.

## Checklist awal 72 jam — rencana internal
- 0–1 jam: triase, commander, preservasi, keputusan containment.
- 1–4 jam: cakupan awal, tenant, kategori data, risiko pasien, kontak klinik.
- 4–24 jam: fakta yang tersedia, tindakan mitigasi, fungsi privasi menilai kewajiban;
  jangan menunggu RCA lengkap untuk menyiapkan pemberitahuan.
- 24–48 jam: perbarui cakupan, siapkan komunikasi dan bukti pengiriman.
- Sebelum tenggat yang berlaku: fungsi privasi/advokat memastikan penyampaian dan
  penerima yang sah; alur dan batas 3×24 jam dirujuk ke kepatuhan-uu-pdp.md.
Jam di atas target operasional usulan; bukan penafsiran baru titik awal hukum.
Dentiva sebagai prosesor mengusulkan laporan awal ke klinik segera setelah sadar,
target internal ≤4 jam, agar pengendali punya waktu menilai kewajiban.

## Templat komunikasi terpisah
Kepada klinik: “Kami mengidentifikasi [kejadian] pada [waktu]. Layanan/data yang
sedang diperiksa: [fakta]. Tindakan awal: [aksi]. Yang belum diketahui: [batas].
Pembaruan berikutnya [waktu], kontak aman [kontak]. Mohon jalankan [langkah].”

Kepada pasien oleh pengendali: “[Klinik] memberi tahu kejadian yang melibatkan
[kategori data], diketahui [waktu/cara yang sudah terverifikasi]. Kami melakukan
[penanganan/pemulihan]. Langkah perlindungan Anda [langkah]. Hubungi [kontak].”

Kepada otoritas: identitas pengendali/prosesor, kronologi, kategori/jumlah terdampak
jika diketahui, dampak, mitigasi/pemulihan, kontak, kekurangan fakta dan rencana
pembaruan. Advokat memverifikasi lembaga/kanal yang berwenang; jangan otomatis
menyamakan setiap kewajiban pemberitahuan dengan satu alamat Komdigi.
