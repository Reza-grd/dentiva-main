import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package, FileSpreadsheet, Wallet, Plus, Boxes, AlertTriangle, Layers, Receipt, Check, ArrowRight,
} from 'lucide-react';
import OverheadCosts from './OverheadCosts';
import MasterBahan from './MasterBahan';
import TreatmentBOM from './TreatmentBOM';
import MaterialPurchases from './MaterialPurchases';
import StockMovements from './StockMovements';
import StockOpname from './StockOpname';
import ProfitabilityReport from './ProfitabilityReport';
import { inventoryService } from '../../services/inventoryService';
import { costingService } from '../../services/costingService';

/**
 * Biaya & Modal — dikelompokkan mengikuti alur kerja:
 *   Gudang (harian)  →  Resep & HPP (per tindakan)  →  Biaya Operasional (bulanan).
 * Posisi tab tersimpan di URL (?tab=…&sub=…) sehingga tautan dari Eira/kartu usulan membuka bagian yang tepat.
 */
export const SEKSI = [
  {
    id: 'gudang', label: 'Gudang', icon: Package, ket: 'Bahan, stok masuk, pergerakan, dan opname',
    sub: [
      { id: 'bahan', label: 'Daftar Bahan', Isi: MasterBahan },
      { id: 'masuk', label: 'Stok Masuk', Isi: MaterialPurchases },
      { id: 'kartu', label: 'Kartu Stok', Isi: StockMovements },
      { id: 'opname', label: 'Stok Opname', Isi: StockOpname },
    ],
  },
  {
    id: 'resep', label: 'Resep & HPP', icon: FileSpreadsheet, ket: 'Bahan per tindakan dan margin setelah HPP',
    sub: [
      { id: 'bom', label: 'Resep Bahan', Isi: TreatmentBOM },
      { id: 'profit', label: 'Profitabilitas', Isi: ProfitabilityReport },
    ],
  },
  {
    id: 'operasional', label: 'Biaya Operasional', icon: Wallet, ket: 'Biaya tetap bulanan & alokasinya ke tindakan',
    sub: [{ id: 'overhead', label: 'Biaya Operasional', Isi: OverheadCosts }],
  },
];

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

function useRingkasan(kunci) {
  const [r, setR] = useState(null);
  useEffect(() => {
    let batal = false;
    Promise.all([inventoryService.getMasterBahan(), costingService.getOverheadCosts()]).then(([b, o]) => {
      if (batal) return;
      const bahan = (b?.success && Array.isArray(b.data) ? b.data : []).filter((x) => x.is_active !== false);
      const biaya = (o?.success && Array.isArray(o.data) ? o.data : []).filter((x) => x.aktif);
      setR({
        jumlahBahan: bahan.length,
        nilaiStok: bahan.reduce((s, x) => s + Math.max(0, Number(x.stok_saat_ini) || 0) * (Number(x.harga_rata2) || 0), 0),
        habis: bahan.filter((x) => Number(x.stok_saat_ini) <= 0).length,
        menipis: bahan.filter((x) => Number(x.stok_saat_ini) > 0 && Number(x.stok_saat_ini) <= Number(x.stok_minimum || 0)).length,
        biayaBulanan: biaya.reduce((s, x) => s + (Number(x.jumlah_bulanan) || 0), 0),
        jumlahBiaya: biaya.length,
      });
    });
    return () => { batal = true; };
  }, [kunci]);
  return r;
}

function Kpi({ icon: Icon, label, nilai, ket, nada = 'netral', onClick }) {
  const warna = { netral: 'text-accent-primary bg-accent-primary/10', waspada: 'text-amber-600 bg-amber-500/10 dark:text-amber-400', baik: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400' }[nada];
  return (
    <button type="button" onClick={onClick}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-accent-primary/40 hover:shadow-md">
      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${warna}`}><Icon size={19} /></span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-text-muted">{label}</span>
        <span className="mt-0.5 block truncate text-lg font-bold tracking-tight text-text-primary">{nilai}</span>
        <span className="block text-xs text-text-muted group-hover:text-accent-primary transition-colors">{ket}</span>
      </span>
    </button>
  );
}

export default function CostingDashboard() {
  const [params, setParams] = useSearchParams();
  const seksi = SEKSI.find((s) => s.id === params.get('tab')) || SEKSI[0];
  const sub = seksi.sub.find((s) => s.id === params.get('sub')) || seksi.sub[0];
  const buka = useCallback((tab, s) => setParams(s ? { tab, sub: s } : { tab }, { replace: true }), [setParams]);
  const r = useRingkasan(`${seksi.id}/${sub.id}`); // dihitung ulang saat berpindah bagian (setelah ada perubahan)
  const Isi = sub.Isi;

  const langkah = r ? [
    { ok: r.jumlahBiaya > 0, label: 'Isi biaya operasional bulanan', ke: ['operasional'] },
    { ok: r.jumlahBahan > 0, label: 'Tambahkan bahan ke gudang', ke: ['gudang', 'bahan'] },
    { ok: false, label: 'Atur resep bahan tiap tindakan', ke: ['resep', 'bom'], opsional: true },
  ] : [];
  const perluPanduan = r && (r.jumlahBiaya === 0 || r.jumlahBahan === 0);

  return (
    <div className="space-y-6">
      {/* Judul + aksi cepat */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Biaya & Modal</h1>
          <p className="mt-1 text-sm text-text-muted">Kelola gudang, resep bahan per tindakan, dan biaya operasional untuk menghitung HPP serta margin.</p>
        </div>
        <button type="button" onClick={() => buka('gudang', 'masuk')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 transition-opacity">
          <Plus size={16} /> Catat stok masuk
        </button>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan biaya dan modal">
        {!r ? [0, 1, 2, 3].map((i) => <div key={i} className="h-[84px] animate-pulse rounded-2xl border border-border bg-card" />) : (
          <>
            <Kpi icon={Boxes} label="Nilai stok gudang" nilai={rupiah(r.nilaiStok)} ket={`${r.jumlahBahan} bahan aktif`} onClick={() => buka('gudang', 'bahan')} />
            <Kpi icon={AlertTriangle} label="Perlu dipesan" nada={r.jumlahBahan === 0 ? 'netral' : r.habis + r.menipis > 0 ? 'waspada' : 'baik'}
              nilai={r.jumlahBahan === 0 ? '–' : r.habis + r.menipis > 0 ? `${r.habis + r.menipis} bahan` : 'Stok aman'}
              ket={r.jumlahBahan === 0 ? 'Belum ada bahan di gudang' : r.habis + r.menipis > 0 ? `${r.habis} habis · ${r.menipis} menipis` : 'Semua di atas minimum'}
              onClick={() => buka('gudang', 'bahan')} />
            <Kpi icon={Layers} label="Resep & margin" nilai="Per tindakan" ket="Lihat HPP dan profitabilitas" onClick={() => buka('resep', 'profit')} />
            <Kpi icon={Receipt} label="Biaya operasional / bulan" nilai={rupiah(r.biayaBulanan)} ket={`${r.jumlahBiaya} pos biaya aktif`} onClick={() => buka('operasional')} />
          </>
        )}
      </div>

      {/* Langkah awal: hanya tampil selama data dasar belum lengkap */}
      {perluPanduan && (
        <div className="rounded-2xl border border-accent-primary/25 bg-accent-primary/5 p-4">
          <p className="text-sm font-semibold text-text-primary">Langkah awal agar HPP terhitung otomatis</p>
          <ol className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-4">
            {langkah.map((l, i) => (
              <li key={l.label}>
                <button type="button" onClick={() => buka(...l.ke)}
                  className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent-primary transition-colors">
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${l.ok ? 'bg-emerald-500 text-white' : 'bg-accent-primary/15 text-accent-primary'}`}>
                    {l.ok ? <Check size={12} /> : i + 1}
                  </span>
                  <span className={l.ok ? 'line-through' : ''}>{l.label}</span>
                  {!l.ok && <ArrowRight size={13} />}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Navigasi utama: tiga kelompok */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="tablist" aria-label="Bagian Biaya & Modal">
        {SEKSI.map((s) => {
          const Icon = s.icon;
          const aktif = s.id === seksi.id;
          return (
            <button key={s.id} type="button" role="tab" aria-selected={aktif} onClick={() => buka(s.id)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${aktif
                ? 'border-transparent bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-md'
                : 'border-border bg-card text-text-primary hover:border-accent-primary/40'}`}>
              <Icon size={20} className={aktif ? 'text-white' : 'text-accent-primary'} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{s.label}</span>
                <span className={`block truncate text-xs ${aktif ? 'text-white/80' : 'text-text-muted'}`}>{s.ket}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Isi bagian, dengan sub-tab bila ada lebih dari satu */}
      <section className="glass-panel overflow-hidden" role="tabpanel" aria-label={`${seksi.label} · ${sub.label}`}>
        {seksi.sub.length > 1 && (
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-background/50 px-3 pt-2 no-scrollbar" aria-label={`Sub-bagian ${seksi.label}`}>
            {seksi.sub.map((s) => {
              const aktif = s.id === sub.id;
              return (
                <button key={s.id} type="button" onClick={() => buka(seksi.id, s.id)} aria-current={aktif ? 'page' : undefined}
                  className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${aktif
                    ? 'border-accent-primary text-accent-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'}`}>
                  {s.label}
                </button>
              );
            })}
          </nav>
        )}
        <div className="p-4 md:p-6">
          <Isi key={`${seksi.id}/${sub.id}`} />
        </div>
      </section>
    </div>
  );
}
