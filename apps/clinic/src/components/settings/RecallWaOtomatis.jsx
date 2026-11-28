import React, { useEffect, useState } from 'react';
import { clinicSettingsService } from '../../services/clinicSettingsService';
import { useToast } from '../common/ToastNotification';

export const KUNCI_RECALL_WA = 'wa_recall_otomatis';

/** Contoh pesan recall otomatis — sama dengan supabase/functions/_shared/recallWa.ts. */
export const CONTOH_PESAN_RECALL = [
  'Yth. Budi Santoso,',
  'sesuai rencana perawatan di klinik kami, Anda dijadwalkan kontrol sekitar Sabtu, 5 Desember 2026 untuk lanjutan perawatan saluran akar.',
  '',
  'Apakah Anda bisa datang? Mohon balas dengan angka:',
  '1 - Bisa datang',
  '2 - Ganti jadwal',
  '3 - Tidak perlu',
];

/** Pengaturan → SOP Recall: sakelar pesan recall WhatsApp otomatis (manajer klinik). Bawaan mati. */
export default function RecallWaOtomatis() {
  const toast = useToast();
  const [aktif, setAktif] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    let batal = false;
    clinicSettingsService.getSettings().then((res) => {
      if (batal) return;
      setMemuat(false);
      if (res.success) setAktif(res.data?.[KUNCI_RECALL_WA] === 'true');
    });
    return () => { batal = true; };
  }, []);

  const ubah = async () => {
    const baru = !aktif;
    setMenyimpan(true);
    const res = await clinicSettingsService.updateSetting(KUNCI_RECALL_WA, baru ? 'true' : 'false');
    setMenyimpan(false);
    if (!res.success) return toast.error('Gagal menyimpan: ' + res.error);
    setAktif(baru);
    toast.success(baru ? 'Pesan recall otomatis diaktifkan.' : 'Pesan recall otomatis dimatikan.');
  };

  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Pesan recall otomatis lewat WhatsApp</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
            Tujuh hari sebelum tanggal kontrol, pasien yang menyetujui pesan WhatsApp menerima pesan recall dan cukup membalas
            angka. Jawaban tercatat di halaman Recall: <b>Bisa datang</b> dan <b>Ganti jadwal</b> muncul sebagai pemberitahuan
            untuk resepsionis agar jam kunjungan ditetapkan. Recall WAJIB yang dijawab <b>Tidak perlu</b> tidak ditutup,
            melainkan diteruskan ke resepsionis dan dokter. Bila belum dijawab, pesan diulang sekali setelah dua hari.
            Pesan dikirim pukul 09.00–16.00 WIB, Senin–Sabtu.
          </p>
        </div>
        <button type="button" role="switch" aria-checked={aktif} aria-label="Pesan recall otomatis lewat WhatsApp"
          onClick={ubah} disabled={memuat || menyimpan}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${aktif ? 'bg-[var(--color-accent)]' : 'bg-gray-300 dark:bg-gray-600'}`}>
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${aktif ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
        <p className="text-[11px] text-gray-500 mb-1">Contoh pesan</p>
        <p className="font-medium">KODE · RM-000123 · Budi S.</p>
        <p className="whitespace-pre-line mt-1">{CONTOH_PESAN_RECALL.join('\n')}</p>
      </div>
    </div>
  );
}
