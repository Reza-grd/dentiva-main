import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, X, Sparkles } from 'lucide-react';
import './desktop-updater.css';

// ─────────────────────────────────────────────
//  Pembaruan otomatis aplikasi desktop (Tauri updater).
//  Cek latest.json bertanda tangan (repo rilis publik) saat aplikasi dibuka lalu
//  tiap 6 jam. Bila ada versi baru, tampil kartu kecil di pojok kanan bawah;
//  pengguna memilih kapan memasang (agar pekerjaan yang belum disimpan aman).
//  Hanya dimuat di desktop (lihat App.jsx) — di web tidak ada efek apa pun.
// ─────────────────────────────────────────────

const FIRST_CHECK_MS = 8000;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

export default function DesktopUpdater() {
  const [update, setUpdate] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | available | downloading | restarting | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const dismissed = useRef(null);
  const busy = useRef(false);

  const runCheck = useCallback(async () => {
    if (busy.current) return;
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const found = await check();
      if (found && found.version !== dismissed.current) {
        setUpdate(found);
        setPhase('available');
      }
    } catch (err) {
      // Offline / server rilis tidak terjangkau: diam saja, coba lagi di jadwal berikutnya.
      console.warn('Cek pembaruan gagal:', err);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(runCheck, FIRST_CHECK_MS);
    const every = setInterval(runCheck, CHECK_EVERY_MS);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [runCheck]);

  const install = async () => {
    if (!update || busy.current) return;
    busy.current = true;
    setPhase('downloading');
    setProgress(0);
    let total = 0;
    let received = 0;
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') total = event.data.contentLength || 0;
        if (event.event === 'Progress') {
          received += event.data.chunkLength;
          if (total) setProgress(Math.min(100, Math.round((received / total) * 100)));
        }
        if (event.event === 'Finished') setProgress(100);
      });
      setPhase('restarting');
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      console.error('Pembaruan gagal:', err);
      setError('Pembaruan gagal dipasang. Periksa koneksi internet lalu coba lagi.');
      setPhase('error');
    } finally {
      busy.current = false;
    }
  };

  const later = () => {
    dismissed.current = update?.version || null;
    setPhase('idle');
  };

  if (phase === 'idle' || !update) return null;

  return (
    <div className="dt-update" role="status" aria-live="polite">
      <div className="dt-update__icon" aria-hidden="true"><Sparkles size={18} strokeWidth={1.6} /></div>
      <div className="dt-update__body">
        <p className="dt-update__title">Dentiva {update.version} tersedia</p>
        {phase === 'available' && (
          <p className="dt-update__text">Simpan pekerjaan Anda dulu — aplikasi akan dimulai ulang setelah pembaruan.</p>
        )}
        {phase === 'downloading' && (
          <>
            <p className="dt-update__text">Mengunduh pembaruan… {progress ? `${progress}%` : ''}</p>
            <div className="dt-update__bar"><span style={{ width: `${progress}%` }} /></div>
          </>
        )}
        {phase === 'restarting' && <p className="dt-update__text">Memasang & memulai ulang Dentiva…</p>}
        {phase === 'error' && <p className="dt-update__text dt-update__text--error">{error}</p>}

        {(phase === 'available' || phase === 'error') && (
          <div className="dt-update__actions">
            <button type="button" className="dt-update__btn dt-update__btn--primary" onClick={install}>
              {phase === 'error' ? <RefreshCw size={15} /> : <Download size={15} />}
              {phase === 'error' ? 'Coba lagi' : 'Perbarui sekarang'}
            </button>
            <button type="button" className="dt-update__btn" onClick={later}>Nanti</button>
          </div>
        )}
      </div>
      {(phase === 'available' || phase === 'error') && (
        <button type="button" className="dt-update__close" onClick={later} aria-label="Tutup"><X size={15} /></button>
      )}
    </div>
  );
}
