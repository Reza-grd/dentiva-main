import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ChevronRight, Rocket, X } from 'lucide-react';
import { Card, CardContent } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { clinicSettingsService } from '../../services/clinicSettingsService';

// Urutan = urutan yang disarankan untuk klinik baru. `optional` tidak menghalangi "selesai".
const STEPS = [
  { key: 'profile', title: 'Lengkapi profil klinik', desc: 'Alamat & telepon tampil di kwitansi, resep, dan pesan WhatsApp.', to: '/admin/pengaturan?tab=profile' },
  { key: 'treatments', title: 'Isi tarif tindakan', desc: 'Daftar perawatan & harga dipakai saat kasir membuat tagihan.', to: '/admin/treatments' },
  { key: 'doctors', title: 'Undang dokter', desc: 'Setiap dokter login dengan akunnya sendiri untuk mengisi rekam medis.', to: '/admin/pengguna' },
  { key: 'schedules', title: 'Atur jadwal praktik dokter', desc: 'Jadwal dipakai resepsionis saat membuat janji temu.', to: '/admin/jadwal-dokter' },
  { key: 'staff', title: 'Undang resepsionis', desc: 'Pendaftaran pasien & pembayaran bisa ditangani staf depan.', to: '/admin/pengguna', optional: true },
  { key: 'satusehat', title: 'Hubungkan SATUSEHAT', desc: 'Wajib bagi fasyankes: isi kredensial & sinkronkan organisasi.', to: '/admin/pengaturan?tab=satusehat', optional: true },
];

/**
 * Panduan langkah awal untuk klinik baru. Status dihitung server
 * (get_onboarding_status, dibatasi RLS ke klinik sendiri). Hilang otomatis bila
 * semua langkah wajib selesai, atau bila admin menyembunyikannya.
 */
const OnboardingChecklist = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('get_onboarding_status').then(({ data, error }) => {
      if (!cancelled && !error) setStatus(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || status.dismissed) return null;

  const required = STEPS.filter((s) => !s.optional);
  const doneRequired = required.filter((s) => status[s.key]).length;
  if (doneRequired === required.length) return null;

  const doneAll = STEPS.filter((s) => status[s.key]).length;
  const pct = Math.round((doneAll / STEPS.length) * 100);

  const dismiss = async () => {
    setStatus((s) => ({ ...s, dismissed: true }));
    await clinicSettingsService.updateSetting('onboarding_dismissed', 'true');
  };

  return (
    <Card className="border-accent-primary/30">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center flex-shrink-0">
              <Rocket className="text-accent-primary" size={20} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Siapkan klinik Anda</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {doneAll} dari {STEPS.length} langkah selesai — lengkapi agar klinik siap menerima pasien.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Sembunyikan panduan"
            title="Sembunyikan panduan"
          >
            <X size={16} />
          </button>
        </div>

        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mb-4 overflow-hidden" aria-hidden="true">
          <div className="h-full bg-accent-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {STEPS.map((s) => {
            const done = Boolean(status[s.key]);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => navigate(s.to)}
                  className="w-full flex items-center gap-3 py-3 text-left bg-transparent border-0 group"
                >
                  {done ? (
                    <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} aria-label="Selesai" />
                  ) : (
                    <Circle className="text-gray-300 dark:text-gray-600 flex-shrink-0" size={20} aria-label="Belum" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {s.title}
                      {s.optional && <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-gray-400">opsional</span>}
                    </span>
                    {!done && <span className="block text-xs text-gray-500 dark:text-gray-400">{s.desc}</span>}
                  </span>
                  {!done && <ChevronRight className="text-gray-300 group-hover:text-accent-primary flex-shrink-0" size={18} />}
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default OnboardingChecklist;
