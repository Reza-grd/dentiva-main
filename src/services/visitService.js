import { supabase } from './supabase';

export const visitService = {
  // Get all visits — lengkap dengan dokter, pasien, dan payment status
  async getAllVisits({ page = 1, limit = 20 } = {}) {
    try {
      const offset = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(id, nama_lengkap, no_rm, no_wa),
          dokter:users(id, full_name)
        `, { count: 'exact' })
        .order('tanggal_kunjungan', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching visits:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all visits with payment info — untuk VisitHistory timeline
  async getAllVisitsWithPayments({ patientId, dokterIdFilter, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
    try {
      const offset = (page - 1) * limit;
      let query = supabase
        .from('visits')
        .select(`
          *,
          patient:patients(id, nama_lengkap, no_rm, no_wa),
          dokter:users(id, full_name),
          payments(id, invoice_number, total_bayar, status_pembayaran, metode_pembayaran, tanggal_pembayaran)
        `, { count: 'exact' })
        .order('tanggal_kunjungan', { ascending: false });

      if (patientId)       query = query.eq('patient_id', patientId);
      if (dokterIdFilter)  query = query.eq('dokter_id', dokterIdFilter);
      if (dateFrom)        query = query.gte('tanggal_kunjungan', dateFrom);
      if (dateTo)          query = query.lte('tanggal_kunjungan', dateTo);

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching visits with payments:', error);
      return { success: false, error: error.message };
    }
  },

  // Get visits by patient
  async getVisitsByPatient(patientId) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          dokter:users(full_name),
          payments(id, invoice_number, total_bayar, status_pembayaran, metode_pembayaran)
        `)
        .eq('patient_id', patientId)
        .order('tanggal_kunjungan', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching patient visits:', error);
      return { success: false, error: error.message };
    }
  },

  // Get today's visits
  async getTodayVisits() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(nama_lengkap, no_rm, no_wa),
          dokter:users(full_name),
          payments(status_pembayaran)
        `)
        .eq('tanggal_kunjungan', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching today visits:', error);
      return { success: false, error: error.message };
    }
  },

  // Get visits by date
  async getVisitsByDate(date) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(nama_lengkap, no_rm, no_wa),
          dokter:users(full_name)
        `)
        .eq('tanggal_kunjungan', date)
        // FIX Bug #6: order by jam_kunjungan (nulls last) untuk urutan slot yang benar
        .order('jam_kunjungan', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching visits by date:', error);
      return { success: false, error: error.message };
    }
  },

  // Get visit by ID with treatments + payment
  async getVisitById(visitId) {
    try {
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .select(`
          *,
          patient:patients(*),
          dokter:users(full_name)
        `)
        .eq('id', visitId)
        .single();

      if (visitError) throw visitError;

      const [treatmentsRes, paymentsRes] = await Promise.all([
        supabase
          .from('visit_treatments')
          .select(`*, treatment:treatments(id, nama_treatment, kategori, kode_treatment)`)
          .eq('visit_id', visitId),
        supabase
          .from('payments')
          .select('*')
          .eq('visit_id', visitId)
          .maybeSingle(),
      ]);

      return {
        success: true,
        data: {
          ...visit,
          treatments: treatmentsRes.data || [],
          payment: paymentsRes.data || null,
        }
      };
    } catch (error) {
      console.error('Error fetching visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new visit
  async createVisit(visitData) {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      // BUG-B4 FIX: Hapus perhitungan visit_number di frontend (race condition).
      // Trigger set_visit_number() di DB sudah menangani ini secara atomic.
      // Jangan kirim visit_number — biarkan trigger DB yang mengisinya.

      // FIX: Jika visitData sudah menyertakan dokter_id (dipilih resepsionis),
      // gunakan itu. Jika tidak, fallback ke user yang sedang login.
      const finalDokterID = visitData.dokter_id || user?.id;
      // Hapus dokter_id dan visit_number dari payload (keduanya ditangani DB)
      const { dokter_id: _removed, visit_number: _vn, ...visitDataClean } = visitData;

      const { data, error } = await supabase
        .from('visits')
        .insert([{
          ...visitDataClean,
          dokter_id: finalDokterID,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Update visit
  async updateVisit(visitId, visitData) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .update(visitData)
        .eq('id', visitId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Convenience: update only status field
  async updateVisitStatus(visitId, status) {
    return this.updateVisit(visitId, { status });
  },

  // Add treatment to visit
  async addTreatmentToVisit(visitId, treatmentData) {
    try {
      const { data, error } = await supabase
        .from('visit_treatments')
        .insert([{
          visit_id: visitId,
          ...treatmentData,
          subtotal: treatmentData.quantity * treatmentData.harga_satuan,
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error adding treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove treatment from visit
  async removeTreatmentFromVisit(visitTreatmentId) {
    try {
      const { error } = await supabase
        .from('visit_treatments')
        .delete()
        .eq('id', visitTreatmentId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error removing treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // ─────────────────────────────────────────────────────────────────────
  // BUG-M1 FIX: replaceVisitTreatments — atomik delete-then-insert via RPC
  // ─────────────────────────────────────────────────────────────────────
  async replaceVisitTreatments(visitId, treatmentsArray) {
    try {
      const vtRows = (treatmentsArray || []).map((t) => ({
        treatment_id: t.treatment_id,
        tooth_number: t.tooth_number || null,
        quantity: t.quantity || 1,
        harga_satuan: parseFloat(t.harga_satuan) || 0,
        subtotal: parseFloat(t.subtotal) || 0,
        notes: t.notes || null,
      }));

      const { error } = await supabase.rpc('replace_visit_treatments', {
        p_visit_id: visitId,
        p_treatments: vtRows
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error replacing visit treatments:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete visit
  async deleteVisit(visitId) {
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Get visit statistics
  async getVisitStatistics(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .gte('tanggal_kunjungan', startDate)
        .lte('tanggal_kunjungan', endDate);

      if (error) throw error;

      const stats = {
        total_visits: data.length,
        completed: data.filter(v => v.status === 'completed').length,
        ongoing: data.filter(v => v.status === 'ongoing').length,
        cancelled: data.filter(v => v.status === 'cancelled').length,
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Error fetching visit statistics:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all doctors (for filter dropdown)
  async getAllDoctors() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'dokter')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return { success: false, error: error.message };
    }
  },
};
