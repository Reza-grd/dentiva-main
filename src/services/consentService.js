import { supabase } from './supabase.js';

export const consentService = {
  /**
   * Dapatkan clinic_id dari sesi aktif pengguna untuk isolasi tenant.
   */
  async getSessionClinicId() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.app_metadata?.clinic_id || 'd0000000-0000-0000-0000-000000000000';
  },

  /**
   * Save a new informed consent
   */
  async saveConsent(consentData) {
    try {
      const clinicId = await this.getSessionClinicId();
      
      const record = {
        ...consentData,
        clinic_id: clinicId
      };

      const { data, error } = await supabase
        .from('informed_consents')
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving consent:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all consents for a patient
   */
  async getConsentsByPatient(patientId) {
    try {
      const { data, error } = await supabase
        .from('informed_consents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching patient consents:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a consent
   */
  async deleteConsent(id) {
    try {
      const { error } = await supabase
        .from('informed_consents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting consent:', error);
      return { success: false, error: error.message };
    }
  }
};
