/**
 * Cara klinik membayar langganan Dentiva.
 *   - 'manual'   (bawaan): transfer ke rekening Dentiva lalu konfirmasi via WhatsApp; tim Dentiva memverifikasi dan
 *                 mencatat di Console (Billing → Invoice → "Konfirmasi transfer").
 *   - 'midtrans' : gerbang Midtrans Snap (fungsi midtrans-create-transaction), aktifkan dengan VITE_BILLING_MODE=midtrans
 *                 setelah akun Midtrans & MIDTRANS_SERVER_KEY di VPS siap.
 * Data rekening & nomor WhatsApp diisi pemilik di Environment Variables Vercel — tidak ditulis di kode.
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const teks = (v) => String(v ?? '').trim();

/** "0812-3456 7890" / "+62 812…" / "62812…" → "62812…" (format wa.me); kosong bila tidak valid. */
export function nomorWa(raw) {
  let d = teks(raw).replace(/\D/g, '');
  if (d.startsWith('0')) d = `62${d.slice(1)}`;
  else if (d.startsWith('8')) d = `62${d}`;
  return /^62\d{8,13}$/.test(d) ? d : '';
}

export const BILLING = {
  mode: teks(env.VITE_BILLING_MODE).toLowerCase() === 'midtrans' ? 'midtrans' : 'manual',
  bank: teks(env.VITE_BILLING_BANK),
  rekening: teks(env.VITE_BILLING_REKENING),
  atasNama: teks(env.VITE_BILLING_ATAS_NAMA),
  wa: nomorWa(env.VITE_BILLING_WA),
  email: teks(env.VITE_BILLING_EMAIL) || 'support@dentiva.co.id',
};

export const rekeningSiap = (b = BILLING) => Boolean(b.bank && b.rekening && b.atasNama);

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

/** Pesan konfirmasi yang terisi otomatis (tanpa data pasien). */
export function pesanKonfirmasi({ klinik, paket, siklus, nominal, admin }) {
  return [
    'Halo tim Dentiva, saya ingin mengonfirmasi pembayaran langganan.',
    '',
    `Klinik: ${klinik || '-'}`,
    `Paket: ${paket} (${siklus === 'yearly' ? 'tahunan' : 'bulanan'})`,
    `Nominal: ${rupiah(nominal)}`,
    `Admin: ${admin || '-'}`,
    '',
    'Bukti transfer saya lampirkan di pesan berikutnya. Terima kasih.',
  ].join('\n');
}

/** Tautan konfirmasi: WhatsApp bila nomor tersedia, selain itu email. */
export function tautanKonfirmasi(data, b = BILLING) {
  const isi = pesanKonfirmasi(data);
  if (b.wa) return { jenis: 'wa', href: `https://wa.me/${b.wa}?text=${encodeURIComponent(isi)}` };
  return { jenis: 'email', href: `mailto:${b.email}?subject=${encodeURIComponent(`Konfirmasi langganan Dentiva — ${data.klinik || 'klinik'}`)}&body=${encodeURIComponent(isi)}` };
}
