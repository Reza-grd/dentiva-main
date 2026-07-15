import { supabase } from './supabase.js';

export const consentService = {
  /**
   * Save a new informed consent
   */
  async saveConsent(consentData) {
    try {
      const { data, error } = await supabase
        .from('informed_consents')
        .insert([consentData])
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
