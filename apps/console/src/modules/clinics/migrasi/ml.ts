/**
 * Model pembelajaran mesin: pengenal jenis kolom berkas pasien.
 *
 * Regresi logistik multikelas (softmax) atas fitur judul + isi kolom. Fitur di
 * bawah dipakai SAMA PERSIS saat pelatihan (scripts/migrasi-ml/latih.ts) dan saat
 * dipakai di Console. Bobot hasil latih ada di modelKolom.ts (dibuat oleh pelatih).
 * Semuanya berjalan di browser; data pasien tidak dikirim ke mana pun.
 */
import {
  judulPengecoh,
  KATA_ALAMAT,
  normTeks,
  PEKERJAAN,
  SAPAAN_BELAKANG,
  SAPAAN_DEPAN,
  skorJudul,
  TOKEN_KELAMIN,
  uraiTanggal,
  type JenisKolom,
} from "./cerdas.ts";

/** Kelas keluaran: 10 jenis kolom pasien + "abaikan" (tgl daftar, umur, dokter, nama ibu, dst). */
export const KELAS = [
  "nama_lengkap", "no_rm_lama", "tanggal_lahir", "jenis_kelamin", "no_wa",
  "alamat", "nik", "tempat_lahir", "pekerjaan", "golongan_darah", "abaikan",
] as const;
export type Kelas = (typeof KELAS)[number];
export const ABAIKAN = KELAS.length - 1;

/** Alias judul kolom yang umum (sumber fitur judul + daftar di Console). */
export const ALIAS_JUDUL: Record<JenisKolom, { label: string; aliases: string[] }> = {
  nama_lengkap: { label: "Nama Lengkap", aliases: ["nama", "nama lengkap", "nama pasien", "name", "patient name", "nama px", "pasien"] },
  no_rm_lama: { label: "No. RM lama", aliases: ["no rm", "no. rm", "norm", "nomor rm", "rm", "no rekam medis", "no. rekam medis", "nomor rekam medis", "kode pasien", "id pasien", "medical record", "mr", "no mr", "no. mr", "no cm", "no. cm", "kode"] },
  tanggal_lahir: { label: "Tanggal Lahir", aliases: ["tanggal lahir", "tgl lahir", "tgl. lahir", "tanggal_lahir", "dob", "birth date", "date of birth", "tgl lhr", "lahir"] },
  jenis_kelamin: { label: "Jenis Kelamin", aliases: ["jenis kelamin", "jk", "l/p", "gender", "kelamin", "sex", "j.k", "j/k"] },
  no_wa: { label: "No WhatsApp / HP", aliases: ["no wa", "no. wa", "whatsapp", "wa", "no hp", "no. hp", "hp", "telepon", "no telepon", "no. telepon", "phone", "telp", "no telp", "kontak", "no. telp", "handphone"] },
  alamat: { label: "Alamat", aliases: ["alamat", "address", "alamat lengkap", "alamat rumah", "domisili"] },
  nik: { label: "NIK", aliases: ["nik", "no ktp", "ktp", "no. ktp", "no nik", "nomor induk kependudukan"] },
  tempat_lahir: { label: "Tempat Lahir", aliases: ["tempat lahir", "tmp lahir", "tempat_lahir", "tmpt lahir", "kota lahir"] },
  pekerjaan: { label: "Pekerjaan", aliases: ["pekerjaan", "occupation", "profesi", "kerja"] },
  golongan_darah: { label: "Golongan Darah", aliases: ["golongan darah", "gol darah", "gol. darah", "blood type", "goldar", "gol"] },
};

const JENIS = KELAS.slice(0, ABAIKAN) as unknown as JenisKolom[];
const AGAMA = new Set(["islam", "kristen", "katolik", "hindu", "budha", "buddha", "konghucu", "protestan"]);

export const NAMA_FITUR: string[] = [
  ...JENIS.map((j) => `judul_${j}`),
  "judul_generik", "judul_pengecoh",
  "isi_tanggal", "isi_tanggal_tua", "isi_sebaran_tahun", "isi_tanggal_objek",
  "isi_nik16", "isi_digit_panjang_lain", "isi_telepon", "isi_kelamin", "isi_goldar", "isi_kode",
  "isi_kode_berawalan_huruf", "isi_nama_orang", "isi_sapaan", "isi_gelar_dokter", "isi_alamat", "isi_pekerjaan",
  "isi_kota_pendek", "isi_email", "isi_angka_kecil", "isi_agama",
  "unik", "kosong", "panjang_rata", "rasio_digit", "rasio_huruf", "kata_rata", "unik_x_nama", "isi_urut_dari_satu", "beda_absolut", "isi_lima_digit", "kata_x_kota",
];

/** Vektor fitur satu kolom (judul + nilai-nilainya). Semua nilai 0..1. */
export function fiturKolom(judul: string, nilai: unknown[], hariIni = new Date()): number[] {
  const fJudul = JENIS.map((j) => skorJudul(judul, ALIAS_JUDUL[j].aliases, ALIAS_JUDUL[j].label));
  const h = normTeks(judul);
  const generik = !h || /^(kolom|column|col|field|unnamed)?[\s:_-]*[a-z]?\d*$/.test(h) ? 1 : 0;
  const pengecoh = judulPengecoh(judul);

  const total = Math.max(1, nilai.length);
  const sampel = nilai.filter((v) => String(v ?? "").trim() !== "" && String(v).trim() !== "-").slice(0, 400);
  const n = sampel.length;
  if (n === 0) {
    const x = [...fJudul, generik, pengecoh, ...new Array(NAMA_FITUR.length - fJudul.length - 2).fill(0)];
    x[NAMA_FITUR.indexOf("kosong")] = 1;
    return x;
  }
  const teks = sampel.map((v) => (v instanceof Date ? "" : String(v).trim()));
  const rasio = (f: (s: string, v: unknown) => boolean) => sampel.filter((v, i) => f(teks[i], v)).length / n;
  const digit = (s: string) => s.replace(/[\s.-]/g, "");
  const tahunIni = hariIni.getFullYear();

  const tahun: number[] = [];
  const tanggal = rasio((s, v) => {
    if (v instanceof Date) {
      if (Number.isNaN(v.getTime())) return false;
      tahun.push(v.getFullYear());
      return v.getFullYear() >= 1900 && v.getFullYear() <= tahunIni + 1;
    }
    const u = uraiTanggal(s, "dmy", hariIni) ?? uraiTanggal(s, "mdy", hariIni);
    if (!u || u[1] < 1 || u[1] > 12 || u[0] < 1900 || u[0] > tahunIni + 1) return false;
    tahun.push(u[0]);
    return true;
  });
  const tua = tahun.length ? tahun.filter((y) => y <= tahunIni - 3).length / tahun.length : 0;
  const rataTahun = tahun.length ? tahun.reduce((a, b) => a + b, 0) / tahun.length : 0;
  const sebaran = tahun.length ? Math.min(1, Math.sqrt(tahun.reduce((a, y) => a + (y - rataTahun) ** 2, 0) / tahun.length) / 25) : 0;
  const objekTanggal = rasio((_, v) => v instanceof Date);
  const nik16 = rasio((s) => /^\d{16}$/.test(digit(s)));
  const digitLain = rasio((s) => /^\d{11,20}$/.test(digit(s)) && !/^\d{16}$/.test(digit(s)) && !/^(0|\+?62)8/.test(s.replace(/[^\d+]/g, "")));
  const telepon = rasio((s) => {
    const d = s.split(/[/,;]/)[0].replace(/[^\d+]/g, "").replace(/^\+?62/, "0");
    return /^0?8\d{7,12}$/.test(d) || /^0[2-7]\d{6,10}$/.test(d);
  });
  const kelamin = rasio((s) => TOKEN_KELAMIN.has(normTeks(s)));
  const golDarah = rasio((s) => /^(a|b|ab|o)[+-]?$/i.test(s));
  const kode = rasio((s) => /^[a-z0-9][a-z0-9./ -]{0,19}$/i.test(s) && /\d/.test(s) && !/^\d{9,}$/.test(digit(s)) && !uraiTanggal(s));
  const kodeHuruf = rasio((s) => /^[a-z]{1,4}[-./ ]?\d/i.test(s));
  const namaOrang = rasio((s) => /^[\p{L}][\p{L} .,'’-]{1,79}$/u.test(s) && s.split(/\s+/).length <= 7);
  const sapaan = rasio((s) => SAPAAN_DEPAN.test(s) || SAPAAN_BELAKANG.test(s));
  const gelarDokter = rasio((s) => /^(drg|dr|prof)\.?\s/i.test(s) || /,\s*(drg|sp\.|dr)/i.test(s));
  const alamat = rasio((s) => s.length >= 8 && (KATA_ALAMAT.test(s) || (/\d/.test(s) && s.split(/\s+/).length >= 3)));
  const kerja = rasio((s) => PEKERJAAN.has(normTeks(s)));
  const kota = rasio((s) => /^[\p{L}][\p{L} .-]{1,39}$/u.test(s) && s.split(/\s+/).length <= 3 && !PEKERJAAN.has(normTeks(s)) && !TOKEN_KELAMIN.has(normTeks(s)));
  const email = rasio((s) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s));
  const angkaKecil = rasio((s, v) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 120) || /^\d{1,3}\s*(th|thn|tahun|bln|bulan)?$/i.test(s));
  const agama = rasio((s) => AGAMA.has(normTeks(s)));

  const unik = new Set(sampel.map((v, i) => (v instanceof Date ? v.toISOString() : normTeks(teks[i])))).size / n;
  const kosong = 1 - n / total;
  const panjang = teks.reduce((a, s) => a + s.length, 0) / n;
  const gabung = teks.join("");
  const rasioDigit = gabung.length ? (gabung.match(/\d/g)?.length ?? 0) / gabung.length : 0;
  const rasioHuruf = gabung.length ? (gabung.match(/\p{L}/gu)?.length ?? 0) / gabung.length : 0;
  const kata = teks.reduce((a, s) => a + (s ? s.split(/\s+/).length : 0), 0) / n;
  // kolom "No" (nomor urut baris 1, 2, 3, ...)
  const urut = nilai.filter((v, i) => Number(String(v ?? "").trim()) === i + 1).length / total;
  const jumlahBeda = new Set(teks.map(normTeks)).size;
  const limaDigit = rasio((s) => /^[1-9]\d{4}$/.test(s));

  return [
    ...fJudul, generik, pengecoh,
    tanggal, tua, sebaran, objekTanggal,
    nik16, digitLain, telepon, kelamin, golDarah, kode,
    kodeHuruf, namaOrang, sapaan, gelarDokter, alamat, kerja,
    kota, email, angkaKecil, agama,
    unik, kosong, Math.min(1, panjang / 50), rasioDigit, rasioHuruf, Math.min(1, kata / 6), unik * namaOrang, urut,
    Math.min(1, jumlahBeda / 30), limaDigit, kota * Math.min(1, kata / 6),
  ];
}

export interface ModelKolom {
  versi: string;
  fitur: string[];
  kelas: readonly string[];
  rata: number[];
  simpang: number[];
  /** bobot[kelas][fitur] */
  bobot: number[][];
  bias: number[];
  metrik?: Record<string, number | string>;
}

/** Peluang tiap kelas (softmax) untuk satu vektor fitur. */
export function prediksi(model: ModelKolom, x: number[]): number[] {
  const z = model.bobot.map((w, k) => {
    let s = model.bias[k];
    for (let i = 0; i < w.length; i++) s += w[i] * ((x[i] - model.rata[i]) / model.simpang[i]);
    return s;
  });
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const jml = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / jml);
}

/** Pasangkan kolom → jenis: peluang tertinggi dulu, satu jenis satu kolom; kolom yang lebih mungkin "abaikan" dilewati. */
export function pasangkanKolom(peluang: number[][], ambang = 0.35): { kolom: number; kelas: number; p: number }[] {
  const kandidat: { kolom: number; kelas: number; p: number }[] = [];
  peluang.forEach((ps, c) =>
    ps.forEach((p, k) => {
      if (k !== ABAIKAN && p >= ambang && p >= ps[ABAIKAN]) kandidat.push({ kolom: c, kelas: k, p });
    }),
  );
  kandidat.sort((a, b) => b.p - a.p);
  const kelasPakai = new Set<number>();
  const kolomPakai = new Set<number>();
  const hasil: { kolom: number; kelas: number; p: number }[] = [];
  for (const k of kandidat) {
    if (kelasPakai.has(k.kelas) || kolomPakai.has(k.kolom)) continue;
    kelasPakai.add(k.kelas);
    kolomPakai.add(k.kolom);
    hasil.push(k);
  }
  return hasil;
}

/** Kenali seluruh kolom berkas dengan model: { kolom → kelas, peluang }. */
export function kenaliKolom(model: ModelKolom, judul: string[], isi: unknown[][], hariIni = new Date()) {
  const lebar = Math.max(judul.length, ...isi.slice(0, 50).map((r) => r.length), 0);
  const peluang: number[][] = [];
  for (let c = 0; c < lebar; c++) peluang.push(prediksi(model, fiturKolom(judul[c] ?? "", isi.map((r) => r[c]), hariIni)));
  return { peluang, pasangan: pasangkanKolom(peluang) };
}
