import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, MessageCircle, Phone, Search, Sparkles, Save, RotateCcw, Check } from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@dentiva/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useClinicSettings } from '../../contexts/ClinicSettingsContext';
import { useToast } from '../common/ToastNotification';
import { recallService } from '../../services/recallService';
import { aiService } from '../../services/aiService';
import {
  DEFAULT_RECALL_TEMPLATE, fillRecallTemplate, recallWaLink, toWaNumber, monthsSince,
} from '../../utils/recallMessage';

const inputCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';
const PERIODS = [3, 6, 12, 24];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

/** Recall pasien: pasien lama yang belum kembali, dengan pesan WA siap kirim. */
export default function RecallPage() {
  const { userProfile } = useAuth();
  const { settings, updateSettings } = useClinicSettings();
  const toast = useToast();
  const isAdmin = userProfile?.role === 'admin';

  const [months, setMonths] = useState(6);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [hideRecent, setHideRecent] = useState(true);
  const [marking, setMarking] = useState(null);

  const savedTemplate = settings?.recall_wa_template || DEFAULT_RECALL_TEMPLATE;
  const [template, setTemplate] = useState(savedTemplate);
  const [savingTpl, setSavingTpl] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const [aiStyle, setAiStyle] = useState('');
  const [drafting, setDrafting] = useState(false);

  useEffect(() => { setTemplate(savedTemplate); }, [savedTemplate]);
  useEffect(() => {
    if (isAdmin) aiService.getStatus().then((r) => r.success && setAiStatus(r.data));
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await recallService.candidates(months);
    setLoading(false);
    if (res.success) { setRows(res.data); setLoadError(''); } else setLoadError(res.error);
  }, [months]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return rows.filter((r) => {
      if (hideRecent && r.terakhir_dihubungi && now - new Date(r.terakhir_dihubungi).getTime() < RECENT_MS) return false;
      if (!q) return true;
      return (r.nama_lengkap || '').toLowerCase().includes(q) || (r.no_rm || '').toLowerCase().includes(q);
    });
  }, [rows, query, hideRecent]);

  const stats = useMemo(() => ({
    total: rows.length,
    wa: rows.filter((r) => r.wa_consent && toWaNumber(r.no_wa)).length,
    recent: rows.filter((r) => r.terakhir_dihubungi && Date.now() - new Date(r.terakhir_dihubungi).getTime() < RECENT_MS).length,
  }), [rows]);

  const templateValid = template.includes('{nama}') && template.trim().length <= 1000;
  const clinicName = settings?.clinic_name || '';

  const mark = async (r, channel) => {
    setMarking(r.patient_id);
    const res = await recallService.markContacted(r.patient_id, channel);
    setMarking(null);
    if (!res.success) return toast.error('Gagal mencatat: ' + res.error);
    setRows((list) => list.map((x) => (x.patient_id === r.patient_id
      ? { ...x, terakhir_dihubungi: new Date().toISOString(), jumlah_dihubungi: (x.jumlah_dihubungi || 0) + 1 } : x)));
    if (channel !== 'wa') toast.success('Dicatat sudah dihubungi.');
  };

  const saveTemplate = async () => {
    if (!templateValid) return toast.error('Template wajib memuat {nama} dan maksimal 1000 karakter.');
    setSavingTpl(true);
    const res = await updateSettings({ recall_wa_template: template.trim() });
    setSavingTpl(false);
    if (res.success) toast.success('Template disimpan.'); else toast.error('Gagal menyimpan template.');
  };

  const draftWithAi = async () => {
    setDrafting(true);
    const res = await aiService.draftRecallTemplate(aiStyle.trim());
    setDrafting(false);
    const st = res.data?.status || (res.status && typeof res.status === 'object' ? res.status : null);
    if (st) setAiStatus(st);
    if (!res.success) return toast.error(res.error);
    setTemplate(res.data.template);
    toast.success('Draf dari AI siap. Periksa lalu simpan.');
  };

  const aiUsable = aiStatus?.aktif && aiStatus.terpakai_bulan_ini < aiStatus.kuota_bulanan;
  const preview = fillRecallTemplate(template, { nama: 'Budi Santoso', klinik: clinicName });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BellRing className="text-[var(--color-accent)]" /> Recall Pasien
          </h1>
          <p className="text-sm text-gray-500">Pasien yang sudah lama tidak kontrol dan belum punya jadwal berikutnya.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="recall-months" className="text-sm text-gray-500 whitespace-nowrap">Terakhir datang ≥</label>
          <select id="recall-months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className={`${inputCls} w-auto`}>
            {PERIODS.map((m) => <option key={m} value={m}>{m} bulan lalu</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">Perlu dihubungi</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">Bisa dihubungi via WA</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">{stats.wa}</p>
          <p className="text-xs text-gray-500">izin WA &amp; nomor valid</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">Sudah dihubungi (30 hari)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">{stats.recent}</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-gray-900 dark:text-white">Template pesan WA</h2>
          <span className="text-xs text-gray-500">Gunakan <code>{'{nama}'}</code> dan <code>{'{klinik}'}</code></span>
        </div>
        <textarea id="recall-template" aria-label="Template pesan WA" rows={3} maxLength={1000} value={template} readOnly={!isAdmin}
          onChange={(e) => setTemplate(e.target.value)} className={`${inputCls} resize-y ${!isAdmin ? 'opacity-80' : ''}`} />
        {!template.includes('{nama}') && <p className="text-xs text-red-600">Template wajib memuat {'{nama}'}.</p>}
        <p className="text-xs text-gray-500"><span className="font-medium">Contoh:</span> {preview}</p>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="gap-1" onClick={saveTemplate} disabled={savingTpl || !templateValid || template.trim() === savedTemplate}>
              <Save size={14} /> {savingTpl ? 'Menyimpan…' : 'Simpan template'}
            </Button>
            {template !== savedTemplate && (
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => setTemplate(savedTemplate)}><RotateCcw size={14} /> Batalkan</Button>
            )}
            {aiStatus?.tersedia_di_paket && (
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <input aria-label="Gaya pesan untuk AI" placeholder="Gaya (opsional), mis. santai, singkat" maxLength={300}
                  value={aiStyle} onChange={(e) => setAiStyle(e.target.value)} className={`${inputCls} h-8 py-1`} />
                <Button size="sm" variant="outline" className="gap-1 whitespace-nowrap" onClick={draftWithAi} disabled={drafting || !aiUsable}
                  title={!aiStatus.aktif ? 'Aktifkan Asisten AI di menu Asisten AI' : !aiUsable ? 'Kuota AI bulan ini habis' : 'Tidak ada data pasien yang dikirim ke AI'}>
                  <Sparkles size={14} /> {drafting ? 'Menyusun…' : 'Buat dengan AI'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-gray-100 dark:border-gray-700">
            <div className="relative sm:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input aria-label="Cari pasien" placeholder="Cari nama atau no. RM" value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputCls} pl-9`} />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={hideRecent} onChange={(e) => setHideRecent(e.target.checked)} />
              Sembunyikan yang sudah dihubungi 30 hari terakhir
            </label>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-gray-500">Memuat…</p>
          ) : loadError ? (
            <p className="p-6 text-sm text-red-600">Gagal memuat: {loadError}</p>
          ) : visible.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-500">
              {rows.length === 0 ? 'Tidak ada pasien yang perlu di-recall untuk periode ini.' : 'Tidak ada pasien yang cocok dengan filter.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Pasien</th>
                    <th className="text-left px-4 py-3">Kunjungan terakhir</th>
                    <th className="text-left px-4 py-3">Dihubungi</th>
                    <th className="text-right px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {visible.map((r) => {
                    const message = fillRecallTemplate(template, { nama: r.nama_lengkap, klinik: clinicName });
                    const link = r.wa_consent ? recallWaLink(r.no_wa, message) : '';
                    const m = monthsSince(r.kunjungan_terakhir);
                    return (
                      <tr key={r.patient_id}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{r.nama_lengkap || 'Nama tidak dapat dibuka'}</div>
                          <div className="text-xs text-gray-500">{r.no_rm} · {r.jumlah_kunjungan}× kunjungan</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {fmtDate(`${r.kunjungan_terakhir}T00:00:00`)}
                          {m !== null && <div className="text-xs text-gray-500">{m} bulan lalu</div>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {r.terakhir_dihubungi ? (
                            <span className="inline-flex items-center gap-1"><Check size={14} className="text-green-600" /> {fmtDate(r.terakhir_dihubungi)}</span>
                          ) : <span className="text-gray-400">Belum</span>}
                          {r.jumlah_dihubungi > 1 && <div className="text-xs text-gray-500">{r.jumlah_dihubungi}× dihubungi</div>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                          {link ? (
                            <a href={link} target="_blank" rel="noopener noreferrer" onClick={() => mark(r, 'wa')}
                              className="inline-flex items-center gap-1 rounded-lg px-3 h-8 text-xs font-medium text-white bg-[#25D366] hover:opacity-90">
                              <MessageCircle size={14} /> Kirim WA
                            </a>
                          ) : (
                            <Badge variant="outline" title={r.wa_consent ? 'Nomor WA tidak valid' : 'Pasien belum memberi izin dihubungi via WA'}>
                              {r.wa_consent ? 'Nomor tidak valid' : 'Tanpa izin WA'}
                            </Badge>
                          )}
                          <Button size="sm" variant="outline" className="gap-1" disabled={marking === r.patient_id} onClick={() => mark(r, 'telepon')}>
                            <Phone size={14} /> Sudah ditelepon
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-gray-400">Pesan WA dibuka di WhatsApp Anda; tidak ada yang terkirim otomatis. Hanya pasien yang mengizinkan kontak WA yang dapat dikirimi pesan.</p>
    </div>
  );
}
