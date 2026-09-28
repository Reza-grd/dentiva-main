import React, { useState } from 'react';
import { Lock, RefreshCw, LogOut } from 'lucide-react';
import { Button, Card, CardContent } from '@dentiva/ui';
import { useAuth } from '../../contexts/AuthContext';

const COPY = {
  suspended: {
    title: 'Klinik sedang ditangguhkan',
    body: 'Akses ke data klinik dihentikan sementara oleh tim Dentiva. Data Anda tetap aman dan tidak dihapus.',
  },
  closed: {
    title: 'Klinik sudah ditutup',
    body: 'Layanan Dentiva untuk klinik ini telah berakhir. Data rekam medis tetap disimpan sesuai ketentuan retensi.',
  },
  pending: {
    title: 'Klinik menunggu aktivasi',
    body: 'Pendaftaran klinik Anda sedang diproses oleh tim Dentiva.',
  },
};

/**
 * Ditampilkan saat klinik user tidak berstatus trial/active.
 * RLS sudah memutus akses data di database; halaman ini menjelaskan alasannya.
 */
const ClinicUnavailable = () => {
  const { accountStatus, refreshAccountStatus, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  const copy = COPY[accountStatus?.clinic_status] ?? COPY.suspended;

  const recheck = async () => {
    setChecking(true);
    try {
      await refreshAccountStatus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B0F17] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="text-amber-600 dark:text-amber-400" size={30} aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{copy.title}</h1>
          {accountStatus?.clinic_name && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{accountStatus.clinic_name}</p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{copy.body}</p>
          {accountStatus?.suspended_reason && (
            <div className="w-full text-left bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800 mb-4">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Keterangan</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{accountStatus.suspended_reason}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Hubungi tim Dentiva untuk bantuan:{' '}
            <a href="mailto:support@dentiva.co.id" className="underline">support@dentiva.co.id</a>
          </p>
          <div className="flex gap-3 w-full">
            <Button onClick={recheck} variant="outline" className="flex-1 gap-2" isLoading={checking}>
              <RefreshCw size={16} aria-hidden="true" /> Periksa lagi
            </Button>
            <Button onClick={signOut} variant="primary" className="flex-1 gap-2">
              <LogOut size={16} aria-hidden="true" /> Keluar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClinicUnavailable;
