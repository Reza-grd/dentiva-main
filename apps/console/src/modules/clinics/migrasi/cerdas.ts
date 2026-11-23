/**
 * "Mesin cerdas" migrasi pasien — berjalan sepenuhnya di browser Console.
 * Data pasien TIDAK dikirim ke layanan AI luar (data kesehatan, UU PDP).
 *
 * Isinya model statistik/aturan yang dapat dijelaskan (explainable):
 *  - pemahaman judul kolom (singkatan, urutan kata, kata pengecoh) — dipakai model ML di ml.ts
 *  - deteksi format tanggal per kolom (hari/bulan vs bulan/hari, nama bulan, tahun 2 digit)
 *  - pembersihan nama (sapaan Tn./Ny./An., HURUF BESAR → Huruf Kapital)
 *  - penurunan tanggal lahir & jenis kelamin dari NIK (struktur NIK Dukcapil)
 *  - kemiripan nama (Jaro-Winkler) untuk duplikat yang tidak persis sama
 */

// ─── Kemiripan teks ─────────────────────────────────────────────────────────
/** Jaro-Winkler 0..1 (1 = identik). */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const jarak = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const cocokA = new Array<boolean>(a.length).fill(false);
  const cocokB = new Array<boolean>(b.length).fill(false);
  let cocok = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - jarak); j < Math.min(b.length, i + jarak + 1); j++) {
      if (cocokB[j] || a[i] !== b[j]) continue;
      cocokA[i] = cocokB[j] = true;
      cocok++;
      break;
    }
  }
  if (!cocok) return 0;
  let t = 0;
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!cocokA[i]) continue;
    while (!cocokB[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (cocok / a.length + cocok / b.length + (cocok - t / 2) / cocok) / 3;
  let awal = 0;
  while (awal < Math.min(4, a.length, b.length) && a[awal] === b[awal]) awal++;
  return jaro + awal * 0.1 * (1 - jaro);
}

export const normTeks = (s: unknown) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

// ─── Nama & sapaan ──────────────────────────────────────────────────────────
type JK = "Laki-laki" | "Perempuan";
const SAPAAN: Record<string, JK | null> = {
  tn: "Laki-laki", tuan: "Laki-laki", bpk: "Laki-laki", bp: "Laki-laki", bapak: "Laki-laki", sdr: "Laki-laki", mr: "Laki-laki",
  ny: "Perempuan", nyonya: "Perempuan", nn: "Perempuan", nona: "Perempuan", ibu: "Perempuan", bu: "Perempuan", sdri: "Perempuan", mrs: "Perempuan", ms: "Perempuan",
  an: null, anak: null, by: null, bayi: null,
};
const POLA_SAPAAN = Object.keys(SAPAAN).sort((x, y) => y.length - x.length).join("|");
export const SAPAAN_DEPAN = new RegExp(`^(?:(${POLA_SAPAAN})\\.?\\s+)+`, "i");
export const SAPAAN_BELAKANG = new RegExp(`[,\\s]+\\(?(${POLA_SAPAAN})\\.?\\)?$`, "i");

function kapital(kata: string): string {
  if (/\./.test(kata) && kata.length <= 5) return kata; // singkatan/gelar: "S.Pd", "M."
  return kata
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_, p: string, h: string) => p + h.toUpperCase());
}

export interface NamaBersih {
  nama: string;
  /** Jenis kelamin yang tersirat dari sapaan (Tn./Ny./Nn.), bila ada. */
  kelaminSapaan: JK | null;
  sapaanDibuang: boolean;
  dirapikan: boolean;
}

/** "TN. BUDI SANTOSO" → "Budi Santoso" (+ petunjuk Laki-laki); "siti aminah, ny" → "Siti Aminah". */
export function bersihkanNama(mentah: unknown): NamaBersih {
  let s = String(mentah ?? "").replace(/\s+/g, " ").trim();
  let kelaminSapaan: JK | null = null;
  let sapaanDibuang = false;
  const ambil = (m: RegExpMatchArray | null) => {
    if (!m) return;
    sapaanDibuang = true;
    const k = SAPAAN[m[1].toLowerCase()];
    if (k) kelaminSapaan = k;
  };
  const depan = s.match(SAPAAN_DEPAN);
  if (depan && s.length > depan[0].length) {
    // ambil sapaan terakhir di depan ("By. Ny. Siti" → Ny.)
    for (const t of depan[0].split(/\s+/).filter(Boolean)) ambil(t.match(new RegExp(`^(${POLA_SAPAAN})\\.?$`, "i")));
    s = s.slice(depan[0].length);
  }
  const belakang = s.match(SAPAAN_BELAKANG);
  if (belakang && s.length > belakang[0].length + 1) {
    ambil(belakang);
    s = s.slice(0, s.length - belakang[0].length);
  }
  s = s.replace(/^[,.\s]+|[,\s]+$/g, "");
  const hurufBesarSemua = s === s.toUpperCase() && /\p{L}/u.test(s);
  const hurufKecilSemua = s === s.toLowerCase() && /\p{L}/u.test(s);
  const nama = hurufBesarSemua || hurufKecilSemua ? s.split(" ").map(kapital).join(" ") : s;
  return { nama, kelaminSapaan, sapaanDibuang, dirapikan: nama !== String(mentah ?? "").replace(/\s+/g, " ").trim() };
}

// ─── NIK ────────────────────────────────────────────────────────────────────
/** NIK: digit 7–12 = DDMMYY (perempuan: DD + 40). */
export function infoNik(nik: string, hariIni = new Date()): { tanggal: string; kelamin: JK } | null {
  if (!/^\d{16}$/.test(nik)) return null;
  let dd = Number(nik.slice(6, 8));
  const mm = Number(nik.slice(8, 10));
  const yy = Number(nik.slice(10, 12));
  const kelamin: JK = dd > 40 ? "Perempuan" : "Laki-laki";
  if (dd > 40) dd -= 40;
  const abad = yy <= hariIni.getFullYear() % 100 ? 2000 : 1900;
  const y = abad + yy;
  const dt = new Date(Date.UTC(y, mm - 1, dd));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
  return { tanggal: `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`, kelamin };
}

// ─── Tanggal ────────────────────────────────────────────────────────────────
export type FormatTanggal = "dmy" | "mdy";
const BULAN: Record<string, number> = {
  jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, peb: 2, mar: 3, maret: 3, march: 3,
  apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, nopember: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12,
};

const tahun4 = (y: number, hariIni: Date) => (y >= 100 ? y : y <= hariIni.getFullYear() % 100 ? 2000 + y : 1900 + y);

/** Uraikan teks tanggal menjadi [y, m, d] (tanpa validasi kalender). */
export function uraiTanggal(s: string, format: FormatTanggal = "dmy", hariIni = new Date()): [number, number, number] | null {
  const t = s.trim().toLowerCase().replace(/\s+/g, " ");
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ t].*)?$/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = tahun4(Number(m[3]), hariIni);
    return format === "mdy" ? [y, a, b] : [y, b, a];
  }
  m = t.match(/^(\d{1,2})[\s/.-]+([a-z]+)\.?[\s/.,-]+(\d{2}|\d{4})$/);
  if (m && BULAN[m[2]]) return [tahun4(Number(m[3]), hariIni), BULAN[m[2]], Number(m[1])];
  m = t.match(/^([a-z]+)\.? (\d{1,2}),? (\d{4})$/);
  if (m && BULAN[m[1]]) return [Number(m[3]), BULAN[m[1]], Number(m[2])];
  return null;
}

/** Tebak urutan hari/bulan dari sampel: ada bagian pertama > 12 → dmy; bagian kedua > 12 → mdy. */
export function tebakFormatTanggal(nilai: unknown[]): FormatTanggal {
  let dmy = 0;
  let mdy = 0;
  for (const v of nilai) {
    if (typeof v !== "string") continue;
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
    if (!m) continue;
    if (Number(m[1]) > 12) dmy++;
    if (Number(m[2]) > 12) mdy++;
  }
  return mdy > dmy ? "mdy" : "dmy";
}

// ─── Pengenalan jenis kolom dari isi ────────────────────────────────────────
export type JenisKolom =
  | "nama_lengkap" | "no_rm_lama" | "tanggal_lahir" | "jenis_kelamin" | "no_wa"
  | "alamat" | "nik" | "tempat_lahir" | "pekerjaan" | "golongan_darah";

export const TOKEN_KELAMIN = new Set(["l", "lk", "laki", "laki-laki", "laki laki", "pria", "male", "m", "p", "pr", "perempuan", "wanita", "female", "f", "w"]);
export const PEKERJAAN = new Set([
  "pns", "asn", "wiraswasta", "swasta", "karyawan", "karyawan swasta", "pegawai swasta", "ibu rumah tangga", "irt", "pelajar", "mahasiswa",
  "mahasiswi", "guru", "dosen", "petani", "buruh", "tni", "polri", "pedagang", "dokter", "perawat", "bidan", "pensiunan", "belum bekerja",
  "tidak bekerja", "nelayan", "sopir", "supir", "ojek", "wirausaha", "honorer", "bumn", "pegawai negeri", "pelajar/mahasiswa", "-",
]);
export const KATA_ALAMAT = /\b(jl|jln|jalan|gg|gang|rt|rw|no|blok|kel|kec|kab|desa|dusun|dsn|perum|perumahan|komplek|kompleks|griya|kp|kampung|kota)\b/i;

/** Kamus singkatan judul kolom yang umum di Excel klinik Indonesia. */
const SINGKATAN: Record<string, string> = {
  tgl: "tanggal", tg: "tanggal", tang: "tanggal", lhr: "lahir", lhir: "lahir", kelahiran: "lahir",
  tmp: "tempat", tmpt: "tempat", tpt: "tempat", tempat: "tempat",
  nomor: "no", nmr: "no", nomer: "no", num: "no", number: "no",
  px: "pasien", psn: "pasien", patient: "pasien",
  rek: "rekam", medik: "medis", medical: "medis", record: "rekam", mrn: "rm", cm: "rm", mr: "rm",
  almt: "alamat", alm: "alamat", address: "alamat",
  jns: "jenis", jen: "jenis", kel: "kelamin", kelamin: "kelamin", gender: "kelamin", sex: "kelamin",
  hp: "hp", handphone: "hp", ponsel: "hp", telp: "hp", tlp: "hp", telepon: "hp", phone: "hp", wa: "hp", whatsapp: "hp", kontak: "hp",
  drh: "darah", gol: "golongan", goldar: "golongan darah", blood: "darah",
  pek: "pekerjaan", pkrjaan: "pekerjaan", kerjaan: "pekerjaan", kerja: "pekerjaan", profesi: "pekerjaan", occupation: "pekerjaan", job: "pekerjaan",
  ktp: "nik", identitas: "nik", nm: "nama", name: "nama", dob: "tanggal lahir", birthdate: "tanggal lahir", birth: "lahir", date: "tanggal",
};
const KATA_SAMPINGAN = new Set(["of", "the", "dd", "mm", "yyyy", "yy", "16", "digit", "sesuai", "lengkap", "saat", "ini", "sekarang"]);

/** Judul → daftar kata baku (singkatan diperluas, tanda baca dibuang). */
const cacheKata = new Map<string, string[]>();
export function kataJudul(judul: string): string[] {
  const ada = cacheKata.get(judul);
  if (ada) return ada;
  const hasil = normTeks(judul)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .flatMap((t) => (SINGKATAN[t] ?? t).split(" "))
    .filter((t) => !KATA_SAMPINGAN.has(t));
  if (cacheKata.size > 5000) cacheKata.clear();
  cacheKata.set(judul, hasil);
  return hasil;
}

/** Kata yang menandai kolom LAIN (bukan data identitas pasien yang diimpor). */
export const KATA_PENGECOH = new Set([
  "pos", "urut", "daftar", "registrasi", "masuk", "kunjungan", "kontrol", "periksa", "terakhir", "akhir", "datang", "visit", "last",
  "umur", "usia", "age", "ibu", "ayah", "ortu", "wali", "kk", "keluarga", "suami", "istri", "penanggung", "dokter", "drg", "dr", "dpjp", "pemeriksa",
  "bpjs", "jkn", "kis", "asuransi", "peserta", "penjamin", "bayar", "pembayaran", "email", "surel", "mail", "agama", "religion", "kepercayaan",
  "ket", "keterangan", "catatan", "notes", "status", "kota", "kab", "kabupaten", "kecamatan", "wilayah", "domisili_kota", "zip", "kodepos",
]);

/** Skor kemiripan judul kolom terhadap daftar alias (0..1), memahami singkatan & urutan kata. */
export function skorJudul(judul: string, aliases: string[], label: string): number {
  const h = kataJudul(judul);
  if (!h.length) return 0;
  const hs = h.join(" ");
  let terbaik = 0;
  for (const alias of [...aliases, label]) {
    const a = kataJudul(alias);
    if (!a.length) continue;
    const as = a.join(" ");
    if (hs === as) return 1;
    const set = new Set(h);
    const semuaAda = a.every((t) => set.has(t));
    if (semuaAda) {
      // alias termuat dalam judul ("tgl lahir pasien" ⊇ "tanggal lahir"); kurangi bila judul membawa kata pengecoh
      const pengecoh = h.some((t) => KATA_PENGECOH.has(t) && !a.includes(t));
      terbaik = Math.max(terbaik, pengecoh ? 0.45 : a.length / h.length >= 0.5 ? 0.92 : 0.8);
    }
    // salah ketik ringan: panjang mirip & Jaro-Winkler tinggi
    if (Math.min(hs.length, as.length) / Math.max(hs.length, as.length) >= 0.8 && jaroWinkler(hs, as) >= 0.92) terbaik = Math.max(terbaik, 0.8);
  }
  return terbaik;
}

/** 1 bila judul jelas menandai kolom lain (kode pos, nama ibu, tgl daftar, usia, ...). */
export function judulPengecoh(judul: string): number {
  return kataJudul(judul).some((t) => KATA_PENGECOH.has(t)) ? 1 : 0;
}

/** Urutan alami No. RM lama: "RM-2" sebelum "RM-10"; kosong di akhir. */
export function bandingkanRm(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "id", { numeric: true, sensitivity: "base" });
}
