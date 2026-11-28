import React, { useEffect, useState } from 'react';
import { Button } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { useToast } from '../common/ToastNotification';

const POLA = /^[A-Z]{3,5}$/;

/** Baris identitas contoh — sama dengan supabase/functions/_shared/tandaPesan.ts. */
export const contohIdentitas = (kode) => `${kode || 'KODE'} · RM-000123 · Budi S.`;

/** Pengaturan WhatsApp → kode klinik untuk identitas setiap pesan ke pasien (manajer klinik). */
export default function KodeKlinikWa() {
  const toast = useToast();
  const [tersimpan, setTersimpan] = useState('');
  const [kode, setKode] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);

  useEffect(() => {
    let batal = false;
    supabase.rpc('kode_klinik_saya').then(({ data, error }) => {
      if (batal) return;
      setMemuat(false);
      if (!error && data) { setTersimpan(data); setKode(data); }
    });
    return () => { batal = true; };
  }, []);

  const valid = POLA.test(kode);
  const simpan = async () => {
    if (!valid) return toast.error('Kode klinik harus 3–5 huruf (A–Z).');
    setMenyimpan(true);
    const { data, error } = await supabase.rpc('kode_klinik_ubah', { p_kode: kode });
    setMenyimpan(false);
    if (error) return toast.error(error.message);
    setTersimpan(data); setKode(data);
    toast.success(`Kode klinik diubah menjadi ${data}.`);
  };

  return (
    <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Kode klinik di pesan WhatsApp</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Nomor WhatsApp Dentiva dipakai bersama banyak klinik. Setiap pesan ke pasien diawali kode klinik, No. RM, dan nama singkat
          pasien, sehingga pasien selalu tahu pesan berasal dari klinik mana dan untuk siapa.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="kode-klinik-wa" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Kode (3–5 huruf)</label>
          <input id="kode-klinik-wa" value={kode} maxLength={5} disabled={memuat || menyimpan} autoComplete="off" spellCheck={false}
            onChange={(e) => setKode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            className="w-28 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold tracking-widest text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
        </div>
        <Button size="sm" onClick={simpan} disabled={memuat || menyimpan || !valid || kode === tersimpan}>
          {menyimpan ? 'Menyimpan…' : 'Simpan kode'}
        </Button>
        {kode && !valid && <span className="text-xs text-red-600">Minimal 3 huruf.</span>}
      </div>
      <div className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100">
        <p className="text-[11px] text-gray-500 mb-1">Contoh awal pesan</p>
        <p className="font-medium">{contohIdentitas(kode)}</p>
        <p className="text-gray-500 mt-1">Yth. Budi Santoso, kami mengingatkan jadwal kunjungan Anda …</p>
      </div>
    </div>
  );
}
