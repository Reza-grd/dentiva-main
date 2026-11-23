/**
 * Membaca berkas Excel/CSV pasien lama klinik untuk migrasi lewat Console.
 *
 * Dibantu "mesin cerdas" lokal (cerdas.ts) agar berkas yang berantakan tetap terbaca:
 *  - baris judul ditemukan otomatis walau ada baris kop/judul laporan di atasnya
 *  - jenis kolom dikenali MODEL PEMBELAJARAN MESIN (ml.ts, bobot di modelKolom.ts) dari judul dan isi,
 *    dengan peluang sebagai skor keyakinan
 *  - nilai diperbaiki otomatis (nama, sapaan, tanggal, nomor WA, data dari NIK)
 *  - duplikat persis ditolak, duplikat mirip ditandai untuk diperiksa
 *  - baris siap impor diurutkan menurut No. RM lama
 * Validasi akhir memakai skema kontrak yang SAMA dengan yang diperiksa console-api.
 */
import { barisPasienMigrasi, type BarisPasienMigrasi, type PemetaanKolomMigrasi } from "@dentiva/shared";
import {
  bandingkanRm,
  bersihkanNama,
  infoNik,
  jaroWinkler,
  normTeks,
  skorJudul,
  tebakFormatTanggal,
  uraiTanggal,
  type FormatTanggal,
} from "./cerdas";
import { ABAIKAN, ALIAS_JUDUL, fiturKolom, KELAS, kenaliKolom } from "./ml";
import { MODEL_KOLOM } from "./modelKolom";

export type KunciKolom = Exclude<keyof BarisPasienMigrasi, "baris">;

export interface DefinisiKolom {
  key: KunciKolom;
  label: string;
  aliases: string[];
  wajib?: boolean;
}

const URUTAN_TAMPIL: KunciKolom[] = [
  "nama_lengkap", "no_rm_lama", "tanggal_lahir", "jenis_kelamin", "no_wa", "alamat", "nik", "tempat_lahir", "pekerjaan", "golongan_darah",
];
export const KOLOM_MIGRASI: DefinisiKolom[] = URUTAN_TAMPIL.map((key) => ({
  key,
  label: ALIAS_JUDUL[key].label,
  aliases: ALIAS_JUDUL[key].aliases,
  wajib: key === "nama_lengkap" || undefined,
}));

/** Peta kolom: kunci field → indeks kolom berkas (atau undefined = tidak dipakai). */
export type PetaKolom = Partial<Record<KunciKolom, number>>;

export interface BerkasMentah {
  judul: string[];
  isi: unknown[][];
}

export type Berkas = BerkasMentah & {
  nomor: number[];
  /** Baris (1-based) tempat judul kolom ditemukan. */
  barisJudul?: number;
};

export interface Keyakinan {
  /** 0..1 */
  skor: number;
  sumber: "judul" | "isi" | "judul+isi";
}

export interface AnalisisKolom {
  peta: PetaKolom;
  keyakinan: Partial<Record<KunciKolom, Keyakinan>>;
  formatTanggal: FormatTanggal;
}

/** Kode perbaikan otomatis yang diterapkan pada satu baris. */
export type Perbaikan =
  | "nama_dirapikan"
  | "sapaan_dibuang"
  | "kelamin_dari_sapaan"
  | "kelamin_dari_nik"
  | "lahir_dari_nik"
  | "wa_dirapikan"
  | "tanggal_dikenali";

export const LABEL_PERBAIKAN: Record<Perbaikan, string> = {
  nama_dirapikan: "Nama dirapikan (huruf kapital/spasi)",
  sapaan_dibuang: "Sapaan Tn./Ny./An. dipisahkan dari nama",
  kelamin_dari_sapaan: "Jenis kelamin diisi dari sapaan",
  kelamin_dari_nik: "Jenis kelamin diisi dari NIK",
  lahir_dari_nik: "Tanggal lahir diisi dari NIK",
  wa_dirapikan: "Nomor WA dirapikan ke format 08…",
  tanggal_dikenali: "Tanggal berformat teks dikenali",
};

export interface BarisHasil {
  /** Nomor baris di Excel. */
  baris: number;
  data: BarisPasienMigrasi | null;
  galat: string[];
  /** Tetap diimpor, tetapi sebaiknya diperiksa klinik. */
  peringatan: string[];
  perbaikan: Perbaikan[];
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const teks = (v: unknown) => {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s === "" || s === "-" ? null : s;
};

/** Cari baris judul di 10 baris pertama: baris dengan kecocokan judul terbanyak. */
export function cariBarisJudul(matriks: unknown[][]): number {
  let terbaik = 0;
  let skorTerbaik = -1;
  matriks.slice(0, 10).forEach((r, i) => {
    const sel = r.map((c) => String(c ?? "").trim()).filter(Boolean);
    if (sel.length < 2) return;
    const skor = sel.filter((h) => KOLOM_MIGRASI.some((k) => skorJudul(h, k.aliases, k.label) >= 0.85)).length;
    if (skor > skorTerbaik) {
      skorTerbaik = skor;
      terbaik = i;
    }
  });
  return skorTerbaik > 0 ? terbaik : 0;
}

/** Baca sheet pertama → judul + isi (baris kosong dibuang, nomor baris Excel dipertahankan). */
export async function bacaBerkas(berkas: File | ArrayBuffer): Promise<Berkas> {
  const XLSX = await import("xlsx");
  const buf = berkas instanceof ArrayBuffer ? berkas : await berkas.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matriks = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "", blankrows: true });
  const j = cariBarisJudul(matriks);
  const judul = (matriks[j] ?? []).map((h) => String(h ?? "").trim());
  const isi: unknown[][] = [];
  const nomor: number[] = [];
  matriks.slice(j + 1).forEach((r, i) => {
    if (r.every((c) => String(c ?? "").trim() === "")) return;
    isi.push(r);
    nomor.push(j + i + 2);
  });
  return { judul, isi, nomor, barisJudul: j + 1 };
}

/**
 * Kenali kolom dari judul DAN isi. Tiap pasangan (kolom berkas, jenis) diberi skor;
 * pasangan terbaik dipilih lebih dulu tanpa memakai kolom/jenis dua kali.
 */
export function analisisKolom(judul: string[], isi: unknown[][] = [], hariIni = new Date()): AnalisisKolom {
  // Model pembelajaran mesin (dilatih dengan scripts/migrasi-ml/latih.ts) menilai setiap kolom.
  const { pasangan } = kenaliKolom(MODEL_KOLOM, judul, isi, hariIni);
  const peta: PetaKolom = {};
  const keyakinan: AnalisisKolom["keyakinan"] = {};
  for (const p of pasangan) {
    const key = KELAS[p.kelas] as KunciKolom;
    const def = KOLOM_MIGRASI.find((k) => k.key === key)!;
    const dariJudul = skorJudul(judul[p.kolom] ?? "", def.aliases, def.label) >= 0.8;
    const dariIsi = isi.some((r) => String(r[p.kolom] ?? "").trim() !== "");
    peta[key] = p.kolom;
    keyakinan[key] = { skor: Math.round(p.p * 100) / 100, sumber: dariJudul && dariIsi ? "judul+isi" : dariJudul ? "judul" : "isi" };
  }
  const formatTanggal = peta.tanggal_lahir === undefined ? "dmy" : tebakFormatTanggal(isi.map((r) => r[peta.tanggal_lahir!]));
  return { peta, keyakinan, formatTanggal };
}

/** Apakah baris judul benar-benar baris judul (minimal satu judul kolom dikenal)? */
export function judulDikenali(judul: string[]): boolean {
  return judul.some((h) => KOLOM_MIGRASI.some((k) => skorJudul(h, k.aliases, k.label) >= 0.85));
}

/** Judul aman disimpan: bukan isi data (tanpa deret angka, pendek). */
function judulAman(h: string): string | null {
  const t = h.trim().replace(/\s+/g, " ");
  if (!t || t.length > 60 || /\d{3,}/.test(t) || /@/.test(t)) return null;
  return t;
}

/**
 * Bahan latih ulang mesin pengenal kolom: per kolom berkas → ciri statistik (angka),
 * tebakan mesin, dan pilihan akhir operator. TIDAK berisi isi sel/data pasien; judul kolom
 * hanya ikut bila baris judul terdeteksi sebagai judul sungguhan.
 */
export function bahanLatihPemetaan(
  berkas: Berkas,
  tebakan: PetaKolom,
  akhir: PetaKolom,
  hariIni = new Date(),
): PemetaanKolomMigrasi[] {
  const lebar = Math.max(berkas.judul.length, ...berkas.isi.slice(0, 50).map((r) => r.length), 0);
  const kebalik = (peta: PetaKolom) => {
    const m = new Map<number, string>();
    for (const [k, c] of Object.entries(peta)) if (c !== undefined) m.set(c, k);
    return m;
  };
  const t = kebalik(tebakan);
  const a = kebalik(akhir);
  const judulAsli = judulDikenali(berkas.judul);
  const hasil: PemetaanKolomMigrasi[] = [];
  for (let c = 0; c < Math.min(lebar, 200); c++) {
    const judul = berkas.judul[c] ?? "";
    const nilai = berkas.isi.map((r) => r[c]);
    const kosong = nilai.every((v) => String(v ?? "").trim() === "");
    if (kosong && !judul.trim()) continue;
    hasil.push({
      kolom: c,
      judul: judulAsli ? judulAman(judul) : null,
      fitur: fiturKolom(judul, nilai, hariIni).map((v) => Math.round(v * 1e4) / 1e4),
      tebakan: t.get(c) ?? KELAS[ABAIKAN],
      final: a.get(c) ?? KELAS[ABAIKAN],
    });
  }
  return hasil;
}

/** Tebak pemetaan kolom (judul saja, atau judul + isi bila diberikan). */
export function tebakPeta(judul: string[], isi?: unknown[][]): PetaKolom {
  if (isi) return analisisKolom(judul, isi).peta;
  const peta: PetaKolom = {};
  judul.forEach((h, i) => {
    const n = norm(h);
    if (!n) return;
    const kol = KOLOM_MIGRASI.find((k) => k.aliases.includes(n) || norm(k.label) === n);
    if (kol && peta[kol.key] === undefined) peta[kol.key] = i;
  });
  return peta;
}

export function tanggal(v: unknown, format: FormatTanggal = "dmy", hariIni = new Date()): string | null | "INVALID" {
  if (v === null || v === undefined || v === "" || v === "-") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number") {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000); // nomor seri Excel
    return d.toISOString().slice(0, 10);
  }
  const u = uraiTanggal(String(v), format, hariIni);
  if (!u) return "INVALID";
  const [y, mo, d] = u;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return "INVALID";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function kelamin(v: unknown): "Laki-laki" | "Perempuan" | null | "INVALID" {
  const s = norm(v);
  if (!s || s === "-") return null;
  if (["l", "lk", "laki", "laki-laki", "laki laki", "pria", "male", "m"].includes(s)) return "Laki-laki";
  if (["p", "pr", "perempuan", "wanita", "female", "f", "w"].includes(s)) return "Perempuan";
  return "INVALID";
}

/** Nomor WA → hanya angka; 62xx / +62xx / 8xx dirapikan jadi 08xx. */
export function nomorWa(v: unknown): string | null {
  const mentah = String(v ?? "").split(/[/,;]| atau /i)[0]; // "0812.. / 0857.." → nomor pertama
  let s = mentah.replace(/[^\d+]/g, "");
  if (!s) return null;
  if (s.startsWith("+62")) s = `0${s.slice(3)}`;
  else if (s.startsWith("62")) s = `0${s.slice(2)}`;
  else if (s.startsWith("8")) s = `0${s}`;
  return s;
}

/** Normalisasi + perbaikan otomatis + validasi semua baris. Duplikat di dalam berkas ditandai di sini. */
export function olahBaris(berkas: Berkas, peta: PetaKolom, opsi: { formatTanggal?: FormatTanggal; hariIni?: Date } = {}): BarisHasil[] {
  const hariIni = opsi.hariIni ?? new Date();
  const format = opsi.formatTanggal ?? (peta.tanggal_lahir === undefined ? "dmy" : tebakFormatTanggal(berkas.isi.map((r) => r[peta.tanggal_lahir!])));
  const dilihat = new Map<string, number>();
  const nikDilihat = new Map<string, number>();

  const hasil = berkas.isi.map((r, i): BarisHasil => {
    const ambil = (k: KunciKolom) => (peta[k] === undefined ? "" : r[peta[k]!]);
    const galat: string[] = [];
    const peringatan: string[] = [];
    const perbaikan: Perbaikan[] = [];

    const n = bersihkanNama(ambil("nama_lengkap"));
    if (n.sapaanDibuang) perbaikan.push("sapaan_dibuang");
    else if (n.dirapikan && n.nama) perbaikan.push("nama_dirapikan");

    const mentahTgl = ambil("tanggal_lahir");
    let tgl = tanggal(mentahTgl, format, hariIni);
    if (tgl === "INVALID") galat.push("Tanggal lahir tidak dikenali (contoh yang dikenali: 17/05/1990, 1990-05-17, 17 Mei 1990)");
    else if (tgl && typeof mentahTgl === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(mentahTgl.trim())) perbaikan.push("tanggal_dikenali");

    let jk = kelamin(ambil("jenis_kelamin"));
    if (jk === "INVALID") galat.push("Jenis kelamin harus L/P");
    if (!jk && n.kelaminSapaan) {
      jk = n.kelaminSapaan;
      perbaikan.push("kelamin_dari_sapaan");
    }

    const nik = String(ambil("nik") ?? "").replace(/\D/g, "");
    const dariNik = nik.length === 16 ? infoNik(nik, hariIni) : null;
    if (dariNik) {
      if (!tgl) {
        tgl = dariNik.tanggal;
        perbaikan.push("lahir_dari_nik");
      } else if (tgl !== "INVALID" && tgl !== dariNik.tanggal) {
        peringatan.push("Tanggal lahir berbeda dengan yang tertera di NIK");
      }
      if (!jk) {
        jk = dariNik.kelamin;
        perbaikan.push("kelamin_dari_nik");
      } else if (jk !== "INVALID" && jk !== dariNik.kelamin) {
        peringatan.push("Jenis kelamin berbeda dengan yang tertera di NIK");
      }
    }
    if (n.kelaminSapaan && jk && jk !== "INVALID" && jk !== n.kelaminSapaan) peringatan.push("Jenis kelamin tidak cocok dengan sapaan nama");

    const mentahWa = String(ambil("no_wa") ?? "").trim();
    const wa = nomorWa(mentahWa);
    if (wa && wa !== mentahWa) perbaikan.push("wa_dirapikan");

    const gol = String(ambil("golongan_darah") ?? "").trim().toUpperCase().replace(/[+-]$/, "");

    const kandidat = {
      baris: berkas.nomor[i],
      nama_lengkap: n.nama,
      tanggal_lahir: tgl === "INVALID" ? null : tgl,
      jenis_kelamin: jk === "INVALID" ? null : jk,
      no_wa: wa,
      alamat: teks(ambil("alamat")),
      nik: nik || null,
      tempat_lahir: teks(ambil("tempat_lahir")),
      pekerjaan: teks(ambil("pekerjaan")),
      golongan_darah: ["A", "B", "AB", "O"].includes(gol) ? (gol as "A" | "B" | "AB" | "O") : null,
      no_rm_lama: teks(ambil("no_rm_lama")),
    };
    const cek = barisPasienMigrasi.safeParse(kandidat);
    if (!cek.success) {
      for (const issue of cek.error.issues) {
        const kol = KOLOM_MIGRASI.find((k) => k.key === issue.path[0]);
        const pesan = issue.code === "too_small" && issue.path[0] === "nama_lengkap" ? "Nama kosong" : issue.message;
        galat.push(kol ? `${kol.label}: ${pesan}` : pesan);
      }
    }

    if (galat.length === 0) {
      const kunci = kandidat.no_rm_lama ?? `${norm(kandidat.nama_lengkap)}|${kandidat.tanggal_lahir ?? ""}`;
      const sebelumnya = dilihat.get(kunci);
      const nikSebelumnya = kandidat.nik ? nikDilihat.get(kandidat.nik) : undefined;
      if (sebelumnya !== undefined) galat.push(`Duplikat dengan baris ${sebelumnya} di berkas ini`);
      else if (nikSebelumnya !== undefined) galat.push(`NIK sama dengan baris ${nikSebelumnya} di berkas ini`);
      else {
        dilihat.set(kunci, kandidat.baris);
        if (kandidat.nik) nikDilihat.set(kandidat.nik, kandidat.baris);
      }
    }
    return { baris: kandidat.baris, data: galat.length ? null : (cek.data as BarisPasienMigrasi), galat, peringatan, perbaikan };
  });

  tandaiMirip(hasil);
  return hasil;
}

/** Duplikat tidak persis: nama sangat mirip + tanggal lahir sama, atau nama mirip + nomor WA sama. */
function tandaiMirip(hasil: BarisHasil[]): void {
  const valid = hasil.filter((h) => h.data);
  const kelompok = new Map<string, BarisHasil[]>();
  for (const h of valid) {
    const d = h.data!;
    for (const kunci of [d.tanggal_lahir ? `t:${d.tanggal_lahir}` : null, d.no_wa ? `w:${d.no_wa}` : null]) {
      if (!kunci) continue;
      const g = kelompok.get(kunci) ?? [];
      g.push(h);
      kelompok.set(kunci, g);
    }
  }
  const sudah = new Set<string>();
  for (const [kunci, g] of kelompok) {
    if (g.length < 2 || g.length > 200) continue;
    const ambang = kunci.startsWith("t:") ? 0.9 : 0.85;
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const a = normTeks(g[i].data!.nama_lengkap);
        const b = normTeks(g[j].data!.nama_lengkap);
        if (a === b && kunci.startsWith("t:")) continue; // persis sama sudah ditangani
        const pasangan = `${g[i].baris}-${g[j].baris}`;
        if (sudah.has(pasangan) || jaroWinkler(a, b) < ambang) continue;
        sudah.add(pasangan);
        const alasan = kunci.startsWith("t:") ? "nama hampir sama, tanggal lahir sama" : "nama mirip, nomor WA sama";
        g[j].peringatan.push(`Mungkin orang yang sama dengan baris ${g[i].baris} (${alasan})`);
      }
    }
  }
}

/** Ringkasan perbaikan otomatis: kode → jumlah baris. */
export function ringkasPerbaikan(hasil: BarisHasil[]): { kode: Perbaikan; label: string; jumlah: number }[] {
  const hitung = new Map<Perbaikan, number>();
  for (const h of hasil) for (const p of new Set(h.perbaikan)) hitung.set(p, (hitung.get(p) ?? 0) + 1);
  return [...hitung].map(([kode, jumlah]) => ({ kode, label: LABEL_PERBAIKAN[kode], jumlah })).sort((a, b) => b.jumlah - a.jumlah);
}

/** Urutkan baris siap impor menurut No. RM lama (urutan alami), lalu nomor baris Excel. */
export function urutkanSiap<T extends { baris: number; no_rm_lama?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => bandingkanRm(a.no_rm_lama, b.no_rm_lama) || a.baris - b.baris);
}

/** Pecah array menjadi potongan berukuran `n`. */
export function potong<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
