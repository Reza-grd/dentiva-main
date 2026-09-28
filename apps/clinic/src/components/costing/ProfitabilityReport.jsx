import React, { useState, useEffect } from 'react';
import { Activity, Download, Filter, FileText } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import { costingService } from '../../services/costingService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useTheme } from '../../contexts/ThemeContext';

const ProfitabilityReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDarkMode } = useTheme();

  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().substring(0, 10), // Awal bulan
    endDate: new Date().toISOString().substring(0, 10)
  });

  useEffect(() => {
    loadReport();
  }, [dateRange]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    const res = await costingService.getProfitabilityReport(dateRange.startDate, dateRange.endDate);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Kalkulasi agregat
  const totalRevenue = data.reduce((sum, item) => sum + Number(item.harga_jual_saat_itu), 0);
  const totalCost = data.reduce((sum, item) => sum + Number(item.total_modal), 0);
  const totalMargin = data.reduce((sum, item) => sum + Number(item.margin), 0);
  const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  // Grup by treatment untuk chart (Top 5 Margin)
  const treatmentStats = data.reduce((acc, curr) => {
    const tName = curr.visit_treatment?.treatment?.nama_treatment || 'Unknown';
    if (!acc[tName]) acc[tName] = { name: tName, margin: 0, count: 0 };
    acc[tName].margin += Number(curr.margin);
    acc[tName].count += 1;
    return acc;
  }, {});

  const chartData = Object.values(treatmentStats)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Laporan Profitabilitas Perawatan', 14, 20);
    doc.setFontSize(10);
    doc.text(`Periode: ${dateRange.startDate} s/d ${dateRange.endDate}`, 14, 28);
    
    doc.text(`Total Pendapatan: ${formatCurrency(totalRevenue)}`, 14, 38);
    doc.text(`Total Modal: ${formatCurrency(totalCost)}`, 14, 44);
    doc.text(`Total Keuntungan Bersih: ${formatCurrency(totalMargin)}`, 14, 50);

    const tableColumn = ["Tanggal", "Perawatan", "Harga Jual", "Modal (Bahan+Ovh)", "Margin", "Margin %"];
    const tableRows = data.map(item => [
      new Date(item.visit_treatment?.visit?.tanggal_kunjungan).toLocaleDateString('id-ID'),
      item.visit_treatment?.treatment?.nama_treatment,
      formatCurrency(item.harga_jual_saat_itu),
      formatCurrency(item.total_modal),
      formatCurrency(item.margin),
      `${Number(item.margin_percent).toFixed(1)}%`
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 76, 129] }
    });

    doc.save(`Profitabilitas_${dateRange.startDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Activity className="text-primary-600" />
          Laporan Profitabilitas Perawatan
        </h3>
        <div className="flex gap-2 w-full md:w-auto">
          <input 
            type="date"
            value={dateRange.startDate}
            onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <span className="py-2 text-gray-500">s/d</span>
          <input 
            type="date"
            value={dateRange.endDate}
            onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <button 
            onClick={exportPDF}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 ml-auto md:ml-2"
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20"><LoadingSpinner /></div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Pendapatan</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-gray-400 mt-2">Dari {data.length} transaksi selesai</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Modal / HPP</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totalCost)}</p>
              <p className="text-xs text-gray-400 mt-2">Bahan + Overhead</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Keuntungan Bersih (Margin)</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalMargin)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Rata-rata Margin %</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-1">{avgMarginPercent.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Top 5 */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Top 5 Kontributor Margin</h4>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: isDarkMode ? '#9ca3af' : '#4b5563' }} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', color: isDarkMode ? '#f3f4f6' : '#111827' }}
                      />
                      <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#0ea5e9'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">Tidak ada data untuk grafik</div>
                )}
              </div>
            </div>

            {/* Rincian Transaksi */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[350px]">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">Rincian per Transaksi Perawatan</h4>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tanggal</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Perawatan</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Pendapatan</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Modal</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.visit_treatment?.visit?.tanggal_kunjungan).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-200">
                          {item.visit_treatment?.treatment?.nama_treatment}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-200">
                          {formatCurrency(item.harga_jual_saat_itu)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          {formatCurrency(item.total_modal)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                          {formatCurrency(item.margin)}
                          <div className="text-[10px] font-normal">{Number(item.margin_percent).toFixed(1)}%</div>
                        </td>
                      </tr>
                    ))}
                    {data.length === 0 && (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">Belum ada transaksi di periode ini</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitabilityReport;
