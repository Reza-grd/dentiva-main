import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { financialService } from '../../services/financialService';
import { dashboardService } from '../../services/dashboardService';
import { visitService } from '../../services/visitService';
import { getGreeting, formatDateFull, formatRupiah } from '../../utils/dateUtils';
import {
  Users, Calendar, DollarSign, TrendingUp, Activity, AlertCircle,
  BarChart2, RefreshCw, ArrowUpRight, ArrowDownRight, CheckCircle,
  Clock, Stethoscope,
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, isCurrency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel p-3 text-sm min-w-[140px] z-50 relative">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-100 dark:border-gray-800 pb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between items-center gap-3 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-semibold" style={{ color: p.color }}>
            {isCurrency || p.dataKey.toLowerCase().includes('revenue') || p.dataKey.toLowerCase().includes('expense') || p.dataKey.toLowerCase().includes('income')
              ? formatRupiah(p.value)
              : p.value.toLocaleString('id-ID')}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, icon: Icon, iconBg, iconColor, trend, trendLabel, loading }) => (
  <Card className="group relative overflow-hidden h-full">
    <div className="absolute -right-6 -top-6 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
      <Icon size={120} />
    </div>
    <CardContent className="p-5 flex items-start justify-between relative z-10 h-full">
      {loading ? (
        <div className="animate-pulse space-y-3 w-full">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">{value}</p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                trend >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {trend >= 0
                  ? <ArrowUpRight size={14} />
                  : <ArrowDownRight size={14} />}
                <span>{Math.abs(trend)}% {trendLabel || 'dari bulan lalu'}</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 ${iconBg} dark:bg-gray-800/50 rounded-xl flex items-center justify-center ml-4 flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
            <Icon className={iconColor} size={22} />
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

// ─── Chart Card wrapper ──────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, loading, action }) => (
  <Card className="h-full flex flex-col">
    <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
      <div>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </CardHeader>
    <CardContent className="flex-1 pb-4">
      {loading ? (
        <div className="h-52 flex items-center justify-center">
          <div className="w-7 h-7 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : children}
    </CardContent>
  </Card>
);

// ─── Status badge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    scheduled:  { label: 'Terjadwal',   variant: 'primary' },
    ongoing:    { label: 'Berlangsung', variant: 'warning' },
    completed:  { label: 'Selesai',     variant: 'success' },
    cancelled:  { label: 'Batal',       variant: 'danger' },
  };
  const { label, variant } = map[status] || { label: status, variant: 'default' };
  return (
    <Badge variant={variant}>{label}</Badge>
  );
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();

  // stats
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  // charts
  const [dailyVisits, setDailyVisits] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  const [popularTreatments, setPopularTreatments] = useState([]);
  const [loadingTreatments, setLoadingTreatments] = useState(true);

  // recent activity
  const [recentVisits, setRecentVisits] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // ── loaders ─────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    const { success, data, error } = await financialService.getDashboardStatistics();
    if (success) setStats(data);
    else setStatsError(error);
    setLoadingStats(false);
  }, []);

  const loadVisits = useCallback(async () => {
    setLoadingVisits(true);
    const { success, data } = await dashboardService.getDailyVisits(30);
    if (success) setDailyVisits(data);
    setLoadingVisits(false);
  }, []);

  const loadRevenue = useCallback(async () => {
    setLoadingRevenue(true);
    const { success, data } = await dashboardService.getMonthlyRevenue(6);
    if (success) setMonthlyRevenue(data);
    setLoadingRevenue(false);
  }, []);

  const loadTreatments = useCallback(async () => {
    setLoadingTreatments(true);
    const { success, data } = await dashboardService.getPopularTreatments(5);
    if (success) setPopularTreatments(data);
    setLoadingTreatments(false);
  }, []);

  const loadRecentVisits = useCallback(async () => {
    setLoadingRecent(true);
    const { success, data } = await visitService.getTodayVisits();
    if (success) setRecentVisits((data || []).slice(0, 5));
    setLoadingRecent(false);
  }, []);

  const loadAll = useCallback(() => {
    loadStats();
    loadVisits();
    loadRevenue();
    loadTreatments();
    loadRecentVisits();
  }, [loadStats, loadVisits, loadRevenue, loadTreatments, loadRecentVisits]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const maxTreatment = Math.max(...popularTreatments.map((t) => t.jumlah), 1);

  return (
    <Routes>
      <Route index element={
        <div className="space-y-6">

          {/* ── Hero Section ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, Manajer Klinik! 👋
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {formatDateFull(new Date())} · Ringkasan klinik hari ini
              </p>
            </div>
            <button
              onClick={loadAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-input text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors shadow-sm self-start sm:self-auto"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {/* ── Error Banner ─────────────────────────────────────── */}
          {statsError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">Gagal memuat data: </span>
                {statsError}
              </div>
              <button onClick={loadStats} className="text-red-600 hover:text-red-800 font-medium underline">
                Coba lagi
              </button>
            </div>
          )}

          {/* ── KPI Cards ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    label="Total Pasien"
                    value={(stats?.totalPatients || 0).toLocaleString('id-ID')}
                    icon={Users}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    loading={loadingStats}
                  />
                  <KpiCard
                    label="Kunjungan Hari Ini"
                    value={(stats?.todayVisits || 0).toLocaleString('id-ID')}
                    icon={Calendar}
                    iconBg="bg-cyan-50"
                    iconColor="text-cyan-600"
                    loading={loadingStats}
                  />
                  <KpiCard
                    label="Pendapatan Hari Ini"
                    value={formatRupiah(stats?.todayRevenue || 0)}
                    icon={DollarSign}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    loading={loadingStats}
                  />
                  <KpiCard
                    label="Pendapatan Bulan Ini"
                    value={formatRupiah(stats?.monthRevenue || 0)}
                    icon={TrendingUp}
                    iconBg="bg-orange-50"
                    iconColor="text-orange-500"
                    loading={loadingStats}
                  />
                </div>

                {/* ── Chart Row ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Kunjungan 30 Hari */}
                  <ChartCard
                    title="Kunjungan 30 Hari"
                    subtitle="Tren kunjungan harian bulan ini"
                    loading={loadingVisits}
                  >
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={dailyVisits} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradVisit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-accent, #06b6d4)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="var(--color-accent, #06b6d4)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} interval={4} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="kunjungan"
                          name="Kunjungan"
                          stroke="var(--color-accent, #06b6d4)"
                          fill="url(#gradVisit)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, fill: 'var(--color-accent, #06b6d4)' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Revenue vs Expenses */}
                  <ChartCard
                    title="Revenue vs Expenses"
                    subtitle="Perbandingan 6 bulan terakhir"
                    loading={loadingRevenue}
                  >
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif' }} tickLine={false} axisLine={false}
                          tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}jt` : `${(v/1000).toFixed(0)}rb`}
                        />
                        <Tooltip content={<CustomTooltip isCurrency />} />
                        <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Inter, sans-serif', paddingTop: 8 }} />
                        <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="expense" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="netIncome" name="Net Income" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* ── Bottom Row ───────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Treatment Terpopuler */}
                  <ChartCard
                    title="Treatment Terpopuler"
                    subtitle="Top 5 tindakan paling sering dilakukan"
                    loading={loadingTreatments}
                  >
                    {popularTreatments.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
                        <BarChart2 size={36} className="opacity-30" />
                        <p className="text-sm">Belum ada data treatment</p>
                      </div>
                    ) : (
                      <div className="space-y-3 py-1">
                        {popularTreatments.map((t, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-center mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                                <span className="text-sm font-medium text-gray-800 truncate">{t.nama}</span>
                              </div>
                              <span className="text-sm font-bold text-gray-700 ml-3 flex-shrink-0">{t.jumlah}x</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 ml-6">
                              <div
                                className="h-2 rounded-full transition-all duration-700"
                                style={{
                                  width: `${(t.jumlah / maxTreatment) * 100}%`,
                                  background: ['#6366f1','#06b6d4','#10b981','#f59e0b','#f87171'][i] || '#6366f1',
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>

                  {/* Aktivitas Terbaru */}
                  <ChartCard
                    title="Aktivitas Terbaru"
                    subtitle="5 kunjungan hari ini"
                    loading={loadingRecent}
                    action={
                      <button
                        onClick={() => navigate('/jadwal')}
                        className="text-xs text-primary-600 hover:underline font-medium"
                      >
                        Lihat semua →
                      </button>
                    }
                  >
                    {recentVisits.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Clock size={36} className="opacity-30" />
                        <p className="text-sm">Belum ada kunjungan hari ini</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 py-1">
                        {recentVisits.map((visit) => (
                          <div key={visit.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                              <Stethoscope size={14} className="text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {visit.patient?.nama_lengkap || '—'}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {visit.keluhan || 'Tidak ada keluhan tercatat'}
                              </p>
                            </div>
                            <StatusBadge status={visit.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>
                </div>

                {/* ── Footer Banner ────────────────────────────────────── */}
                <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs text-gray-500">
                    Sistem berjalan normal · Terakhir diperbarui: <span className="font-medium text-gray-700">{new Date().toLocaleString('id-ID')}</span>
                  </p>
                </div>

              </div>
      } />
    </Routes>
  );
};

export default AdminDashboard;
