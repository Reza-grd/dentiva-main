import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Calendar, Filter, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { paymentService } from '../../services/paymentService';

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const navigate = useNavigate();

  // Server-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadPayments();
  }, [page, pageSize, debouncedSearch, statusFilter, dateFilter]);

  const loadPayments = async () => {
    setLoading(true);
    const { success, data, count } = await paymentService.getAllPayments({
      page,
      limit: pageSize,
      searchTerm: debouncedSearch,
      statusFilter,
      dateFilter
    });
    if (success) {
      setPayments(data || []);
      setTotalCount(count || 0);
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

  const formatDate = (date) => {
    if (!date) return '-';
    const d = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(date.replace(/-/g, '/'))
      : new Date(date);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      partial: 'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    };
    const labels = {
      pending: 'Pending',
      paid: 'Lunas',
      partial: 'Cicilan',
      cancelled: 'Dibatalkan'
    };
    const icons = {
      pending: Clock,
      paid: CheckCircle,
      partial: DollarSign,
      cancelled: XCircle
    };
    const Icon = icons[status] || Clock;
    
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${badges[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'} flex items-center gap-1.5 w-fit`}>
        <Icon size={12} />
        {labels[status] || status}
      </span>
    );
  };

  const getFilteredPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.patient?.nama_lengkap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status_pembayaran === statusFilter);
    }

    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(p => {
        const payDate = new Date(p.created_at);
        return payDate.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => new Date(p.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(p => new Date(p.created_at) >= monthAgo);
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const filteredPayments = getFilteredPayments();

  const stats = {
    total: filteredPayments.reduce((sum, p) => sum + parseFloat(p.total_bayar || 0), 0),
    paid: filteredPayments.filter(p => p.status_pembayaran === 'paid').reduce((sum, p) => sum + parseFloat(p.total_bayar || 0), 0),
    pending: filteredPayments.filter(p => p.status_pembayaran === 'pending').reduce((sum, p) => sum + parseFloat(p.total_bayar || 0), 0),
    count: filteredPayments.length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 flex items-center justify-center">
            <DollarSign className="text-[var(--color-accent)]" size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Daftar Pembayaran</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola semua transaksi pembayaran klinik</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Transaksi</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.count}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="text-gray-600 dark:text-gray-400" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Total Semua</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.total)}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Sudah Lunas</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.paid)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle className="text-emerald-500" size={24} />
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">Pending</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.pending)}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="text-amber-500" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="glass-panel overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama pasien atau invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
                className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm appearance-none"
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini</option>
                <option value="week">7 Hari Terakhir</option>
                <option value="month">30 Hari Terakhir</option>
              </select>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm appearance-none"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Lunas</option>
                <option value="partial">Cicilan</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Tidak ada pembayaran yang ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Tanggal</th>
                  <th className="px-6 py-4 font-semibold">Invoice</th>
                  <th className="px-6 py-4 font-semibold">Pasien</th>
                  <th className="px-6 py-4 font-semibold">Total</th>
                  <th className="px-6 py-4 font-semibold">Metode</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-1 rounded">
                        {payment.invoice_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {payment.patient?.nama_lengkap}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {payment.patient?.no_rm}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(payment.total_bayar)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-700 dark:text-gray-300 capitalize bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full text-xs">
                        {payment.metode_pembayaran}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(payment.status_pembayaran)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/pembayaran/${payment.visit_id}`)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination UI */}
        {!loading && totalCount > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Menampilkan <span className="text-gray-900 dark:text-white font-bold">{(page - 1) * pageSize + 1}</span> - <span className="text-gray-900 dark:text-white font-bold">{Math.min(page * pageSize, totalCount)}</span> dari <span className="text-gray-900 dark:text-white font-bold">{totalCount}</span> pembayaran
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Sebelumnya
              </button>

              <button
                onClick={() => setPage(p => Math.min(p + 1, Math.ceil(totalCount / pageSize)))}
                disabled={page === Math.ceil(totalCount / pageSize) || totalCount === 0}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentList;
