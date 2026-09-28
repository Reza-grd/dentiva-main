import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import { financialService } from '../../services/financialService';
import { paymentService } from '../../services/paymentService';
import { parseDateLocal } from '../../utils/dateUtils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, TrendingDown, Calendar, Download, RefreshCw } from 'lucide-react';

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp size={32} className="text-accent-primary" />
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-text-primary">Dashboard Keuangan</h1>
            <p className="text-text-muted">Laporan dan analisa keuangan klinik</p>
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
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-semibold transition-colors shadow-sm border-0 hover:opacity-90"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export (Cetak)</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-panel p-5 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none text-emerald-500">
                <TrendingUp size={100} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-text-muted mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(stats?.totalRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={24} />
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none text-rose-500">
                <TrendingDown size={100} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-text-muted mb-1">Total Expenses</p>
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(stats?.totalExpenses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center">
                  <TrendingDown className="text-rose-600 dark:text-rose-400" size={24} />
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none text-accent-primary">
                <DollarSign size={100} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-text-muted mb-1">Net Income</p>
                  <p className="text-2xl font-bold text-accent-primary">
                    {formatCurrency(stats?.netIncome)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent-primary/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="text-accent-primary" size={24} />
                </div>
              </div>
            </div>

            <div className="glass-panel p-5 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 dark:opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none text-amber-500">
                <Calendar size={100} />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm text-text-muted mb-1">Profit Margin</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {stats?.profitMargin?.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Calendar className="text-amber-600 dark:text-amber-400" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="glass-panel p-6 mb-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6">
              Grafik Pendapatan ({dateRange === 'week' ? '7 Hari Terakhir' : dateRange === 'year' ? '1 Tahun Terakhir' : '30 Hari Terakhir'})
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} stroke="var(--color-muted)" tickLine={false} axisLine={false} />
                <YAxis style={{ fontSize: '12px' }} stroke="var(--color-muted)" tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '12px' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-accent)"
                  strokeWidth={3}
                  name="Revenue"
                  dot={{ fill: 'var(--color-accent)' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue vs Expenses Bar Chart & Expenses Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Bar Chart */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-6">Revenue vs Expenses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  {
                    name: 'Financial',
                    Revenue: stats?.totalRevenue || 0,
                    Expenses: stats?.totalExpenses || 0,
                    'Net Income': stats?.netIncome || 0
                  }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="name" style={{ fontSize: '12px' }} stroke="var(--color-muted)" tickLine={false} axisLine={false} />
                  <YAxis style={{ fontSize: '12px' }} stroke="var(--color-muted)" tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '12px' }}
                    cursor={{fill: 'var(--color-bg)'}}
                  />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net Income" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - Expenses by Category */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-6">Expenses by Category</h3>
              {expensesByCategory.length === 0 ? (
                <p className="text-center text-text-muted py-12">Tidak ada data pengeluaran</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ kategori, percent }) => `${kategori} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        innerRadius={60}
                        paddingAngle={5}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {expensesByCategory.map((expense, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-text-primary">{expense.kategori}</span>
                        </div>
                        <span className="font-semibold text-text-primary">{formatCurrency(expense.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Financial Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="font-semibold text-lg mb-4 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                💰 Financial Health
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Operating Ratio:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats?.totalRevenue > 0
                      ? ((stats?.totalExpenses / stats?.totalRevenue) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Profit Margin:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats?.profitMargin?.toFixed(1)}%
                  </span>
                </div>
                <div className="pt-4 border-t border-emerald-500/20">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {stats?.profitMargin > 30
                      ? '✅ Performa keuangan sangat baik!'
                      : stats?.profitMargin > 15
                      ? '👍 Performa keuangan baik'
                      : '⚠️ Perlu optimasi pengeluaran'}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 bg-accent-primary/5 border border-accent-primary/20">
              <h3 className="font-semibold text-lg mb-4 text-accent-primary flex items-center gap-2">
                📊 Quick Stats
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Total Revenue:</span>
                  <span className="font-semibold text-accent-primary">
                    {formatCurrency(stats?.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Total Expenses:</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {formatCurrency(stats?.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-accent-primary/20">
                  <span className="text-text-primary font-semibold">Net Income:</span>
                  <span className="font-bold text-lg text-accent-primary">
                    {formatCurrency(stats?.netIncome)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialDashboard;
