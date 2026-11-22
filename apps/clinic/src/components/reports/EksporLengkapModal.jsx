import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { X, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '@dentiva/ui';
import { PRESET_PERIODE, hitungPeriode, formatTanggal } from '../../utils/periodeEkspor';
import { susunEksporLengkap, buatWorkbook, namaBerkasEkspor, URUTAN_SHEET } from '../../utils/eksporLengkap';
import { kumpulkanDataEkspor, catatAuditEkspor } from '../../services/eksporService';
import { useAuth } from '../../contexts/AuthContext';
import { useClinicSettingsOptional } from '../../contexts/ClinicSettingsContext';

/** Jendela "Ekspor Lengkap Klinik": pilih periode → satu berkas Excel berisi keuangan, bahan, dan laporan. */
export default function EksporLengkapModal({ onClose }) {
  const { user, userProfile } = useAuth();
  const { settings } = useClinicSettingsOptional() || {};
  const [preset, setPreset] = useState('bulan_lalu');
  const [mulai, setMulai] = useState('');
  const [akhir, setAkhir] = useState('');
  const [sertakanNama, setSertakanNama] = useState(false);
  const [proses, setProses] = useState('');
  const [galat, setGalat] = useState('');

  const periode = useMemo(() => hitungPeriode(preset, { mulai, akhir }), [preset, mulai, akhir]);

  const unduh = async () => {
    if (periode.error) { setGalat(periode.error); return; }
    setGalat('');
    try {
      setProses('Menyiapkan…');
      const data = await kumpulkanDataEkspor(periode, { sertakanNama, onTahap: (t) => setProses(`Mengambil ${t.toLowerCase()}…`) });
      setProses('Menyusun berkas Excel…');
      const klinik = settings?.clinic_name || '';
      const sheets = susunEksporLengkap({
        ...data,
        klinik: { name: klinik },
        dibuatOleh: userProfile?.full_name || user?.email || '',
        dibuatPada: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      }, { sertakanNama });
      XLSX.writeFile(buatWorkbook(sheets), namaBerkasEkspor(klinik, periode));
      catatAuditEkspor(periode, { sertakanNama, role: userProfile?.role });
      setProses('');
      onClose?.();
    } catch (e) {
      setProses('');
      setGalat(`Ekspor gagal: ${e?.message || e}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="judul-ekspor-lengkap">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-border">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 id="judul-ekspor-lengkap" className="font-semibold text-lg text-text-primary flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-accent-primary" /> Ekspor Lengkap Klinik
          </h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary" aria-label="Tutup" disabled={Boolean(proses)}><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <p className="text-sm text-text-muted">
            Satu berkas Excel berisi keuangan, bahan, dan laporan untuk periode yang dipilih. Urutan sheet selalu sama, sehingga mudah
            dibandingkan antarbulan atau dikirim ke akuntan.
          </p>

          <fieldset>
            <legend className="text-sm font-medium text-text-primary mb-2">Periode</legend>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_PERIODE.map((p) => (
                <label key={p.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${preset === p.id ? 'border-accent-primary bg-accent-primary/5 text-text-primary' : 'border-border text-text-muted'} ${p.id === 'rentang' ? 'col-span-2' : ''}`}>
                  <input type="radio" name="preset-periode" value={p.id} checked={preset === p.id} onChange={() => setPreset(p.id)} />
                  {p.label}
                </label>
              ))}
            </div>
            {preset === 'rentang' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm text-text-muted">Dari
                  <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
                </label>
                <label className="text-sm text-text-muted">Sampai
                  <input type="date" value={akhir} onChange={(e) => setAkhir(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary" />
                </label>
              </div>
            )}
            {!periode.error && (
              <p className="mt-2 text-sm text-text-primary" data-testid="ringkas-periode">
                {periode.label}: {formatTanggal(periode.mulai)} s.d. {formatTanggal(periode.akhir)}
              </p>
            )}
          </fieldset>

          <label className="flex items-start gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={sertakanNama} onChange={(e) => setSertakanNama(e.target.checked)} className="mt-1" />
            <span>
              Sertakan nama pasien di sheet Transaksi
              <span className="block text-xs text-text-muted">Bawaan: hanya No. RM. Berkas dengan nama pasien termasuk data pribadi — simpan dengan aman.</span>
            </span>
          </label>

          <details className="text-sm text-text-muted">
            <summary className="cursor-pointer">Isi berkas ({URUTAN_SHEET.length} sheet)</summary>
            <p className="mt-2">{URUTAN_SHEET.join(' · ')}</p>
          </details>

          {galat && <p className="text-sm text-red-600" role="alert">{galat}</p>}
          {proses && <p className="text-sm text-text-muted" aria-live="polite">{proses}</p>}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={Boolean(proses)}>Batal</Button>
          <Button className="gap-2" onClick={unduh} isLoading={Boolean(proses)} disabled={Boolean(periode.error) && preset !== 'rentang'}>
            <Download size={16} /> Unduh Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
