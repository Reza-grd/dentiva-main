/**
 * Pabrik data latih SINTETIS untuk model pengenal kolom migrasi pasien.
 *
 * Tidak memakai data pasien asli sama sekali: semua nama, NIK, alamat, dan nomor
 * dibuat acak dari daftar umum. Setiap "berkas" meniru kebiasaan Excel klinik di
 * Indonesia — gaya judul, urutan kolom, format tanggal/nomor, sapaan, huruf besar,
 * sel kosong, salah ketik — plus kolom pengecoh (No urut, Tgl daftar, Umur, Dokter,
 * Nama ibu, BPJS, Agama, ...). Label kebenaran ikut dicatat untuk pelatihan & uji.
 */
import { ABAIKAN, KELAS } from "../../src/modules/clinics/migrasi/ml.ts";

export type Acak = () => number;

/** PRNG mulberry32 — hasil bisa diulang (seed sama → data sama). */
export function buatAcak(seed: number): Acak {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pilih = <T>(r: Acak, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
const antara = (r: Acak, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const kadang = (r: Acak, p: number) => r() < p;
const pad = (n: number, w: number) => String(n).padStart(w, "0");

const DEPAN_L = ["Budi", "Andi", "Agus", "Rizky", "Dedi", "Joko", "Ahmad", "Muhammad", "Eko", "Hendra", "Bambang", "Yusuf", "Fajar", "Arif", "Dimas", "Rudi", "Bayu", "Ilham", "Teguh", "Wahyu", "Doni", "Gilang", "Hadi", "Irfan", "Kevin", "Lukman", "Nanda", "Putra", "Rendi", "Slamet", "Taufik", "Umar", "Yoga", "Zainal", "Aditya", "Bagus", "Cahyo", "Dwi", "Galih", "Haris"];
const DEPAN_P = ["Siti", "Dewi", "Sri", "Rina", "Ani", "Wulan", "Ayu", "Fitri", "Nur", "Lestari", "Indah", "Putri", "Ratna", "Yuni", "Maya", "Nadia", "Citra", "Dian", "Eka", "Fatimah", "Intan", "Kartika", "Lina", "Mega", "Novi", "Puspita", "Rahma", "Sari", "Tika", "Utami", "Vina", "Winda", "Yanti", "Zahra", "Anisa", "Bunga", "Desi", "Elsa", "Gita", "Hana"];
const BELAKANG = ["Santoso", "Wijaya", "Saputra", "Pratama", "Hidayat", "Kusuma", "Lestari", "Rahayu", "Setiawan", "Nugroho", "Wibowo", "Hartono", "Susanto", "Purnama", "Siregar", "Nasution", "Harahap", "Simanjuntak", "Gunawan", "Halim", "Permana", "Ramadhan", "Firmansyah", "Kurniawan", "Maulana", "Hakim", "Syahputra", "Utomo", "Sulistyo", "Putri", "Anggraini", "Wahyuni", "Handayani", "Suryani", "Puspitasari", "Ginting", "Tarigan", "Lubis", "Panjaitan", "Sihombing"];
const KOTA = ["Bandung", "Jakarta", "Surabaya", "Medan", "Semarang", "Yogyakarta", "Malang", "Bogor", "Bekasi", "Depok", "Tangerang", "Solo", "Garut", "Tasikmalaya", "Cirebon", "Sukabumi", "Palembang", "Makassar", "Denpasar", "Padang", "Pekanbaru", "Banjarmasin", "Pontianak", "Manado", "Kediri", "Madiun", "Purwokerto", "Tegal", "Cimahi", "Sumedang"];
const JALAN = ["Merdeka", "Sudirman", "Diponegoro", "Ahmad Yani", "Gatot Subroto", "Pahlawan", "Mawar", "Melati", "Kenanga", "Cempaka", "Siliwangi", "Pajajaran", "Asia Afrika", "Dago", "Cihampelas", "Sukajadi", "Kebon Jati", "Veteran", "Kartini", "Imam Bonjol"];
const KERJA = ["PNS", "Wiraswasta", "Karyawan Swasta", "Ibu Rumah Tangga", "IRT", "Pelajar", "Mahasiswa", "Guru", "Petani", "Buruh", "TNI", "Polri", "Pedagang", "Pensiunan", "Belum Bekerja", "Dokter", "Perawat", "Swasta", "Nelayan", "Sopir"];
const AGAMA = ["Islam", "Kristen", "Katolik", "Hindu", "Budha", "Konghucu"];
const CATATAN = ["alergi penisilin", "kontrol 2 minggu", "pasien BPJS", "takut jarum", "riwayat hipertensi", "rujukan puskesmas", "", "gigi sensitif", "pakai kawat gigi", "hamil 5 bulan", "diabetes", "ok", "lanjut scaling"];
const BULAN_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

type Jenis = (typeof KELAS)[number];
type Pengecoh = "no_urut" | "tgl_daftar" | "kunjungan_terakhir" | "umur" | "agama" | "email" | "bpjs" | "catatan" | "dokter" | "nama_ibu" | "kota" | "status" | "asuransi" | "kode_pos";

/** Variasi judul. "latih" dipakai saat melatih; "baru" HANYA muncul di data uji (menguji generalisasi). */
const JUDUL: Record<Exclude<Jenis, "abaikan"> | Pengecoh, { latih: string[]; baru: string[]; akhir: string[] }> = {
  nama_lengkap: { latih: ["Nama", "Nama Pasien", "NAMA PASIEN", "Nama Lengkap", "nama_pasien", "Name", "NAMA", "Pasien"], baru: ["Nm Pasien", "Nama Px.", "NAMA LENGKAP PASIEN", "Nama (sesuai KTP)"], akhir: ["Nama Pasien Lengkap", "NM_PASIEN", "Nama Px", "Patient"] },
  no_rm_lama: { latih: ["No RM", "No. RM", "NO.RM", "No Rekam Medis", "Kode Pasien", "ID Pasien", "No. MR", "NORM", "RM", "No CM"], baru: ["Nomor Rekam Medik", "No.Rek.Medis", "Kode Px", "MRN"], akhir: ["No.Rekam Medis", "RM No", "Kode RM", "No. Pasien"] },
  tanggal_lahir: { latih: ["Tgl Lahir", "Tanggal Lahir", "TGL. LAHIR", "Tgl. Lahir", "DOB", "Tanggal_Lahir", "Lahir", "Tgl Lhr"], baru: ["Tgl.Lahir (dd/mm/yyyy)", "TANGGAL LAHIR PASIEN", "Birthdate", "Tgl Lahir Px"], akhir: ["Tanggal Lahir Pasien", "Tgl_Lahir", "Date of Birth", "TGL LHR"] },
  jenis_kelamin: { latih: ["JK", "L/P", "Jenis Kelamin", "JENIS KELAMIN", "Gender", "Kelamin", "Sex", "J/K"], baru: ["Jns Kelamin", "Jenis Kel.", "L / P", "Kelamin (L/P)"], akhir: ["JENIS_KELAMIN", "Jns Kel", "L/P (Jenis Kelamin)", "Gender Pasien"] },
  no_wa: { latih: ["No HP", "No. HP", "HP", "Telp", "No Telp", "No WA", "WhatsApp", "Telepon", "Kontak", "Phone"], baru: ["No.Telp/HP", "Nomor HP/WA", "Telp. Rumah/HP", "HP (WA)"], akhir: ["No. Handphone", "Nomor WA", "Telp/WA", "No Kontak"] },
  alamat: { latih: ["Alamat", "ALAMAT", "Alamat Lengkap", "Alamat Rumah", "Address", "Domisili"], baru: ["Alamat Tinggal", "Almt", "Alamat Sekarang", "ALAMAT PASIEN"], akhir: ["Alamat Domisili", "Alamat (KTP)", "ALMT", "Address Pasien"] },
  nik: { latih: ["NIK", "No KTP", "KTP", "No. KTP", "No NIK", "Nomor Induk Kependudukan"], baru: ["NIK/KTP", "No.Identitas (NIK)", "NIK Pasien", "No KTP/NIK"], akhir: ["Nomor KTP", "No.NIK", "NIK (16 digit)", "Identitas"] },
  tempat_lahir: { latih: ["Tempat Lahir", "Tmp Lahir", "Tempat_Lahir", "Tmpt Lahir", "Kota Lahir"], baru: ["Tempat Lhr", "TEMPAT LAHIR", "Tpt. Lahir", "Kelahiran"], akhir: ["Tempat Kelahiran", "Tmp. Lahir", "Kota Kelahiran", "Tpt Lhr"] },
  pekerjaan: { latih: ["Pekerjaan", "PEKERJAAN", "Profesi", "Occupation", "Kerja"], baru: ["Pekerjaan Pasien", "Pkrjaan", "Job", "Pek."], akhir: ["Pekerjaan Saat Ini", "PEKERJAAN PX", "Profesi Pasien", "Kerjaan"] },
  golongan_darah: { latih: ["Gol Darah", "Gol. Darah", "Golongan Darah", "Goldar", "Blood Type"], baru: ["Gol.Drh", "GOL DARAH", "Darah", "Gol"], akhir: ["Golongan Drh", "Gol.Darah", "Blood", "GolDar"] },
  no_urut: { latih: ["No", "No.", "NO", "#", "Urut"], baru: ["No Urut", "Nomor"], akhir: ["No.Urut", "NO URUT"] },
  tgl_daftar: { latih: ["Tgl Daftar", "Tanggal Daftar", "Tgl Registrasi", "Terdaftar"], baru: ["Tgl. Kunjungan Pertama", "Mulai"], akhir: ["Tanggal Registrasi", "Tgl Masuk"] },
  kunjungan_terakhir: { latih: ["Kunjungan Terakhir", "Tgl Kunjungan", "Last Visit"], baru: ["Terakhir Datang", "Tgl Periksa"], akhir: ["Kunjungan Akhir", "Tgl Kontrol"] },
  umur: { latih: ["Umur", "Usia", "UMUR", "Age"], baru: ["Umur (th)", "Usia Pasien"], akhir: ["Umur Pasien", "USIA (TH)"] },
  agama: { latih: ["Agama", "AGAMA", "Religion"], baru: ["Agm"], akhir: ["Kepercayaan"] },
  email: { latih: ["Email", "E-mail", "Surel"], baru: ["Alamat Email"], akhir: ["Email Pasien"] },
  bpjs: { latih: ["No BPJS", "BPJS", "No. Kartu BPJS", "No Asuransi"], baru: ["Nomor JKN", "No.Peserta"], akhir: ["No. JKN-KIS", "Kartu BPJS"] },
  catatan: { latih: ["Catatan", "Keterangan", "Ket", "Notes"], baru: ["Ket.", "Catatan Medis"], akhir: ["Keterangan Lain"] },
  dokter: { latih: ["Dokter", "Dokter Gigi", "Drg", "DPJP"], baru: ["Dokter Pemeriksa", "Nama Dokter"], akhir: ["Dokter Gigi Penanggung Jawab", "Dr. Pemeriksa"] },
  nama_ibu: { latih: ["Nama Ibu", "Nama Ibu Kandung", "Nama KK", "Penanggung Jawab", "Nama Ortu"], baru: ["Nama Wali", "Kepala Keluarga"], akhir: ["Nama Ayah", "Nama Suami/Istri"] },
  kota: { latih: ["Kota", "Kabupaten", "Kota/Kab", "Kecamatan"], baru: ["Kab/Kota", "Wilayah"], akhir: ["Kota Domisili", "Kabupaten/Kota"] },
  status: { latih: ["Status", "Status Pasien"], baru: ["Stat."], akhir: ["Status Aktif"] },
  asuransi: { latih: ["Penjamin", "Jenis Pasien", "Cara Bayar"], baru: ["Pembayaran"], akhir: ["Jenis Pembayaran"] },
  kode_pos: { latih: ["Kode Pos", "Kodepos"], baru: ["ZIP"], akhir: ["Kode Pos Rumah"] },
};

const GENERIK = ["", "Kolom1", "Kolom 2", "Column3", "Unnamed: 4", "F5", "Field6", "col_7"];

function gayaJudul(r: Acak, j: string): string {
  const x = r();
  if (x < 0.15) return j.toUpperCase();
  if (x < 0.25) return j.toLowerCase();
  if (x < 0.3) return `${j}:`;
  if (x < 0.34) return `${j} *`;
  if (x < 0.38) return j.replace(/\s+/g, "_");
  return j;
}

function salahKetik(r: Acak, s: string): string {
  if (s.length < 4) return s;
  const i = antara(r, 1, s.length - 2);
  const op = r();
  if (op < 0.33) return s.slice(0, i) + s.slice(i + 1); // hapus huruf
  if (op < 0.66) return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2); // tukar
  return s.slice(0, i) + pilih(r, ["a", "i", "u", "e", "o", "y"]) + s.slice(i + 1); // ganti
}

interface Orang {
  lk: boolean;
  lahir: Date;
  nama: string;
}

function formatTanggalTeks(r: Acak, d: Date, gaya: number): string | Date {
  const dd = d.getDate();
  const mm = d.getMonth() + 1;
  const y = d.getFullYear();
  switch (gaya) {
    case 0: return d; // sel tanggal Excel
    case 1: return `${pad(dd, 2)}/${pad(mm, 2)}/${y}`;
    case 2: return `${dd}-${mm}-${y}`;
    case 3: return `${pad(dd, 2)}.${pad(mm, 2)}.${y}`;
    case 4: return `${dd} ${pilih(r, [BULAN_ID[mm - 1], BULAN_PANJANG[mm - 1]])} ${y}`;
    case 5: return `${y}-${pad(mm, 2)}-${pad(dd, 2)}`;
    case 6: return `${pad(mm, 2)}/${pad(dd, 2)}/${y}`; // gaya Amerika
    default: return `${pad(dd, 2)}/${pad(mm, 2)}/${String(y).slice(2)}`; // tahun 2 digit
  }
}

function tanggalAcak(r: Acak, y0: number, y1: number): Date {
  return new Date(antara(r, y0, y1), antara(r, 0, 11), antara(r, 1, 28));
}

export interface BerkasSintetis {
  judul: string[];
  isi: unknown[][];
  /** label[kolom] = indeks KELAS (ABAIKAN untuk kolom pengecoh). */
  label: number[];
}

export interface OpsiPabrik {
  /** true = boleh memakai variasi judul "baru" (data uji). */
  judulBaru?: boolean;
  /** true = pakai variasi judul "akhir": kumpulan tertahan, HANYA untuk laporan akhir (tidak pernah dipakai menyetel model). */
  judulAkhir?: boolean;
  /** Peluang judul kolom generik/kosong (memaksa model membaca isi). */
  pGenerik?: number;
}

/** Buat satu berkas Excel klinik sintetis beserta labelnya. */
export function buatBerkas(r: Acak, opsi: OpsiPabrik = {}): BerkasSintetis {
  const pGenerik = opsi.pGenerik ?? 0.15;
  const nBaris = antara(r, 12, 120);
  const kapital = r(); // gaya huruf nama per berkas
  const pakaiSapaan = kadang(r, 0.3);
  const sapaanBelakang = kadang(r, 0.3);
  const gayaTgl = pilih(r, [0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 7]);
  const gayaJk = pilih(r, [["L", "P"], ["Laki-laki", "Perempuan"], ["LAKI-LAKI", "PEREMPUAN"], ["Pria", "Wanita"], ["M", "F"], ["l", "p"]]);
  const gayaRm = antara(r, 0, 7);
  const awalRm = antara(r, 1, 5000);
  const kosong = (p: number) => kadang(r, p);

  const orang: Orang[] = Array.from({ length: nBaris }, () => {
    const lk = kadang(r, 0.5);
    const depan = pilih(r, lk ? DEPAN_L : DEPAN_P);
    let nama = kadang(r, 0.1) ? depan : kadang(r, 0.2) ? `${depan} ${pilih(r, lk ? DEPAN_L : DEPAN_P)} ${pilih(r, BELAKANG)}` : `${depan} ${pilih(r, BELAKANG)}`;
    if (kadang(r, 0.03)) nama = salahKetik(r, nama);
    const lahir = tanggalAcak(r, 1940, 2024);
    if (kapital < 0.3) nama = nama.toUpperCase();
    else if (kapital < 0.38) nama = nama.toLowerCase();
    if (pakaiSapaan) {
      const umur = 2026 - lahir.getFullYear();
      const s = umur < 15 ? "An." : lk ? pilih(r, ["Tn.", "Bpk.", "Sdr."]) : pilih(r, ["Ny.", "Nn.", "Ibu"]);
      nama = sapaanBelakang ? `${nama}, ${s.replace(".", "")}` : `${s} ${nama}`;
    }
    return { lk, lahir, nama };
  });

  const kolom: { jenis: Exclude<Jenis, "abaikan"> | Pengecoh; nilai: (o: Orang, i: number) => unknown }[] = [];
  const pakai = (jenis: (typeof kolom)[number]["jenis"], p: number, nilai: (o: Orang, i: number) => unknown) => {
    if (kadang(r, p)) kolom.push({ jenis, nilai });
  };

  const rmUrut = Array.from({ length: nBaris }, (_, i) => awalRm + i * antara(r, 1, 3));
  if (kadang(r, 0.4)) rmUrut.sort(() => r() - 0.5);
  const thn = antara(r, 2010, 2025);
  const fRm = (n: number) => [
    `RM-${pad(n, 5)}`, pad(n, 6), n, `A-${n}`, `${thn}/${pad(n, 4)}`, `P${pad(n, 4)}`, `${n}/${String(thn).slice(2)}`, `${pilih(r, ["G", "K", "D"])}${pad(n, 3)}`,
  ][gayaRm];
  const pKosongTgl = r() * 0.3;
  const pKosongWa = r() * 0.4;
  const pKosongNik = 0.3 + r() * 0.6;

  kolom.push({ jenis: "nama_lengkap", nilai: (o) => o.nama });
  pakai("no_rm_lama", 0.85, (_, i) => fRm(rmUrut[i]));
  pakai("tanggal_lahir", 0.85, (o) => (kosong(pKosongTgl) ? "" : formatTanggalTeks(r, o.lahir, gayaTgl)));
  pakai("jenis_kelamin", 0.8, (o) => (kosong(0.05) ? "" : o.lk ? gayaJk[0] : gayaJk[1]));
  pakai("no_wa", 0.8, () => {
    if (kosong(pKosongWa)) return "";
    const n = `8${antara(r, 11, 99)}${pad(antara(r, 0, 9999), 4)}${pad(antara(r, 0, 9999), 4)}`;
    return pilih(r, [`0${n}`, `0${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`, `+62 ${n.slice(0, 3)} ${n.slice(3, 7)} ${n.slice(7)}`, `62${n}`, Number(n), `0${n.slice(0, 3)}.${n.slice(3, 7)}.${n.slice(7)}`, `0${n} / 0${n.slice(0, 4)}${pad(antara(r, 0, 9999999), 7)}`, `(022) ${antara(r, 200, 799)}${pad(antara(r, 0, 9999), 4)}`]);
  });
  pakai("alamat", 0.75, () => {
    if (kosong(0.1)) return "";
    const kota = pilih(r, KOTA);
    return pilih(r, [
      `Jl. ${pilih(r, JALAN)} No. ${antara(r, 1, 200)}`,
      `Jl. ${pilih(r, JALAN)} No.${antara(r, 1, 200)} RT 0${antara(r, 1, 9)}/RW 0${antara(r, 1, 9)}, ${kota}`,
      `Gg. ${pilih(r, JALAN)} ${antara(r, 1, 50)} Kel. ${pilih(r, JALAN)}`,
      `Perum ${pilih(r, ["Griya", "Bumi", "Taman"])} ${pilih(r, JALAN)} Blok ${pilih(r, ["A", "B", "C", "D"])}${antara(r, 1, 30)}`,
      `Dusun ${pilih(r, JALAN)} RT ${antara(r, 1, 15)} RW ${antara(r, 1, 10)} Desa ${pilih(r, JALAN)}`,
      `${pilih(r, ["JL", "jln", "Jalan"])} ${pilih(r, JALAN).toUpperCase()} ${antara(r, 1, 99)} ${kota.toUpperCase()}`,
    ]);
  });
  pakai("nik", 0.6, (o) => {
    if (kosong(pKosongNik)) return "";
    const dd = o.lahir.getDate() + (o.lk ? 0 : 40);
    const nik = `${pilih(r, ["32", "31", "33", "35", "12", "73", "51"])}${pad(antara(r, 1, 99), 2)}${pad(antara(r, 1, 40), 2)}${pad(dd, 2)}${pad(o.lahir.getMonth() + 1, 2)}${String(o.lahir.getFullYear()).slice(2)}${pad(antara(r, 1, 9999), 4)}`;
    return kadang(r, 0.1) ? nik.replace(/(\d{6})(\d{6})(\d{4})/, "$1 $2 $3") : nik;
  });
  pakai("tempat_lahir", 0.45, () => (kosong(0.1) ? "" : pilih(r, KOTA)));
  pakai("pekerjaan", 0.45, () => (kosong(0.1) ? "" : pilih(r, KERJA)));
  pakai("golongan_darah", 0.3, () => (kosong(0.3) ? "" : pilih(r, ["A", "B", "AB", "O", "O+", "A+", "-"])));

  // kolom pengecoh
  pakai("no_urut", 0.45, (_, i) => i + 1);
  pakai("tgl_daftar", 0.35, () => formatTanggalTeks(r, tanggalAcak(r, 2016, 2026), gayaTgl));
  pakai("kunjungan_terakhir", 0.2, () => formatTanggalTeks(r, tanggalAcak(r, 2022, 2026), gayaTgl));
  pakai("umur", 0.3, (o) => (kadang(r, 0.5) ? 2026 - o.lahir.getFullYear() : `${2026 - o.lahir.getFullYear()} th`));
  pakai("agama", 0.25, () => pilih(r, AGAMA));
  pakai("email", 0.15, (o) => (kosong(0.6) ? "" : `${o.nama.split(/[ ,.]+/).filter(Boolean)[0]?.toLowerCase() ?? "x"}${antara(r, 1, 99)}@${pilih(r, ["gmail.com", "yahoo.com", "mail.id"])}`));
  pakai("bpjs", 0.2, () => (kosong(0.5) ? "" : `000${pad(antara(r, 0, 9999999999), 10)}`));
  pakai("catatan", 0.3, () => pilih(r, CATATAN));
  pakai("dokter", 0.25, () => `drg. ${pilih(r, ["Rina", "Andi", "Maya", "Budi"])}${kadang(r, 0.5) ? ` ${pilih(r, BELAKANG)}` : ""}`);
  pakai("nama_ibu", 0.15, () => `${pilih(r, DEPAN_P)} ${pilih(r, BELAKANG)}`);
  pakai("kota", 0.2, () => pilih(r, KOTA));
  pakai("status", 0.15, () => pilih(r, ["Aktif", "Baru", "Lama"]));
  pakai("asuransi", 0.2, () => pilih(r, ["BPJS", "Umum", "Asuransi", "Mandiri"]));
  pakai("kode_pos", 0.1, () => antara(r, 10110, 99999));

  // acak urutan kolom
  for (let i = kolom.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kolom[i], kolom[j]] = [kolom[j], kolom[i]];
  }

  const judul = kolom.map((k) => {
    // kolom yang artinya ambigu tanpa judul (nama ibu, kota, dokter) tetap diberi judul
    const boleh = !["nama_ibu", "kota", "dokter", "tgl_daftar", "kunjungan_terakhir", "no_urut", "umur"].includes(k.jenis);
    if (boleh && kadang(r, pGenerik)) return pilih(r, GENERIK);
    const v = JUDUL[k.jenis];
    const daftar = opsi.judulAkhir && kadang(r, 0.6) ? v.akhir : opsi.judulBaru && kadang(r, 0.5) ? v.baru : v.latih;
    return gayaJudul(r, pilih(r, daftar));
  });
  const isi = orang.map((o, i) => kolom.map((k) => k.nilai(o, i)));
  const label = kolom.map((k) => (KELAS as readonly string[]).includes(k.jenis) ? (KELAS as readonly string[]).indexOf(k.jenis) : ABAIKAN);
  return { judul, isi, label };
}
