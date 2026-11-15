import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../contexts/PermissionsContext';

/**
 * Pengingat langganan untuk manajer klinik (gaya SaaS): sisa masa uji coba / pembayaran tertunda,
 * dengan ajakan memilih paket. Tidak tampil untuk peran lain atau klinik yang sudah aktif berbayar.
 *   varian "banner" — baris di atas Dashboard (bisa ditutup untuk hari ini, kecuali tunggakan)
 *   varian "kartu"  — kartu ringkas di bawah menu samping
 */
const HARI = 86_400_000;
const kunciTutup = () => `dentiva-pengingat-langganan:${new Date().toISOString().slice(0, 10)}`;

export function statusPengingat(subscription, sekarang = Date.now()) {
  if (!subscription) return null;
  if (subscription.status === 'past_due') return { jenis: 'tunggakan', sisa: 0 };
  if (subscription.status !== 'trialing') return null;
  const akhir = new Date(subscription.current_period_end || 0).getTime();
  const mulai = new Date(subscription.current_period_start || subscription.created_at || 0).getTime();
  if (!akhir) return null;
  const sisa = Math.max(0, Math.ceil((akhir - sekarang) / HARI));
  const total = mulai && akhir > mulai ? Math.max(1, Math.round((akhir - mulai) / HARI)) : 14;
  return { jenis: 'trial', sisa, total, mendesak: sisa <= 7 };
}

export default function PengingatLangganan({ varian = 'banner' }) {
  const { userProfile } = useAuth();
  const { subscription, plan } = usePermission();
  const navigate = useNavigate();
  const [ditutup, setDitutup] = useState(() => {
    try { return Boolean(localStorage.getItem(kunciTutup())); } catch { return false; }
  });

  if (userProfile?.role !== 'admin') return null;
  const st = statusPengingat(subscription);
  if (!st) return null;
  const namaPaket = plan?.name ? `paket ${plan.name}` : 'Dentiva';
  const keHarga = () => navigate('/pricing');

  if (varian === 'kartu') {
    const persen = st.jenis === 'trial' ? Math.min(100, Math.round(((st.total - st.sisa) / st.total) * 100)) : 100;
    return (
      <div className="mx-3 mb-3 rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-medium text-text-primary">
          {st.jenis === 'tunggakan' ? 'Pembayaran tertunda' : `Uji coba · ${st.sisa} hari lagi`}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
          <div className={`h-full rounded-full ${st.jenis === 'tunggakan' || st.mendesak ? 'bg-amber-500' : 'bg-accent-primary'}`} style={{ width: `${persen}%` }} />
        </div>
        <button type="button" onClick={keHarga}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
          <Sparkles size={13} /> {st.jenis === 'tunggakan' ? 'Bayar sekarang' : 'Upgrade'}
        </button>
      </div>
    );
  }

  if (ditutup && st.jenis !== 'tunggakan') return null;
  const tutup = () => {
    try { localStorage.setItem(kunciTutup(), '1'); } catch { /* abaikan */ }
    setDitutup(true);
  };
  const peringatan = st.jenis === 'tunggakan' || st.mendesak;
  const judul = st.jenis === 'tunggakan'
    ? 'Pembayaran langganan tertunda.'
    : st.sisa === 0 ? 'Masa uji coba berakhir hari ini.' : `Masa uji coba ${namaPaket} tersisa ${st.sisa} hari.`;
  const isi = st.jenis === 'tunggakan'
    ? 'Selesaikan pembayaran agar rekam medis, jadwal, dan kasir tetap berjalan tanpa jeda.'
    : 'Pilih paket sekarang agar data dan pengaturan klinik tetap berjalan tanpa jeda setelah uji coba berakhir.';

  return (
    <div role="status"
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center ${peringatan
        ? 'border-amber-500/30 bg-amber-500/10'
        : 'border-accent-primary/20 bg-accent-primary/5'}`}>
      <Sparkles size={18} className={`hidden flex-none sm:block ${peringatan ? 'text-amber-700 dark:text-amber-400' : 'text-accent-primary'}`} />
      <p className="min-w-0 flex-1 text-sm text-text-primary">
        <span className="font-semibold">{judul}</span> <span className="text-text-muted">{isi}</span>
      </p>
      <div className="flex flex-none items-center gap-2">
        <button type="button" onClick={keHarga}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110">
          {st.jenis === 'tunggakan' ? 'Bayar sekarang' : 'Pilih paket'} <ArrowRight size={15} />
        </button>
        {st.jenis !== 'tunggakan' && (
          <button type="button" onClick={tutup} aria-label="Tutup pengingat hari ini" className="rounded-lg p-1.5 text-text-muted hover:bg-background hover:text-text-primary">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
