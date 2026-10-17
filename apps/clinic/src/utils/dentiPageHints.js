/**
 * Saran Eira yang menyesuaikan halaman yang sedang dibuka ("Ajarkan cara menerima pembayaran" di halaman kasir, dst).
 * Setiap kalimat saran harus dipahami otak lokal Eira — dijaga oleh dentiPageHints.test.js.
 */
export const PAGE_HINTS = [
  { prefix: '/resepsionis/pembayaran', hints: ['Ajarkan cara menerima pembayaran', 'Kenapa invoice WA tidak terkirim?'] },
  { prefix: '/pembayaran/', hints: ['Ajarkan cara menerima pembayaran', 'Kenapa invoice WA tidak terkirim?'] },
  { prefix: '/resepsionis/jadwal', hints: ['Ajarkan cara membuat jadwal kunjungan', 'Apa itu recall?'] },
  { prefix: '/booking-requests', hints: ['Ajarkan cara memproses booking', 'Ajarkan cara mendaftarkan pasien baru'] },
  { prefix: '/resepsionis/recall', hints: ['Ajarkan cara recall pasien', 'Apa itu recall?'] },
  { prefix: '/pasien/daftar', hints: ['Ajarkan cara mendaftarkan pasien baru', 'Ajarkan cara membuat jadwal kunjungan'] },
  { prefix: '/layar-antrean', hints: ['Ajarkan cara menampilkan antrean di TV'] },
  { prefix: '/dokter/jadwal', hints: ['Ajarkan cara mulai kunjungan', 'Ajarkan cara isi rekam medis'] },
  { prefix: '/dokter/rekam-medis', hints: ['Ajarkan cara isi rekam medis', 'Apa itu SOAP?', 'Ajarkan cara tulis resep'] },
  { prefix: '/rekam-medis/', hints: ['Ajarkan cara isi rekam medis', 'Apa itu odontogram?', 'Ajarkan cara tulis resep'] },
  { prefix: '/admin/pengaturan', hints: ['Ajarkan cara mengatur template pengingat', 'Ajarkan cara menguji pesan WhatsApp', 'Ajarkan cara mengaktifkan booking online'] },
  { prefix: '/pengaturan', hints: ['Ajarkan cara ganti password', 'Ajarkan cara ganti tema'] },
  { prefix: '/admin/costing', hints: ['Apa itu HPP?', 'Ajarkan cara hitung HPP', 'Apa itu BEP?'] },
  { prefix: '/admin/pengguna', hints: ['Ajarkan cara menambah staf baru', 'Ajarkan cara mengatur hak akses'] },
  { prefix: '/admin/treatments', hints: ['Ajarkan cara menambah tindakan', 'Apa itu margin?'] },
  { prefix: '/admin/pengeluaran', hints: ['Ajarkan cara catat pengeluaran'] },
  { prefix: '/admin/jadwal-dokter', hints: ['Ajarkan cara mengatur jadwal praktik dokter'] },
  { prefix: '/keuangan', hints: ['Ajarkan cara lihat laporan keuangan', 'Apa itu margin?'] },
  { prefix: '/admin/laporan', hints: ['Ajarkan cara lihat laporan keuangan'] },
  { prefix: '/admin/audit-log', hints: ['Ajarkan cara membaca log audit', 'Apa itu audit log?'] },
];

/** Hingga `max` saran untuk halaman ini; awalan paling spesifik (terpanjang) dipilih. */
export function pageHints(pathname = '', max = 3) {
  const hit = [...PAGE_HINTS].sort((a, b) => b.prefix.length - a.prefix.length).find((p) => pathname.startsWith(p.prefix));
  return hit ? hit.hints.slice(0, max) : [];
}
