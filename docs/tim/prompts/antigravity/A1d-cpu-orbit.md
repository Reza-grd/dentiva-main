# Antigravity · Misi A1d — Perbaiki regresi CPU orbit (WAJIB sebelum deploy)

```
MISI A1d — REGRESI CPU DENTI. Prioritas tertinggi; kerjakan sampai selesai tanpa jeda.

Worktree sendiri dari console TERBARU (sudah berisi A1c + A4b):
    git fetch origin
    git worktree add D:/dentiva/antigravity-A1d -b antigravity/A1d-cpu-orbit origin/console

TEMUAN KETUA (diukur dengan docs/tim/alat/ukur-cpu-denti.mjs — Chrome, DPR 2, satu Denti idle, 5 detik, TaskDuration main thread):
  A1  (53f3011)  hero 0,59% · standar 0,47% · mini 0,25%
  A1b (1781c32)  hero 21,04%
  A1c (86db5ac)  hero 18,69% · standar 20,31% · mini 0,17%
  A1c + EXTRA_CSS '.denti .d-orbit-dot{animation:none!important}' → hero 0,44%
  ⇒ Penyebab: animasi offset-path partikel orbit (A1b) memicu Layout + RecalcStyle tiap frame di main thread.
  Laporan A1c menyebut "~12,5% → 12,31% (≤15% lulus)" — batas 15% itu SALAH; acuan A1 adalah <1%.
  Denti hero/standar tampil terus di halaman Asisten AI & layar antrean TV (berjam-jam) → baterai/kipas laptop klinik.

TARGET (diukur dengan alat yang sama, sertakan keluaran mentahnya di laporan):
  hero 220 px ≤ 1,0% · standar 120 px ≤ 1,0% · mini 58 px ≤ 0,5% · 7 Denti sekaligus (hero) ≤ 3%.
  Ukur juga state celebrate & talk (sementara, gerak memang aktif) dan laporkan angkanya.

PILIHAN SOLUSI (pilih yang lolos target; jelaskan alasannya):
  a) Orbit tanpa gerak terus-menerus: titik diam + denyut opacity lambat (seperti A1), gerak orbit hanya sesaat pada state aktif
     (celebrate/wave/happy, ≤ 2 dtk) lalu berhenti.
  b) Gerak diskret: animation-timing-function steps(n) dengan n kecil (mis. 24 langkah per 9 dtk) agar main thread hanya bekerja beberapa kali per detik.
  c) Jeda otomatis saat tidak terlihat/diam: IntersectionObserver + document.visibilityState → set data-animate="off"; setelah 20 dtk idle
     tanpa interaksi, matikan animasi dekoratif (orbit, sparks) — tetap hormati prefers-reduced-motion.
  Animasi lain yang terus berulang (pulse, ring bayangan, kedip) juga ukur & tekan bila perlu (A1c tanpa orbit+bayangan = 0,36%).

TES & BUKTI:
  - Tes unit: animasi orbit tidak berulang tanpa batas pada state idle (atau berhenti saat data-animate="off").
  - Keluaran ukur-cpu-denti.mjs untuk A1c vs A1d (hero/standar/mini, 1 dan 7 Denti).
  - Visual tidak berubah selain gerak orbit; Playwright 33/33; lint/typecheck/npm test/build:clinic.
  - Jalankan dari worktree A1d saja (dist-e2e). Jangan menyentuh folder utama.

SERAH TERIMA: commit di antigravity/A1d-cpu-orbit, push cabang itu, docs/tim/serah-terima/A1d.md (templat 03 §4). Kabari Ketua.
Setelah A1d diterima Ketua, baru boleh mulai A2.
```
