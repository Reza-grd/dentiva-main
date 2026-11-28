import React from 'react';
import { BellRing } from 'lucide-react';
import RecallKeputusanForm from './RecallKeputusanForm';
import { STATUS_RECALL, KEPUTUSAN } from '../../utils/recallSop';

/**
 * Bagian "Rencana Recall" di rekam medis. Isian disimpan bersama tombol "Simpan Rekam Medis".
 * Bila dibiarkan kosong, dokter ditanya lewat pop-up setelah menyimpan.
 */
export default function RecallSectionRM({ tersimpan, draft, setDraft, usulan, tanggalKunjungan, disabled }) {
  const nilai = draft ?? (tersimpan
    ? { keputusan: tersimpan.keputusan, interval_hari: tersimpan.interval_hari, wajib: tersimpan.wajib, tujuan: tersimpan.tujuan || '', sumber: tersimpan.sumber }
    : {});
  const status = tersimpan?.keputusan === 'perlu' ? STATUS_RECALL[tersimpan.status] : null;

  return (
    <div data-tur="rm-recall" className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex flex-wrap items-center gap-2">
        <BellRing size={18} className="text-[var(--color-accent)]" />
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Rencana Recall</h3>
        {tersimpan && !draft && (
          <span className="text-xs text-gray-500">Tersimpan: {KEPUTUSAN[tersimpan.keputusan]}</span>
        )}
        {status && !draft && <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${status.warna}`}>{status.label}</span>}
        {draft && <span className="text-xs text-amber-700 dark:text-amber-300">Belum disimpan — ikut tersimpan saat &ldquo;Simpan Rekam Medis&rdquo;</span>}
        {draft && (
          <button type="button" onClick={() => setDraft(null)} className="ml-auto text-xs text-gray-500 hover:underline">Batalkan perubahan</button>
        )}
      </div>
      <div className="p-6">
        {!tersimpan && !draft && (
          <p className="text-sm text-gray-500 mb-3">Belum diisi. Bila dibiarkan kosong, Anda akan ditanya setelah menyimpan rekam medis.</p>
        )}
        <RecallKeputusanForm nilai={nilai} ubah={setDraft} usulan={usulan} tanggalKunjungan={tanggalKunjungan} disabled={disabled} idPrefix="recall-rm" />
      </div>
    </div>
  );
}
