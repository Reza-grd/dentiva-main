import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarClock, Crown, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../contexts/PermissionsContext';
import { statusPengingat } from './PengingatLangganan';

const URUTAN = ['Starter', 'Pro', 'Enterprise'];

const tanggal = (iso) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-');

/**
 * Kartu langganan di Dashboard Manajer Klinik: paket berjalan, masa berlaku, dan tombol
 * upgrade / perpanjang / aktifkan sehingga perubahan paket cukup satu klik dari beranda.
 */
export default function KartuLangganan() {
  const { userProfile } = useAuth();
  const { subscription, plan, loadingSubscription } = usePermission();
  const navigate = useNavigate();

  if (userProfile?.role !== 'admin' || loadingSubscription) return null;

  const st = statusPengingat(subscription);
  const status = subscription?.status;
  const namaPaket = plan?.name || 'Starter';
  const tertinggi = URUTAN.indexOf(namaPaket) === URUTAN.length - 1;
  const peringatan = st?.jenis === 'tunggakan' || st?.mendesak;

  const label = status === 'trialing' ? `Uji coba · ${st?.sisa ?? 0} hari lagi`
    : status === 'past_due' ? 'Pembayaran tertunda'
    : status === 'active' ? 'Aktif'
    : 'Belum berlangganan';

  const keterangan = status === 'trialing' ? `Uji coba berakhir ${tanggal(subscription?.current_period_end)}`
    : status === 'past_due' ? 'Selesaikan pembayaran agar layanan tidak terhenti'
    : status === 'active' ? `Berlaku hingga ${tanggal(subscription?.current_period_end)}`
    : 'Pilih paket untuk mulai berlangganan';

  const aksiUtama = status === 'past_due' ? { teks: 'Bayar sekarang', ikon: ArrowUpRight }
    : status === 'trialing' ? { teks: 'Pilih paket', ikon: Sparkles }
    : tertinggi ? { teks: 'Perpanjang', ikon: RefreshCw }
    : { teks: 'Upgrade paket', ikon: ArrowUpRight };
  const IkonAksi = aksiUtama.ikon;

  return (
    <section
      aria-label="Langganan Dentiva"
      className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:p-5 ${peringatan
        ? 'border-amber-500/30 bg-amber-500/10'
        : 'border-accent-primary/20 bg-gradient-to-r from-accent-primary/10 via-accent-primary/5 to-transparent'}`}
    >
      <div className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl ${peringatan ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-accent-primary/15 text-accent-primary'}`}>
        <Crown size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-text-primary">Paket {namaPaket}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status === 'active' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
            : peringatan ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300' : 'bg-accent-primary/15 text-accent-primary'}`}>
            {label}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-text-muted">
          <CalendarClock size={14} className="flex-none" /> {keterangan}
        </p>
      </div>
      <div className="flex flex-none flex-wrap gap-2">
        {status === 'active' && !tertinggi && (
          <button type="button" onClick={() => navigate('/pricing')}
            className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-text-primary hover:bg-background">
            Perpanjang
          </button>
        )}
        <button type="button" onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
          <IkonAksi size={15} /> {aksiUtama.teks}
        </button>
      </div>
    </section>
  );
}
