/**
 * Koreksi pemetaan kolom NYATA dari operator Console (ekspor platform.migrasi_koreksi_kolom).
 * Isinya hanya angka ciri kolom + jenis kolom pilihan operator, tanpa data pasien.
 */
import { KELAS, NAMA_FITUR, prediksi, type ModelKolom } from "../../src/modules/clinics/migrasi/ml.ts";

const F = NAMA_FITUR.length;

/** Satu kolom nyata hasil koreksi operator (ekspor tabel platform.migrasi_koreksi_kolom). */
interface KoreksiNyata { fitur: number[]; final: string; tebakan?: string }

/** Baca ekspor koreksi; buang baris dari versi fitur lain / jenis tak dikenal. Bagi 80% latih, 20% uji. */
export function bacaKoreksi(isi: unknown): { latih: { X: number[][]; y: number[] }; uji: { X: number[][]; y: number[] }; dibuang: number } {
  const daftar = Array.isArray(isi) ? (isi as KoreksiNyata[]) : [];
  const latih = { X: [] as number[][], y: [] as number[] };
  const ujiN = { X: [] as number[][], y: [] as number[] };
  let dibuang = 0;
  daftar.forEach((k, i) => {
    const kelas = KELAS.indexOf(k?.final as (typeof KELAS)[number]);
    if (kelas < 0 || !Array.isArray(k.fitur) || k.fitur.length !== F || !k.fitur.every((v) => Number.isFinite(v))) {
      dibuang++;
      return;
    }
    const tujuan = i % 5 === 4 ? ujiN : latih;
    tujuan.X.push(k.fitur.map(Number));
    tujuan.y.push(kelas);
  });
  return { latih, uji: ujiN, dibuang };
}

/** Akurasi per kolom (tanpa pemasangan antar-kolom) pada koreksi nyata. */
export function ujiNyata(model: ModelKolom, d: { X: number[][]; y: number[] }): number {
  if (!d.X.length) return 1;
  let benar = 0;
  d.X.forEach((x, i) => {
    const p = prediksi(model, x);
    if (p.indexOf(Math.max(...p)) === d.y[i]) benar++;
  });
  return benar / d.X.length;
}
