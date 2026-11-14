import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { financialService } from '../../services/financialService';
import { paymentService } from '../../services/paymentService';
import { parseDateLocal } from '../../utils/dateUtils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3, Download, RefreshCw, Receipt } from 'lucide-react';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';

const FinancialDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadFinancialData();
  }, [dateRange]);

  const loadFinancialData = async () => {
    setLoading(true);

    // Get date range
    const endDate = new Date().toISOString().split('T')[0];
    let startDate;
    switch (dateRange) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    // Load financial summary
    const summaryResult = await financialService.getFinancialSummary(startDate, endDate);
    if (summaryResult.success) {
      setStats(summaryResult.data);
    }

    // Load revenue by period
    const revenueLimitDays = dateRange === 'week' ? 7 : dateRange === 'year' ? 365 : 30;
    const revenueResult = await financialService.getRevenueByPeriod('daily', revenueLimitDays);
    if (revenueResult.success) {
      const formattedRevenue = revenueResult.data.map(item => ({
        // TIMEZONE FIX: parseDateLocal mencegah off-by-one saat string DATE diparsing sebagai UTC
        date: item.tanggal ? parseDateLocal(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-',
        revenue: parseFloat(item.total_revenue) || 0,
        transactions: item.total_transactions || 0
      }));
      setRevenueData(formattedRevenue);
    }

    // Load expenses by category
    const expensesResult = await financialService.getExpensesByCategory(startDate, endDate);
    if (expensesResult.success) {
      setExpensesByCategory(expensesResult.data);
    }

    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Angka ringkas untuk sumbu grafik: 1,2 jt · 850 rb
  const ringkas = (v) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : v >= 1e3 ? `${Math.round(v / 1e3)} rb` : `${v}`);
  const persen = (v) => `${(Number.isFinite(v) ? v : 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;

  const pendapatan = stats?.totalRevenue || 0;
  const pengeluaran = stats?.totalExpenses || 0;
  const laba = stats?.netIncome ?? pendapatan - pengeluaran;
  const margin = stats?.profitMargin ?? (pendapatan > 0 ? (laba / pendapatan) * 100 : 0);
  const rasioOperasional = pendapatan > 0 ? (pengeluaran / pendapatan) * 100 : 0;
  const adaGrafik = revenueData.some((d) => d.revenue > 0);
  const totalKategori = expensesByCategory.reduce((n, e) => n + (Number(e.total) || 0), 0);
  const labelPeriode = dateRange === 'week' ? '7 hari terakhir' : dateRange === 'year' ? 'tahun ini' : 'bulan ini';

  // Catatan singkat yang jujur terhadap data, tanpa pujian berlebihan.
  const catatan = pendapatan === 0 && pengeluaran === 0
    ? 'Belum ada transaksi pada periode ini.'
    : pendapatan === 0
      ? 'Ada pengeluaran, tetapi belum ada pendapatan tercatat pada periode ini.'
      : margin >= 30
        ? 'Margin laba sehat: lebih dari 30% pendapatan menjadi laba.'
        : margin >= 15
          ? 'Margin laba wajar. Tinjau pengeluaran terbesar untuk menaikkannya.'
          : margin >= 0
            ? 'Margin laba tipis. Pengeluaran menyerap sebagian besar pendapatan.'
            : 'Pengeluaran melebihi pendapatan pada periode ini.';
  const tooltipGaya = { backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '8px', fontSize: '13px' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-medium leading-tight text-text-primary">Laporan Keuangan</h1>
            <p className="text-text-muted">Pendapatan, pengeluaran, dan laba klinik, {labelPeriode}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Date Range Filter */}
          <div className="flex bg-background p-1 rounded-xl border border-border">
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'week'
                  ? 'bg-card text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'month'
                  ? 'bg-card text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setDateRange('year')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                dateRange === 'year'
                  ? 'bg-card text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Tahun Ini
            </button>
          </div>
          
          <button
            onClick={loadFinancialData}
            className="flex items-center gap-2 px-3 py-2 rounded-xl glass-input text-sm text-text-primary hover:bg-background transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            <span className="hidden sm:inline">Muat ulang</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-primary text-white text-sm font-semibold transition-colors shadow-sm border-0 hover:opacity-90"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Ringkasan angka */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Pendapatan" value={formatCurrency(pendapatan)} />
            <StatCard label="Pengeluaran" value={formatCurrency(pengeluaran)} />
            <StatCard label="Laba bersih" value={formatCurrency(laba)} tone={laba < 0 ? 'bahaya' : 'netral'} />
            <StatCard label="Margin laba" value={persen(margin)} hint={pendapatan > 0 ? `Rasio operasional ${persen(rasioOperasional)}` : undefined} />
          </div>

          {/* Tren pendapatan */}
          <section className="rounded-xl border border-border bg-card p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2 className="text-base font-semibold text-text-primary">Tren pendapatan</h2>
              <span className="text-xs text-text-muted">{dateRange === 'week' ? '7 hari terakhir' : dateRange === 'year' ? '1 tahun terakhir' : '30 hari terakhir'} · harian</span>
            </div>
            {adaGrafik ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="isiPendapatan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.14} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-muted)" tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted)" tickLine={false} axisLine={false} tickFormatter={ringkas} width={52} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Pendapatan']} contentStyle={tooltipGaya} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-accent)" strokeWidth={2} fill="url(#isiPendapatan)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState compact icon={BarChart3} title="Belum ada pendapatan pada periode ini" description="Grafik terisi otomatis setelah pembayaran pertama tercatat di kasir." />
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Laba rugi ringkas */}
            <section className="lg:col-span-3 rounded-xl border border-border bg-card p-5 md:p-6">
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <h2 className="text-base font-semibold text-text-primary">Laba rugi ringkas</h2>
                <span className="text-xs text-text-muted">{labelPeriode}</span>
              </div>
              <dl className="text-sm tabular-nums">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-text-muted">Pendapatan</dt>
                  <dd className="text-text-primary">{formatCurrency(pendapatan)}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5 border-t border-border">
                  <dt className="text-text-muted">Pengeluaran</dt>
                  <dd className="text-text-primary">({formatCurrency(pengeluaran)})</dd>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-text-primary/60">
                  <dt className="font-semibold text-text-primary">Laba bersih</dt>
                  <dd className={`text-base font-semibold ${laba < 0 ? 'text-red-700 dark:text-red-400' : 'text-text-primary'}`}>{formatCurrency(laba)}</dd>
                </div>
              </dl>

              {/* Porsi pengeluaran terhadap pendapatan */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-text-muted mb-1.5">
                  <span>Pengeluaran terhadap pendapatan</span>
                  <span className="tabular-nums">{pendapatan > 0 ? persen(rasioOperasional) : '–'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden" aria-hidden="true">
                  <div className={`h-full rounded-full ${rasioOperasional > 100 ? 'bg-red-600' : 'bg-accent-primary'}`} style={{ width: `${Math.min(100, rasioOperasional)}%` }} />
                </div>
              </div>
              <p className="mt-4 pt-4 border-t border-border text-sm text-text-muted">{catatan}</p>
            </section>

            {/* Pengeluaran per kategori */}
            <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5 md:p-6">
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <h2 className="text-base font-semibold text-text-primary">Pengeluaran per kategori</h2>
                {totalKategori > 0 && (
                  <button type="button" onClick={() => navigate('/admin/pengeluaran')} className="text-xs font-medium text-accent-primary hover:underline">Lihat rincian</button>
                )}
              </div>
              {expensesByCategory.length === 0 ? (
                <EmptyState
                  compact icon={Receipt} title="Belum ada pengeluaran"
                  description="Catat pengeluaran klinik agar rinciannya tampil di sini."
                  action={<button type="button" onClick={() => navigate('/admin/pengeluaran')} className="text-sm font-medium text-accent-primary hover:underline">Catat pengeluaran</button>}
                />
              ) : (
                <ul className="space-y-3.5">
                  {[...expensesByCategory].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0)).map((e) => {
                    const porsi = totalKategori > 0 ? ((Number(e.total) || 0) / totalKategori) * 100 : 0;
                    return (
                      <li key={e.kategori || 'lainnya'}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-text-primary truncate">{e.kategori || 'Lainnya'}</span>
                          <span className="tabular-nums text-text-primary whitespace-nowrap">
                            {formatCurrency(e.total)} <span className="text-xs text-text-muted ml-1">{persen(porsi)}</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden" aria-hidden="true">
                          <div className="h-full rounded-full bg-accent-primary/70" style={{ width: `${porsi}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialDashboard;
