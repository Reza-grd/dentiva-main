import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import { Button, Card, CardContent } from '@dentiva/ui';
import { useAuth } from '../contexts/AuthContext';
import { getCheckoutStatus } from '../services/checkoutService';

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

/**
 * /langganan/status?order_id=… — menunggu konfirmasi resmi dari webhook Midtrans.
 * Bisa dibuka klinik yang masih 'menunggu' (sebelum aktif), jadi dirender sebelum gerbang akses.
 */
export default function CheckoutStatusPage() {
  const [params] = useSearchParams();
  const orderId = params.get('order_id') || '';
  const navigate = useNavigate();
  const { refreshAccountStatus } = useAuth();
  const [st, setSt] = useState(null);
  const [habis, setHabis] = useState(false);
  const mulai = useRef(Date.now());

  useEffect(() => {
    let batal = false;
    let timer;
    const cek = async () => {
      try {
        const s = await getCheckoutStatus(orderId);
        if (batal) return;
        setSt(s || { status: 'unknown' });
        if (s?.status === 'confirmed') { await refreshAccountStatus?.(); return; }
        if (s?.status === 'failed') return;
      } catch { /* coba lagi */ }
      // Cek cepat 3 menit pertama, lalu tiap 15 detik (VA/QRIS bisa dibayar belakangan).
      const lewat = Date.now() - mulai.current;
      if (lewat > 3 * 60 * 1000) setHabis(true);
      timer = setTimeout(cek, lewat > 3 * 60 * 1000 ? 15000 : 3000);
    };
    if (orderId) cek();
    return () => { batal = true; clearTimeout(timer); };
  }, [orderId, refreshAccountStatus]);

  const status = st?.status;
  const ikon = status === 'confirmed'
    ? <CheckCircle2 className="text-emerald-600" size={44} />
    : status === 'failed'
      ? <XCircle className="text-red-500" size={44} />
      : habis ? <Clock className="text-amber-500" size={44} /> : <Loader2 className="animate-spin text-[#183858]" size={44} />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F17] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center flex flex-col items-center gap-3">
          {ikon}
          {status === 'confirmed' ? (
            <>
              <h1 className="text-xl font-medium text-gray-900 dark:text-white">Pembayaran berhasil</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Terima kasih! Langganan aktif dan klinik Anda siap dipakai.
                {st.invoice_number && <> Invoice <strong>{st.invoice_number}</strong> ({rupiah(st.amount_idr)}).</>}
              </p>
              <Button className="w-full mt-3" onClick={() => navigate('/', { replace: true })}>Masuk ke Dentiva</Button>
            </>
          ) : status === 'failed' ? (
            <>
              <h1 className="text-xl font-medium text-gray-900 dark:text-white">Pembayaran tidak berhasil</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transaksi dibatalkan atau kedaluwarsa. Tidak ada dana yang ditarik untuk transaksi ini.</p>
              <Button className="w-full mt-3" onClick={() => navigate('/', { replace: true })}>Coba bayar lagi</Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-medium text-gray-900 dark:text-white">{habis ? 'Menunggu pembayaran Anda' : 'Memeriksa pembayaran…'}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {habis
                  ? 'Jika Anda memilih Virtual Account atau QRIS, selesaikan pembayaran sesuai instruksi (berlaku 24 jam). Halaman ini akan berubah otomatis begitu pembayaran diterima.'
                  : 'Mohon tunggu sebentar, kami sedang menerima konfirmasi dari Midtrans.'}
              </p>
              {st?.amount_idr && <p className="text-sm font-medium text-gray-900 dark:text-white">Total {rupiah(st.amount_idr)}</p>}
              <p className="text-xs text-gray-400 break-all">No. pesanan {orderId}</p>
              <Button variant="outline" className="w-full mt-3" onClick={() => navigate('/', { replace: true })}>Kembali</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
