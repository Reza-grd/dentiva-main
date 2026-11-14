import { useToast } from '../common/ToastNotification';
import React, { useState, useEffect } from 'react';
import { usePermission } from '../../contexts/PermissionsContext';
import { useNavigate } from 'react-router-dom';
import { Download, BarChart3, Users, Lock, Stethoscope } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import LoadingSpinner from '../common/LoadingSpinner';
import StatCard from '../ui/StatCard';
import EmptyState from '../ui/EmptyState';
import { financialService } from '../../services/financialService';
import { treatmentService } from '../../services/treatmentService';
import { dashboardService } from '../../services/dashboardService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ReportsPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { hasFeature } = usePermission();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const canCustomReport = hasFeature('custom_reports');

  // BUG S-01 FIX: state untuk data real dari API (bukan dummy hardcoded)
  const [treatmentDistribution, setTreatmentDistribution] = useState([]);
  const [patientGrowth, setPatientGrowth] = useState([]);

  useEffect(() => {
    loadReportData();
  }, [selectedYear]);

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
      (treatmentData.data || []).map((item) => ({
        name: item.nama,
        value: item.jumlah,
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

  // Perbandingan nyata dengan bulan lalu (dulu angka 12% / 5% / 18% ditulis mati dan selalu tampil).
  const bulanLalu = (() => {
    const kini = new Date();
    if (Number(selectedYear) !== kini.getFullYear() || kini.getMonth() === 0) return null; // Januari: bulan lalu ada di tahun lain
    return (reportData?.monthly || [])[kini.getMonth() - 1] || null;
  })();
  const tren = (nilaiKini, kunci, naikBaik = true) => {
    const lalu = Number(bulanLalu?.[kunci] || 0);
    if (!bulanLalu || lalu === 0) return { teks: 'Belum ada pembanding bulan lalu', kelas: 'text-text-muted' };
    const persen = ((Number(nilaiKini || 0) - lalu) / Math.abs(lalu)) * 100;
    if (Math.abs(persen) < 0.5) return { teks: 'Sama dengan bulan lalu', kelas: 'text-text-muted' };
    const baik = persen > 0 === naikBaik;
    return {
      teks: `${persen > 0 ? '↑' : '↓'} ${Math.abs(persen).toLocaleString('id-ID', { maximumFractionDigits: 0 })}% vs bulan lalu`,
      kelas: baik ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
    };
  };
  const trenPendapatan = tren(reportData?.stats?.monthRevenue, 'totalRevenue');
  const trenPengeluaran = tren(reportData?.stats?.monthExpenses, 'totalExpenses', false);
  const trenLaba = tren(reportData?.stats?.monthNetIncome, 'netIncome');

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
        doc.text(`Laba Bersih: ${formatCurrency(reportData.stats?.monthNetIncome)}`, 14, 64);
        doc.text(`Total Pasien: ${reportData.stats?.totalPatients || 0} (${reportData.stats?.todayVisits || 0} hari ini)`, 14, 70);

        // Table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Rincian Kinerja Bulanan:', 14, 82);

        const tableHeaders = [['Bulan', 'Pendapatan', 'Pengeluaran', 'Laba Bersih', 'Kunjungan']];
        const tableRows = (reportData.monthly || []).map((item, idx) => [
          `${item.monthName} ${selectedYear}`,
          formatCurrency(item.totalRevenue),
          formatCurrency(item.totalExpenses),
          formatCurrency(item.netIncome),
          `${patientGrowth[idx]?.patients || 0} kunjungan`
        ]);

        autoTable(doc, {
          startY: 86,
          head: tableHeaders,
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [30, 41, 59] }, // slate gelap, netral
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

  // Angka ringkas untuk sumbu grafik: 1,2 jt · 850 rb
  const ringkas = (v) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : v >= 1e3 ? `${Math.round(v / 1e3)} rb` : `${v}`);
  const tooltipGaya = { backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)', borderRadius: '8px', fontSize: '13px' };
  const tahunPilihan = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);
  const total = monthlyRevenue.reduce((t, m, i) => ({
    pendapatan: t.pendapatan + (Number(m.totalRevenue) || 0),
    pengeluaran: t.pengeluaran + (Number(m.totalExpenses) || 0),
    kunjungan: t.kunjungan + (Number(patientGrowth[i]?.patients) || 0),
  }), { pendapatan: 0, pengeluaran: 0, kunjungan: 0 });
  const adaKeuangan = monthlyRevenue.some((m) => (Number(m.totalRevenue) || 0) + (Number(m.totalExpenses) || 0) > 0);
  const adaKunjungan = patientGrowth.some((m) => (Number(m.patients) || 0) > 0);
  const totalTindakan = treatmentDistribution.reduce((n, t) => n + (Number(t.value) || 0), 0);
  const ekspor = (format) => {
    if (!canCustomReport) {
      toast.showToast(`Ekspor ${format === 'pdf' ? 'PDF' : 'Excel'} tersedia di paket Pro dan Enterprise.`, 'warning');
      return;
    }
    handleExport(format);
  };
  const tombolEkspor = `flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${canCustomReport
    ? 'border-border bg-card text-text-primary hover:bg-background'
    : 'border-border bg-card text-text-muted'}`;

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Judul & alat */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-medium leading-tight text-text-primary">Laporan Tahunan & Kunjungan</h1>
          <p className="text-text-muted">Kinerja bulanan klinik sepanjang tahun {selectedYear}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="laporan-tahun">Tahun</label>
          <select
            id="laporan-tahun" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 rounded-lg border border-border bg-card text-sm text-text-primary"
          >
            {tahunPilihan.map((y) => <option key={y} value={y}>Tahun {y}</option>)}
          </select>
          <button type="button" onClick={() => ekspor('pdf')} className={tombolEkspor} title={canCustomReport ? 'Unduh PDF' : 'Tersedia di paket Pro'}>
            {canCustomReport ? <Download size={15} /> : <Lock size={14} />} PDF
          </button>
          <button type="button" onClick={() => ekspor('excel')} className={tombolEkspor} title={canCustomReport ? 'Unduh Excel' : 'Tersedia di paket Pro'}>
            {canCustomReport ? <Download size={15} /> : <Lock size={14} />} Excel
          </button>
        </div>
      </div>

      {/* Info paket (tenang, tanpa ajakan mencolok) */}
      {!canCustomReport && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm text-text-muted">
            <Lock size={14} className="inline -mt-0.5 mr-1.5 text-text-muted" />
            Ekspor PDF/Excel tersedia di paket Pro dan Enterprise.
          </p>
          <button type="button" onClick={() => navigate('/pricing')} className="text-sm font-medium text-accent-primary hover:underline whitespace-nowrap">
            Lihat paket
          </button>
        </div>
      )}

      {/* Bulan ini */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pendapatan bulan ini" value={formatCurrency(reportData?.stats?.monthRevenue)} hint={trenPendapatan.teks} />
        <StatCard label="Pengeluaran bulan ini" value={formatCurrency(reportData?.stats?.monthExpenses)} hint={trenPengeluaran.teks} />
        <StatCard label="Laba bersih bulan ini" value={formatCurrency(reportData?.stats?.monthNetIncome)} hint={trenLaba.teks} tone={(reportData?.stats?.monthNetIncome || 0) < 0 ? 'bahaya' : 'netral'} />
        <StatCard label="Total pasien" value={(reportData?.stats?.totalPatients || 0).toLocaleString('id-ID')} hint={`${reportData?.stats?.todayVisits || 0} kunjungan hari ini`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pendapatan vs pengeluaran per bulan */}
        <section className="lg:col-span-3 rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-text-primary">Pendapatan & pengeluaran per bulan</h2>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-accent-primary" /> Pendapatan</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-text-muted/40" /> Pengeluaran</span>
            </div>
          </div>
          {adaKeuangan ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyRevenue} barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="monthName" tick={{ fontSize: 12 }} stroke="var(--color-muted)" tickLine={false} axisLine={false} tickFormatter={(m) => String(m || '').slice(0, 3)} />
                <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted)" tickLine={false} axisLine={false} tickFormatter={ringkas} width={52} />
                <Tooltip formatter={(v, n) => [formatCurrency(v), n]} contentStyle={tooltipGaya} cursor={{ fill: 'var(--color-bg)' }} />
                <Bar dataKey="totalRevenue" name="Pendapatan" fill="var(--color-accent)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="totalExpenses" name="Pengeluaran" fill="var(--color-muted)" fillOpacity={0.4} radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState compact icon={BarChart3} title={`Belum ada transaksi di tahun ${selectedYear}`} description="Grafik terisi otomatis dari pembayaran dan pengeluaran yang tercatat." />
          )}
        </section>

        {/* Tindakan terpopuler */}
        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-5 md:p-6">
          <h2 className="text-base font-semibold text-text-primary mb-4">Tindakan terpopuler</h2>
          {treatmentDistribution.length === 0 ? (
            <EmptyState compact icon={Stethoscope} title="Belum ada tindakan tercatat" description="Daftar ini terisi dari tindakan yang dipilih dokter di rekam medis." />
          ) : (
            <ol className="space-y-3.5">
              {treatmentDistribution.map((t, i) => {
                const porsi = totalTindakan > 0 ? ((Number(t.value) || 0) / totalTindakan) * 100 : 0;
                return (
                  <li key={t.name || i}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-text-primary truncate"><span className="text-text-muted tabular-nums mr-2">{i + 1}.</span>{t.name}</span>
                      <span className="tabular-nums text-text-primary whitespace-nowrap">{(Number(t.value) || 0).toLocaleString('id-ID')}<span className="text-xs text-text-muted ml-1">kali</span></span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden" aria-hidden="true">
                      <div className="h-full rounded-full bg-accent-primary/70" style={{ width: `${porsi}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      {/* Kunjungan per bulan */}
      <section className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-base font-semibold text-text-primary">Kunjungan per bulan</h2>
          <span className="text-xs text-text-muted tabular-nums">{total.kunjungan.toLocaleString('id-ID')} kunjungan di {selectedYear}</span>
        </div>
        {adaKunjungan ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={patientGrowth} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="isiKunjungan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-muted)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted)" tickLine={false} axisLine={false} allowDecimals={false} width={36} />
              <Tooltip formatter={(v) => [`${v} kunjungan`, 'Kunjungan']} contentStyle={tooltipGaya} />
              <Area type="monotone" dataKey="patients" stroke="var(--color-accent)" strokeWidth={2} fill="url(#isiKunjungan)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState compact icon={Users} title={`Belum ada kunjungan di tahun ${selectedYear}`} description="Grafik terisi otomatis dari jadwal kunjungan yang tercatat." />
        )}
      </section>

      {/* Ringkasan bulanan */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Ringkasan bulanan {selectedYear}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th scope="col" className="px-5 md:px-6 py-3 text-left font-medium">Bulan</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Pendapatan</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Pengeluaran</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Laba bersih</th>
                <th scope="col" className="px-5 md:px-6 py-3 text-right font-medium">Kunjungan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monthlyRevenue.map((item, index) => {
                const labaBulan = (Number(item.totalRevenue) || 0) - (Number(item.totalExpenses) || 0);
                const kosong = !item.totalRevenue && !item.totalExpenses && !patientGrowth[index]?.patients;
                return (
                  <tr key={item.monthName || index} className={kosong ? 'text-text-muted' : 'text-text-primary'}>
                    <td className="px-5 md:px-6 py-2.5">{item.monthName}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(item.totalRevenue)}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(item.totalExpenses)}</td>
                    <td className={`px-4 py-2.5 text-right ${labaBulan < 0 ? 'text-red-700 dark:text-red-400' : ''}`}>{formatCurrency(labaBulan)}</td>
                    <td className="px-5 md:px-6 py-2.5 text-right">{(Number(patientGrowth[index]?.patients) || 0).toLocaleString('id-ID')}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-text-primary/60 font-semibold text-text-primary">
                <td className="px-5 md:px-6 py-3">Total {selectedYear}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(total.pendapatan)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(total.pengeluaran)}</td>
                <td className={`px-4 py-3 text-right ${total.pendapatan - total.pengeluaran < 0 ? 'text-red-700 dark:text-red-400' : ''}`}>{formatCurrency(total.pendapatan - total.pengeluaran)}</td>
                <td className="px-5 md:px-6 py-3 text-right">{total.kunjungan.toLocaleString('id-ID')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ReportsPage;
