/**
 * Latih model pengenal kolom migrasi pasien (regresi logistik multikelas / softmax).
 *
 *   npm run ml:latih-migrasi            → latih, uji, tulis src/modules/clinics/migrasi/modelKolom.ts
 *   npm run ml:latih-migrasi -- --uji   → hanya uji model yang sudah ada
 *   npm run ml:latih-migrasi -- --koreksi koreksi.json
 *        → ikut latih dengan pemetaan kolom NYATA dari operator Console
 *          (ekspor platform.migrasi_koreksi_kolom, lihat docs/dentiva-console.md).
 *          Isinya hanya angka ciri kolom + jenis kolom pilihan operator, tanpa data pasien.
 *          20% disisihkan sebagai uji "NYATA" (tidak ikut dilatih).
 *
 * Data: SINTETIS dari pabrik.ts (tanpa data pasien asli).
 *   - latih : 3000 berkas, judul dari daftar "latih"
 *   - validasi: 800 berkas, seed lain (memilih kekuatan regularisasi)
 *   - uji   : 1500 berkas, seed lain + variasi judul BARU yang tidak pernah dilihat
 *             + lebih banyak judul kosong/generik (kolom harus dikenali dari isinya)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ABAIKAN, fiturKolom, KELAS, NAMA_FITUR, pasangkanKolom, prediksi, type ModelKolom } from "../../src/modules/clinics/migrasi/ml.ts";
import { buatAcak, buatBerkas, type BerkasSintetis, type OpsiPabrik } from "./pabrik.ts";
import { bacaKoreksi, ujiNyata } from "./koreksi.ts";

const HARI = new Date(2026, 10, 23);
const K = KELAS.length;
const F = NAMA_FITUR.length;

interface Data { X: number[][]; y: number[]; berkas: BerkasSintetis[]; offset: number[] }

function buatData(seed: number, jumlah: number, opsi: OpsiPabrik): Data {
  const r = buatAcak(seed);
  const X: number[][] = [];
  const y: number[] = [];
  const berkas: BerkasSintetis[] = [];
  const offset: number[] = [];
  for (let b = 0; b < jumlah; b++) {
    const f = buatBerkas(r, opsi);
    berkas.push(f);
    offset.push(X.length);
    f.judul.forEach((j, c) => {
      X.push(fiturKolom(j, f.isi.map((row) => row[c]), HARI));
      y.push(f.label[c]);
    });
  }
  return { X, y, berkas, offset };
}

function latih(X: number[][], y: number[], l2: number, epoch = 60): ModelKolom {
  const rata = new Array(F).fill(0);
  const simpang = new Array(F).fill(0);
  for (const x of X) x.forEach((v, i) => (rata[i] += v / X.length));
  for (const x of X) x.forEach((v, i) => (simpang[i] += (v - rata[i]) ** 2 / X.length));
  for (let i = 0; i < F; i++) simpang[i] = Math.sqrt(simpang[i]) || 1;
  const Z = X.map((x) => x.map((v, i) => (v - rata[i]) / simpang[i]));

  // bobot kelas seimbang: kelas jarang tidak kalah oleh "abaikan"/nama
  const hitung = new Array(K).fill(0);
  y.forEach((k) => hitung[k]++);
  const bobotKelas = hitung.map((c) => (c ? y.length / (K * c) : 0));

  const W = Array.from({ length: K }, () => new Array(F).fill(0));
  const b = new Array(K).fill(0);
  // Adam
  const mW = W.map((w) => w.map(() => 0)), vW = W.map((w) => w.map(() => 0));
  const mb = new Array(K).fill(0), vb = new Array(K).fill(0);
  const lr = 0.05, b1 = 0.9, b2 = 0.999, eps = 1e-8;
  const r = buatAcak(7);
  const idx = Z.map((_, i) => i);
  let t = 0;
  const batch = 256;
  for (let ep = 0; ep < epoch; ep++) {
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (let s = 0; s < idx.length; s += batch) {
      const gW = W.map((w) => w.map(() => 0));
      const gb = new Array(K).fill(0);
      const bagian = idx.slice(s, s + batch);
      for (const n of bagian) {
        const z = Z[n];
        const logit = W.map((w, k) => w.reduce((a, wi, i) => a + wi * z[i], b[k]));
        const m = Math.max(...logit);
        const e = logit.map((v) => Math.exp(v - m));
        const jml = e.reduce((a, v) => a + v, 0);
        const bk = bobotKelas[y[n]];
        for (let k = 0; k < K; k++) {
          const g = (e[k] / jml - (k === y[n] ? 1 : 0)) * bk;
          gb[k] += g;
          for (let i = 0; i < F; i++) gW[k][i] += g * z[i];
        }
      }
      t++;
      const lrT = lr * Math.sqrt(1 - b2 ** t) / (1 - b1 ** t) * (1 - ep / (epoch * 1.2));
      for (let k = 0; k < K; k++) {
        for (let i = 0; i < F; i++) {
          const g = gW[k][i] / bagian.length + l2 * W[k][i];
          mW[k][i] = b1 * mW[k][i] + (1 - b1) * g;
          vW[k][i] = b2 * vW[k][i] + (1 - b2) * g * g;
          W[k][i] -= lrT * mW[k][i] / (Math.sqrt(vW[k][i]) + eps);
        }
        const g = gb[k] / bagian.length;
        mb[k] = b1 * mb[k] + (1 - b1) * g;
        vb[k] = b2 * vb[k] + (1 - b2) * g * g;
        b[k] -= lrT * mb[k] / (Math.sqrt(vb[k]) + eps);
      }
    }
  }
  const bulat = (v: number) => Math.round(v * 1e4) / 1e4;
  return {
    versi: "", fitur: NAMA_FITUR, kelas: KELAS,
    rata: rata.map(bulat), simpang: simpang.map(bulat), bobot: W.map((w) => w.map(bulat)), bias: b.map(bulat),
  };
}

export interface HasilUji {
  akurasiKolom: number;
  akurasiKolomJudulGenerik: number;
  berkasSempurna: number;
  presisi: Record<string, number>;
  recall: Record<string, number>;
  salah: { benar: string; tebak: string; jumlah: number }[];
}

/** Uji ujung-ke-ujung: prediksi per kolom + pemasangan satu-jenis-satu-kolom seperti di Console. */
export function uji(model: ModelKolom, d: Data): HasilUji {
  let benar = 0, total = 0, benarG = 0, totalG = 0, sempurna = 0;
  const tp = new Array(K).fill(0), fp = new Array(K).fill(0), fn = new Array(K).fill(0);
  const bingung = new Map<string, number>();
  d.berkas.forEach((f, bi) => {
    const peluang = f.judul.map((_, c) => prediksi(model, d.X[d.offset[bi] + c]));
    const tebak = new Array(f.judul.length).fill(ABAIKAN);
    for (const p of pasangkanKolom(peluang)) tebak[p.kolom] = p.kelas;
    let semua = true;
    f.label.forEach((lab, c) => {
      const ok = tebak[c] === lab;
      total++; if (ok) benar++;
      const generik = /^(|kolom ?\d+|column\d+|unnamed: \d+|f\d+|field\d+|col_\d+)$/i.test(f.judul[c].trim());
      if (generik) { totalG++; if (ok) benarG++; }
      if (!ok) {
        semua = false;
        const kunci = `${KELAS[lab]} → ${KELAS[tebak[c]]}`;
        bingung.set(kunci, (bingung.get(kunci) ?? 0) + 1);
      }
      if (tebak[c] !== ABAIKAN) (ok ? tp : fp)[tebak[c]]++;
      if (lab !== ABAIKAN && !ok) fn[lab]++;
    });
    if (semua) sempurna++;
  });
  const presisi: Record<string, number> = {};
  const recall: Record<string, number> = {};
  for (let k = 0; k < ABAIKAN; k++) {
    presisi[KELAS[k]] = tp[k] + fp[k] ? tp[k] / (tp[k] + fp[k]) : 1;
    recall[KELAS[k]] = tp[k] + fn[k] ? tp[k] / (tp[k] + fn[k]) : 1;
  }
  const salah = [...bingung].map(([k, jumlah]) => ({ benar: k.split(" → ")[0], tebak: k.split(" → ")[1], jumlah })).sort((a, b) => b.jumlah - a.jumlah);
  return { akurasiKolom: benar / total, akurasiKolomJudulGenerik: totalG ? benarG / totalG : 1, berkasSempurna: sempurna / d.berkas.length, presisi, recall, salah };
}

/** Kolom nyata diulang agar berbobot di antara ribuan kolom sintetis. */
const ULANG_NYATA = 5;

const persen = (v: number) => `${(v * 100).toFixed(2)}%`;

function cetak(nama: string, h: HasilUji) {
  console.log(`\n== ${nama}`);
  console.log(`  akurasi per kolom          : ${persen(h.akurasiKolom)}`);
  console.log(`  akurasi kolom tanpa judul  : ${persen(h.akurasiKolomJudulGenerik)}`);
  console.log(`  berkas terpetakan sempurna : ${persen(h.berkasSempurna)}`);
  console.log("  presisi / recall per jenis :");
  for (const k of Object.keys(h.presisi)) console.log(`    ${k.padEnd(16)} ${persen(h.presisi[k]).padStart(8)} / ${persen(h.recall[k]).padStart(8)}`);
  if (h.salah.length) console.log("  kesalahan terbanyak:", h.salah.slice(0, 8).map((s) => `${s.benar}→${s.tebak} (${s.jumlah})`).join(", "));
}

async function utama() {
  const hanyaUji = process.argv.includes("--uji");
  const iKoreksi = process.argv.indexOf("--koreksi");
  const koreksi = iKoreksi > 0 && process.argv[iKoreksi + 1]
    ? bacaKoreksi(JSON.parse(readFileSync(process.argv[iKoreksi + 1], "utf8")))
    : null;
  if (koreksi) {
    console.log(`Koreksi nyata: ${koreksi.latih.X.length} latih, ${koreksi.uji.X.length} uji, ${koreksi.dibuang} dibuang (versi fitur/jenis tidak cocok)`);
  }
  const t0 = Date.now();
  const dataUji = buatData(303, 1500, { judulBaru: true, pGenerik: 0.3 });
  // Kumpulan AKHIR: seed & variasi judul tertahan — tidak pernah dipakai untuk menyetel model.
  const dataAkhir = buatData(404, 1500, { judulAkhir: true, pGenerik: 0.3 });
  if (hanyaUji) {
    const { MODEL_KOLOM } = await import("../../src/modules/clinics/migrasi/modelKolom.ts");
    cetak("UJI (model terpasang)", uji(MODEL_KOLOM, dataUji));
    cetak("AKHIR (model terpasang)", uji(MODEL_KOLOM, dataAkhir));
    if (koreksi) console.log(`
== NYATA (model terpasang): akurasi per kolom ${persen(ujiNyata(MODEL_KOLOM, { X: [...koreksi.latih.X, ...koreksi.uji.X], y: [...koreksi.latih.y, ...koreksi.uji.y] }))}`);
    return;
  }
  const dataLatih = buatData(101, 3000, { pGenerik: 0.15 });
  const dataVal = buatData(202, 800, { pGenerik: 0.2, judulBaru: false });
  const { MODEL_KOLOM: modelLama } = await import("../../src/modules/clinics/migrasi/modelKolom.ts");
  const nyataLama = koreksi?.uji.X.length ? ujiNyata(modelLama, koreksi.uji) : null;
  if (koreksi) {
    for (let u = 0; u < ULANG_NYATA; u++) {
      dataLatih.X.push(...koreksi.latih.X);
      dataLatih.y.push(...koreksi.latih.y);
    }
  }
  console.log(`Data: latih ${dataLatih.X.length} kolom, validasi ${dataVal.X.length}, uji ${dataUji.X.length} (${((Date.now() - t0) / 1000).toFixed(1)} dtk)`);

  let terbaik: { model: ModelKolom; skor: number; l2: number } | null = null;
  for (const l2 of [1e-4, 1e-3, 1e-2]) {
    const m = latih(dataLatih.X, dataLatih.y, l2);
    const h = uji(m, dataVal);
    // dengan koreksi nyata: skor = rata-rata validasi sintetis & bagian latih nyata
    const skor = koreksi?.latih.X.length ? (h.akurasiKolom + ujiNyata(m, koreksi.latih)) / 2 : h.akurasiKolom;
    console.log(`  l2=${l2}: validasi akurasi kolom ${persen(h.akurasiKolom)}, berkas sempurna ${persen(h.berkasSempurna)}`);
    if (!terbaik || skor > terbaik.skor) terbaik = { model: m, skor, l2 };
  }
  const model = terbaik!.model;
  const hLatih = uji(model, dataLatih);
  const hUji = uji(model, dataUji);
  cetak("LATIH", hLatih);
  cetak("UJI (data & variasi judul belum pernah dilihat)", hUji);
  const hAkhir = uji(model, dataAkhir);
  cetak("AKHIR (kumpulan tertahan)", hAkhir);
  const hNyata = koreksi?.uji.X.length ? ujiNyata(model, koreksi.uji) : null;
  if (hNyata !== null) {
    console.log(`
== NYATA (20% koreksi operator yang disisihkan): model baru ${persen(hNyata)} vs model lama ${persen(nyataLama!)}`);
  }

  const tgl = new Date();
  model.versi = `kolom-${tgl.getFullYear()}-${String(tgl.getMonth() + 1).padStart(2, "0")}-${String(tgl.getDate()).padStart(2, "0")}-l2_${terbaik!.l2}`;
  model.metrik = {
    data: koreksi
      ? `sintetis (pabrik.ts) + ${koreksi.latih.X.length} kolom koreksi operator (ciri angka, tanpa data pasien)`
      : "sintetis (pabrik.ts), tanpa data pasien asli",
    kolom_latih: dataLatih.X.length,
    kolom_uji: dataUji.X.length,
    uji_akurasi_kolom: Number(hUji.akurasiKolom.toFixed(4)),
    uji_akurasi_kolom_tanpa_judul: Number(hUji.akurasiKolomJudulGenerik.toFixed(4)),
    uji_berkas_sempurna: Number(hUji.berkasSempurna.toFixed(4)),
    akhir_akurasi_kolom: Number(hAkhir.akurasiKolom.toFixed(4)),
    akhir_berkas_sempurna: Number(hAkhir.berkasSempurna.toFixed(4)),
    ...(hNyata !== null ? { nyata_akurasi_kolom: Number(hNyata.toFixed(4)), nyata_kolom_uji: koreksi!.uji.X.length } : {}),
  };
  const tujuan = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "modules", "clinics", "migrasi", "modelKolom.ts");
  writeFileSync(
    tujuan,
    `/* eslint-disable */\n// DIBUAT OTOMATIS oleh scripts/migrasi-ml/latih.ts — jangan diedit manual. Latih ulang: npm run ml:latih-migrasi\nimport type { ModelKolom } from "./ml.ts";\n\nexport const MODEL_KOLOM: ModelKolom = ${JSON.stringify(model)};\n`,
  );
  console.log(`\nModel ditulis ke ${tujuan} (${((Date.now() - t0) / 1000).toFixed(1)} dtk)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await utama();
