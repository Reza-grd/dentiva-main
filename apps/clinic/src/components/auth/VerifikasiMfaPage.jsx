import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/** Langkah kedua masuk: kode 6 digit dari aplikasi authenticator (akun yang mengaktifkan verifikasi dua langkah). */
export default function VerifikasiMfaPage() {
  const { user, verifikasiMfa, signOut } = useAuth();
  const [kode, setKode] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');

  const kirim = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(kode)) { setGalat('Masukkan 6 digit kode dari aplikasi authenticator.'); return; }
    setProses(true);
    setGalat('');
    const r = await verifikasiMfa(kode);
    setProses(false);
    if (!r.success) { setGalat(r.error); setKode(''); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <section className="w-full max-w-sm rounded-2xl border border-border bg-card p-7" aria-labelledby="judul-mfa">
        <ShieldCheck size={28} className="text-accent-primary" />
        <h1 id="judul-mfa" className="mt-3 font-display text-[24px] font-medium leading-tight text-text-primary">Verifikasi dua langkah</h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Masukkan kode 6 digit dari aplikasi authenticator di HP Anda{user?.email ? <> untuk <span className="font-medium text-text-primary">{user.email}</span></> : null}.
        </p>
        <form onSubmit={kirim} className="mt-6 space-y-4" noValidate>
          <label htmlFor="kode-mfa" className="sr-only">Kode verifikasi</label>
          <input
            id="kode-mfa" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            value={kode} onChange={(e) => setKode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
            placeholder="••••••"
          />
          {galat && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{galat}</p>}
          <button type="submit" disabled={proses} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            {proses && <Loader2 size={16} className="animate-spin" />} Verifikasi
          </button>
        </form>
        <button type="button" onClick={signOut} className="mt-4 w-full text-center text-sm text-text-muted hover:text-text-primary">
          Batal dan keluar
        </button>
        <p className="mt-5 border-t border-border pt-4 text-xs text-text-muted">
          HP hilang atau ganti HP? Minta manajer klinik atau tim Dentiva mengatur ulang verifikasi dua langkah akun Anda.
        </p>
      </section>
    </div>
  );
}
