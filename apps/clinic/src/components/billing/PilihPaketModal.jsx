import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, Sparkles, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../contexts/PermissionsContext';
import { statusPengingat } from './PengingatLangganan';
import { sudahTur, akunBaru } from '../tour/EiraTour';

const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const tanpaBatas = (n) => Number(n) >= 9999;
const RINGKAS = {
  Starter: 'Praktik mandiri / 1 dokter',
  Pro: 'Klinik tumbuh dengan tim dokter',
  Enterprise: 'Klinik besar, dukungan prioritas',
};

/** Kunci per sesi login: popup muncul sekali setiap kali Manajer Klinik masuk. */
const kunciSesi = (user) => `dentiva-popup-paket:${user?.id}:${user?.last_sign_in_at || ''}`;

/**
 * Popup pilihan paket (gaya aplikasi SaaS besar) untuk Manajer Klinik yang masih
 * dalam masa uji coba atau menunggak. Tampil sekali per login; pilihan paket
 * diteruskan ke halaman Paket Langganan yang langsung membuka pembayaran.
 */
export default function PilihPaketModal() {
  const { user, userProfile } = useAuth();
  const { subscription, plan } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();
  const [buka, setBuka] = useState(false);
  const [paket, setPaket] = useState([]);
  const [siklus, setSiklus] = useState('monthly');

  const st = statusPengingat(subscription);
  const layak = userProfile?.role === 'admin' && Boolean(st) && location.pathname !== '/pricing';

  useEffect(() => {
    if (!layak || !user) return;
    // Akun baru yang belum ikut tur pengenalan: biarkan tur Eira tampil dulu, popup menyusul di login berikutnya.
    if (!sudahTur(user) && akunBaru(user)) return;
    try { if (localStorage.getItem(kunciSesi(user))) return; } catch { /* tetap tampilkan */ }
    let batal = false;
    supabase.from('subscription_plans').select('*').eq('is_active', true).order('price_monthly', { ascending: true })
      .then(({ data }) => {
        if (batal || !data?.length) return;
        setPaket(data);
        setBuka(true);
      });
    return () => { batal = true; };
  }, [layak, user]);

  const tutup = () => {
    try { localStorage.setItem(kunciSesi(user), '1'); } catch { /* abaikan */ }
    setBuka(false);
  };

  useEffect(() => {
    if (!buka) return undefined;
    const esc = (e) => e.key === 'Escape' && tutup();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  });

  if (!buka) return null;

  const pilih = (id) => {
    tutup();
    navigate(`/pricing?paket=${encodeURIComponent(id)}&siklus=${siklus}`);
  };

  const judul = st.jenis === 'tunggakan' ? 'Pembayaran langganan tertunda'
    : st.sisa === 0 ? 'Masa uji coba berakhir hari ini'
    : `Masa uji coba Anda tersisa ${st.sisa} hari`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="judul-pilih-paket">
      <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl">
        <button type="button" onClick={tutup} aria-label="Tutup" className="absolute right-4 top-4 rounded-full p-2 text-text-muted hover:bg-background hover:text-text-primary">
          <X size={18} />
        </button>

        <div className="px-5 pb-2 pt-7 text-center sm:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-primary">
            <Sparkles size={13} /> {judul}
          </span>
          <h2 id="judul-pilih-paket" className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">Pilih paket untuk klinik Anda</h2>
          <p className="mx-auto mt-1.5 max-w-xl text-sm text-text-muted">
            Lanjutkan tanpa jeda: seluruh data pasien, jadwal, dan pengaturan klinik tetap tersimpan saat Anda berlangganan.
          </p>
          <div className="mt-4 inline-flex rounded-full border border-border bg-background p-1">
            {[['monthly', 'Bulanan'], ['yearly', 'Tahunan']].map(([k, v]) => (
              <button key={k} type="button" onClick={() => setSiklus(k)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${siklus === k ? 'bg-card text-text-primary shadow-sm' : 'text-text-muted'}`}>
                {v}{k === 'yearly' && <span className="ml-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">2 bln gratis</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:px-8">
          {paket.map((p) => {
            const populer = p.name === 'Pro';
            const sekarang = plan?.id === p.id;
            const harga = siklus === 'yearly' ? p.price_yearly : p.price_monthly;
            return (
              <div key={p.id} className={`relative flex flex-col rounded-2xl border p-4 ${populer ? 'border-2 border-accent-primary shadow-lg' : 'border-border'}`}>
                {populer && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Paling populer</span>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-text-primary">{p.name}</p>
                  {sekarang && <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-text-muted">Uji coba saat ini</span>}
                </div>
                <p className="text-xs text-text-muted">{RINGKAS[p.name] || p.description}</p>
                <p className="mt-3 text-2xl font-semibold text-text-primary">{rupiah(harga)}</p>
                <p className="text-xs text-text-muted">per klinik / {siklus === 'yearly' ? 'tahun' : 'bulan'}</p>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-text-primary">
                  <li className="flex gap-2"><Check size={15} className="mt-0.5 flex-none text-emerald-500" />{tanpaBatas(p.max_users) ? 'Pengguna tanpa batas' : `Maks. ${p.max_users} pengguna`}</li>
                  <li className="flex gap-2"><Check size={15} className="mt-0.5 flex-none text-emerald-500" />{tanpaBatas(p.max_patients) ? 'Pasien tanpa batas' : `Hingga ${Number(p.max_patients ?? 1000).toLocaleString('id-ID')} pasien`}</li>
                  <li className="flex gap-2"><Check size={15} className="mt-0.5 flex-none text-emerald-500" />Integrasi SATUSEHAT</li>
                  {p.features?.whatsapp_reminders && <li className="flex gap-2"><Check size={15} className="mt-0.5 flex-none text-emerald-500" />Pengingat WhatsApp</li>}
                  {p.features?.custom_reports && <li className="flex gap-2"><Check size={15} className="mt-0.5 flex-none text-emerald-500" />Laporan laba/rugi</li>}
                </ul>
                <button type="button" onClick={() => pilih(p.id)}
                  className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${populer ? 'bg-accent-primary text-white hover:brightness-110' : 'border border-border text-text-primary hover:bg-background'}`}>
                  {sekarang ? `Aktifkan ${p.name}` : `Pilih ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-border px-5 py-4 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
          <p className="text-xs text-text-muted">Pembayaran aman lewat Midtrans atau transfer bank. Batalkan kapan saja.</p>
          {st.jenis !== 'tunggakan' && (
            <button type="button" onClick={tutup} className="text-sm font-medium text-text-muted hover:text-text-primary">
              Nanti saja, lanjutkan uji coba
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
