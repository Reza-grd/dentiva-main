import React, { useEffect, useMemo, useState } from 'react';
import { BookCheck, Trash2, Search, X } from 'lucide-react';
import { Card, CardContent } from '@dentiva/ui';
import { aiService } from '../../services/aiService';
import { useToast } from '../common/ToastNotification';
import { getRelativeTime } from '../../utils/dateUtils';

/** Daftar jawaban terverifikasi (basis pengetahuan Asisten AI) — lihat, cari, hapus. */
export default function KnowledgePanel({ onClose, refreshKey }) {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    aiService.listKnowledge().then((r) => (r.success ? setRows(r.data) : setError(r.error)));
  }, [refreshKey]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => !q || r.question.toLowerCase().includes(q) || r.answer.toLowerCase().includes(q));
  }, [rows, query]);

  const remove = async (row) => {
    const res = await aiService.deleteKnowledge(row.id);
    if (!res.success) return toast.error('Gagal menghapus: ' + res.error);
    setRows((list) => list.filter((r) => r.id !== row.id));
    toast.success('Jawaban terverifikasi dihapus.');
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BookCheck size={18} className="text-[var(--color-accent)]" /> Jawaban terverifikasi
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Jawaban yang Anda nilai tepat. Pertanyaan panduan yang sama dijawab seketika; pertanyaan berangka dijawab seketika
              selama data klinik belum berubah, dan menjadi acuan AI untuk pertanyaan yang mirip.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input aria-label="Cari jawaban terverifikasi" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pertanyaan atau jawaban…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
        </div>

        {error && <p className="text-sm text-red-600">Gagal memuat: {error}</p>}
        {!rows && !error && <p className="text-sm text-gray-500">Memuat…</p>}
        {rows && visible.length === 0 && (
          <p className="text-sm text-gray-500 py-4 text-center">
            {rows.length === 0 ? 'Belum ada jawaban terverifikasi. Tekan "Tepat" pada jawaban AI untuk menyimpannya.' : 'Tidak ada yang cocok.'}
          </p>
        )}

        <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[420px] overflow-y-auto">
          {visible.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{r.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.kind === 'panduan' ? 'Panduan' : 'Data klinik'} · dipakai {r.hit_count}× · diperbarui {getRelativeTime(r.updated_at)}
                  </p>
                </button>
                <button type="button" onClick={() => remove(r)} className="p-1.5 text-gray-400 hover:text-red-500" title="Hapus" aria-label={`Hapus jawaban: ${r.question}`}>
                  <Trash2 size={15} />
                </button>
              </div>
              {open === r.id && (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">{r.answer}</p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
