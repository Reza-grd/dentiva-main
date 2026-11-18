/**
 * Popup pembayaran Midtrans Snap (https://docs.midtrans.com/docs/snap-snap-integration-guide).
 *   VITE_MIDTRANS_CLIENT_KEY  — Client Key (publik) dari Dashboard Midtrans → Settings → Access Keys
 *   VITE_MIDTRANS_ENV         — 'sandbox' (bawaan) | 'production'
 *   Uji sandbox: ketiga variabel di atas diisi hanya untuk lingkungan Preview Vercel.
 * Server Key TIDAK pernah ada di aplikasi; transaksi dibuat fungsi midtrans-create-transaction.
 * Hasil popup hanya petunjuk tampilan — status resmi datang dari webhook (lihat get_checkout_status).
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const MIDTRANS = {
  clientKey: String(env.VITE_MIDTRANS_CLIENT_KEY || '').trim(),
  production: String(env.VITE_MIDTRANS_ENV || '').trim().toLowerCase() === 'production',
};

const SNAP_URL = MIDTRANS.production
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js';

let loading = null;

export function loadSnap() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Snap hanya berjalan di browser'));
  if (window.snap) return Promise.resolve(window.snap);
  if (!MIDTRANS.clientKey) return Promise.reject(new Error('Client Key Midtrans belum diatur (VITE_MIDTRANS_CLIENT_KEY).'));
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SNAP_URL;
      s.setAttribute('data-client-key', MIDTRANS.clientKey);
      s.async = true;
      s.onload = () => (window.snap ? resolve(window.snap) : reject(new Error('Snap gagal dimuat')));
      s.onerror = () => { loading = null; reject(new Error('Tidak bisa memuat halaman pembayaran. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Buka popup Snap. Resolve { hasil: 'success'|'pending'|'error'|'close', data }. */
export async function bayarDenganSnap(token) {
  const snap = await loadSnap();
  return new Promise((resolve) => {
    snap.pay(token, {
      onSuccess: (data) => resolve({ hasil: 'success', data }),
      onPending: (data) => resolve({ hasil: 'pending', data }),
      onError: (data) => resolve({ hasil: 'error', data }),
      onClose: () => resolve({ hasil: 'close', data: null }),
    });
  });
}

/** Paket & siklus pilihan dari halaman harga (?paket=pro&siklus=yearly), disimpan sampai checkout. */
const KUNCI_NIAT = 'dentiva_niat_beli';
export function simpanNiatBeli(params) {
  const paket = String(params.get('paket') || '').trim().toLowerCase();
  if (!paket) return;
  const siklus = params.get('siklus') === 'yearly' ? 'yearly' : 'monthly';
  try { localStorage.setItem(KUNCI_NIAT, JSON.stringify({ paket, siklus })); } catch { /* abaikan */ }
}
export function bacaNiatBeli() {
  try { return JSON.parse(localStorage.getItem(KUNCI_NIAT) || 'null'); } catch { return null; }
}
export function hapusNiatBeli() {
  try { localStorage.removeItem(KUNCI_NIAT); } catch { /* abaikan */ }
}
