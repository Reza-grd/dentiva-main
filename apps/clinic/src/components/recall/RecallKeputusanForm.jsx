import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { KEPUTUSAN, PRESET_HARI, BATAS_HARI, tambahHari, teksJarak } from '../../utils/recallSop';

const inputCls = 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] disabled:opacity-60';

/**
 * Isian keputusan recall (terkendali).
 * @param {{ nilai: object, ubah: (v: object) => void, usulan?: object|null, tanggalKunjungan?: string, disabled?: boolean, idPrefix?: string }} props
 *   nilai = { keputusan, interval_hari, wajib, tujuan, sumber }
 */
export default function RecallKeputusanForm({ nilai, ubah, usulan = null, tanggalKunjungan = '', disabled = false, idPrefix = 'recall' }) {
  const v = nilai || {};
  const set = (patch) => ubah({ ...v, sumber: 'dokter', ...patch });
  const pakaiUsulan = () => usulan && ubah({ ...usulan });
  const sesuaiUsulan = usulan && v.keputusan === usulan.keputusan
    && (usulan.keputusan !== 'perlu' || (Number(v.interval_hari) === usulan.interval_hari && !!v.wajib === usulan.wajib));
  const target = v.keputusan === 'perlu' && tanggalKunjungan ? tambahHari(tanggalKunjungan, v.interval_hari) : '';

  return (
    <div className="space-y-3">
      {usulan && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 px-3 py-2 text-sm">
          <Sparkles size={15} className="text-[var(--color-accent)] shrink-0" />
          <span className="text-gray-700 dark:text-gray-200">
            Usulan SOP: <b>{usulan.keputusan === 'perlu' ? `recall ${teksJarak(usulan.interval_hari)}` : 'tidak perlu recall'}</b>
            {usulan.wajib && <span className="ml-1 font-semibold text-red-700 dark:text-red-300">· WAJIB</span>}
            {usulan.dasar?.length > 0 && <span className="text-gray-500"> — {usulan.dasar.join(', ')}</span>}
          </span>
          {!sesuaiUsulan && !disabled && (
            <button type="button" onClick={pakaiUsulan} className="ml-auto text-xs font-semibold text-[var(--color-accent)] hover:underline">Pakai usulan</button>
          )}
        </div>
      )}

      <div role="radiogroup" aria-label="Keputusan recall" className="grid gap-2 sm:grid-cols-3">
        {Object.entries(KEPUTUSAN).map(([k, label]) => (
          <label key={k} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
            v.keputusan === k ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-gray-900 dark:text-white font-semibold' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
            <input type="radio" name={`${idPrefix}-keputusan`} value={k} checked={v.keputusan === k} disabled={disabled}
              onChange={() => set(k === 'perlu'
                ? { keputusan: k, interval_hari: v.interval_hari || usulan?.interval_hari || 180, wajib: v.wajib ?? usulan?.wajib ?? false, tujuan: v.tujuan ?? usulan?.tujuan ?? '' }
                : { keputusan: k, interval_hari: null, wajib: false })} />
            {label}
          </label>
        ))}
      </div>

      {v.keputusan === 'perlu' && (
        <div className="space-y-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-36">
              <label htmlFor={`${idPrefix}-hari`} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Kontrol setelah (hari)</label>
              <input id={`${idPrefix}-hari`} type="number" inputMode="numeric" min={BATAS_HARI.min} max={BATAS_HARI.max} step={1} disabled={disabled}
                value={v.interval_hari ?? ''} onChange={(e) => set({ interval_hari: e.target.value === '' ? '' : Number(e.target.value) })} className={inputCls} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_HARI.map((p) => (
                <button key={p.hari} type="button" disabled={disabled} onClick={() => set({ interval_hari: p.hari })}
                  className={`rounded-full px-2.5 h-7 text-xs border ${Number(v.interval_hari) === p.hari ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {target && <p className="text-xs text-gray-500">Target kontrol: <b className="text-gray-700 dark:text-gray-200">{new Date(`${target}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b></p>}
          <div>
            <label htmlFor={`${idPrefix}-tujuan`} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tujuan kontrol (opsional)</label>
            <input id={`${idPrefix}-tujuan`} maxLength={200} disabled={disabled} placeholder="mis. Lanjutan PSA, lepas jahitan"
              value={v.tujuan || ''} onChange={(e) => set({ tujuan: e.target.value })} className={inputCls} />
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" className="mt-0.5" checked={!!v.wajib} disabled={disabled} onChange={(e) => set({ wajib: e.target.checked })} />
            <span>
              <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-300"><AlertTriangle size={14} /> Recall wajib</span>
              <span className="block text-xs text-gray-500">Perawatan berisiko bila tidak dilanjutkan. Diprioritaskan di daftar & resepsionis diberi pengingat bila terlewat.</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
