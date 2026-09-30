import React, { useRef, useState } from 'react';
import { Upload, Download, X, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@dentiva/ui';
import { parsePatientFile, downloadImportTemplate, IMPORT_COLUMNS } from '../../utils/patientImport';
import { patientService } from '../../services/patientService';

/**
 * Impor pasien dari Excel/CSV: unduh templat → pilih berkas → pratinjau & validasi
 * → impor baris yang valid (terenkripsi di server, No. RM otomatis).
 */
export default function PatientImportModal({ onClose, onImported }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const valid = parsed?.rows.filter((r) => r.errors.length === 0) ?? [];
  const invalid = parsed?.rows.filter((r) => r.errors.length > 0) ?? [];

  const pick = async (file) => {
    if (!file) return;
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      setParsed(await parsePatientFile(file));
    } catch (e) {
      setParsed(null);
      setError('Berkas tidak bisa dibaca: ' + e.message);
    }
  };

  const run = async () => {
    setProgress({ done: 0, total: valid.length });
    const res = await patientService.importPatients(valid.map((r) => r.data), (done, total) => setProgress({ done, total }));
    setProgress(null);
    setResult(res);
    if (res.inserted > 0) onImported?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-[var(--color-accent)]" /> Impor Pasien dari Excel
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Tutup"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal pl-5 space-y-1">
            <li>Unduh templat, lalu salin data pasien Anda ke dalamnya (satu baris per pasien).</li>
            <li>Kolom wajib hanya <strong>Nama Lengkap</strong>. Kolom dikenali: {IMPORT_COLUMNS.map((c) => c.label).join(', ')}.</li>
            <li>Nomor RM dibuat otomatis. Data sensitif (nama, WA, alamat, NIK) dienkripsi saat disimpan.</li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={downloadImportTemplate}><Download size={16} /> Unduh templat</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                   onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            <Button className="gap-2" onClick={() => fileRef.current?.click()} disabled={Boolean(progress)}>
              <Upload size={16} /> Pilih berkas
            </Button>
            {fileName && <span className="text-sm text-gray-500 self-center">{fileName}</span>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {parsed?.missingRequired?.length > 0 && (
            <p className="text-sm text-red-600">Kolom wajib tidak ditemukan: {parsed.missingRequired.join(', ')}. Gunakan templat.</p>
          )}

          {parsed && !parsed.missingRequired?.length && (
            <>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">{valid.length} siap diimpor</span>
                {invalid.length > 0 && <span className="px-3 py-1 rounded-full bg-red-50 text-red-700">{invalid.length} bermasalah (dilewati)</span>}
                {parsed.unknownHeaders.length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600">Kolom diabaikan: {parsed.unknownHeaders.join(', ')}</span>
                )}
              </div>

              {invalid.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-900 max-h-40 overflow-y-auto text-xs">
                  {invalid.slice(0, 100).map((r) => (
                    <div key={r.line} className="px-3 py-1.5 border-b border-red-100 dark:border-red-950 flex gap-2">
                      <span className="font-mono text-red-500">Baris {r.line}</span>
                      <span className="text-gray-700 dark:text-gray-300">{r.data.nama_lengkap || '(tanpa nama)'} — {r.errors.join('; ')}</span>
                    </div>
                  ))}
                </div>
              )}

              {valid.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
                      <tr>{['Nama', 'Tgl Lahir', 'JK', 'WA', 'Alamat'].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {valid.slice(0, 8).map((r) => (
                        <tr key={r.line} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-1.5">{r.data.nama_lengkap}</td>
                          <td className="px-3 py-1.5">{r.data.tanggal_lahir || '-'}</td>
                          <td className="px-3 py-1.5">{r.data.jenis_kelamin || '-'}</td>
                          <td className="px-3 py-1.5">{r.data.no_wa || '-'}</td>
                          <td className="px-3 py-1.5 max-w-[220px] truncate">{r.data.alamat || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {valid.length > 8 && <p className="px-3 py-2 text-xs text-gray-500">… dan {valid.length - 8} lainnya</p>}
                </div>
              )}
            </>
          )}

          {progress && (
            <div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Mengimpor {progress.done} / {progress.total}…</p>
            </div>
          )}

          {result && (
            <div className={`rounded-xl p-4 text-sm ${result.failures.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
              <p className="flex items-center gap-2 font-semibold">
                {result.failures.length ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                {result.inserted} pasien berhasil diimpor.
              </p>
              {result.failures.map((f) => (
                <p key={f.from} className="text-xs mt-1">Data ke-{f.from}–{f.to} gagal: {f.error}</p>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{result ? 'Selesai' : 'Batal'}</Button>
          {!result && (
            <Button onClick={run} disabled={!valid.length || Boolean(progress)} isLoading={Boolean(progress)}>
              Impor {valid.length || ''} pasien
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
