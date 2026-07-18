import { supabase } from './supabase.js';
import { getTodayLocal, getLocalDateRange, formatLocalISO } from '../utils/dateUtils.js';

export const dashboardService = {
  // ─── Kunjungan harian 30 hari terakhir ───────────────────────────────────
  async getDailyVisits(days = 30) {
    try {
      const startDate = getLocalDateRange(days).start;

      const { data, error } = await supabase
        .from('visits')
        .select('tanggal_kunjungan')
        .gte('tanggal_kunjungan', startDate)
        .order('tanggal_kunjungan', { ascending: true });

      if (error) throw error;

      // Build full date range
      const dateMap = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = formatLocalISO(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
        dateMap[d] = 0;
      }

      (data || []).forEach((v) => {
        const d = v.tanggal_kunjungan;
        if (dateMap[d] !== undefined) dateMap[d]++;
      });

      const result = Object.entries(dateMap).map(([tanggal, kunjungan]) => ({
        tanggal,
        label: new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
        }),
        kunjungan,
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('getDailyVisits error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // ─── Kunjungan bulanan 12 bulan terakhir ─────────────────────────────────
  async getMonthlyVisits(monthsOrYear = 12) {
    try {
      let startDate, endDate;
      let yearMode = false;
      let targetYear;

      if (monthsOrYear > 1000) {
        yearMode = true;
        targetYear = monthsOrYear;
        startDate = `${targetYear}-01-01`;
        endDate = `${targetYear}-12-31`;
      } else {
        startDate = formatLocalISO(new Date(new Date().getFullYear(), new Date().getMonth() - monthsOrYear + 1, 1));
        endDate = getTodayLocal();
      }

      let query = supabase
        .from('visits')
        .select('tanggal_kunjungan')
        .gte('tanggal_kunjungan', startDate);

      if (yearMode) {
        query = query.lte('tanggal_kunjungan', endDate);
      }

      const { data, error } = await query.order('tanggal_kunjungan', { ascending: true });

      if (error) throw error;

      // Build months map
      const monthMap = {};
      if (yearMode) {
        for (let m = 1; m <= 12; m++) {
          const key = `${targetYear}-${String(m).padStart(2, '0')}`;
          monthMap[key] = {
            label: new Date(targetYear, m - 1).toLocaleDateString('id-ID', { month: 'short' }),
            kunjungan: 0,
          };
        }
      } else {
        for (let i = monthsOrYear - 1; i >= 0; i--) {
          const d = new Date(
            new Date().getFullYear(),
            new Date().getMonth() - i,
            1
          );
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          monthMap[key] = {
            label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
            kunjungan: 0,
          };
        }
      }

      (data || []).forEach((v) => {
        const key = v.tanggal_kunjungan.substring(0, 7);
        if (monthMap[key]) monthMap[key].kunjungan++;
      });

      const result = Object.entries(monthMap).map(([, val]) => val);
      return { success: true, data: result };
    } catch (error) {
      console.error('getMonthlyVisits error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // ─── Revenue harian via v_daily_revenue ──────────────────────────────────
  async getDailyRevenue(days = 30) {
    try {
      const startDate = getLocalDateRange(days).start;
      const endDate = getTodayLocal();

      const { data, error } = await supabase
        .from('v_daily_revenue')
        .select('*')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true });

      if (error) throw error;

      // Fill gaps
      const dateMap = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = formatLocalISO(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
        dateMap[d] = { revenue: 0, transaksi: 0 };
      }

      (data || []).forEach((row) => {
        const d =
          typeof row.tanggal === 'string'
            ? row.tanggal.split('T')[0]
            : row.tanggal;
        if (dateMap[d]) {
          dateMap[d].revenue = parseFloat(row.total_revenue || 0);
          dateMap[d].transaksi = parseInt(row.total_transactions || 0);
        }
      });

      const result = Object.entries(dateMap).map(([tanggal, val]) => ({
        tanggal,
        label: new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
        }),
        revenue: val.revenue,
        transaksi: val.transaksi,
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('getDailyRevenue error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // ─── Revenue bulanan ─────────────────────────────────────────────────────
  async getMonthlyRevenue(months = 12) {
    try {
      // Gunakan v_monthly_revenue (DB view) agar hanya 1 query ke DB
      // Sebelumnya: loop 12 bulan × 2 tabel = 24 query beruntun
      const startDate = formatLocalISO(new Date(new Date().getFullYear(), new Date().getMonth() - months + 1, 1));

      const { data: revenueRows, error: revErr } = await supabase
        .from('v_monthly_revenue')
        .select('bulan, label_bulan, total_revenue')
        .gte('bulan', startDate)
        .order('bulan', { ascending: true });

      if (revErr) throw revErr;

      // Ambil expenses bulanan dalam satu query
      const { data: expRows, error: expErr } = await supabase
        .from('expenses')
        .select('tanggal_expense, jumlah')
        .gte('tanggal_expense', startDate);

      if (expErr) throw expErr;

      // Build month map dari revenue view
      const monthMap = {};
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = {
          label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
          revenue: 0,
          expense: 0,
          netIncome: 0,
        };
      }

      (revenueRows || []).forEach((row) => {
        const key = (row.bulan || '').substring(0, 7);
        if (monthMap[key]) monthMap[key].revenue = parseFloat(row.total_revenue || 0);
      });

      (expRows || []).forEach((row) => {
        const key = (row.tanggal_expense || '').substring(0, 7);
        if (monthMap[key]) monthMap[key].expense += parseFloat(row.jumlah || 0);
      });

      const result = Object.values(monthMap).map((m) => ({
        ...m,
        netIncome: m.revenue - m.expense,
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('getMonthlyRevenue error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // ─── Top 5 treatment terpopuler via v_popular_treatments ─────────────────
  async getPopularTreatments(limit = 5) {
    try {
      const { data, error } = await supabase
        .from('v_popular_treatments')
        .select('*')
        .limit(limit);

      if (error) throw error;

      const result = (data || []).map((row) => ({
        nama: row.nama_treatment,
        kategori: row.kategori,
        jumlah: parseInt(row.usage_count || 0),
        revenue: parseFloat(row.total_revenue || 0),
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('getPopularTreatments error:', error);
      return { success: false, error: error.message, data: [] };
    }
  },
};
