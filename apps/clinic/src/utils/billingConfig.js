/**
 * Pembayaran langganan Dentiva memakai Midtrans Snap (fungsi midtrans-create-transaction).
 * Lingkungan Snap (sandbox/production) diatur VITE_MIDTRANS_ENV + VITE_MIDTRANS_CLIENT_KEY.
 * Data rekening & nomor WhatsApp di bawah hanya untuk identitas pada invoice PDF, diisi pemilik di
 * Environment Variables — tidak ditulis di kode.
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
  bank: teks(env.VITE_BILLING_BANK),
  rekening: teks(env.VITE_BILLING_REKENING),
  atasNama: teks(env.VITE_BILLING_ATAS_NAMA),
  wa: nomorWa(env.VITE_BILLING_WA),
  email: teks(env.VITE_BILLING_EMAIL) || 'info@dentiva.id',
};

/**
 * Identitas penjual pada invoice langganan. Alamat (pisahkan baris dengan "|") dan NPWP diisi
 * pemilik di Environment Variables Vercel; baris yang kosong tidak dicetak.
 */
export const PENJUAL = {
  nama: teks(env.VITE_INVOICE_NAMA) || 'PT Dentiva Teknologi Nusantara',
  alamat: teks(env.VITE_INVOICE_ALAMAT).split('|').map((x) => x.trim()).filter(Boolean),
  npwp: teks(env.VITE_INVOICE_NPWP),
  email: BILLING.email,
};
