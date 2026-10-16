# Antigravity · A6 + A7 — Desktop premium & performa

**Cabang:** `antigravity/A6-desktop-premium`, `antigravity/A7-performa`

```
MISI A6 — APLIKASI DESKTOP KELAS PREMIUM (apps/desktop, Tauri 2)
1) Tampilan installer: gambar NSIS (header/sidebar) & DMG beresolusi tinggi (@2×), ikon aplikasi tajam semua ukuran (skrip apps/desktop/branding/generate.py sudah ada — perbaiki hasilnya), layar pembuka, judul jendela.
2) UX: banner offline/sambungan, UX pembaruan otomatis (kartu DesktopUpdater sudah ada — poles), menu aplikasi & tray, pintasan keyboard, kunci layar saat idle (bersama A5), penanganan tautan eksternal aman (opener).
3) Pencetakan: rancang & implementasikan cetak nota/kwitansi yang tajam (CSS print + ukuran thermal 58/80 mm sebagai opsi), tanpa dependensi native baru kecuali disetujui.
4) PENANDATANGANAN KODE: tulis workflow USULAN docs/tim/usulan-ci/desktop-sign.yml — Windows (Azure Trusted Signing atau sertifikat OV/EV via secret placeholder), macOS (Developer ID + notarisasi via secret placeholder),
   updater key (tauri signer). JANGAN menaruh kredensial; dokumentasikan langkah pemilik mengisi secret. Jangan mengubah .github/workflows.
LULUS: build uji berhasil lokal/CI usulan, installer & ikon terlihat premium (bukti tangkapan layar), tidak ada rahasia di repo, dokumentasi docs/desktop.md diperbarui.

MISI A7 — PERFORMA & PENGALAMAN
1) Ukur: bundel (rollup-plugin-visualizer), Lighthouse/Web Vitals pada profil laptop menengah + 4G cepat (LCP, INP, CLS, TBT), simpan baseline.
2) Perbaiki: code-splitting per rute, muat malas komponen berat (grafik, editor, PDF, maskot LOD), optimasi gambar & fon (subset, preload), hilangkan JS tak terpakai, memoisasi di titik panas.
3) Error boundary dengan UX baik (+ pelaporan Sentry yang tidak membocorkan data pasien), skeleton konsisten, kesiapan i18n (ekstrak string tanpa mengubah bahasa).
TARGET: LCP < 2,0 s, INP < 200 ms, CLS < 0,05; bundel awal tidak lebih besar dari sebelumnya (idealnya −20%). LULUS: angka sebelum/sesudah terdokumentasi & tercapai; tes hijau; tidak ada regresi fungsional.
```
