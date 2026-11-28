/**
 * Recall berbasis SOP perawatan — logika murni (tanpa jaringan), dipakai RM, pop-up, & halaman Recall.
 * Aturan server: supabase/migrations/20261128090000_recall_sop.sql
 */

export const KEPUTUSAN = {
  belum: 'Belum ditentukan',
  tidak_perlu: 'Tidak perlu recall',
  perlu: 'Perlu recall',
};

export const STATUS_RECALL = {
  menunggu: { label: 'Menunggu', warna: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200' },
  diingatkan: { label: 'Sudah diingatkan', warna: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  dikonfirmasi: { label: 'Pasien konfirmasi', warna: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  minta_ganti: { label: 'Minta ganti jadwal', warna: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  dibooking: { label: 'Sudah dijadwalkan', warna: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  selesai: { label: 'Selesai (pasien datang)', warna: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  tidak_jadi: { label: 'Tidak jadi', warna: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
  terlewat: { label: 'Terlewat', warna: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' },
};

/** Pilihan cepat jarak recall (hari). */
export const PRESET_HARI = [
  { hari: 7, label: '1 minggu' },
  { hari: 14, label: '2 minggu' },
  { hari: 30, label: '1 bulan' },
  { hari: 90, label: '3 bulan' },
  { hari: 180, label: '6 bulan' },
];

export const BATAS_HARI = { min: 1, max: 730 };

/**
 * Usulan recall dari SOP klinik untuk daftar perawatan kunjungan ini.
 *  - Ada perawatan "perlu" → perlu, jarak = yang TERPENDEK, wajib bila salah satunya wajib.
 *  - Semua perawatan yang dikenal SOP "tidak perlu" → tidak_perlu.
 *  - Tidak ada perawatan yang punya SOP → null (dokter memilih sendiri).
 * @param {string[]} treatmentIds
 * @param {{treatment_id:string, perlu:boolean, interval_hari:number|null, wajib:boolean, tujuan?:string|null, nama_treatment?:string}[]} sopRows
 */
export function usulanRecall(treatmentIds, sopRows) {
  const peta = new Map((sopRows || []).map((s) => [s.treatment_id, s]));
  const cocok = [...new Set(treatmentIds || [])].map((id) => peta.get(id)).filter(Boolean);
  if (cocok.length === 0) return null;
  const perlu = cocok.filter((s) => s.perlu && Number.isInteger(s.interval_hari));
  if (perlu.length === 0) {
    return { keputusan: 'tidak_perlu', interval_hari: null, wajib: false, tujuan: null, sumber: 'sop', dasar: cocok.map((s) => s.nama_treatment).filter(Boolean) };
  }
  const terdekat = perlu.reduce((a, b) => (b.interval_hari < a.interval_hari ? b : a));
  return {
    keputusan: 'perlu',
    interval_hari: terdekat.interval_hari,
    wajib: perlu.some((s) => s.wajib),
    tujuan: terdekat.tujuan || null,
    sumber: 'sop',
    dasar: perlu.map((s) => s.nama_treatment).filter(Boolean),
  };
}

/** Validasi isian keputusan sebelum dikirim. Mengembalikan pesan galat atau ''. */
export function validasiKeputusan(d) {
  if (!d || !KEPUTUSAN[d.keputusan]) return 'Pilih keputusan recall.';
  if (d.keputusan !== 'perlu') return '';
  const n = Number(d.interval_hari);
  if (!Number.isInteger(n) || n < BATAS_HARI.min || n > BATAS_HARI.max) return `Jarak recall harus ${BATAS_HARI.min}–${BATAS_HARI.max} hari.`;
  if ((d.tujuan || '').length > 200) return 'Tujuan recall maksimal 200 karakter.';
  return '';
}

/** 'YYYY-MM-DD' + n hari → 'YYYY-MM-DD' (kalender, tanpa geser zona waktu). */
export function tambahHari(tanggal, n) {
  const [y, m, d] = (tanggal || '').split('-').map(Number);
  if (!y || !m || !d || !Number.isFinite(Number(n))) return '';
  const t = new Date(Date.UTC(y, m - 1, d + Number(n)));
  return t.toISOString().slice(0, 10);
}

/** Teks jarak yang mudah dibaca: 7 → "7 hari (1 minggu)", 180 → "180 hari (± 6 bulan)". */
export function teksJarak(hari) {
  const n = Number(hari);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n % 7 === 0 && n < 30) return `${n} hari (${n / 7} minggu)`;
  if (n >= 28) {
    const bulan = Math.round(n / 30);
    return `${n} hari (± ${bulan} bulan)`;
  }
  return `${n} hari`;
}

/** "3 hari lagi" / "hari ini" / "lewat 2 hari". */
export function teksHariLagi(n) {
  if (n === null || n === undefined) return '';
  if (n === 0) return 'hari ini';
  return n > 0 ? `${n} hari lagi` : `lewat ${-n} hari`;
}

/** Keputusan yang sudah tersimpan dianggap "terisi" kecuali masih "belum". */
export const sudahDiputuskan = (row) => !!row && (row.keputusan === 'perlu' || row.keputusan === 'tidak_perlu');

const TEMPLATE_PESAN_RECALL =
  'Halo {nama}, ini pengingat dari {klinik}. Sesuai rencana perawatan, Anda dijadwalkan kontrol sekitar {tanggal}{tujuan}. ' +
  'Balas pesan ini untuk memilih waktu kunjungan ya. Terima kasih.';

/** Pesan WA manual untuk recall berbasis SOP. */
export function pesanRecallSop({ nama, klinik, tanggal, tujuan }) {
  const rapi = (nama || '').trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const tgl = tanggal
    ? new Date(`${tanggal}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'waktu dekat';
  return TEMPLATE_PESAN_RECALL
    .replace('{nama}', rapi || 'Bapak/Ibu')
    .replace('{klinik}', (klinik || '').trim() || 'klinik kami')
    .replace('{tanggal}', tgl)
    .replace('{tujuan}', tujuan ? ` untuk ${tujuan.charAt(0).toLowerCase()}${tujuan.slice(1)}` : '');
}
