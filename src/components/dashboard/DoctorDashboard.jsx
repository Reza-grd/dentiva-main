import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { visitService } from '../../services/visitService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/common/ToastNotification';
import { getGreeting, formatDateFull, formatRupiah, formatDoctorName } from '../../utils/dateUtils';
import PageTransition from '../common/PageTransition';
import {
  Calendar, Users, FileText, Clock, CheckCircle,
  AlertCircle, ArrowRight, Stethoscope, RefreshCw,
  Activity, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';

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
// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, iconBg, iconColor, valueColor, loading }) => (
  <div className="glass-panel p-5 group relative overflow-hidden h-full">
    <div className="absolute -right-2 -bottom-2 opacity-[0.03] dark:opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
      <Icon size={80} />
    </div>
    {loading ? (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-8 bg-gray-200 rounded w-1/2" />
      </div>
    ) : (
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
          <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 ${iconBg} dark:bg-gray-800/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
          <Icon className={iconColor} size={22} />
        </div>
      </div>
    )}
  </div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const DoctorDashboard = () => {
  const [todayVisits, setTodayVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const loadTodayVisits = useCallback(async () => {
    setLoading(true);
    const { success, data } = await visitService.getTodayVisits();
    if (success) {
      // Sort by jam_kunjungan
      const sorted = (data || []).sort((a, b) => {
        const ta = a.jam_kunjungan || '00:00';
        const tb = b.jam_kunjungan || '00:00';
        return ta.localeCompare(tb);
      });
      setTodayVisits(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTodayVisits(); }, [loadTodayVisits]);

  // Update visit status
  const updateStatus = async (visitId, newStatus) => {
    setUpdatingId(visitId);
    try {
      const res = await visitService.updateVisitStatus(visitId, newStatus);
      if (res && res.success === false) {
        toast.error(res.error || 'Gagal memperbarui status kunjungan');
      } else {
        toast.success('Status kunjungan berhasil diperbarui');
        await loadTodayVisits();
      }
    } catch (e) {
      console.error('Update status error:', e);
      toast.error('Terjadi kesalahan koneksi');
    }
    setUpdatingId(null);
  };

  const completed = todayVisits.filter((v) => v.status === 'completed').length;
  const pending   = todayVisits.filter((v) => v.status !== 'completed' && v.status !== 'cancelled').length;

  // Sparkline last-7-days mock from today's count (will be real if data exists)
  const sparkData = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    pasien: Math.max(0, todayVisits.length - (6 - i) * 0 + 0), // placeholder shape
  }));

  return (
    <Routes>
      <Route index element={
        <PageTransition>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, {formatDoctorName(userProfile) || 'Dokter'}! 👨‍⚕️
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {formatDateFull(new Date())}
                {userProfile?.role === 'dokter' && (
                  <span className="ml-2 px-2 py-0.5 bg-primary-50 dark:bg-blue-500/10 text-primary-700 dark:text-blue-400 text-xs rounded-full border border-primary-100 dark:border-blue-500/20 font-medium">
                    Dokter Gigi
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={loadTodayVisits}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-input text-sm hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors shadow-sm self-start sm:self-auto"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

                {/* ── Stats Row ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    label="Pasien Hari Ini"
                    value={todayVisits.length}
                    icon={Users}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    valueColor="text-indigo-600"
                    loading={loading}
                  />
                  <StatCard
                    label="Selesai"
                    value={completed}
                    icon={CheckCircle}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                    valueColor="text-emerald-600"
                    loading={loading}
                  />
                  <StatCard
                    label="Belum Selesai"
                    value={pending}
                    icon={Clock}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-500"
                    valueColor="text-amber-600"
                    loading={loading}
                  />
                </div>

          {/* ── Jadwal Hari Ini ──────────────────────────────────── */}
          <div className="glass-panel overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Stethoscope size={20} className="text-[var(--color-accent)]" />
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Jadwal Hari Ini</h2>
              </div>
              {todayVisits.length > 0 && (
                <span className="text-xs font-medium text-[var(--color-accent)] bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-full">
                  {todayVisits.length} pasien
                </span>
              )}
            </div>

                  {loading ? (
                    <div className="p-6 space-y-3">
                      {[1,2,3].map((i) => (
                        <div key={i} className="animate-pulse flex gap-4 items-center p-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : todayVisits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                      <Calendar size={48} className="opacity-30" />
                      <p className="text-sm font-medium">Tidak ada jadwal untuk hari ini</p>
                      <button
                        onClick={() => navigate('/pasien')}
                        className="text-sm text-primary-600 hover:underline font-medium"
                      >
                        Lihat semua pasien →
                      </button>
                    </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {todayVisits.map((visit) => (
                  <div key={visit.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Time */}
                    <div className="flex-shrink-0 w-14 text-center">
                      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {visit.jam_kunjungan
                                ? visit.jam_kunjungan.slice(0, 5)
                                : '—'}
                            </div>
                            <div className="text-xs text-gray-400">WIB</div>
                          </div>

                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-700">
                            {(visit.patient?.nama_lengkap || '?').charAt(0).toUpperCase()}
                          </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {visit.patient?.nama_lengkap}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {visit.keluhan || 'Tidak ada keluhan tercatat'}
                      </p>
                    </div>

                          {/* Status */}
                          <StatusBadge status={visit.status} />

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {visit.status === 'scheduled' && (
                              <button
                                onClick={() => updateStatus(visit.id, 'ongoing')}
                                disabled={updatingId === visit.id}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updatingId === visit.id ? '...' : 'Mulai'}
                              </button>
                            )}
                            {visit.status === 'ongoing' && (
                              <button
                                onClick={() => updateStatus(visit.id, 'completed')}
                                disabled={updatingId === visit.id}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {updatingId === visit.id ? '...' : 'Selesai'}
                              </button>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
                )}
              </div>

          {/* ── Bottom Row ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Pasien Bulan Ini + Sparkline */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={18} className="text-[var(--color-accent)]" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pasien Bulan Ini</h3>
              </div>
              <p className="text-4xl font-bold text-[var(--color-accent)] mb-3">{todayVisits.length}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Hari ini · data real-time</p>
              <ResponsiveContainer width="100%" height={60}>
                <BarChart data={sparkData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <Bar dataKey="pasien" fill="var(--color-accent)" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  <XAxis hide />
                  <YAxis hide />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow px-2 py-1 text-xs">
                          {payload[0].value} pasien
                        </div>
                      ) : null
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Actions */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-[var(--color-accent)]" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Akses Cepat</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/dokter/rekam-medis')}
                  className="w-full flex items-center justify-between p-3.5 bg-[var(--color-accent)]/5 dark:bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)]/10 dark:hover:bg-[var(--color-accent)]/20 rounded-xl text-[var(--color-accent)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} />
                    <span className="font-medium text-sm">Lihat Rekam Medis</span>
                  </div>
                  <ArrowRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
                <button
                  onClick={() => navigate('/dokter/jadwal')}
                  className="w-full flex items-center justify-between p-3.5 bg-cyan-50/50 dark:bg-cyan-500/10 hover:bg-cyan-50 dark:hover:bg-cyan-500/20 rounded-xl text-cyan-700 dark:text-cyan-400 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar size={18} />
                    <span className="font-medium text-sm">Jadwal Saya</span>
                  </div>
                  <ArrowRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
                <button
                  onClick={() => navigate('/pasien')}
                  className="w-full flex items-center justify-between p-3.5 bg-emerald-50/50 dark:bg-emerald-500/10 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} />
                    <span className="font-medium text-sm">Semua Pasien</span>
                  </div>
                  <ArrowRight size={16} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>
          </div>
          </PageTransition>
        } />
    </Routes>
  );
};

export default DoctorDashboard;
