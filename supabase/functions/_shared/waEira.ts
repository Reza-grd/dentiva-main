/**
 * Logika murni percakapan Eira lewat WhatsApp (tanpa jaringan/DB) — dipakai whatsapp-webhook, diuji di waEira.test.ts.
 */

export type PerintahWa =
  | { jenis: "kode"; kode: string }
  | { jenis: "bantuan" }
  | { jenis: "ganti_klinik" }
  | { jenis: "pilih"; nomor: number }
  | { jenis: "putuskan" }
  | { jenis: "ya" }
  | { jenis: "tidak" }
  | { jenis: "tanya"; teks: string };

const rapi = (t: string) => t.normalize("NFKC").replace(/\s+/g, " ").trim();

export function bacaPerintah(teksMentah: string): PerintahWa {
  const teks = rapi(teksMentah ?? "");
  const kecil = teks.toLowerCase().replace(/[.!?]+$/, "");
  const kode = /^dentiva\s*[:#-]?\s*(\d{6})$/i.exec(teks);
  if (kode) return { jenis: "kode", kode: kode[1] };
  if (/^(bantuan|menu|help|\?)$/.test(kecil)) return { jenis: "bantuan" };
  if (/^(ganti|pilih|pindah) klinik$|^klinik$/.test(kecil)) return { jenis: "ganti_klinik" };
  if (/^[1-9]$/.test(kecil)) return { jenis: "pilih", nomor: Number(kecil) };
  if (/^(putuskan|lepas|putus)( (wa|whatsapp|nomor|tautan))?$/.test(kecil)) return { jenis: "putuskan" };
  if (/^(ya|iya|y|ok|oke|setuju|setujui|jalankan|lanjut)$/.test(kecil)) return { jenis: "ya" };
  if (/^(tidak|tdk|ga|gak|nggak|batal|batalkan|tolak|jangan)$/.test(kecil)) return { jenis: "tidak" };
  return { jenis: "tanya", teks };
}

/** "6281234567890" → "+62 812-••••-7890" (untuk tampilan di aplikasi; nomor utuh tidak disimpan). */
export function samarkanNomor(nomor: string): string {
  const d = String(nomor ?? "").replace(/\D/g, "");
  if (d.length < 8) return "+••••";
  return `+${d.slice(0, 2)} ${d.slice(2, 5)}-••••-${d.slice(-4)}`;
}

/** Markdown jawaban Eira → format WhatsApp (*tebal*, _miring_), maks. ±3.800 karakter. */
export function keFormatWa(md: string, maks = 3800): string {
  let t = String(md ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/^#{1,6}\s*(.+)$/gm, "*$1*")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/__(.+?)__/g, "*$1*")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 ($2)")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (t.length > maks) {
    const ekor = "…\n\n_Jawaban dipotong. Buka Eira di aplikasi untuk selengkapnya._";
    t = t.slice(0, maks - ekor.length).trimEnd() + ekor;
  }
  return t;
}

export interface AkunWa {
  user_id: string;
  clinic_id: string;
  nama: string;
  peran: string;
  klinik: string;
}

const PERAN: Record<string, string> = { admin: "Manajer", dokter: "Dokter", resepsionis: "Resepsionis" };
export const labelPeran = (p: string) => PERAN[p] ?? p;

export function teksBantuan(akun: AkunWa | null): string {
  return [
    `Halo${akun ? ` ${akun.nama}` : ""}, saya *Eira*, asisten Dentiva.`,
    akun ? `Akun aktif: *${akun.klinik}* (${labelPeran(akun.peran)}).` : "",
    "",
    "Contoh pertanyaan:",
    "• Berapa pendapatan hari ini?",
    "• Bahan apa yang hampir habis?",
    "• Catat pengeluaran listrik 850 ribu",
    "",
    "Perintah:",
    "• *KLINIK* — ganti klinik (bila nomor tertaut ke beberapa klinik)",
    "• *PUTUSKAN* — lepas nomor ini dari akun Dentiva",
    "",
    "_Data pasien dan isi rekam medis tidak dikirim lewat WhatsApp._",
  ].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n");
}

export function teksPilihKlinik(akun: AkunWa[]): string {
  return [
    "Nomor ini tertaut ke beberapa akun. Balas dengan angka untuk memilih:",
    ...akun.map((a, i) => `${i + 1}. ${a.klinik} — ${labelPeran(a.peran)}`),
  ].join("\n");
}

export const TEKS_BELUM_TERTAUT = [
  "Nomor ini belum tertaut ke akun Dentiva.",
  "",
  "Untuk memakai Eira lewat WhatsApp: buka aplikasi Dentiva → *Profil* → *WhatsApp untuk Eira* → *Buat kode*, lalu kirim kode tersebut ke nomor ini, contoh: *DENTIVA 123456*.",
].join("\n");

export function teksHasilTautan(r: { ok: boolean; alasan?: string; nama?: string; peran?: string; klinik?: string }): string {
  if (r.ok) {
    return `Berhasil. Nomor ini kini tertaut ke *${r.nama}* — ${r.klinik} (${labelPeran(r.peran ?? "")}).\n\nSilakan langsung bertanya. Ketik *BANTUAN* untuk contoh pertanyaan.`;
  }
  if (r.alasan === "terlalu_banyak") return "Terlalu banyak kode salah. Coba lagi dalam satu jam.";
  if (r.alasan === "akun_tidak_aktif") return "Akun untuk kode ini sedang tidak aktif. Hubungi manajer klinik Anda.";
  return "Kode salah atau sudah kedaluwarsa (berlaku 10 menit). Buat kode baru di aplikasi: Profil → WhatsApp untuk Eira.";
}

export const TEKS_KHUSUS_MANAJER =
  "Eira lewat WhatsApp saat ini melayani *manajer klinik*. Untuk panduan dan tugas harian, buka Eira di aplikasi Dentiva (tombol Eira di pojok kanan bawah).";

/** Ringkasan usulan Eira Agen untuk dikonfirmasi lewat balasan YA/TIDAK. */
export function teksUsulan(usulan: { jenis?: string; pratinjau?: { judul?: string } }[]): string {
  const daftar = usulan.slice(0, 8).map((u) => `• ${u.pratinjau?.judul ?? u.jenis ?? "Usulan"}`).join("\n");
  return `\n\n*Menunggu persetujuan Anda:*\n${daftar}\n\nBalas *YA* untuk menjalankan atau *TIDAK* untuk membatalkan. (Berlaku 30 menit.)`;
}

export interface GiliranRiwayat { role: "user" | "assistant"; content: string }

/** Riwayat singkat untuk konteks (maks. 10 giliran), kosong bila percakapan sudah lewat 6 jam. */
export function riwayatAktif(riwayat: unknown, diperbarui: string | null, sekarang = Date.now()): GiliranRiwayat[] {
  if (!Array.isArray(riwayat) || !diperbarui) return [];
  if (sekarang - new Date(diperbarui).getTime() > 6 * 3600_000) return [];
  return (riwayat as GiliranRiwayat[])
    .filter((t) => (t?.role === "user" || t?.role === "assistant") && typeof t?.content === "string")
    .slice(-20);
}
