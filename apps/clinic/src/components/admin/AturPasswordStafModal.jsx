import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';

/** Aturan sama dengan server (admin-atur-password-staf): ≥ 8 karakter, huruf + angka. */
export function cekPasswordStaf(pw) {
  if (pw.length < 8) return 'Password minimal 8 karakter.';
  if (pw.length > 72) return 'Password maksimal 72 karakter.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password harus memuat huruf dan angka.';
  return null;
}

/**
 * Manajer klinik menetapkan password baru untuk staf. Staf langsung keluar dari semua perangkat
 * dan masuk ulang dengan password baru. Props: staf {id, full_name, email}, onSubmit(password) → {success, error}, onClose.
 */
export default function AturPasswordStafModal({ staf, onSubmit, onClose }) {
  const [pw, setPw] = useState('');
  const [ulang, setUlang] = useState('');
  const [lihat, setLihat] = useState(false);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !proses && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, proses]);

  const kirim = async (e) => {
    e.preventDefault();
    const salah = cekPasswordStaf(pw) || (pw !== ulang ? 'Konfirmasi password tidak sama.' : null);
    if (salah) { setGalat(salah); return; }
    setGalat('');
    setProses(true);
    const r = await onSubmit(pw);
    setProses(false);
    if (!r?.success) setGalat(r?.error || 'Password gagal diatur.');
  };

  const masukan = 'w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onClick={() => !proses && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="judul-atur-pw" onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex gap-3">
            <KeyRound size={18} className="mt-0.5 text-text-muted" />
            <div>
              <h2 id="judul-atur-pw" className="text-base font-semibold text-text-primary">Atur ulang password</h2>
              <p className="text-sm text-text-muted">{staf.full_name} · {staf.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={proses} aria-label="Tutup" className="rounded-lg p-1 text-text-muted hover:bg-background"><X size={18} /></button>
        </header>
        <form onSubmit={kirim} className="space-y-4 p-5" noValidate>
          <div>
            <label htmlFor="pw-baru-staf" className="mb-1.5 block text-xs font-medium text-text-muted">Password baru</label>
            <div className="relative">
              <input id="pw-baru-staf" type={lihat ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={masukan} autoFocus />
              <button type="button" onClick={() => setLihat((v) => !v)} aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted">
                {lihat ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="pw-ulang-staf" className="mb-1.5 block text-xs font-medium text-text-muted">Ulangi password baru</label>
            <input id="pw-ulang-staf" type={lihat ? 'text' : 'password'} autoComplete="new-password" value={ulang} onChange={(e) => setUlang(e.target.value)} className={masukan} />
          </div>
          {galat && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{galat}</p>}
          <p className="text-xs text-text-muted">Minimal 8 karakter, berisi huruf dan angka. Staf akan keluar dari semua perangkat dan masuk lagi dengan password ini. Sampaikan password secara langsung, lalu sarankan staf menggantinya.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={proses} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-background">Batal</button>
            <button type="submit" disabled={proses} className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
              {proses && <Loader2 size={15} className="animate-spin" />} Simpan password
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
