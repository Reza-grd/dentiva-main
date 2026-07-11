import { useToast } from '../common/ToastNotification';
import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, Calendar, BarChart3, Users, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../common/LoadingSpinner';
import { financialService } from '../../services/financialService';
import { treatmentService } from '../../services/treatmentService';
import { dashboardService } from '../../services/dashboardService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TREATMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ReportsPage = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // BUG S-01 FIX: state untuk data real dari API (bukan dummy hardcoded)
  const [treatmentDistribution, setTreatmentDistribution] = useState([]);
  const [patientGrowth, setPatientGrowth] = useState([]);

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, selectedYear]);

  const loadReportData = async () => {
    setLoading(true);

    // BUG S-01 FIX: fetch treatmentDistribution & patientGrowth dari API nyata
    const [stats, monthlyData, treatmentData, visitsData] = await Promise.all([
      financialService.getDashboardStatistics(),
      financialService.getMonthlyReport(selectedYear),
      treatmentService.getPopularTreatments(6),
      dashboardService.getMonthlyVisits(selectedYear),
    ]);

    setReportData({
      stats: stats.data,
      monthly: monthlyData.data || [],
    });

    // BUG S-01 FIX: map ke format yang dipakai chart, bukan hardcoded dummy
    setTreatmentDistribution(
      (treatmentData.data || []).map((item, index) => ({
        name: item.nama,
        value: item.jumlah,
        color: TREATMENT_COLORS[index % TREATMENT_COLORS.length],
      }))
    );

    setPatientGrowth(
      (visitsData.data || []).map((item) => ({
        month: item.label,
        patients: item.kunjungan,
      }))
    );

    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleExport = (format) => {
    if (format === 'pdf') {
      try {
        if (!reportData) return;
        const doc = new jsPDF();
        
        // Title & Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('Laporan Keuangan & Kunjungan Klinik Dentiva', 14, 20);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tahun: ${selectedYear}`, 14, 28);
        doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 34);
        
        // Key Metrics Summary
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Ringkasan Keuangan (Bulan Ini):', 14, 45);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Pendapatan: ${formatCurrency(reportData.stats?.monthRevenue)}`, 14, 52);
        doc.text(`Total Pengeluaran: ${formatCurrency(reportData.stats?.monthExpenses)}`, 14, 58);
        doc.text(`Pendapatan Bersih: ${formatCurrency(reportData.stats?.monthNetIncome)}`, 14, 64);
        doc.text(`Total Pasien: ${reportData.stats?.totalPatients || 0} (${reportData.stats?.todayVisits || 0} hari ini)`, 14, 70);

        // Table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Rincian Kinerja Bulanan:', 14, 82);

        const tableHeaders = [['Bulan', 'Pendapatan', 'Pengeluaran', 'Pendapatan Bersih', 'Kunjungan']];
        const tableRows = (reportData.monthly || []).map((item, idx) => [
          `${item.monthName} ${selectedYear}`,
          formatCurrency(item.totalRevenue),
          formatCurrency(item.totalExpenses),
          formatCurrency(item.netIncome),
          `${patientGrowth[idx]?.patients || 0} kunjungan`
        ]);

        doc.autoTable({
          startY: 86,
          head: tableHeaders,
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [124, 58, 237] }, // Purple accent
          styles: { fontSize: 9 }
        });

        doc.save(`Laporan_Dentiva_${selectedYear}.pdf`);
        toast.success('Laporan PDF berhasil diunduh!');
      } catch (err) {
        console.error('PDF export error:', err);
        toast.error('Gagal mengekspor PDF: ' + err.message);
      }
    } else if (format === 'excel') {
      try {
        if (!reportData) return;

        // 1. Sheet Ringkasan
        const summaryData = [
          ['Kategori Laporan', 'Nilai'],
          ['Tahun Laporan', selectedYear],
          ['Total Pendapatan (Bulan Ini)', reportData.stats?.monthRevenue || 0],
          ['Total Pengeluaran (Bulan Ini)', reportData.stats?.monthExpenses || 0],
          ['Pendapatan Bersih (Bulan Ini)', reportData.stats?.monthNetIncome || 0],
          ['Total Pasien Terdaftar', reportData.stats?.totalPatients || 0],
          ['Kunjungan Hari Ini', reportData.stats?.todayVisits || 0],
        ];
        const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);

        // 2. Sheet Bulanan
        const monthlyData = [
          ['Bulan', 'Pendapatan', 'Pengeluaran', 'Pendapatan Bersih', 'Jumlah Kunjungan']
        ];
        (reportData.monthly || []).forEach((item, idx) => {
          monthlyData.push([
            `${item.monthName} ${selectedYear}`,
            item.totalRevenue,
            item.totalExpenses,
            item.netIncome,
            patientGrowth[idx]?.patients || 0
          ]);
        });
        const monthlyWS = XLSX.utils.aoa_to_sheet(monthlyData);

        // 3. Sheet Tindakan Populer
        const treatmentData = [
          ['Nama Tindakan', 'Jumlah Penggunaan']
        ];
        treatmentDistribution.forEach(item => {
          treatmentData.push([item.name, item.value]);
        });
        const treatmentWS = XLSX.utils.aoa_to_sheet(treatmentData);

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, summaryWS, 'Ringkasan');
        XLSX.utils.book_append_sheet(wb, monthlyWS, 'Kinerja Bulanan');
        XLSX.utils.book_append_sheet(wb, treatmentWS, 'Tindakan Terpopuler');

        XLSX.writeFile(wb, `Laporan_Dentiva_${selectedYear}.xlsx`);
        toast.success('Laporan Excel berhasil diunduh!');
      } catch (err) {
        console.error('Excel export error:', err);
        toast.error('Gagal mengekspor Excel: ' + err.message);
      }
    }
  };

  // BUG K-02 FIX: pakai reportData.monthly dari getMonthlyReport(), bukan dummy hardcoded
  const monthlyRevenue = reportData?.monthly || [];

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <TrendingUp className="text-[var(--color-accent)]" size={32} />
          Laporan & Analisis
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Dashboard analisis bisnis klinik</p>
      </div>

      {/* Controls */}
      <div className="glass-panel mb-6 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Periode
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="glass-input px-4 py-2 rounded-lg text-sm"
              >
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
                <option value="quarter">Kuartal Ini</option>
                <option value="year">Tahun Ini</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="glass-input px-4 py-2 rounded-lg text-sm"
              >
                {[2024, 2025, 2026].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download size={16} />
              Export PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm hover:bg-[var(--color-accent-secondary)] transition-colors shadow-lg shadow-[var(--color-accent)]/20"
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
            <DollarSign className="text-green-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(reportData?.stats?.monthRevenue || 0)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">↑ 12% vs bulan lalu</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-red-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Expenses</p>
            <DollarSign className="text-red-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(reportData?.stats?.monthExpenses || 0)}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">↑ 5% vs bulan lalu</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(reportData?.stats?.monthNetIncome || 0)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">↑ 18% vs bulan lalu</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Pasien</p>
            <Users className="text-purple-500" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {reportData?.stats?.totalPatients || 0}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">+{reportData?.stats?.todayVisits || 0} hari ini</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue vs Expenses — BUG K-02 + K-01 FIX: pakai monthlyRevenue dari state, field totalRevenue/totalExpenses */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-[var(--color-accent)]" />
            Revenue vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
              {/* BUG K-01 FIX: dataKey pakai monthName (bukan month) */}
              <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 12}} className="text-gray-500 dark:text-gray-400"/>
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 12}} className="text-gray-500 dark:text-gray-400"/>
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: 'var(--color-tooltip-bg, #fff)', color: 'var(--color-tooltip-text, #374151)', border: '1px solid var(--color-tooltip-border, #e5e7eb)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {/* BUG K-01 FIX: dataKey pakai totalRevenue & totalExpenses */}
              <Bar dataKey="totalRevenue" name="Revenue" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="totalExpenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Treatment Distribution — BUG S-01 FIX: pakai state treatmentDistribution */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-[var(--color-accent)]" />
            Distribusi Treatment
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={treatmentDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                stroke="var(--color-background, #fff)"
                strokeWidth={2}
              >
                {treatmentDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-tooltip-bg, #fff)', color: 'var(--color-tooltip-text, #374151)', border: '1px solid var(--color-tooltip-border, #e5e7eb)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Patient Growth — BUG S-01 FIX: pakai state patientGrowth */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-[var(--color-accent)]" />
            Pertumbuhan Pasien
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={patientGrowth}>
              <defs>
                <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.2)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 12}} className="text-gray-500 dark:text-gray-400" />
              <YAxis axisLine={false} tickLine={false} tick={{fill: 'currentColor', fontSize: 12}} className="text-gray-500 dark:text-gray-400" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--color-tooltip-bg, #fff)', color: 'var(--color-tooltip-text, #374151)', border: '1px solid var(--color-tooltip-border, #e5e7eb)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="patients"
                name="Pasien Baru"
                stroke="var(--color-accent)"
                strokeWidth={3}
                dot={{ fill: 'var(--color-accent)', r: 4, strokeWidth: 2, stroke: 'var(--color-background, #fff)' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Table */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ringkasan Bulanan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bulan</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net Profit</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pasien</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-transparent">
              {monthlyRevenue.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  {/* BUG K-01 FIX: item.monthName (bukan item.month) */}
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">{item.monthName} {selectedYear}</td>
                  {/* BUG K-01 FIX: item.totalRevenue (bukan item.revenue) */}
                  <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 font-semibold">
                    {formatCurrency(item.totalRevenue)}
                  </td>
                  {/* BUG K-01 FIX: item.totalExpenses (bukan item.expenses) */}
                  <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 font-semibold">
                    {formatCurrency(item.totalExpenses)}
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400 font-bold bg-blue-50/30 dark:bg-blue-500/10">
                    {formatCurrency(item.totalRevenue - item.totalExpenses)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {patientGrowth[index]?.patients || 0} <span className="text-gray-400 text-xs font-normal">kunjungan</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
