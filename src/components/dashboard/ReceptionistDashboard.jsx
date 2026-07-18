import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { visitService } from '../../services/visitService';
import { paymentService } from '../../services/paymentService';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import { getGreeting, formatDateFull, formatRupiah } from '../../utils/dateUtils';
import {
  UserPlus, DollarSign, Calendar, AlertCircle, CheckCircle,
  Clock, RefreshCw, Activity, ArrowRight, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    scheduled: { label: 'Terjadwal',   cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    ongoing:   { label: 'Berlangsung', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    completed: { label: 'Selesai',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    cancelled: { label: 'Dibatalkan',  cls: 'bg-red-50 text-red-600 border border-red-200' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600 border border-gray-200' };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${cls}`}>
      {label}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, iconBg, iconColor, valueColor, loading, subtitle }) => (
  <Card className="group relative overflow-hidden border-0 bg-white/60 dark:bg-gray-900/60 shadow-sm backdrop-blur-xl">
    <div className="absolute -right-6 -top-6 opacity-5 dark:opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
      <Icon size={120} />
    </div>
    <CardContent className="p-5">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
        </div>
      ) : (
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 ${iconBg} dark:bg-gray-800/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
            <Icon className={iconColor} size={22} />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const ReceptionistDashboard = () => {
  const [todayVisits, setTodayVisits] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleUpdateStatus = async (visitId, newStatus) => {
    try {
      const res = await visitService.updateVisit(visitId, { status: newStatus });
      if (res.success) {
        toast.success(`Status kunjungan berhasil diubah menjadi ${newStatus === 'ongoing' ? 'Berlangsung' : 'Selesai'}`);
        loadDashboardData();
        if (newStatus === 'completed') {
          navigate(`/resepsionis/pembayaran/${visitId}`);
        }
      } else {
        toast.error(res.error || 'Gagal mengubah status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Terjadi kesalahan saat mengubah status');
    }
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const [visitsResult, paymentsResult] = await Promise.all([
      visitService.getTodayVisits(),
      paymentService.getPendingPayments(),
    ]);
    if (visitsResult.success) setTodayVisits(visitsResult.data || []);
    if (paymentsResult.success) setPendingPayments(paymentsResult.data || []);
    setLoading(false);
  }, []);

  
  useEffect(() => {
    loadDashboardData();

    // Subscribe to realtime visits changes
    const visitsChannel = supabase.channel('public:visits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(visitsChannel);
    };
  }, [loadDashboardData]);


  const sudahBayar = todayVisits.filter((v) => v.status === 'completed').length;
  const belumBayar = pendingPayments.length;
  const totalPending = pendingPayments.reduce((s, p) => s + parseFloat(p.total_bayar || 0), 0);

  // Mini bar chart — 7 hari (placeholder from available data)
  const weekData = Array.from({ length: 7 }, (_, i) => ({
    day: ['Sen','Sel','Rab','Kam','Jum','Sab','Min'][i],
    kunjungan: i === 6 ? todayVisits.length : 0,
  }));

  return (
    <Routes>
      <Route index element={
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, {userProfile?.full_name || 'Resepsionis'}! 👋
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{formatDateFull(new Date())}</p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                onClick={() => navigate('/pasien/daftar')}
                className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                <UserPlus size={15} />
                Tambah Kunjungan
              </button>
              <button
                onClick={loadDashboardData}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-input text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors shadow-sm"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* ── Stats Row ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Antrian Hari Ini"
              value={todayVisits.length}
              icon={Calendar}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              valueColor="text-indigo-600"
              loading={loading}
            />
            <StatCard
              label="Sudah Selesai"
              value={sudahBayar}
              icon={CheckCircle}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              valueColor="text-emerald-600"
              loading={loading}
            />
            <StatCard
              label="Belum Bayar"
              value={belumBayar}
              icon={Clock}
              iconBg="bg-amber-50"
              iconColor="text-amber-500"
              valueColor="text-amber-600"
              loading={loading}
            />
            <StatCard
              label="Total Pending"
              value={formatRupiah(totalPending)}
              icon={DollarSign}
              iconBg="bg-red-50"
              iconColor="text-red-500"
              valueColor="text-red-600"
              loading={loading}
              subtitle="belum terbayar"
            />
          </div>

          {/* ── Antrian Real-time ────────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <CardTitle className="text-base font-bold text-gray-900 dark:text-gray-100">Antrian Real-time</CardTitle>
              </div>
              <Badge variant="default" className="bg-gray-100 text-gray-500">
                {todayVisits.length} antrian
              </Badge>
            </CardHeader>
            <CardContent className="p-0">

            {loading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3 items-center">
                    <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div className="w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : todayVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400 dark:text-gray-500 gap-3">
                <Calendar size={44} className="opacity-30" />
                <p className="text-sm font-medium">Belum ada antrian hari ini</p>
                <Button onClick={() => navigate('/pasien/daftar')} className="mt-1">
                  + Daftarkan Pasien
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">No</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pasien</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Jam</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Dokter</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {todayVisits.map((visit, idx) => (
                      <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{visit.patient?.nama_lengkap}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{visit.patient?.no_rm}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400 font-medium">
                          {visit.jam_kunjungan ? visit.jam_kunjungan.slice(0, 5) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">
                          {visit.dokter?.full_name || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={visit.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {visit.status === 'scheduled' && (
                              <button
                                onClick={() => handleUpdateStatus(visit.id, 'ongoing')}
                                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                Mulai Perawatan
                              </button>
                            )}
                            {visit.status === 'ongoing' && (
                              <button
                                onClick={() => handleUpdateStatus(visit.id, 'completed')}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                Selesai Perawatan
                              </button>
                            )}
                            {visit.status === 'completed' && visit.payments?.[0]?.status_pembayaran !== 'paid' && (
                              <button
                                onClick={() => navigate(`/pembayaran/${visit.id}`)}
                                className="px-3 py-1.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white text-xs font-semibold rounded-lg transition-colors"
                              >
                                Bayar
                              </button>
                            )}
                            {visit.payments?.[0]?.status_pembayaran === 'paid' && (
                              <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-lg">
                                Lunas
                              </span>
                            )}
                            <button
                              onClick={() => navigate(`/pasien/${visit.patient_id}`)}
                              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors"
                            >
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

          {/* ── Bottom Row ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Pembayaran Pending */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-gray-100 dark:border-gray-800">
                <AlertCircle size={18} className="text-amber-500" />
                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pembayaran Pending</CardTitle>
                {belumBayar > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                    {belumBayar}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0">
              {pendingPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-10 text-gray-400 dark:text-gray-500 gap-2">
                  <CheckCircle size={36} className="text-emerald-400 opacity-60" />
                  <p className="text-sm">Semua pembayaran sudah lunas!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-64 overflow-y-auto">
                  {pendingPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <DollarSign size={14} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {payment.patient?.nama_lengkap || payment.visit?.patient?.nama_lengkap}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{payment.invoice_number}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{formatRupiah(payment.total_bayar)}</p>
                        <button
                          onClick={() => navigate(`/pembayaran/${payment.visit_id}`)}
                          className="text-xs text-[var(--color-accent)] hover:underline font-medium"
                        >
                          Proses →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pendingPayments.length > 5 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => navigate('/resepsionis/pembayaran')}
                    className="text-sm text-[var(--color-accent)] hover:underline font-medium"
                  >
                    Lihat semua ({pendingPayments.length}) →
                  </button>
                </div>
              )}
              </CardContent>
            </Card>

            {/* Quick stats + mini bar + quick actions */}
            <div className="space-y-4">
              {/* Mini chart */}
              <Card>
                <CardHeader className="py-4">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-[var(--color-accent)]" />
                    <CardTitle className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Kunjungan Minggu Ini</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                <ResponsiveContainer width="100%" height={70}>
                  <BarChart data={weekData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <Bar dataKey="kunjungan" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'Inter, sans-serif' }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow px-2 py-1 text-xs">
                            <span className="font-semibold">{label}: </span>{payload[0].value} kunjungan
                          </div>
                        ) : null
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Akses Cepat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button
                    onClick={() => navigate('/pasien/daftar')}
                    className="w-full flex items-center justify-between p-3 bg-blue-50/50 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-xl text-blue-700 dark:text-blue-400 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserPlus size={16} />
                      <span className="font-medium text-sm">Daftarkan Pasien Baru</span>
                    </div>
                    <ArrowRight size={15} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => navigate('/pasien')}
                    className="w-full flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users size={16} />
                      <span className="font-medium text-sm">Data Pasien</span>
                    </div>
                    <ArrowRight size={15} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      } />
    </Routes>
  );
};

export default ReceptionistDashboard;
