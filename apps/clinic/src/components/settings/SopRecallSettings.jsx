import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, Sparkles, Save, RotateCcw } from 'lucide-react';
import { Button } from '@dentiva/ui';
import { supabase } from '../../services/supabase';
import { recallService } from '../../services/recallService';
import { useToast } from '../common/ToastNotification';
import { BATAS_HARI, teksJarak } from '../../utils/recallSop';
import RecallWaOtomatis from './RecallWaOtomatis';

const inputCls = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-50';

const kosong = { perlu: false, interval_hari: '', wajib: false, tujuan: '' };
const dariSop = (s) => (s ? { perlu: s.perlu, interval_hari: s.interval_hari ?? '', wajib: s.wajib, tujuan: s.tujuan || '' } : null);
const sama = (a, b) => a.perlu === b.perlu && String(a.interval_hari ?? '') === String(b.interval_hari ?? '')
  && a.wajib === b.wajib && (a.tujuan || '') === (b.tujuan || '');

/** Pengaturan → SOP Recall (manajer klinik): aturan recall per perawatan. */
export default function SopRecallSettings() {
  const toast = useToast();
  const [perawatan, setPerawatan] = useState([]);
  const [sop, setSop] = useState({});        // treatment_id → baris tersimpan
  const [ubahan, setUbahan] = useState({});  // treatment_id → isian belum disimpan
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [cari, setCari] = useState('');
  const [menyimpan, setMenyimpan] = useState(null);
  const [mengisi, setMengisi] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    const [t, s] = await Promise.all([
      supabase.from('treatments').select('id, kode_treatment, nama_treatment, kategori').eq('is_active', true).order('nama_treatment'),
      recallService.sopList(),
    ]);
    setMemuat(false);
    if (t.error || !s.success) { setGalat(t.error?.message || s.error); return; }
    setGalat('');
    setPerawatan(t.data || []);
    setSop(Object.fromEntries(s.data.map((r) => [r.treatment_id, r])));
    setUbahan({});
  }, []);
  useEffect(() => { muat(); }, [muat]);

  const nilai = (id) => ubahan[id] ?? dariSop(sop[id]) ?? kosong;
  const ubah = (id, patch) => setUbahan((u) => {
    const baru = { ...(u[id] ?? dariSop(sop[id]) ?? kosong), ...patch };
    if (patch.perlu === false) { baru.wajib = false; }
    if (patch.perlu === true && !baru.interval_hari) baru.interval_hari = 180;
    const asal = dariSop(sop[id]) ?? kosong;
    const { [id]: _, ...sisa } = u;
    return sama(baru, asal) ? sisa : { ...sisa, [id]: baru };
  });

  const simpan = async (t) => {
    const v = nilai(t.id);
    const n = Number(v.interval_hari);
    if (v.perlu && (!Number.isInteger(n) || n < BATAS_HARI.min || n > BATAS_HARI.max)) {
      return toast.error(`${t.nama_treatment}: jarak recall harus ${BATAS_HARI.min}–${BATAS_HARI.max} hari.`);
    }
    setMenyimpan(t.id);
    const res = await recallService.sopSimpan({ treatment_id: t.id, ...v });
    setMenyimpan(null);
    if (!res.success) return toast.error('Gagal menyimpan: ' + res.error);
    setSop((s) => ({ ...s, [t.id]: res.data }));
    setUbahan(({ [t.id]: _, ...sisa }) => sisa);
    toast.success(`SOP ${t.nama_treatment} disimpan.`);
  };

  const isiOtomatis = async () => {
    setMengisi(true);
    const res = await recallService.sopIsiDefault();
    setMengisi(false);
    if (!res.success) return toast.error('Gagal: ' + res.error);
    toast.success(res.data > 0 ? `${res.data} perawatan diisi SOP bawaan. Silakan tinjau.` : 'Semua perawatan yang dikenali sudah punya SOP.');
    muat();
  };

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return perawatan.filter((t) => !q || `${t.nama_treatment} ${t.kode_treatment} ${t.kategori || ''}`.toLowerCase().includes(q));
  }, [perawatan, cari]);
  const tanpaSop = perawatan.filter((t) => !sop[t.id]).length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SOP Recall</h3>
        <p className="text-sm text-gray-500 mt-1">
          Atur perawatan mana yang perlu kontrol ulang dan berapa hari setelahnya. Dokter melihatnya sebagai usulan di rekam medis
          dan tetap bisa mengubahnya per pasien. Angka bawaan hanyalah titik awal — tinjau bersama dokter penanggung jawab.
        </p>
      </div>

      <RecallWaOtomatis />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input aria-label="Cari perawatan" placeholder="Cari perawatan" value={cari} onChange={(e) => setCari(e.target.value)} className={`${inputCls} w-full pl-9 py-2`} />
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={isiOtomatis} disabled={mengisi}>
          <Sparkles size={14} /> {mengisi ? 'Mengisi…' : `Isi SOP bawaan${tanpaSop ? ` (${tanpaSop} belum diatur)` : ''}`}
        </Button>
      </div>

      {memuat ? <p className="text-sm text-gray-500">Memuat…</p>
        : galat ? <p className="text-sm text-red-600">Gagal memuat: {galat}</p>
        : tampil.length === 0 ? <p className="text-sm text-gray-500">Tidak ada perawatan aktif{cari ? ' yang cocok' : ''}.</p>
        : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-xs text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2.5">Perawatan</th>
                  <th className="text-left px-3 py-2.5">Perlu recall</th>
                  <th className="text-left px-3 py-2.5">Setelah (hari)</th>
                  <th className="text-left px-3 py-2.5">Wajib</th>
                  <th className="text-left px-3 py-2.5">Tujuan kontrol</th>
                  <th className="px-3 py-2.5"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tampil.map((t) => {
                  const v = nilai(t.id);
                  const kotor = !!ubahan[t.id];
                  const id = `sop-${t.id}`;
                  return (
                    <tr key={t.id} className={kotor ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-gray-900 dark:text-white">{t.nama_treatment}</div>
                        <div className="text-xs text-gray-500">{t.kode_treatment}{t.kategori ? ` · ${t.kategori}` : ''}{!sop[t.id] && !kotor ? ' · belum diatur' : ''}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <input id={`${id}-perlu`} type="checkbox" aria-label={`Perlu recall: ${t.nama_treatment}`} checked={v.perlu} onChange={(e) => ubah(t.id, { perlu: e.target.checked })} />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="number" min={BATAS_HARI.min} max={BATAS_HARI.max} aria-label={`Jarak recall (hari): ${t.nama_treatment}`} disabled={!v.perlu}
                          value={v.perlu ? v.interval_hari : ''} onChange={(e) => ubah(t.id, { interval_hari: e.target.value === '' ? '' : Number(e.target.value) })} className={`${inputCls} w-24`} />
                        {v.perlu && v.interval_hari ? <div className="text-[11px] text-gray-500 mt-0.5">{teksJarak(v.interval_hari)}</div> : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <label className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300">
                          <input type="checkbox" disabled={!v.perlu} checked={v.wajib} onChange={(e) => ubah(t.id, { wajib: e.target.checked })} aria-label={`Recall wajib: ${t.nama_treatment}`} />
                          {v.wajib && <><AlertTriangle size={12} /> Wajib</>}
                        </label>
                      </td>
                      <td className="px-3 py-2.5">
                        <input maxLength={200} disabled={!v.perlu} aria-label={`Tujuan kontrol: ${t.nama_treatment}`} placeholder="mis. Kontrol pasca bedah"
                          value={v.perlu ? v.tujuan : ''} onChange={(e) => ubah(t.id, { tujuan: e.target.value })} className={`${inputCls} w-full min-w-[180px]`} />
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {kotor && (
                          <span className="inline-flex gap-1">
                            <Button size="sm" className="gap-1" onClick={() => simpan(t)} disabled={menyimpan === t.id}><Save size={13} /> Simpan</Button>
                            <Button size="sm" variant="ghost" aria-label="Batalkan" onClick={() => setUbahan(({ [t.id]: _, ...s }) => s)}><RotateCcw size={13} /></Button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      <p className="text-xs text-gray-500">
        Bila satu kunjungan memuat beberapa perawatan, usulan memakai jarak <b>terpendek</b> dan menjadi <b>wajib</b> bila salah satunya wajib.
        Recall wajib diprioritaskan di daftar Recall dan resepsionis mendapat pengingat bila pasien terlewat.
      </p>
    </div>
  );
}
