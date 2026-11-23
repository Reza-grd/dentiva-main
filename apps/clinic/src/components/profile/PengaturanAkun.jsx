import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2, Mail, MessageCircle, Unlink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import { akunService } from '../../services/akunService';
import { nomorWa } from '../../utils/billingConfig';
import KeamananAkun from './KeamananAkun';

// Hanya kunci yang dipakai (bukan seluruh import.meta.env) agar variabel build lain tidak ikut ke bundle.
const env = {
  VITE_EIRA_WA: import.meta.env.VITE_EIRA_WA,
};
/** Nomor WhatsApp resmi Eira (diisi pemilik di Vercel: VITE_EIRA_WA). */
const NOMOR_EIRA = nomorWa(env.VITE_EIRA_WA);
const tampilNomor = (d) => (d ? `+${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5, 9)}-${d.slice(9)}` : '');
const tanggal = (v) => (v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const kotak = 'rounded-xl border border-border bg-card';
const masukan = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30';

/** Ganti email masuk: email baru + password saat ini. */
function GantiEmail() {
  const { user } = useAuth();
  const toast = useToast();
  const [buka, setBuka] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lihat, setLihat] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');
  const [menunggu, setMenunggu] = useState(user?.new_email || '');
  // Kembali dari tautan konfirmasi email (?email=dikonfirmasi): Auth menaruh pesan di hash URL.
  const [kembali] = useState(() => {
    if (typeof window === 'undefined') return '';
    const q = new URLSearchParams(window.location.search);
    if (q.get('email') !== 'dikonfirmasi') return '';
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (h.get('error_description')) return `galat:${h.get('error_description')}`;
    return h.get('message') ? 'satu' : 'selesai';
  });
  useEffect(() => { setMenunggu(user?.new_email || ''); }, [user?.new_email]);

  const kirim = async (e) => {
    e.preventDefault();
    setGalat('');
    const baru = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(baru)) { setGalat('Format email baru tidak valid.'); return; }
    if (baru === (user?.email || '').toLowerCase()) { setGalat('Email baru sama dengan email saat ini.'); return; }
    if (!password) { setGalat('Masukkan password Anda saat ini.'); return; }
    setProses(true);
    const r = await akunService.gantiEmail(baru, password);
    setProses(false);
    if (!r.ok) { setGalat(r.error); return; }
    setPassword(''); setEmail(''); setBuka(false);
    setMenunggu(r.email);
    toast.success('Tautan konfirmasi dikirim ke email lama dan email baru.');
  };

  return (
    <section className={kotak} aria-labelledby="judul-ganti-email">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex gap-3">
          <Mail size={18} className="mt-0.5 text-text-muted" />
          <div>
            <h3 id="judul-ganti-email" className="text-base font-semibold text-text-primary">Email masuk</h3>
            <p className="text-sm text-text-muted">{user?.email}</p>
          </div>
        </div>
        {!buka && (
          <button type="button" onClick={() => setBuka(true)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-background">
            Ganti email
          </button>
        )}
      </div>
      {kembali && (
        <p role="status" className={`mx-5 mb-4 rounded-lg px-3 py-2 text-sm ${kembali.startsWith('galat:') ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-accent-primary/10 text-text-primary'}`}>
          {kembali === 'satu' && 'Satu tautan sudah dikonfirmasi. Klik juga tautan di email yang satunya untuk menyelesaikan pergantian.'}
          {kembali === 'selesai' && 'Konfirmasi diterima. Gunakan email baru saat masuk berikutnya.'}
          {kembali.startsWith('galat:') && `Tautan tidak berlaku: ${kembali.slice(6)}. Ulangi ganti email bila perlu.`}
        </p>
      )}
      {menunggu && !buka && (
        <p className="mx-5 mb-4 rounded-lg bg-accent-primary/10 px-3 py-2 text-sm text-text-primary">
          Menunggu konfirmasi ke <span className="font-semibold">{menunggu}</span>. Klik tautan yang kami kirim ke email lama <b>dan</b> email baru; email baru berlaku setelah keduanya dikonfirmasi.
        </p>
      )}
      {buka && (
        <form onSubmit={kirim} className="space-y-4 border-t border-border p-5" noValidate>
          <div>
            <label htmlFor="email-baru" className="mb-1.5 block text-xs font-medium text-text-muted">Email baru</label>
            <input id="email-baru" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={masukan} placeholder="nama@contoh.com" />
          </div>
          <div>
            <label htmlFor="password-konfirmasi" className="mb-1.5 block text-xs font-medium text-text-muted">Password saat ini (untuk konfirmasi)</label>
            <div className="relative">
              <input id="password-konfirmasi" type={lihat ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${masukan} pr-10`} />
              <button type="button" onClick={() => setLihat((v) => !v)} aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">
                {lihat ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {galat && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{galat}</p>}
          <p className="text-xs text-text-muted">Kami mengirim tautan konfirmasi ke email lama dan email baru. Email baru berlaku setelah keduanya diklik. Password tidak berubah.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setBuka(false); setGalat(''); setPassword(''); }} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background">Batal</button>
            <button type="submit" disabled={proses} className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
              {proses && <Loader2 size={15} className="animate-spin" />} Simpan email baru
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Tautkan nomor WhatsApp agar bisa bertanya ke Eira lewat WA. */
function WhatsAppEira() {
  const { userProfile } = useAuth();
  const toast = useToast();
  const [tautan, setTautan] = useState([]);
  const [kode, setKode] = useState(null);
  const [proses, setProses] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const muat = useCallback(async () => {
    const r = await akunService.daftarTautanWa();
    if (r.ok) setTautan(r.data);
  }, []);
  useEffect(() => { muat(); }, [muat]);
  // Setelah kode dibuat, periksa berkala apakah nomor sudah tertaut.
  useEffect(() => {
    if (!kode) return undefined;
    const t = setInterval(muat, 5000);
    const habis = setTimeout(() => setKode(null), new Date(kode.kedaluwarsa).getTime() - Date.now());
    return () => { clearInterval(t); clearTimeout(habis); };
  }, [kode, muat]);

  const buatKode = async () => {
    setProses(true);
    const r = await akunService.buatKodeWa();
    setProses(false);
    if (!r.ok) { toast.error(r.error); return; }
    setKode(r);
  };
  const pesan = kode ? `DENTIVA ${kode.kode}` : '';
  const salin = async () => {
    try { await navigator.clipboard.writeText(pesan); setTersalin(true); setTimeout(() => setTersalin(false), 1800); } catch { /* ditolak */ }
  };
  const putuskan = async (id) => {
    const r = await akunService.putuskanWa(id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Nomor WhatsApp dilepas dari akun Anda.');
    muat();
  };
  const manajer = userProfile?.role === 'admin';

  return (
    <section className={kotak} aria-labelledby="judul-wa-eira">
      <div className="flex gap-3 p-5">
        <MessageCircle size={18} className="mt-0.5 text-text-muted" />
        <div className="min-w-0 flex-1">
          <h3 id="judul-wa-eira" className="text-base font-semibold text-text-primary">WhatsApp untuk Eira</h3>
          <p className="text-sm text-text-muted">
            {manajer
              ? 'Tautkan nomor WhatsApp Anda agar bisa bertanya ke Eira atau memberi instruksi lewat WA, misalnya "pendapatan hari ini?" atau "catat pengeluaran listrik 850 ribu".'
              : 'Tautkan nomor WhatsApp Anda ke akun Dentiva. Saat ini percakapan Eira lewat WA melayani manajer klinik.'}
          </p>

          {tautan.length > 0 && (
            <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
              {tautan.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium tabular-nums text-text-primary">{t.nomor_tersamar}</p>
                    <p className="text-xs text-text-muted">Ditautkan {tanggal(t.dibuat_pada)}{t.terakhir_dipakai ? ` · terakhir dipakai ${tanggal(t.terakhir_dipakai)}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => putuskan(t.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-background">
                    <Unlink size={13} /> Lepas
                  </button>
                </li>
              ))}
            </ul>
          )}

          {kode ? (
            <div className="mt-4 rounded-lg border border-accent-primary/25 bg-accent-primary/10 p-4">
              <p className="text-sm text-text-primary">
                Kirim pesan berikut dari WhatsApp Anda{NOMOR_EIRA ? <> ke <span className="font-semibold tabular-nums">{tampilNomor(NOMOR_EIRA)}</span></> : ' ke nomor WhatsApp resmi Dentiva'}:
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-card px-3 py-1.5 font-mono text-lg font-semibold tracking-wider text-text-primary">{pesan}</span>
                <button type="button" onClick={salin} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10">
                  {tersalin ? <Check size={13} /> : <Copy size={13} />} {tersalin ? 'Tersalin' : 'Salin'}
                </button>
                {NOMOR_EIRA && (
                  <a href={`https://wa.me/${NOMOR_EIRA}?text=${encodeURIComponent(pesan)}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                    <MessageCircle size={13} /> Buka WhatsApp
                  </a>
                )}
              </div>
              <p className="mt-2 text-xs text-text-muted">Kode berlaku 10 menit dan hanya bisa dipakai sekali. Halaman ini otomatis diperbarui setelah nomor tertaut.</p>
            </div>
          ) : (
            <button type="button" onClick={buatKode} disabled={proses}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-background disabled:opacity-60">
              {proses && <Loader2 size={14} className="animate-spin" />} {tautan.length ? 'Tautkan nomor lain' : 'Buat kode tautan'}
            </button>
          )}
          <p className="mt-3 text-xs text-text-muted">Data pasien dan isi rekam medis tidak dikirim lewat WhatsApp. Ketik <b>PUTUSKAN</b> di WhatsApp untuk melepas nomor kapan saja.</p>
        </div>
      </div>
    </section>
  );
}

/** Bagian "Akun & keamanan" di halaman profil semua peran. */
export default function PengaturanAkun() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-text-primary">Akun & keamanan</h2>
      <GantiEmail />
      <KeamananAkun />
      <WhatsAppEira />
    </div>
  );
}
