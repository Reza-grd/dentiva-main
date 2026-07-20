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
  },

  /**
   * Save SatuSehat consent status
   */
  async saveSatuSehatConsent(patientId, consentGiven, notes = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('satusehat_consents')
        .insert([{
          patient_id: patientId,
          consent_given: consentGiven,
          consent_date: new Date().toISOString(),
          recorded_by: user?.id,
          notes: notes
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error saving SatuSehat consent:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get latest SatuSehat consent status for a patient
   */
  async getLatestSatuSehatConsent(patientId) {
    try {
      const { data, error } = await supabase
        .from('satusehat_consents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return { success: true, data: data[0] || null };
    } catch (error) {
      console.error('Error fetching latest SatuSehat consent:', error);
      return { success: false, error: error.message };
    }
  }
};
