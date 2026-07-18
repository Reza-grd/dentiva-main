import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { Shield, Clock, User, AlertTriangle, Info, AlertOctagon, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

// ─── Risk Level Badge ─────────────────────────────────────────────────────────
const RiskBadge = ({ level }) => {
  const cfg = {
    LOW:      { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  icon: Info           },
    MEDIUM:   { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertTriangle  },
    HIGH:     { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertTriangle  },
    CRITICAL: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',          icon: AlertOctagon   },
  };
  const { color, icon: Icon } = cfg[level] || cfg.LOW;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <Icon size={11} />
      {level}
    </span>
  );
};

// ─── AuditLogPage ─────────────────────────────────────────────────────────────
const AuditLogPage = () => {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [riskFilter, setRiskFilter]     = useState('');
  const [searchUser, setSearchUser]     = useState('');

  // Pagination
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;

      let query = supabase
        .from('audit_logs')
        .select(`
          id, timestamp, module, action, user_role, risk_level, ip_address,
          actor:users!audit_logs_user_id_fkey(full_name, email),
          patient:patients!audit_logs_patient_id_fkey(nama_lengkap, no_rm)
        `, { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (dateFrom)     query = query.gte('timestamp', dateFrom);
      if (dateTo)       query = query.lte('timestamp', dateTo + 'T23:59:59');
      if (moduleFilter) query = query.ilike('module', `%${moduleFilter}%`);
      if (riskFilter)   query = query.eq('risk_level', riskFilter);

      const { data, error, count } = await query;
      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Audit log fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, moduleFilter, riskFilter]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, moduleFilter, riskFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatTs = (ts) =>
    new Date(ts).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield size={24} className="text-blue-500" />
            Audit Log
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Riwayat seluruh aksi yang tercatat di sistem — {totalCount.toLocaleString('id-ID')} entri total
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Modul</label>
            <input
              type="text"
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              placeholder="Cari modul..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tingkat Risiko</label>
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <RefreshCw size={24} className="animate-spin mr-2" />
            Memuat log...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
            <Shield size={40} className="opacity-30" />
            <p className="text-sm">Tidak ada log yang sesuai filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <Clock size={12} className="inline mr-1" />Waktu
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <User size={12} className="inline mr-1" />Pengguna
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modul</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pasien</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Risiko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {formatTs(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {log.actor?.full_name || '—'}
                      </div>
                      <div className="text-xs text-gray-400">{log.user_role || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={log.action}>
                      {log.action}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {log.patient ? (
                        <span>{log.patient.no_rm}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={log.risk_level || 'LOW'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Halaman {page} dari {totalPages} ({totalCount.toLocaleString('id-ID')} entri)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
