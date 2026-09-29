import React, { useState } from 'react';
import { Search, ShieldCheck, AlertTriangle, X, Loader } from 'lucide-react';
import { supabase } from '../../services/supabase';

/**
 * Pencarian obat di Kamus Farmasi & Alat Kesehatan (KFA) resmi SATUSEHAT lewat
 * Edge Function satusehat-kfa. Kode tidak bisa diketik bebas: hanya produk hasil
 * pencarian yang bisa dipilih, lalu diverifikasi ulang oleh server saat disimpan.
 *
 * value:    { kode_kfa, kfa_nama, kfa_verified_at, kfa_bentuk_sediaan_nama } (dari master_bahan)
 * selected: produk KFA yang dipilih tapi belum disimpan (atau null)
 */
const KfaPicker = ({ value, selected, onSelect, onClear, defaultKeyword = '' }) => {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    const kw = keyword.trim();
    if (kw.length < 3) {
      setError('Ketik minimal 3 huruf nama obat / zat aktif.');
      return;
    }
    setSearching(true);
    setError('');
    const { data, error: fnError } = await supabase.functions.invoke('satusehat-kfa', {
      body: { action: 'search', keyword: kw },
    });
    setSearching(false);
    if (fnError || data?.error) {
      let msg = data?.error;
      if (!msg && fnError?.context) {
        msg = await fnError.context.json().then((b) => b?.error).catch(() => null);
      }
      setError(msg || 'Gagal menghubungi KFA SATUSEHAT.');
      setResults(null);
      return;
    }
    setResults(data.items || []);
  };

  const current = selected
    ? { code: selected.kfa_code, name: selected.name, form: selected.dosage_form_name, verified: false, pending: true }
    : value?.kode_kfa
      ? { code: value.kode_kfa, name: value.kfa_nama, form: value.kfa_bentuk_sediaan_nama, verified: Boolean(value.kfa_verified_at) }
      : null;

  return (
    <div className="space-y-2">
      {current && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            current.verified
              ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900'
              : 'border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900'
          }`}
        >
          {current.verified ? (
            <ShieldCheck size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-gray-500">KFA {current.code}</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{current.name || 'Nama KFA belum tersedia'}</p>
            {current.form && <p className="text-xs text-gray-500">{current.form}</p>}
            <p className="text-[11px] mt-1 text-gray-600 dark:text-gray-400">
              {current.verified
                ? 'Terverifikasi dari KFA SATUSEHAT — resep obat ini dikirim ke SATUSEHAT.'
                : current.pending
                  ? 'Akan diverifikasi ke KFA SATUSEHAT saat Anda menyimpan.'
                  : 'Belum terverifikasi — resep obat ini TIDAK dikirim ke SATUSEHAT. Cari & pilih ulang dari KFA.'}
            </p>
          </div>
          <button type="button" onClick={onClear} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Hapus kode KFA">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Cari nama obat / zat aktif, mis. amoxicillin 500"
          className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          aria-label="Cari obat di KFA"
        />
        <button
          type="button"
          onClick={search}
          disabled={searching}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm disabled:opacity-60"
        >
          {searching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />} Cari di KFA
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {results && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {results.length === 0 ? (
            <p className="p-3 text-xs text-gray-500">Tidak ada produk KFA yang cocok.</p>
          ) : (
            results.map((r) => (
              <button
                type="button"
                key={r.kfa_code}
                disabled={!r.active}
                onClick={() => {
                  onSelect(r);
                  setResults(null);
                }}
                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.name}</p>
                <p className="text-[11px] text-gray-500 font-mono">
                  KFA {r.kfa_code}
                  {r.dosage_form_name ? ` · ${r.dosage_form_name}` : ''}
                  {r.manufacturer ? ` · ${r.manufacturer}` : ''}
                  {!r.active ? ' · tidak aktif' : ''}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default KfaPicker;
