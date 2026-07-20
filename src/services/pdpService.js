import { supabase } from './supabase.js';

export const pdpService = {
  /**
   * Get clinic retention period setting (in years)
   */
  async getRetentionPeriod(clinicId) {
    try {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('value')
        .eq('clinic_id', clinicId)
        .eq('key', 'retention_period_years')
        .maybeSingle();

      if (error) throw error;
      const years = parseInt(data?.value || '5', 10);
      return { success: true, years: isNaN(years) ? 5 : years };
    } catch (err) {
      console.error('Error fetching retention period setting:', err);
      return { success: false, years: 5, error: err.message };
    }
  },

  /**
   * Update clinic retention period setting
   */
  async setRetentionPeriod(clinicId, years) {
    try {
      const { error } = await supabase
        .from('clinic_settings')
        .upsert({
          clinic_id: clinicId,
          key: 'retention_period_years',
          value: years.toString()
        });

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error updating retention period setting:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Calculate retention status for a patient's medical record based on last visit date
   */
  checkRetentionStatus(lastVisitDate, retentionYears = 5) {
    if (!lastVisitDate) {
      return { isExpired: false, retentionYears, label: 'Aktif' };
    }

    const lastDate = new Date(lastVisitDate);
    const expiryDate = new Date(lastDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + retentionYears);

    const now = new Date();
    const isExpired = now > expiryDate;

    return {
      isExpired,
      lastVisitDate,
      expiryDate: expiryDate.toISOString().split('T')[0],
      retentionYears,
      label: isExpired ? `Melewati Retensi (${retentionYears} Thn)` : 'Dalam Masa Retensi'
    };
  },

  /**
   * Fetch Data Subject Requests for a specific patient (UU PDP Compliance)
   */
  async getDataSubjectRequests(patientId) {
    try {
      const { data, error } = await supabase
        .from('data_subject_requests')
        .select(`
          *,
          handler:users(full_name)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error fetching data subject requests:', err);
      return { success: false, error: err.message || err };
    }
  },

  /**
   * Create a new Data Subject Request
   */
  async createDataSubjectRequest(payload) {
    try {
      const { data, error } = await supabase
        .from('data_subject_requests')
        .insert({
          clinic_id: payload.clinicId,
          patient_id: payload.patientId,
          request_type: payload.requestType, // 'access' | 'correction' | 'deletion'
          status: 'pending',
          notes: payload.notes || '',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error creating data subject request:', err);
      return { success: false, error: err.message || err };
    }
  },

  /**
   * Update Data Subject Request status (e.g. completed, in_progress, rejected)
   */
  async updateDataSubjectRequest(requestId, status, notes, handlerUserId) {
    try {
      const { data, error } = await supabase
        .from('data_subject_requests')
        .update({
          status,
          notes,
          handled_by: handlerUserId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error updating data subject request:', err);
      return { success: false, error: err.message || err };
    }
  }
};
