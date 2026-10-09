export const DEFAULT_RECALL_TEMPLATE =
  'Halo {nama}, semoga sehat selalu. Sudah cukup lama sejak pemeriksaan gigi terakhir Anda di {klinik}. ' +
  'Kami menyarankan kontrol rutin setiap 6 bulan agar kesehatan gigi tetap terjaga. ' +
  'Balas pesan ini untuk membuat janji ya. Terima kasih.';

/** Nomor WA Indonesia → format internasional tanpa "+" (08xx → 628xx). Kosong bila tidak valid. */
export function toWaNumber(phone) {
  let n = (phone || '').toString().replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = `62${n.slice(1)}`;
  else if (n.startsWith('8')) n = `62${n}`;
  return /^62\d{8,13}$/.test(n) ? n : '';
}

/** Ganti {nama} dan {klinik} di template. Nama dirapikan ke huruf kapital awal. */
export function fillRecallTemplate(template, { nama, klinik }) {
  const prettyName = (nama || '').trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  return (template || DEFAULT_RECALL_TEMPLATE)
    .replaceAll('{nama}', prettyName || 'Bapak/Ibu')
    .replaceAll('{klinik}', (klinik || '').trim() || 'klinik kami');
}

/** Tautan wa.me berisi pesan, atau '' bila nomor tidak valid. */
export function recallWaLink(phone, message) {
  const n = toWaNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : '';
}

/** Selisih bulan penuh antara tanggal (YYYY-MM-DD) dan hari ini. */
export function monthsSince(dateStr, today = new Date()) {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  let months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m);
  if (today.getDate() < d) months -= 1;
  return Math.max(0, months);
}
