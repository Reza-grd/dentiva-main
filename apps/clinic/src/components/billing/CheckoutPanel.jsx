import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ShieldCheck, Lock, CreditCard, QrCode, Landmark, Wallet } from 'lucide-react';
import { Button } from '@dentiva/ui';
import { getCheckoutPlans, mulaiCheckout } from '../../services/checkoutService';
import { bacaNiatBeli, hapusNiatBeli, MIDTRANS } from '../../utils/midtransSnap';

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
const tanpaBatas = (n) => Number(n) >= 9999;

/**
 * Checkout langganan (dipakai di layar klinik 'menunggu' dan halaman Paket).
 * Langkah: akun ✓ → pilih paket → bayar via Midtrans Snap → halaman status.
 */
export default function CheckoutPanel({ judul = 'Aktifkan klinik Anda sekarang', subjudul, tampilLangkah = true }) {
  const navigate = useNavigate();
  const niat = useMemo(() => bacaNiatBeli(), []);
  const [plans, setPlans] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [siklus, setSiklus] = useState(niat?.siklus || 'monthly');
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    getCheckoutPlans()
      .then((rows) => {
        setPlans(rows);
        const cocok = niat && rows.find((p) => p.name.toLowerCase() === niat.paket);
        const populer = rows.find((p) => p.name.toLowerCase() === 'pro');
        setPlanId((cocok || populer || rows[0])?.id ?? null);
      })
      .catch(() => setPlans([]));
  }, [niat]);

  const plan = plans?.find((p) => p.id === planId);
  const harga = plan ? (siklus === 'yearly' ? plan.price_yearly : plan.price_monthly) : 0;
  const hemat = plan ? Math.max(0, plan.price_monthly * 12 - plan.price_yearly) : 0;

  const bayar = async () => {
    if (!plan) return;
    setPesan('');
    setProses(true);
    try {
      const { orderId, hasil } = await mulaiCheckout(plan.id, siklus);
      if (hasil === 'close') {
        setPesan('Jendela pembayaran ditutup. Klik "Bayar" lagi bila ingin melanjutkan.');
        return;
      }
      hapusNiatBeli();
      navigate(`/langganan/status?order_id=${encodeURIComponent(orderId)}`);
    } catch (e) {
      setPesan(e.message || 'Pembayaran belum bisa dimulai.');
    } finally {
      setProses(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      {tampilLangkah && (
        <ol className="flex items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm mb-6" aria-label="Langkah pembelian">
          {[['Akun & klinik', true], ['Pilih paket', false], ['Pembayaran', false]].map(([t, selesai], i) => (
            <li key={t} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full grid place-items-center font-semibold ${selesai ? 'bg-emerald-500 text-white' : i === 1 ? 'bg-[#183858] text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {selesai ? <Check size={15} /> : i + 1}
              </span>
              <span className={i === 1 ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>{t}</span>
              {i < 2 && <span className="hidden sm:block w-10 h-px bg-gray-300 dark:bg-gray-700" />}
            </li>
          ))}
        </ol>
      )}

      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-gray-900 dark:text-white">{judul}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xl mx-auto">
          {subjudul || 'Pilih paket, bayar, dan klinik Anda langsung aktif tanpa menunggu verifikasi.'}
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_340px] gap-5 items-start">
        {/* Paket */}
        <div className="space-y-3">
          <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800" role="radiogroup" aria-label="Siklus tagihan">
            {[['monthly', 'Bulanan'], ['yearly', 'Tahunan']].map(([v, t]) => (
              <button key={v} type="button" role="radio" aria-checked={siklus === v} onClick={() => setSiklus(v)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${siklus === v ? 'bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {t}{v === 'yearly' && <span className="ml-1.5 text-[11px] font-semibold text-emerald-600">lebih hemat</span>}
              </button>
            ))}
          </div>

          {plans === null && <div className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}
          {plans?.length === 0 && <p className="text-sm text-red-600">Daftar paket belum bisa dimuat. Muat ulang halaman.</p>}
          {plans?.map((p) => {
            const aktif = p.id === planId;
            const h = siklus === 'yearly' ? p.price_yearly : p.price_monthly;
            return (
              <button key={p.id} type="button" onClick={() => setPlanId(p.id)} aria-pressed={aktif}
                className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition flex gap-4 items-start bg-white dark:bg-[#14171F] ${aktif ? 'border-[#C99D4E] ring-2 ring-[#C99D4E]/30 shadow-md' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`}>
                <span className={`mt-1 w-5 h-5 rounded-full border-2 grid place-items-center flex-none ${aktif ? 'border-[#183858]' : 'border-gray-300'}`}>
                  {aktif && <span className="w-2.5 h-2.5 rounded-full bg-[#183858]" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{p.name}</span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                      {rupiah(h)}<span className="text-xs font-normal text-gray-500"> /{siklus === 'yearly' ? 'tahun' : 'bulan'}</span>
                    </span>
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-gray-600 dark:text-gray-400">
                    <span>✓ {tanpaBatas(p.max_users) ? 'Pengguna tanpa batas' : `${p.max_users} pengguna`}</span>
                    <span>✓ {tanpaBatas(p.max_patients) ? 'Pasien tanpa batas' : `${Number(p.max_patients).toLocaleString('id-ID')} pasien`}</span>
                    {p.features?.whatsapp_reminders && <span>✓ Pengingat WhatsApp</span>}
                    {p.features?.custom_reports && <span>✓ Laporan laba/rugi</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Ringkasan */}
        <aside className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#14171F] p-5 md:sticky md:top-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Ringkasan</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-400">Paket</dt><dd className="font-medium text-gray-900 dark:text-white">{plan?.name || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-400">Periode</dt><dd className="font-medium text-gray-900 dark:text-white">{siklus === 'yearly' ? '12 bulan' : '1 bulan'}</dd></div>
            {siklus === 'yearly' && hemat > 0 && (
              <div className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-400">Hemat</dt><dd className="font-medium text-emerald-600 tabular-nums">−{rupiah(hemat)}</dd></div>
            )}
          </dl>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-baseline">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Total</span>
            <span className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums">{rupiah(harga)}</span>
          </div>
          <Button className="w-full mt-5 gap-2" onClick={bayar} isLoading={proses} disabled={!plan || proses}>
            <Lock size={16} aria-hidden="true" /> Bayar {plan ? rupiah(harga) : ''}
          </Button>
          {pesan && <p className="mt-3 text-sm text-amber-700 dark:text-amber-400" role="status">{pesan}</p>}
          <div className="mt-5 flex items-center justify-center gap-3 text-gray-400" aria-label="Metode pembayaran">
            <Landmark size={18} aria-label="Transfer bank / Virtual Account" /><QrCode size={18} aria-label="QRIS" />
            <Wallet size={18} aria-label="E-wallet" /><CreditCard size={18} aria-label="Kartu kredit" />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-center text-gray-500 flex items-start gap-1.5 justify-center">
            <ShieldCheck size={14} className="flex-none mt-0.5 text-emerald-600" aria-hidden="true" />
            Pembayaran diproses aman oleh Midtrans. VA bank, QRIS, e-wallet, dan kartu kredit.
          </p>
          {!MIDTRANS.production && (
            <p className="mt-3 text-[11px] text-center font-semibold text-amber-700 bg-amber-50 dark:bg-amber-500/10 rounded-lg py-1.5">MODE UJI (SANDBOX) — tidak ada uang sungguhan</p>
          )}
        </aside>
      </div>
    </div>
  );
}
