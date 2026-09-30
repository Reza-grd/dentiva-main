import React, { useRef, useState } from 'react';
import { QrCode, Upload, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';
import { useToast } from '../common/ToastNotification';
import { useQrisImage } from '../payment/QrisPanel';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/**
 * QRIS statis milik klinik untuk kasir. Gambar disimpan privat di
 * bucket `klinik/<clinic_id>/qris/` (policy storage membatasi ke klinik sendiri).
 */
export default function PaymentSettings() {
  const { userProfile } = useAuth();
  const { settings, updateSettings } = useClinicSettings();
  const { url, configured } = useQrisImage();
  const toast = useToast();
  const fileRef = useRef(null);
  const [merchant, setMerchant] = useState(settings?.qris_merchant_name || '');
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    const ext = TYPES[file.type];
    if (!ext) return toast.error('Format harus PNG, JPG, atau WebP.');
    if (file.size > MAX_BYTES) return toast.error('Ukuran maksimal 2 MB.');
    if (!userProfile?.clinic_id) return toast.error('Profil klinik belum termuat.');

    setBusy(true);
    const path = `${userProfile.clinic_id}/qris/qris-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('klinik').upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setBusy(false);
      return toast.error('Gagal mengunggah: ' + upErr.message);
    }
    const old = settings?.qris_image_path;
    const res = await updateSettings({ qris_image_path: path, qris_merchant_name: merchant.trim() });
    if (res.success && old && old !== path) {
      await supabase.storage.from('klinik').remove([old]);
    }
    setBusy(false);
    if (res.success) toast.success('QRIS klinik tersimpan.');
    else toast.error('Gagal menyimpan pengaturan: ' + res.error);
  };

  const saveMerchant = async () => {
    const res = await updateSettings({ qris_merchant_name: merchant.trim() });
    if (res.success) toast.success('Nama merchant disimpan.');
  };

  const remove = async () => {
    if (!window.confirm('Hapus QRIS klinik? Metode QRIS di kasir tidak akan menampilkan kode QR lagi.')) return;
    setBusy(true);
    const old = settings?.qris_image_path;
    const res = await updateSettings({ qris_image_path: '' });
    if (res.success && old) await supabase.storage.from('klinik').remove([old]);
    setBusy(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <QrCode className="w-5 h-5 text-[var(--color-accent)]" />
          Pembayaran &amp; QRIS
        </CardTitle>
        <CardDescription>
          Unggah kode QRIS dari bank atau e-wallet klinik Anda. Kode ini ditampilkan ke pasien di kasir saat metode
          QRIS dipilih; dana langsung masuk ke rekening klinik.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Nama merchant (sesuai QRIS)
          </label>
          <div className="flex gap-2">
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="mis. KLINIK GIGI SEHAT" maxLength={80} />
            <Button variant="outline" onClick={saveMerchant} disabled={busy}>Simpan</Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="w-48 h-48 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-white overflow-hidden">
            {configured && url ? (
              <img src={url} alt="QRIS klinik" className="w-full h-full object-contain p-2" />
            ) : (
              <span className="text-xs text-gray-400 text-center px-3">Belum ada QRIS</span>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <Button onClick={() => fileRef.current?.click()} isLoading={busy} disabled={busy} className="gap-2">
              <Upload size={16} /> {configured ? 'Ganti gambar QRIS' : 'Unggah gambar QRIS'}
            </Button>
            {configured && (
              <Button variant="ghost" onClick={remove} disabled={busy} className="gap-2 text-red-600">
                <Trash2 size={16} /> Hapus
              </Button>
            )}
            <p className="text-xs text-gray-500 max-w-sm">
              PNG/JPG/WebP, maks. 2 MB. Pastikan kode QR terbaca jelas (crop tanpa bingkai berlebih).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
