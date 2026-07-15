import { supabase } from './supabase.js';

export const financialService = {
  // Get financial summary
  async getFinancialSummary(startDate, endDate) {
    try {
      // BUG-C2 FIX: tanggal_pembayaran adalah tipe DATE (bukan TIMESTAMPTZ).
      // Cukup pakai string 'YYYY-MM-DD' langsung — tidak perlu suffix ISO timestamp.
      const { data: payments } = await supabase
        .from('payments')
        .select('total_bayar')
        .eq('status_pembayaran', 'paid')
        .gte('tanggal_pembayaran', startDate)
        .lte('tanggal_pembayaran', endDate);

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('jumlah')
        .gte('tanggal_expense', startDate)
        .lte('tanggal_expense', endDate);

      const totalRevenue = (payments || []).reduce((sum, p) => sum + parseFloat(p.total_bayar || 0), 0);
      const totalExpenses = (expenses || []).reduce((sum, e) => sum + parseFloat(e.jumlah || 0), 0);
      const netIncome = totalRevenue - totalExpenses;

      return {
        success: true,
        data: {
          totalRevenue,
          totalExpenses,
          netIncome,
          profitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0
        }
      };
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      return { success: false, error: error.message };
    }
  },

  // Get revenue by period
  async getRevenueByPeriod(period = 'daily', limit = 30) {
    try {
      let query;
      const endDate = new Date().toISOString().split('T')[0];
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(Date.now() - limit * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          query = supabase
            .from('v_daily_revenue')
            .select('*')
            .gte('tanggal', startDate)
            .lte('tanggal', endDate)
            .order('tanggal', { ascending: true });
          break;
        
        case 'monthly':
          startDate = new Date(Date.now() - limit * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          query = supabase
            .from('payments')
            .select('tanggal_pembayaran, total_bayar')
            .eq('status_pembayaran', 'paid')
            .gte('tanggal_pembayaran', startDate)
            .lte('tanggal_pembayaran', endDate);
          break;
        
        default:
          throw new Error('Invalid period');
      }

      const { data, error } = await query;
      if (error) throw error;

      // BUG-M2 FIX: untuk period 'monthly', agregasi raw rows per bulan
      // sebelum return — tanpa ini komponen menerima array flat tanggal harian
      // dan harus agregasi sendiri (rawan bug duplikat).
      if (period === 'monthly') {
        const monthlyMap = {};
        (data || []).forEach(row => {
          const key = String(row.tanggal_pembayaran || '').substring(0, 7); // 'YYYY-MM'
          if (!monthlyMap[key]) {
            monthlyMap[key] = {
              bulan: key,
              label_bulan: new Date(key + '-01').toLocaleString('id-ID', { month: 'short', year: 'numeric' }),
              total_revenue: 0,
              total_transactions: 0,
            };
          }
          monthlyMap[key].total_revenue += parseFloat(row.total_bayar || 0);
          monthlyMap[key].total_transactions += 1;
        });
        const aggregated = Object.values(monthlyMap).sort((a, b) => a.bulan.localeCompare(b.bulan));
        return { success: true, data: aggregated };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching revenue by period:', error);
      return { success: false, error: error.message };
    }
  },

  // Get expenses
  async getExpenses(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          recorded_by_user:users(full_name)
        `)
        .gte('tanggal_expense', startDate)
        .lte('tanggal_expense', endDate)
        .order('tanggal_expense', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return { success: false, error: error.message };
    }
  },

  // Get expenses by category
  async getExpensesByCategory(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('kategori, jumlah')
        .gte('tanggal_expense', startDate)
        .lte('tanggal_expense', endDate);

      if (error) throw error;

      // Group by category
      const grouped = (data || []).reduce((acc, expense) => {
        const category = expense.kategori || 'Lain-lain';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += parseFloat(expense.jumlah || 0);
        return acc;
      }, {});

      const result = Object.entries(grouped).map(([kategori, total]) => ({
        kategori,
        total
      }));

      return { success: true, data: result };
    } catch (error) {
      console.error('Error fetching expenses by category:', error);
      return { success: false, error: error.message };
    }
  },

  // Create expense
  async createExpense(expenseData) {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          ...expenseData,
          recorded_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating expense:', error);
      return { success: false, error: error.message };
    }
  },

  // Update expense
  async updateExpense(id, expenseData) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating expense:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete expense
  async deleteExpense(id) {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting expense:', error);
      return { success: false, error: error.message };
    }
  },

  // Get dashboard statistics
  async getDashboardStatistics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

      // BUG-C2 FIX: tanggal_pembayaran adalah tipe DATE — gunakan string 'YYYY-MM-DD'
      // langsung tanpa suffix ISO timestamp (T00:00:00+00:00 dll).
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('total_bayar')
        .eq('status_pembayaran', 'paid')
        .gte('tanggal_pembayaran', today)
        .lte('tanggal_pembayaran', today);

      const todayRevenue = (todayPayments || []).reduce((sum, p) => sum + parseFloat(p.total_bayar || 0), 0);

      // BUG-C2 FIX: month filter pakai DATE range biasa
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('total_bayar')
        .eq('status_pembayaran', 'paid')
        .gte('tanggal_pembayaran', monthStart)
        .lte('tanggal_pembayaran', monthEnd);

      const monthRevenue = (monthPayments || []).reduce((sum, p) => sum + parseFloat(p.total_bayar || 0), 0);

      // Month's expenses
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('jumlah')
        .gte('tanggal_expense', monthStart)
        .lte('tanggal_expense', monthEnd);

      const monthExpensesTotal = (monthExpenses || []).reduce((sum, e) => sum + parseFloat(e.jumlah || 0), 0);

      // Total patients
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      // Today's visits
      const { count: todayVisits } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .eq('tanggal_kunjungan', today);

      return {
        success: true,
        data: {
          todayRevenue,
          monthRevenue,
          monthExpenses: monthExpensesTotal,
          monthNetIncome: monthRevenue - monthExpensesTotal,
          totalPatients,
          todayVisits
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate financial report
  async generateReport(startDate, endDate) {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      const summary = await this.getFinancialSummary(startDate, endDate);
      if (!summary.success) throw new Error(summary.error);

      // Get patient count
      const { count: patientCount } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Get visit count
      const { count: visitCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true })
        .gte('tanggal_kunjungan', startDate)
        .lte('tanggal_kunjungan', endDate);

      // Hanya kembalikan data tanpa simpan ke DB (report_type 'custom' tidak
      // ada di CHECK constraint: 'daily' | 'monthly' | 'yearly')
      const reportData = {
        report_date: endDate,
        total_revenue: summary.data.totalRevenue,
        total_expenses: summary.data.totalExpenses,
        net_income: summary.data.netIncome,
        total_patients: patientCount || 0,
        total_visits: visitCount || 0,
        generated_by: user?.id
      };

      return { success: true, data: reportData };
    } catch (error) {
      console.error('Error generating report:', error);
      return { success: false, error: error.message };
    }
  },

  // Get monthly report for a specific year
  // FIX: Sebelumnya loop 12 bulan x 2 query = 24 query sequential (N+1).
  // Sekarang: 2 query bulk untuk seluruh tahun, agregasi di JS.
  async getMonthlyReport(year) {
    try {
      const yearStart = `${year}-01-01`;
      // BUG-C2 FIX: tanggal_pembayaran adalah DATE — gunakan 'YYYY-12-31' bukan ISO timestamp
      const yearEnd   = `${year}-12-31`;

      // Satu query untuk semua payments dalam setahun
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('tanggal_pembayaran, total_bayar')
        .eq('status_pembayaran', 'paid')
        .gte('tanggal_pembayaran', yearStart)
        .lte('tanggal_pembayaran', yearEnd);
      if (pErr) throw pErr;

      // Satu query untuk semua expenses dalam setahun
      const { data: expenses, error: eErr } = await supabase
        .from('expenses')
        .select('tanggal_expense, jumlah')
        .gte('tanggal_expense', yearStart)
        .lte('tanggal_expense', `${year}-12-31`);
      if (eErr) throw eErr;

      // Buat map 12 bulan
      const monthlyMap = {};
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}`;
        monthlyMap[key] = {
          month: m,
          monthName: new Date(year, m - 1).toLocaleString('id-ID', { month: 'short' }),
          totalRevenue: 0,
          totalExpenses: 0,
          netIncome: 0,
          profitMargin: 0,
        };
      }

      // Agregasi revenue
      (payments || []).forEach(p => {
        // BUG-C2 FIX: String() cast memastikan aman meski Supabase mengembalikan
        // objek Date alih-alih string (tergantung konfigurasi Supabase client).
        const key = String(p.tanggal_pembayaran || '').substring(0, 7);
        if (monthlyMap[key]) monthlyMap[key].totalRevenue += parseFloat(p.total_bayar || 0);
      });

      // Agregasi expenses
      (expenses || []).forEach(e => {
        const key = String(e.tanggal_expense || '').substring(0, 7);
        if (monthlyMap[key]) monthlyMap[key].totalExpenses += parseFloat(e.jumlah || 0);
      });

      // Hitung net income & profit margin
      const monthlyData = Object.values(monthlyMap).map(m => ({
        ...m,
        netIncome: m.totalRevenue - m.totalExpenses,
        profitMargin: m.totalRevenue > 0 ? ((m.totalRevenue - m.totalExpenses) / m.totalRevenue) * 100 : 0,
      }));

      return { success: true, data: monthlyData };
    } catch (error) {
      console.error('Error fetching monthly report:', error);
      return { success: false, error: error.message };
    }
  }
};
