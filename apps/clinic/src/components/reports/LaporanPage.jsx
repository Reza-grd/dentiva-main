import React, { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, TrendingUp } from 'lucide-react';

// Dulu "Lap. Keuangan" (/keuangan) dan "Laporan" (/admin/laporan) berdiri sebagai dua menu terpisah dengan
// angka yang sama (pendapatan, pengeluaran, laba). Kini satu menu "Laporan" dengan dua tab.
const FinancialDashboard = lazy(() => import('../financial/FinancialDashboard'));
const ReportsPage = lazy(() => import('./ReportsPage'));

const TABS = [
  { id: 'keuangan', label: 'Keuangan', hint: 'Pendapatan, pengeluaran, laba per periode', icon: BarChart3 },
  { id: 'tahunan', label: 'Tahunan & Kunjungan', hint: 'Ringkasan bulanan, kunjungan, tindakan terpopuler, PDF', icon: TrendingUp },
];

export default function LaporanPage() {
  const [params, setParams] = useSearchParams();
  const aktif = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'keuangan';

  return (
    <div>
      <div role="tablist" aria-label="Jenis laporan" className="flex flex-wrap gap-2 mb-5">
        {TABS.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-laporan-${id}`}
            aria-selected={aktif === id}
            aria-controls={`panel-laporan-${id}`}
            title={hint}
            onClick={() => setParams({ tab: id }, { replace: true })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              aktif === id
                ? 'bg-accent-primary text-white border-transparent shadow-sm'
                : 'bg-card text-text-muted border-border hover:text-text-primary'
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-laporan-${aktif}`} aria-labelledby={`tab-laporan-${aktif}`}>
        <Suspense fallback={<div className="py-16 text-center text-text-muted">Memuat laporan…</div>}>
          {aktif === 'keuangan' ? <FinancialDashboard /> : <ReportsPage />}
        </Suspense>
      </div>
    </div>
  );
}
