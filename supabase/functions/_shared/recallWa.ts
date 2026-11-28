/**
 * Recall WhatsApp (Fase 3): teks pesan & tafsir jawaban pasien. Tanpa emoji, gaya formal.
 * Tidak bergantung penyedia: jalur sidecar memakai balasan angka; jalur Meta kelak memakai tombol
 * dengan judul yang sama ("Bisa datang", "Ganti jadwal", "Tidak perlu") sehingga tafsirnya tetap.
 */

export type JawabanRecall = 'bisa' | 'ganti' | 'tidak' | 'berhenti'
export type HasilJawab = 'dikonfirmasi' | 'minta_ganti' | 'tidak_jadi' | 'diteruskan' | 'sudah' | 'ditutup'

const PILIHAN = '1 - Bisa datang\n2 - Ganti jadwal\n3 - Tidak perlu'
const BERHENTI = 'Balas BERHENTI bila tidak ingin menerima pesan WhatsApp lagi.'

const KATA: Record<string, JawabanRecall> = {
  '1': 'bisa', 'satu': 'bisa', 'bisa': 'bisa', 'bisa datang': 'bisa', 'ya': 'bisa', 'iya': 'bisa', 'ya bisa': 'bisa',
  'iya bisa': 'bisa', 'ok': 'bisa', 'oke': 'bisa', 'okey': 'bisa', 'siap': 'bisa', 'insyaallah bisa': 'bisa',
  '2': 'ganti', 'dua': 'ganti', 'ganti': 'ganti', 'ganti jadwal': 'ganti', 'ubah jadwal': 'ganti', 'jadwal lain': 'ganti',
  'atur ulang': 'ganti', 'reschedule': 'ganti',
  // "Tidak"/"gak" saja menjawab "Apakah Anda bisa datang?" = tidak bisa pada tanggal itu → ganti jadwal
  // (resepsionis menghubungi), BUKAN "tidak perlu kontrol" yang menutup recall.
  'tidak': 'ganti', 'tdk': 'ganti', 'gak': 'ganti', 'ga': 'ganti', 'nggak': 'ganti', 'enggak': 'ganti',
  'tidak bisa': 'ganti', 'gak bisa': 'ganti', 'tdk bisa': 'ganti', 'belum bisa': 'ganti',
  '3': 'tidak', 'tiga': 'tidak', 'tidak perlu': 'tidak', 'tdk perlu': 'tidak', 'tidak usah': 'tidak', 'gak usah': 'tidak',
  'gak perlu': 'tidak', 'ga perlu': 'tidak',
  'berhenti': 'berhenti', 'stop': 'berhenti', 'unsubscribe': 'berhenti',
}

/**
 * Tafsir balasan pasien. Hanya jawaban yang jelas yang diterima: angka 1/2/3 di awal pesan
 * ("1", "1.", "2 ganti jadwal") atau frasa pendek yang dikenal. Kalimat lain (mis. "tidak bisa hari itu") → null.
 */
const rapikan = (teks: string | null | undefined) =>
  String(teks ?? '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()

export function tafsirJawaban(teks: string | null | undefined): JawabanRecall | null {
  const t = rapikan(teks)
  if (!t) return null
  if (KATA[t]) return KATA[t]
  const angka = /^([123])(\s|$)/.exec(t)
  if (angka) return KATA[angka[1]]
  return null
}

/** Sapaan singkat ("ya", "ok", "siap") yang hanya berarti "Bisa" sebagai jawaban PERTAMA. */
const SAPAAN = new Set(['ya', 'iya', 'ok', 'oke', 'okey', 'siap'])

/**
 * Jawaban tegas: angka 1/2/3 atau frasa yang menyebut pilihannya. Setelah pasien menjawab, hanya jawaban tegas
 * yang boleh mengubah jawaban — "ok"/"ya" untuk pesan balasan kita tidak boleh menimpa "Ganti jadwal".
 */
export function jawabanTegas(teks: string | null | undefined): boolean {
  return tafsirJawaban(teks) !== null && !SAPAAN.has(rapikan(teks))
}

/** "2026-12-05" → "Sabtu, 5 Desember 2026" (WIB). */
export function tanggalPanjang(iso: string): string {
  return new Date(`${iso}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  })
}

const tujuanKalimat = (tujuan: string | null | undefined) => {
  const t = String(tujuan ?? '').trim().replace(/[.\s]+$/, '')
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : 'kontrol lanjutan'
}

interface DataPesan { nama: string; klinik: string; tanggal: string; tujuan?: string | null; telepon?: string | null }

/** Pesan recall pertama (H-7) dan pesan ulang (sekali, 2 hari kemudian bila belum dijawab). */
export function pesanRecall(jenis: 'awal' | 'ulang', d: DataPesan): string {
  const nama = d.nama?.trim() || 'Bapak/Ibu'
  const tgl = tanggalPanjang(d.tanggal)
  if (jenis === 'ulang') {
    return `Yth. ${nama}, kami belum menerima jawaban Anda mengenai jadwal kontrol di ${d.klinik} sekitar ${tgl}.\n\n` +
      `Mohon balas dengan angka agar kami dapat menyiapkan jadwal Anda:\n${PILIHAN}\n\n${BERHENTI}`
  }
  return `Yth. ${nama},\nsesuai rencana perawatan di ${d.klinik}, Anda dijadwalkan kontrol sekitar ${tgl} untuk ${tujuanKalimat(d.tujuan)}.\n\n` +
    `Apakah Anda bisa datang? Mohon balas dengan angka:\n${PILIHAN}\n\n${BERHENTI}`
}

/** Balasan otomatis setelah jawaban pasien dicatat. */
export function pesanBalasan(hasil: HasilJawab, d: DataPesan): string {
  const nama = d.nama?.trim() || 'Bapak/Ibu'
  const tel = d.telepon && d.telepon !== '-' ? ` di ${d.telepon}` : ''
  const tgl = tanggalPanjang(d.tanggal)
  switch (hasil) {
    case 'dikonfirmasi':
      return `Terima kasih, ${nama}. Kesediaan Anda untuk kontrol sekitar ${tgl} telah kami catat. ` +
        `Petugas ${d.klinik} akan menghubungi Anda untuk menetapkan jam kunjungan.`
    case 'minta_ganti':
      return `Terima kasih, ${nama}. Permintaan ganti jadwal telah kami terima. ` +
        `Petugas ${d.klinik} akan menghubungi Anda untuk menawarkan waktu lain yang tersedia.`
    case 'tidak_jadi':
      return `Terima kasih atas jawaban Anda, ${nama}. Jadwal kontrol ini kami batalkan. ` +
        `Bila sewaktu-waktu ada keluhan, silakan hubungi ${d.klinik}${tel}.`
    case 'diteruskan':
      return `Terima kasih atas jawaban Anda, ${nama}. Kontrol ini penting untuk keberhasilan perawatan Anda, ` +
        `sehingga petugas ${d.klinik} akan menghubungi Anda untuk penjelasan lebih lanjut.`
    case 'sudah':
      return `Terima kasih, ${nama}. Jawaban Anda sudah kami catat sebelumnya.`
    case 'ditutup':
      return `Terima kasih, ${nama}. Untuk pertanyaan atau perubahan jadwal, silakan hubungi ${d.klinik}${tel}.`
  }
}

export const PESAN_PETUNJUK =
  'Mohon maaf, jawaban Anda belum dapat kami proses. Silakan balas dengan angka 1 (Bisa datang), 2 (Ganti jadwal), atau 3 (Tidak perlu).'

export const PESAN_BERHENTI =
  'Baik, nomor ini tidak akan menerima pesan WhatsApp dari kami lagi. Untuk mengaktifkan kembali, silakan hubungi klinik Anda.'

/** Jendela kirim pesan recall: 09.00–16.00 WIB, Senin–Sabtu. */
export function dalamJendelaKirim(now: Date = new Date()): boolean {
  const wib = new Date(now.getTime() + 7 * 3_600_000)
  const jam = wib.getUTCHours()
  return wib.getUTCDay() !== 0 && jam >= 9 && jam < 16
}
