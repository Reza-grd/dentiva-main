import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, MessageCircle, Search, CalendarCheck, CheckCircle2, XCircle, Pencil, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent, Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@dentiva/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';
import { useToast } from '../common/ToastNotification';
import { recallService } from '../../services/recallService';
import { recallWaLink } from '../../utils/recallMessage';
import { STATUS_RECALL, teksHariLagi, pesanRecallSop, validasiKeputusan } from '../../utils/recallSop';
import RecallKeputusanForm from './RecallKeputusanForm';
import RecallPasienLama from './RecallPasienLama';

const inputCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';
const fmt = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const TAB = [
  { id: 'jatuh_tempo', label: 'Jatuh tempo', kunci: 'jatuh_tempo', info: 'Target kontrol ≤ 14 hari lagi atau sudah lewat, belum dijadwalkan.' },
  { id: 'terlewat', label: 'Terlewat', kunci: 'terlewat', info: 'Lewat lebih dari 7 hari dari target dan pasien belum dijadwalkan.' },
  { id: 'minta_ganti', label: 'Minta ganti jadwal', kunci: 'minta_ganti', info: 'Pasien meminta waktu lain — hubungi untuk menjadwalkan ulang.' },
  { id: 'mendatang', label: 'Mendatang', info: 'Recall yang targetnya lebih dari 14 hari lagi.' },
  { id: 'belum', label: 'Belum ditentukan', kunci: 'belum', info: 'Kunjungan yang keputusan recall-nya belum ditentukan dokter.' },
  { id: 'riwayat', label: 'Riwayat', info: 'Dijadwalkan, selesai, atau tidak jadi dalam 90 hari terakhir.' },
  { id: 'pasien_lama', label: 'Pasien lama', staf: true, info: '' },
];
const TERBUKA = ['jatuh_tempo', 'terlewat', 'minta_ganti', 'mendatang'];

/** Recall pasien: berbasis SOP perawatan & keputusan dokter, plus daftar pasien lama. */
export default function RecallPage() {
  const { userProfile } = useAuth();
  const { settings } = useClinicSettings();
  const toast = useToast();
  const role = userProfile?.role;
  const bisaPutuskan = role === 'dokter' || role === 'admin';
  const bisaPasienLama = role === 'admin' || role === 'resepsionis';

  const { search } = useLocation();
  const tabDariUrl = useCallback((q) => {
    const t = new URLSearchParams(q).get('tab');
    const ada = TAB.find((x) => x.id === t);
    return ada && (!ada.staf || bisaPasienLama) ? t : null;
  }, [bisaPasienLama]);
  const [tab, setTab] = useState(() => tabDariUrl(search) || 'jatuh_tempo');
  // Tautan lonceng (?tab=terlewat) juga berlaku saat halaman ini sudah terbuka.
  useEffect(() => { const t = tabDariUrl(search); if (t) setTab(t); }, [search, tabDariUrl]);
  const [rows, setRows] = useState([]);
  const [ringkas, setRingkas] = useState({});
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [cari, setCari] = useState('');
  const [proses, setProses] = useState(null);
  const [tidakJadi, setTidakJadi] = useState(null);   // { row, alasan }
  const [tentukan, setTentukan] = useState(null);     // { row, nilai }

  const muatRingkasan = useCallback(async () => {
    const r = await recallService.ringkasan();
    if (r.success) setRingkas(r.data);
  }, []);

  const muat = useCallback(async () => {
    if (tab === 'pasien_lama') return;
    setMemuat(true);
    const r = await recallService.daftar(tab);
    setMemuat(false);
    if (r.success) { setRows(r.data); setGalat(''); } else setGalat(r.error);
  }, [tab]);

  useEffect(() => { muat(); }, [muat]);
  useEffect(() => { muatRingkasan(); }, [muatRingkasan]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.nama_lengkap} ${r.no_rm} ${r.tujuan || ''} ${r.dokter_nama || ''}`.toLowerCase().includes(q));
  }, [rows, cari]);

  const segarkan = () => { muat(); muatRingkasan(); };

  const ubahStatus = async (row, status, catatan = null, diam = false) => {
    setProses(row.id);
    const r = await recallService.ubahStatus(row.id, status, catatan);
    setProses(null);
    if (!r.success) { toast.error('Gagal: ' + r.error); return false; }
    if (!diam) toast.success(`Status: ${STATUS_RECALL[status]?.label || status}.`);
    segarkan();
    return true;
  };

  const kirimWa = (row) => {
    // Membuka WA di perangkat staf; "diingatkan" dicatat sekali. Recall terlewat tetap di tab Terlewat
    // (bila diubah ke diingatkan, tugas harian akan mengembalikannya ke terlewat setiap hari).
    if (row.status === 'menunggu') ubahStatus(row, 'diingatkan', null, true);
  };

  const simpanTidakJadi = async () => {
    const alasan = (tidakJadi?.alasan || '').trim();
    if (alasan.length < 3) return toast.error('Tuliskan alasan (minimal 3 huruf).');
    if (await ubahStatus(tidakJadi.row, 'tidak_jadi', alasan)) setTidakJadi(null);
  };

  const simpanTentukan = async () => {
    const e = validasiKeputusan(tentukan?.nilai);
    if (e) return toast.error(e);
    setProses(tentukan.row.id);
    const r = await recallService.simpanKeputusan(tentukan.row.visit_id, tentukan.nilai);
    setProses(null);
    if (!r.success) return toast.error('Gagal: ' + r.error);
    toast.success('Keputusan recall disimpan.');
    setTentukan(null);
    segarkan();
  };

  const tabTampil = TAB.filter((t) => (!t.staf || bisaPasienLama) && (t.id !== 'minta_ganti' || ringkas.minta_ganti > 0 || tab === 'minta_ganti'));
  const infoTab = TAB.find((t) => t.id === tab);
  const klinik = settings?.clinic_name || '';

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-medium leading-tight text-text-primary">Recall Pasien</h1>
          <p className="text-sm text-gray-500">Kontrol ulang sesuai rencana dokter & SOP perawatan klinik.</p>
        </div>
        {role === 'admin' && (
          <Link to="/admin/pengaturan?tab=sop-recall" className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline">
            <Settings size={14} /> Atur SOP Recall
          </Link>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Jatuh tempo</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums mt-1">{ringkas.jatuh_tempo ?? '–'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-red-700 dark:text-red-300 inline-flex items-center gap-1"><AlertTriangle size={12} /> Wajib jatuh tempo</p>
          <p className="text-2xl font-semibold text-red-700 dark:text-red-300 tabular-nums mt-1">{ringkas.wajib_jatuh_tempo ?? '–'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Terlewat</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums mt-1">{ringkas.terlewat ?? '–'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-gray-500">Belum ditentukan dokter</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums mt-1">{ringkas.belum ?? '–'}</p>
        </CardContent></Card>
      </div>

      <div role="tablist" aria-label="Kelompok recall" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabTampil.map((t) => {
          const n = t.kunci ? ringkas[t.kunci] : null;
          return (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setCari(''); }}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${tab === t.id ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold' : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900'}`}>
              {t.label}{n > 0 && <span className="ml-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 text-xs tabular-nums">{n}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'pasien_lama' ? <RecallPasienLama /> : (
        <Card><CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">{infoTab?.info}</p>
            <div className="relative sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input aria-label="Cari recall" placeholder="Cari nama, RM, tujuan" value={cari} onChange={(e) => setCari(e.target.value)} className={`${inputCls} pl-9`} />
            </div>
          </div>

          {memuat ? <p className="p-6 text-sm text-gray-500">Memuat…</p>
            : galat ? <p className="p-6 text-sm text-red-600">Gagal memuat: {galat}</p>
            : tampil.length === 0 ? <p className="p-10 text-center text-sm text-gray-500">{rows.length ? 'Tidak ada yang cocok dengan pencarian.' : 'Tidak ada recall di kelompok ini.'}</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 text-xs">
                    <tr>
                      <th className="text-left px-4 py-3">Pasien</th>
                      <th className="text-left px-4 py-3">Kunjungan asal</th>
                      {tab !== 'belum' && <th className="text-left px-4 py-3">Target kontrol</th>}
                      {tab !== 'belum' && <th className="text-left px-4 py-3">Status</th>}
                      <th className="text-right px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {tampil.map((r) => {
                      const st = STATUS_RECALL[r.status];
                      const pesan = pesanRecallSop({ nama: r.nama_lengkap, klinik, tanggal: r.tanggal_target, tujuan: r.tujuan });
                      const wa = r.wa_consent ? recallWaLink(r.no_wa, pesan) : '';
                      const sibuk = proses === r.id;
                      return (
                        <tr key={r.id} className={r.wajib && TERBUKA.includes(tab) ? 'bg-red-50/40 dark:bg-red-900/10' : ''}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                              {r.nama_lengkap || 'Nama tidak dapat dibuka'}
                              {r.wajib && <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-1.5 text-[11px] font-semibold"><AlertTriangle size={11} /> WAJIB</span>}
                            </div>
                            <div className="text-xs text-gray-500">{r.no_rm}{r.dokter_nama ? ` · ${r.dokter_nama}` : ''}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            <div className="whitespace-nowrap">{fmt(r.tanggal_kunjungan)}</div>
                            {r.tujuan && <div className="text-xs text-gray-500">{r.tujuan}</div>}
                          </td>
                          {tab !== 'belum' && (
                            <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {fmt(r.tanggal_target)}
                              {TERBUKA.includes(tab) && <div className={`text-xs ${r.hari_lagi < 0 ? 'text-red-600' : 'text-gray-500'}`}>{teksHariLagi(r.hari_lagi)}</div>}
                            </td>
                          )}
                          {tab !== 'belum' && (
                            <td className="px-4 py-3">
                              {st && <span className={`text-xs rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${st.warna}`}>{st.label}</span>}
                              {r.catatan && <div className="text-xs text-gray-500 mt-1 max-w-[220px]">{r.catatan}</div>}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-1.5">
                              {tab === 'belum' ? (
                                bisaPutuskan ? (
                                  <Button size="sm" className="gap-1" onClick={() => setTentukan({ row: r, nilai: { keputusan: 'perlu', interval_hari: 180, wajib: false, tujuan: '', sumber: 'dokter' } })}>
                                    <Pencil size={13} /> Tentukan
                                  </Button>
                                ) : <span className="text-xs text-gray-500">Menunggu keputusan dokter</span>
                              ) : TERBUKA.includes(tab) ? (
                                <>
                                  {wa ? (
                                    <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => kirimWa(r)}
                                      className="inline-flex items-center gap-1 rounded-lg px-2.5 h-8 text-xs font-medium text-white bg-[#25D366] hover:opacity-90">
                                      <MessageCircle size={13} /> Kirim WA
                                    </a>
                                  ) : (
                                    <Badge variant="outline" title={r.wa_consent ? 'Nomor WA tidak valid' : 'Pasien belum memberi izin dihubungi via WA'}>
                                      {r.wa_consent ? 'Nomor tidak valid' : 'Tanpa izin WA'}
                                    </Badge>
                                  )}
                                  {r.status !== 'dikonfirmasi' && (
                                    <Button size="sm" variant="outline" className="gap-1" disabled={sibuk} onClick={() => ubahStatus(r, 'dikonfirmasi')} title="Pasien menyatakan bisa datang">
                                      <CheckCircle2 size={13} /> Pasien bisa
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" className="gap-1" disabled={sibuk} onClick={() => ubahStatus(r, 'dibooking')} title="Jadwal kunjungan sudah dibuat">
                                    <CalendarCheck size={13} /> Sudah dijadwalkan
                                  </Button>
                                  <Button size="sm" variant="ghost" className="gap-1" disabled={sibuk} onClick={() => setTidakJadi({ row: r, alasan: '' })}>
                                    <XCircle size={13} /> Tidak jadi
                                  </Button>
                                </>
                              ) : r.status === 'tidak_jadi' || r.status === 'dibooking' ? (
                                <Button size="sm" variant="ghost" disabled={sibuk} onClick={() => ubahStatus(r, 'menunggu')}>Buka lagi</Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </CardContent></Card>
      )}

      <p className="text-xs text-gray-400">
        Pesan WA dibuka di WhatsApp perangkat Anda; belum ada yang terkirim otomatis. Jadwal kunjungan yang dibuat untuk pasien otomatis
        menandai recall-nya &ldquo;Sudah dijadwalkan&rdquo;, dan kunjungan yang selesai menutupnya.
      </p>

      <Dialog open={!!tidakJadi} onOpenChange={(o) => { if (!o) setTidakJadi(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recall tidak jadi</DialogTitle>
            <DialogDescription>{tidakJadi?.row?.wajib ? 'Ini recall WAJIB — pastikan alasan tercatat jelas untuk rekam jejak.' : 'Catat alasannya agar tim tahu.'}</DialogDescription>
          </DialogHeader>
          <label htmlFor="recall-alasan" className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Alasan</label>
          <textarea id="recall-alasan" rows={3} maxLength={500} value={tidakJadi?.alasan || ''} className={inputCls}
            placeholder="mis. Pasien pindah kota, sudah kontrol di klinik lain"
            onChange={(e) => setTidakJadi((t) => ({ ...t, alasan: e.target.value }))} />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setTidakJadi(null)}>Batal</Button>
            <Button onClick={simpanTidakJadi} disabled={proses === tidakJadi?.row?.id}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tentukan} onOpenChange={(o) => { if (!o) setTentukan(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Keputusan recall</DialogTitle>
            <DialogDescription>{tentukan?.row?.nama_lengkap} · kunjungan {fmt(tentukan?.row?.tanggal_kunjungan)}</DialogDescription>
          </DialogHeader>
          {tentukan && (
            <RecallKeputusanForm nilai={tentukan.nilai} ubah={(nilai) => setTentukan((t) => ({ ...t, nilai }))}
              tanggalKunjungan={tentukan.row.tanggal_kunjungan} idPrefix="recall-tentukan" />
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setTentukan(null)}>Batal</Button>
            <Button onClick={simpanTentukan} disabled={proses === tentukan?.row?.id}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
