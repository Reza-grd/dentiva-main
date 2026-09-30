import React, { useEffect, useState } from 'react';
import { CalendarCheck, Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';
import { useToast } from '../common/ToastNotification';
import { PUBLIC_APP_URL, openExternal } from '../../utils/platform';

/** Aktifkan booking online & bagikan tautan publik /booking/<slug>. */
export default function BookingSettings() {
  const { userProfile } = useAuth();
  const { settings, updateSettings } = useClinicSettings();
  const toast = useToast();
  const [slug, setSlug] = useState(null);
  const [copied, setCopied] = useState(false);
  const enabled = settings?.online_booking_enabled === 'true';

  useEffect(() => {
    if (!userProfile?.clinic_id) return;
    supabase.from('clinics').select('slug').eq('id', userProfile.clinic_id).maybeSingle()
      .then(({ data }) => setSlug(data?.slug ?? null));
  }, [userProfile?.clinic_id]);

  const url = slug ? `${PUBLIC_APP_URL}/booking/${slug}` : '';

  const toggle = async () => {
    const res = await updateSettings({ online_booking_enabled: enabled ? 'false' : 'true' });
    if (res.success) toast.success(enabled ? 'Booking online dinonaktifkan.' : 'Booking online aktif.');
    else toast.error('Gagal menyimpan: ' + res.error);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-[var(--color-accent)]" /> Booking Online
        </CardTitle>
        <CardDescription>
          Pasien dapat meminta jadwal lewat tautan klinik Anda. Slot mengikuti Jadwal Dokter dan kuota harian; setiap
          permintaan dikonfirmasi resepsionis di menu Booking Online.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Terima booking online</p>
            <p className="text-xs text-gray-500">{enabled ? 'Aktif — halaman booking dapat diakses publik.' : 'Nonaktif — tautan menampilkan pesan "tidak tersedia".'}</p>
          </div>
          <Button variant={enabled ? 'outline' : 'primary'} onClick={toggle}>{enabled ? 'Nonaktifkan' : 'Aktifkan'}</Button>
        </div>
        {url && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tautan booking klinik</p>
            <code className="block break-all text-xs bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">{url}</code>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Tersalin' : 'Salin'}
              </Button>
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => openExternal(url)}>
                <ExternalLink size={14} /> Buka
              </Button>
            </div>
            <p className="text-xs text-gray-500">Pasang di bio Instagram, Google Maps, atau kirim lewat WhatsApp.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
