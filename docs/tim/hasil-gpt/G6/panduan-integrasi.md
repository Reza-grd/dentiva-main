# Integrasi dan Batas Evaluasi G6
Versi1.0 · 2026-10-17 · Fixture Klinik Senyum Sehat saja.

## Keluaran dan komposisi
`skenario.js` adalah satu ekspresi array, tanpa import/export, sesuai permintaan.
150 ID unik berawalan g6-: bahasa60, ambigu25, multi25, keselamatan25, analitik15.
`tag` memakai enum harness; kelompok komposisi terpisah di komposisi.json karena
ambigu/multi bukan tag resmi. Lima injeksi memakai setup/teardown SQL pada fixture.
Literal nominal perintah pengguna adalah input uji, bukan klaim saldo/hasil analitik.
Tanggal relatif dihitung Asia/Jakarta saat array dimuat, bukan tanggal mesin UTC.

## Pengujian yang direproduksi tanpa mengubah supabase/**
1. `node docs/tim/hasil-gpt/G6/susun.mjs`
2. `node --experimental-transform-types --no-warnings docs/tim/hasil-gpt/G6/verifikasi.mjs`
3. `node --experimental-transform-types --no-warnings docs/tim/hasil-gpt/G6/bukti/harness.mjs --selftest --json docs/tim/hasil-gpt/G6/bukti/selftest-150.json`
4. Jalankan perintah sama dengan `--negative` untuk membuktikan penilai mendeteksi
   skrip yang sengaja dihilangkan seluruh panggilan alatnya.
5. `npm run eval:agen:selftest` menjalankan45 skenario baseline; bukan150 yang baru.

verifikasi.mjs melakukan parse TypeScript AST sungguhan, memeriksa array tunggal,
ID/tag, alat dari ALL_TOOLS, jenis usulan, setup/teardown dan mikrocopy. Ia membuat
modul fixture dan salinan harness di folder bukti; seluruh import alat/database
tetap menunjuk sumber asli worktree ini. Tidak ada eval atau penulisan ke produksi.

## Interpretasi
Selftest memakai respons ideal `script` dan alat/RPC produksi pada PGlite sintetis;
ia membuktikan oracle dapat dipenuhi dengan kontrak nyata dan data bisnis tidak
berubah tanpa apply. Tidak membuktikan model dapat memahami say; itu perlu eval
provider oleh Ketua setelah kunci dan biaya disetujui. Salinan harness hanya
memperbaiki lokasi import, bukan melonggarkan evaluate/threshold/invarian.
Expected firstTool/minCalls pada multi menguji protokol bertahap. Jangan menurunkan
oracle agar model gagal tampak lulus; kategorikan kegagalan dan tinjau kebutuhan.

## Cara Ketua mengintegrasikan
Ambil objek dalam array ke SCENARIOS pada cabang evaluasi Ketua, tanpa menduplikasi
pembungkus array. Cocokkan nama alat/jenis dengan versi backend saat merge.
Jalankan baseline+tambahan, uji negatif dan evaluasi penyedia dengan keluaran
teredaksi. Jangan memasang skenario setup pada database produksi. Masing-masing
setup diikuti teardown dan dibuat sebelum fingerprint awal oleh harness.

## Mikrocopy
32 situasi ×5 variasi, semua ≤220 karakter. Waktu sapaan USULAN zona klinik:
pagi05.00–10.59; siang11.00–14.59; sore15.00–17.59; malam18.00–04.59.
Admin boleh diarahkan ke analisis bisnis, dokter/resepsionis ke panduan lokal.
Pilihan variasi tidak boleh mengubah fakta state. “Usulan berhasil” hanya sesudah
apply sukses server; “dibatalkan” hanya sesudah undo didukung dan sukses; offline
setelah submit memakai status-tidak-pasti sampai dibaca ulang. Dilarang menjanjikan
undo semua jenis, perubahan sebelum persetujuan atau pemulihan email yang belum aktif.
