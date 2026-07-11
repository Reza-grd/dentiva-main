import { supabase } from './supabase';

export const paymentService = {
  // Get all payments
  async getAllPayments({ page = 1, limit = 20, searchTerm = '', statusFilter = 'all', dateFilter = 'all' } = {}) {
    try {
      const offset = (page - 1) * limit;
      let query = supabase
        .from('payments')
        .select(`
          *,
          patient:patients!inner(nama_lengkap, no_rm),
          visit:visits(tanggal_kunjungan),
          processed_by_user:users(full_name)
        `, { count: 'exact' });

      // Apply search term to invoice number or patient name
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        query = query.or(`invoice_number.ilike.%${term}%,patient.nama_lengkap.ilike.%${term}%`);
      }

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status_pembayaran', statusFilter);
      }

      // Apply date filter
      const now = new Date();
      if (dateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        query = query.gte('created_at', `${todayStr}T00:00:00`).lte('created_at', `${todayStr}T23:59:59`);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte('created_at', firstDay.toISOString());
      }

      const { data, error, count } = await query
        .order('tanggal_pembayaran', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return { success: false, error: error.message };
    }
  },

  // Get payment by ID
  async getPaymentById(id) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          patient:patients(*),
          visit:visits(*),
          processed_by_user:users(full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching payment:', error);
      return { success: false, error: error.message };
    }
  },

  // Get payment by visit ID
  // BUG FIX: Gunakan .maybeSingle() bukan .single() agar tidak throw error
  // saat belum ada pembayaran (PGRST116). .maybeSingle() mengembalikan null
  // jika tidak ada row, tanpa error.
  async getPaymentByVisitId(visitId) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('visit_id', visitId)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error fetching payment by visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Create payment
  async createPayment(paymentData) {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          processed_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating payment:', error);
      return { success: false, error: error.message };
    }
  },

  // Update payment
  async updatePayment(id, paymentData) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(paymentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating payment:', error);
      return { success: false, error: error.message };
    }
  },

  // Get payments by date range
  async getPaymentsByDateRange(startDate, endDate, { page = 1, limit = 20 } = {}) {
    try {
      const offset = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('payments')
        .select(`
          *,
          patient:patients(nama_lengkap, no_rm)
        `, { count: 'exact' })
        .gte('tanggal_pembayaran', startDate)
        .lte('tanggal_pembayaran', endDate)
        .order('tanggal_pembayaran', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching payments by date:', error);
      return { success: false, error: error.message };
    }
  },

  // Get payment statistics
  async getPaymentStatistics(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .gte('tanggal_pembayaran', startDate)
        .lte('tanggal_pembayaran', endDate);

      if (error) throw error;

      const stats = {
        total_transactions: data.length,
        total_revenue: data.reduce((sum, p) => sum + (parseFloat(p.total_bayar) || 0), 0),
        paid: data.filter(p => p.status_pembayaran === 'paid').length,
        pending: data.filter(p => p.status_pembayaran === 'pending').length,
        average_transaction: data.length > 0 
          ? data.reduce((sum, p) => sum + (parseFloat(p.total_bayar) || 0), 0) / data.length
          : 0
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching payment statistics:', error);
      return { success: false, error: error.message };
    }
  },

  // Get daily revenue
  async getDailyRevenue(days = 30) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('v_daily_revenue')
        .select('*')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching daily revenue:', error);
      return { success: false, error: error.message };
    }
  },

  // Get pending payments
  async getPendingPayments() {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          patient:patients(nama_lengkap, no_rm, no_wa),
          visit:visits(tanggal_kunjungan)
        `)
        .eq('status_pembayaran', 'pending')
        .order('tanggal_pembayaran', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching pending payments:', error);
      return { success: false, error: error.message };
    }
  }
};
