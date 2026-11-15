import React, { useCallback, useEffect, useState } from 'react';
import { Laptop, Loader2, LogOut, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useToast } from '../common/ToastNotification';

const kotak = 'rounded-xl border border-border bg-card';
const waktu = (v) => (v ? new Date(v).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
const namaPerangkat = (ua = '') => {
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /Tauri|tauri/.test(ua) ? 'Aplikasi desktop' : '';
  return [br, os].filter(Boolean).join(' · ') || 'Perangkat tidak dikenal';
};

/** Verifikasi dua langkah (TOTP) — pasang dengan QR, lepas bila perlu. */
function VerifikasiDuaLangkah() {
  const toast = useToast();
  const [faktor, setFaktor] = useState(null); // faktor TOTP terverifikasi
  const [daftar, setDaftar] = useState({ memuat: true });
  const [daftarBaru, setDaftarBaru] = useState(null); // { id, qr, secret }
  const [kode, setKode] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');

  const muat = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFaktor(data?.totp?.find((f) => f.status === 'verified') || null);
    setDaftar({ memuat: false });
  }, []);
  useEffect(() => { muat(); }, [muat]);

  const mulai = async () => {
    setProses(true); setGalat('');
    // Bersihkan pendaftaran yang belum selesai sebelumnya.
    const { data: lama } = await supabase.auth.mfa.listFactors();
    for (const f of (lama?.all || []).filter((x) => x.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Dentiva ${new Date().toISOString().slice(0, 10)}` });
    setProses(false);
    if (error) { setGalat(error.message); return; }
    setDaftarBaru({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const konfirmasi = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(kode)) { setGalat('Masukkan 6 digit kode dari aplikasi authenticator.'); return; }
    setProses(true); setGalat('');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: daftarBaru.id, code: kode });
    setProses(false);
    if (error) { setGalat('Kode salah. Pastikan jam HP tepat, lalu masukkan kode terbaru.'); setKode(''); return; }
    setDaftarBaru(null); setKode('');
    toast.success('Verifikasi dua langkah aktif. Mulai sekarang, masuk memerlukan kode dari HP Anda.');
    muat();
  };

  const lepas = async () => {
    if (!faktor || !window.confirm('Matikan verifikasi dua langkah? Akun hanya dilindungi password setelah ini.')) return;
    setProses(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: faktor.id });
    setProses(false);
    if (error) { toast.error(error.message); return; }
    await supabase.auth.refreshSession().catch(() => {});
    toast.success('Verifikasi dua langkah dimatikan.');
    muat();
  };

  return (
    <section className={kotak} aria-labelledby="judul-mfa-profil">
      <div className="flex gap-3 p-5">
        {faktor ? <ShieldCheck size={18} className="mt-0.5 text-emerald-700 dark:text-emerald-400" /> : <ShieldOff size={18} className="mt-0.5 text-text-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="judul-mfa-profil" className="text-base font-semibold text-text-primary">Verifikasi dua langkah</h3>
            {!daftar.memuat && (
              <span className={`text-xs font-medium ${faktor ? 'text-emerald-700 dark:text-emerald-400' : 'text-text-muted'}`}>{faktor ? 'Aktif' : 'Belum aktif'}</span>
            )}
          </div>
          <p className="text-sm text-text-muted">
            Selain password, masuk memerlukan kode 6 digit dari aplikasi di HP (Google Authenticator, Microsoft Authenticator, dll.).
            Bila password bocor, data klinik tetap tidak bisa dibuka tanpa HP Anda.
          </p>

          {daftarBaru ? (
            <form onSubmit={konfirmasi} className="mt-4 space-y-3 rounded-lg border border-border p-4" noValidate>
              <p className="text-sm text-text-primary">1. Pindai kode QR ini dengan aplikasi authenticator.</p>
              <img src={daftarBaru.qr} alt="Kode QR verifikasi dua langkah" className="h-44 w-44 rounded-md bg-white p-2" />
              <p className="text-xs text-text-muted">Tidak bisa memindai? Masukkan kunci ini secara manual: <code className="break-all font-mono text-text-primary">{daftarBaru.secret}</code></p>
              <label htmlFor="kode-daftar-mfa" className="block text-sm text-text-primary">2. Masukkan kode 6 digit yang muncul:</label>
              <div className="flex gap-2">
                <input id="kode-daftar-mfa" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={kode}
                  onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-36 rounded-lg border border-border bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.3em] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30" />
                <button type="submit" disabled={proses} className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                  {proses && <Loader2 size={15} className="animate-spin" />} Aktifkan
                </button>
                <button type="button" onClick={() => { setDaftarBaru(null); setGalat(''); }} className="rounded-lg border border-border px-3 py-2 text-sm text-text-primary hover:bg-background">Batal</button>
              </div>
            </form>
          ) : !daftar.memuat && (
            <button type="button" onClick={faktor ? lepas : mulai} disabled={proses}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-background disabled:opacity-60">
              {proses && <Loader2 size={14} className="animate-spin" />} {faktor ? 'Matikan verifikasi dua langkah' : 'Aktifkan verifikasi dua langkah'}
            </button>
          )}
          {galat && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-400">{galat}</p>}
        </div>
      </div>
    </section>
  );
}

/** Perangkat yang sedang masuk ke akun ini + keluar dari perangkat lain. */
function PerangkatMasuk() {
  const toast = useToast();
  const [sesi, setSesi] = useState({ memuat: true, data: [] });
  const [proses, setProses] = useState(false);
  const muat = useCallback(async () => {
    const { data, error } = await supabase.rpc('sesi_saya');
    setSesi({ memuat: false, data: error ? [] : data || [], galat: error?.message });
  }, []);
  useEffect(() => { muat(); }, [muat]);

  const keluarLain = async () => {
    if (!window.confirm('Keluarkan akun ini dari semua perangkat lain?')) return;
    setProses(true);
    const { data, error } = await supabase.rpc('keluar_perangkat_lain');
    setProses(false);
    if (error) { toast.error(error.message); return; }
    toast.success(data ? `${data} perangkat lain sudah dikeluarkan.` : 'Tidak ada perangkat lain yang masuk.');
    muat();
  };
  const lain = sesi.data.filter((s) => !s.sesi_ini).length;

  return (
    <section className={kotak} aria-labelledby="judul-perangkat">
      <div className="flex gap-3 p-5">
        <Laptop size={18} className="mt-0.5 text-text-muted" />
        <div className="min-w-0 flex-1">
          <h3 id="judul-perangkat" className="text-base font-semibold text-text-primary">Perangkat yang sedang masuk</h3>
          <p className="text-sm text-text-muted">Periksa bila ada perangkat yang tidak Anda kenali, lalu keluarkan.</p>
          {sesi.memuat ? (
            <p className="mt-3 text-sm text-text-muted">Memuat…</p>
          ) : sesi.data.length > 0 && (
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {sesi.data.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  {/Android|iPhone|iPad/i.test(s.perangkat || '') ? <Smartphone size={16} className="text-text-muted" /> : <Laptop size={16} className="text-text-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-primary">
                      {namaPerangkat(s.perangkat)}{s.sesi_ini && <span className="ml-2 text-xs font-medium text-accent-primary">Perangkat ini</span>}
                    </p>
                    <p className="text-xs text-text-muted tabular-nums">Aktif {waktu(s.terakhir_aktif)}{s.ip_tersamar ? ` · IP ${s.ip_tersamar}` : ''}{s.aal === 'aal2' ? ' · terverifikasi 2 langkah' : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!sesi.memuat && lain > 0 && (
            <button type="button" onClick={keluarLain} disabled={proses}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary hover:bg-background disabled:opacity-60">
              {proses ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Keluar dari {lain} perangkat lain
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default function KeamananAkun() {
  return (
    <>
      <VerifikasiDuaLangkah />
      <PerangkatMasuk />
    </>
  );
}
