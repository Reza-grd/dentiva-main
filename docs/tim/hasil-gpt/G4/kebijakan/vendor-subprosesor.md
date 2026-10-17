# Vendor dan Subprosesor

**DRAF — perlu ditinjau advokat/DPO/auditor**

Versi 1.0 · Tanggal 2026-10-17 · Pemilik: Ketua Tim dan fungsi privasi yang ditunjuk.
Periode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.
Status: usulan internal; tidak ada klaim sertifikasi atau audit independen.

## Tujuan dan ruang lingkup
Semua pemasok infrastruktur, komunikasi, AI, billing dan telemetri. Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
1. Inventaris kategori data, lokasi/subvendor, tujuan, DPA, transfer, retensi, akses dukungan dan exit plan.
2. Jangan menyamakan Supabase self-host dengan Supabase Cloud sebagai prosesor aktif.
3. Aktivasi vendor baru memerlukan persetujuan pengendali dan minimisasi; rahasia/dataset nyata tidak dikirim untuk demo.
4. Evaluasi kondisi layanan WhatsApp tidak resmi dan alternatif resmi; jangan menjanjikan uptime atau ketahanan kanal vendor.

## Keadaan nyata dan rencana
E08/E10/E11 dan tabel vendor di bawah. Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
Pemilik menyetujui vendor, fungsi privasi menilai kontrak. Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
DPA/subprocessor approval, review tahunan, uji ekspor/penghapusan dan bukti konfigurasi. Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].

## Register pemasok awal
| Pihak | Peran/data yang mungkin | Status bukti | Yang perlu dipastikan |
|---|---|---|---|
| Biznet | VPS/database/Storage terenkripsi bidang | dilaporkan aktif E08 | entitas/lokasi fisik, akses dukungan, kontrak dan DR |
| Supabase self-host | perangkat lunak di VPS | ada | tidak otomatis transfer ke Supabase Cloud; telemetry/support harus dicek |
| Vercel | frontend/CDN, log permintaan | sumber arsitektur | lokasi log, IP/metadata, DPA, retensi |
| Google/Gemini | teks AI agregat dan prompt pengguna | penyedia dilaporkan saat snapshot | minimisasi prompt bebas; kontrak/retensi/lokasi belum diverifikasi |
| Anthropic | rencana AI atau aktif setelah T1 | belum konfirmasi aktivasi | DPA/transfer/retensi/model; nama model dalam kode bukan bukti ketersediaan |
| WA sidecar | nomor dan isi pesan, sesi riwayat | dilaporkan aktif | data sensitif, risiko kanal tidak resmi dan nomor klinik |
| Whapi | penyedia lama | tidak dipakai menurut E08 | pastikan pencabutan kredensial dan penghapusan historis |
| Midtrans | pembayaran langganan, metadata pelanggan | kode integrasi | jangan samakan pembayaran pasien; kontrak/webhook/retensi |
| Sentry | error/metadata perangkat | kode integrasi | redaksi identitas, lokasi dan sampling; tidak menganggap data selalu anonim |
| SATUSEHAT | pertukaran kesehatan sesuai kewenangan | sandbox | bukan otomatis subprosesor biasa; advokat tetapkan peran hukum |
