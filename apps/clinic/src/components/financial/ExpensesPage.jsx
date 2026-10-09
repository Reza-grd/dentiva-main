import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt, Plus, ScanLine, Pencil, Trash2, Sparkles, AlertTriangle, Image as ImageIcon, X, Loader2,
} from 'lucide-react';
import { Card, CardContent, Button, Badge } from '@dentiva/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import { expenseService } from '../../services/expenseService';
import { aiService } from '../../services/aiService';
import { EXPENSE_CATEGORIES, findDuplicateExpenses } from '../../utils/expenseCategories';
import { resizeImageToJpeg } from '../../utils/imageResize';
import { formatRupiah, getTodayLocal } from '../../utils/dateUtils';

const inputCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` };
};
const fmtDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const emptyForm = () => ({
  tanggal_expense: getTodayLocal(), kategori: '', jumlah: '', pemasok: '', nomor_nota: '', deskripsi: '', sumber: 'manual',
});

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[92vh] overflow-hidden flex flex-col`}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { userProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const scanToken = useRef(0); // naik saat formulir ditutup → hasil pindai yang terlambat diabaikan

  const [month, setMonth] = useState(() => getTodayLocal().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [aiStatus, setAiStatus] = useState(null);

  // Formulir (tambah/edit/hasil pindai)
  const [editing, setEditing] = useState(null); // null = tertutup; { id?, ...form }
  const [scan, setScan] = useState(null); // { previewUrl, blob, busy, draft, error }
  const [keepPhoto, setKeepPhoto] = useState(true);
  const [dupes, setDupes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = monthRange(month);
    const res = await expenseService.list(from, to);
    setLoading(false);
    if (res.success) { setRows(res.data); setLoadError(''); } else setLoadError(res.error);
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { aiService.getStatus().then((r) => r.success && setAiStatus(r.data)); }, []);

  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + Number(r.jumlah || 0), 0);
    const per = {};
    rows.forEach((r) => { const k = r.kategori || 'Lainnya'; per[k] = (per[k] || 0) + Number(r.jumlah || 0); });
    const cats = Object.entries(per).sort((a, b) => b[1] - a[1]);
    return { total, cats, count: rows.length };
  }, [rows]);

  const closeForm = () => {
    scanToken.current += 1;
    if (scan?.previewUrl) URL.revokeObjectURL(scan.previewUrl);
    setScan(null); setEditing(null); setDupes([]); setSaving(false);
  };

  const openNew = () => { setDupes([]); setEditing(emptyForm()); };
  const openEdit = (r) => {
    setDupes([]);
    setEditing({
      id: r.id, tanggal_expense: r.tanggal_expense, kategori: r.kategori || 'Lainnya', jumlah: String(Math.round(Number(r.jumlah || 0))),
      pemasok: r.pemasok || '', nomor_nota: r.nomor_nota || '', deskripsi: r.deskripsi || '', sumber: r.sumber || 'manual', bukti_url: r.bukti_url,
    });
  };

  const aiReady = aiStatus?.aktif && aiStatus.terpakai_bulan_ini < aiStatus.kuota_bulanan;

  const startScan = () => {
    if (!aiStatus?.tersedia_di_paket) return toast.error('Pindai nota memakai Asisten AI (paket Pro/Enterprise).');
    if (!aiStatus.aktif) { toast.info('Aktifkan Asisten AI terlebih dahulu.'); return navigate('/admin/asisten-ai'); }
    if (!aiReady) return toast.error('Kuota Asisten AI bulan ini sudah habis. Silakan isi manual.');
    fileRef.current?.click();
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let img;
    try { img = await resizeImageToJpeg(file); } catch (err) { return toast.error(err.message); }
    const token = ++scanToken.current;
    const previewUrl = URL.createObjectURL(img.blob);
    setKeepPhoto(true);
    setDupes([]);
    setScan({ previewUrl, blob: img.blob, busy: true, draft: null, error: '' });
    setEditing({ ...emptyForm(), sumber: 'ai_nota' });

    const res = await aiService.scanReceipt(img.base64, img.mediaType);
    const newStatus = res.data?.status || (res.status && typeof res.status === 'object' ? res.status : null);
    if (newStatus) setAiStatus(newStatus);
    if (token !== scanToken.current) return;
    if (!res.success) {
      setScan((s) => s && { ...s, busy: false, error: `${res.error} Anda tetap bisa mengisi data secara manual.` });
      setEditing((f) => f && { ...f, sumber: 'manual' });
      return;
    }
    const d = res.data.draft;
    setScan((s) => s && { ...s, busy: false, draft: d });
    if (!d.adalah_nota) {
      setScan((s) => s && { ...s, error: 'Foto ini sepertinya bukan nota. Periksa kembali atau isi manual.' });
      return;
    }
    const itemText = d.items?.length ? d.items.slice(0, 6).map((i) => i.nama).join(', ') : '';
    const next = {
      ...emptyForm(),
      sumber: 'ai_nota',
      tanggal_expense: d.tanggal || getTodayLocal(),
      kategori: d.kategori || 'Lainnya',
      jumlah: d.total ? String(d.total) : '',
      pemasok: d.pemasok || '',
      nomor_nota: d.nomor_nota || '',
      deskripsi: (d.deskripsi || itemText).slice(0, 200),
    };
    setEditing(next);
    checkDupes(next);
  };

  const checkDupes = async (form) => {
    const [near, nota] = await Promise.all([expenseService.around(form.tanggal_expense), expenseService.byNota(form.nomor_nota)]);
    const pool = [...(near.data || []), ...(nota.data || [])].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
    const found = findDuplicateExpenses(form, pool);
    setDupes(found);
    return found;
  };

  const save = async (force = false) => {
    const f = editing;
    const jumlah = Number(f.jumlah);
    if (!f.tanggal_expense) return toast.error('Tanggal wajib diisi.');
    if (f.tanggal_expense > getTodayLocal()) return toast.error('Tanggal tidak boleh di masa depan.');
    if (!f.kategori) return toast.error('Pilih kategori.');
    if (!(jumlah > 0)) return toast.error('Jumlah harus lebih dari 0.');
    if (jumlah > 10_000_000_000) return toast.error('Jumlah terlalu besar. Periksa kembali.');

    setSaving(true);
    if (!force) {
      const found = await checkDupes(f);
      if (found.length) { setSaving(false); return; }
    }
    let buktiPath = f.bukti_url;
    let uploaded = null;
    if (scan?.blob && keepPhoto) {
      const up = await expenseService.uploadReceipt(userProfile?.clinic_id, scan.blob);
      if (!up.success) { setSaving(false); return toast.error('Gagal menyimpan foto nota: ' + up.error); }
      buktiPath = up.data; uploaded = up.data;
    }
    const payload = { ...f, bukti_url: buktiPath ?? null };
    const res = f.id ? await expenseService.update(f.id, payload) : await expenseService.create(payload);
    if (!res.success) {
      if (uploaded) await expenseService.removeReceipt(uploaded);
      setSaving(false);
      return toast.error('Gagal menyimpan: ' + res.error);
    }
    toast.success(f.id ? 'Pengeluaran diperbarui.' : 'Pengeluaran disimpan.');
    closeForm();
    if (res.data.tanggal_expense.slice(0, 7) !== month) setMonth(res.data.tanggal_expense.slice(0, 7));
    else load();
  };

  const doDelete = async () => {
    const row = confirmDelete;
    setConfirmDelete(null);
    const res = await expenseService.remove(row);
    if (res.success) { toast.success('Pengeluaran dihapus.'); load(); } else toast.error('Gagal menghapus: ' + res.error);
  };

  const viewReceipt = async (path) => {
    const res = await expenseService.receiptUrl(path);
    if (res.success) window.open(res.data, '_blank', 'noopener');
    else toast.error('Foto nota tidak dapat dibuka: ' + res.error);
  };

  const set = (k) => (e) => { const v = e.target.value; setEditing((f) => ({ ...f, [k]: v })); if (dupes.length) setDupes([]); };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="text-[var(--color-accent)]" /> Pengeluaran
          </h1>
          <p className="text-sm text-gray-500">Catat biaya operasional klinik. Foto nota bisa dibaca otomatis oleh Asisten AI.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={startScan} title={aiStatus?.aktif ? `${aiStatus.terpakai_bulan_ini}/${aiStatus.kuota_bulanan} kuota AI terpakai` : undefined}>
            <ScanLine size={16} /> Pindai nota (AI)
          </Button>
          <Button className="gap-2" onClick={openNew}><Plus size={16} /> Tambah</Button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={onPhoto} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5">
          <label htmlFor="exp-month" className="text-xs uppercase tracking-wide text-gray-500">Periode</label>
          <input id="exp-month" type="month" value={month} max={getTodayLocal().slice(0, 7)}
            onChange={(e) => e.target.value && setMonth(e.target.value)} className={`${inputCls} mt-1`} />
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total pengeluaran</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums mt-1">{formatRupiah(summary.total)}</p>
          <p className="text-xs text-gray-500">{summary.count} catatan</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs uppercase tracking-wide text-gray-500">Kategori terbesar</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{summary.cats[0]?.[0] || '—'}</p>
          <p className="text-xs text-gray-500 tabular-nums">{summary.cats[0] ? formatRupiah(summary.cats[0][1]) : 'Belum ada data'}</p>
        </CardContent></Card>
      </div>

      {summary.cats.length > 1 && (
        <Card><CardContent className="p-5 space-y-2">
          {summary.cats.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3 text-sm">
              <span className="w-48 shrink-0 truncate text-gray-700 dark:text-gray-300">{k}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${summary.total ? (v / summary.total) * 100 : 0}%` }} />
              </div>
              <span className="w-32 text-right tabular-nums text-gray-900 dark:text-white">{formatRupiah(v)}</span>
            </div>
          ))}
        </CardContent></Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-gray-500">Memuat…</p>
          ) : loadError ? (
            <p className="p-6 text-sm text-red-600">Gagal memuat: {loadError}</p>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Receipt className="mx-auto text-gray-300" size={36} />
              <p className="text-sm text-gray-500">Belum ada pengeluaran di periode ini.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Tanggal</th>
                  <th className="text-left px-4 py-3">Kategori</th>
                  <th className="text-left px-4 py-3">Keterangan</th>
                  <th className="text-right px-4 py-3">Jumlah</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">{fmtDate(r.tanggal_expense)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-900 dark:text-white">{r.kategori || 'Lainnya'}</span>
                      {r.sumber === 'ai_nota' && <Badge variant="secondary" className="ml-2 gap-1"><Sparkles size={10} /> AI</Badge>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 min-w-[200px]">
                      <div>{r.deskripsi || <span className="text-gray-400">—</span>}</div>
                      {(r.pemasok || r.nomor_nota) && (
                        <div className="text-xs text-gray-500">{[r.pemasok, r.nomor_nota && `No. ${r.nomor_nota}`].filter(Boolean).join(' · ')}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-medium text-gray-900 dark:text-white">{formatRupiah(Number(r.jumlah))}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {r.bukti_url && (
                        <button type="button" onClick={() => viewReceipt(r.bukti_url)} className="p-1.5 text-gray-400 hover:text-[var(--color-accent)]" title="Lihat foto nota">
                          <ImageIcon size={16} />
                        </button>
                      )}
                      <button type="button" onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-[var(--color-accent)]" title="Ubah"><Pencil size={16} /></button>
                      <button type="button" onClick={() => setConfirmDelete(r)} className="p-1.5 text-gray-400 hover:text-red-500" title="Hapus"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Modal wide={Boolean(scan)} onClose={saving ? () => {} : closeForm}
          title={editing.id ? 'Ubah pengeluaran' : scan ? 'Periksa hasil pindai nota' : 'Tambah pengeluaran'}>
          <div className={scan ? 'grid md:grid-cols-2' : ''}>
            {scan && (
              <div className="p-6 md:border-r border-gray-200 dark:border-gray-700 space-y-3">
                <img src={scan.previewUrl} alt="Foto nota" className="w-full max-h-[60vh] object-contain rounded-lg bg-gray-50 dark:bg-gray-900" />
                {scan.busy && (
                  <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Asisten AI membaca nota…</p>
                )}
                {scan.draft?.items?.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-300">{scan.draft.items.length} barang terbaca</summary>
                    <ul className="mt-2 space-y-1">
                      {scan.draft.items.map((it, i) => (
                        <li key={i} className="flex justify-between gap-3 text-gray-700 dark:text-gray-300">
                          <span className="truncate">{it.jumlah ? `${it.jumlah}× ` : ''}{it.nama}</span>
                          <span className="tabular-nums">{it.harga ? formatRupiah(it.harga) : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} /> Simpan foto sebagai bukti
                </label>
              </div>
            )}
            <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); save(false); }}>
              {scan?.error && (
                <p className="text-sm rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">{scan.error}</p>
              )}
              {scan?.draft?.adalah_nota && (
                <p className="text-xs rounded-lg p-3 bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] text-gray-700 dark:text-gray-300 flex gap-2">
                  <Sparkles size={14} className="shrink-0 mt-0.5 text-[var(--color-accent)]" />
                  <span>Diisi oleh AI dari foto. Periksa setiap kolom sebelum menyimpan.{scan.draft.catatan ? ` Catatan: ${scan.draft.catatan}` : ''}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-date" className={labelCls}>Tanggal</label>
                  <input id="exp-date" type="date" required max={getTodayLocal()} value={editing.tanggal_expense} onChange={set('tanggal_expense')} className={inputCls} disabled={scan?.busy} />
                </div>
                <div>
                  <label htmlFor="exp-amount" className={labelCls}>Jumlah (Rp)</label>
                  <input id="exp-amount" type="number" inputMode="numeric" min="1" step="1" required value={editing.jumlah} onChange={set('jumlah')} className={`${inputCls} tabular-nums`} disabled={scan?.busy} />
                </div>
              </div>
              <div>
                <label htmlFor="exp-cat" className={labelCls}>Kategori</label>
                <select id="exp-cat" required value={editing.kategori} onChange={set('kategori')} className={inputCls} disabled={scan?.busy}>
                  <option value="">Pilih kategori…</option>
                  {[...new Set([...EXPENSE_CATEGORIES, ...(editing.kategori ? [editing.kategori] : [])])].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-vendor" className={labelCls}>Pemasok / toko</label>
                  <input id="exp-vendor" maxLength={120} value={editing.pemasok} onChange={set('pemasok')} className={inputCls} disabled={scan?.busy} />
                </div>
                <div>
                  <label htmlFor="exp-no" className={labelCls}>No. nota</label>
                  <input id="exp-no" maxLength={60} value={editing.nomor_nota} onChange={set('nomor_nota')} className={inputCls} disabled={scan?.busy} />
                </div>
              </div>
              <div>
                <label htmlFor="exp-desc" className={labelCls}>Keterangan</label>
                <textarea id="exp-desc" rows={2} maxLength={500} value={editing.deskripsi} onChange={set('deskripsi')} className={`${inputCls} resize-none`} disabled={scan?.busy} />
              </div>

              {dupes.length > 0 && (
                <div className="text-sm rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-medium flex items-center gap-2"><AlertTriangle size={16} /> Kemungkinan nota ini sudah dicatat:</p>
                  <ul className="list-disc pl-5">
                    {dupes.slice(0, 3).map((d) => (
                      <li key={d.id}>{fmtDate(d.tanggal_expense)} · {formatRupiah(Number(d.jumlah))}{d.nomor_nota ? ` · No. ${d.nomor_nota}` : ''}{d.pemasok ? ` · ${d.pemasok}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Batal</Button>
                {dupes.length > 0 ? (
                  <Button type="button" onClick={() => save(true)} disabled={saving}>{saving ? 'Menyimpan…' : 'Tetap simpan'}</Button>
                ) : (
                  <Button type="submit" disabled={saving || scan?.busy}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
                )}
              </div>
            </form>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Hapus pengeluaran?" onClose={() => setConfirmDelete(null)}>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {fmtDate(confirmDelete.tanggal_expense)} · {confirmDelete.kategori} · <strong>{formatRupiah(Number(confirmDelete.jumlah))}</strong>
              {confirmDelete.bukti_url ? '. Foto nota juga akan dihapus.' : '.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
              <Button variant="danger" onClick={doDelete}>Hapus</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
