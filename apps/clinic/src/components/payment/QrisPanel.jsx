import React, { useEffect, useState } from 'react';
import { QrCode, AlertTriangle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

/** URL sementara (1 jam) untuk gambar QRIS klinik di bucket privat `klinik`. */
export function useQrisImage() {
  const { settings } = useClinicSettings();
  const path = settings?.qris_image_path;
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return undefined;
    }
    supabase.storage
      .from('klinik')
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { url, configured: Boolean(path), merchant: settings?.qris_merchant_name || settings?.clinic_name };
}

/** Ditampilkan di kasir saat metode QRIS dipilih: kode QR klinik + nominal yang harus dibayar. */
export default function QrisPanel({ amount }) {
  const { url, configured, merchant } = useQrisImage();

  if (!configured) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 text-sm">
        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
        <p className="text-amber-800 dark:text-amber-300">
          QRIS klinik belum diatur. Admin dapat mengunggah kode QRIS di <strong>Pengaturan → Pembayaran &amp; QRIS</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center justify-center gap-1.5">
        <QrCode size={14} /> Scan QRIS untuk membayar
      </p>
      {merchant && <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{merchant}</p>}
      <div className="my-4 flex justify-center">
        {url ? (
          <img src={url} alt="Kode QRIS klinik" className="w-56 h-56 object-contain rounded-lg bg-white p-2" />
        ) : (
          <div className="w-56 h-56 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
        )}
      </div>
      <p className="text-xs text-gray-500">Nominal yang harus dibayar</p>
      <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{formatRupiah(amount)}</p>
      <p className="text-[11px] text-gray-500 mt-3">
        Simpan pembayaran hanya setelah notifikasi dana masuk muncul di aplikasi bank/e-wallet klinik.
      </p>
    </div>
  );
}
