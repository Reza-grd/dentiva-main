import { supabase } from './supabase.js';

export const satusehatService = {
  /**
   * Trigger Edge Function synchronization for Organization
   */
  async syncOrganization(clinicId) {
    try {
      const { data, error } = await supabase.functions.invoke('satusehat-sync', {
        body: { action: 'syncOrganization', clinicId }
      });
      if (error) throw error;
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error syncing SatuSehat organization:', error);
      return { success: false, error: error.message || error };
    }
  },

  /**
   * Trigger Edge Function synchronization for Location
   */
  async syncLocation(locationId) {
    try {
      const { data, error } = await supabase.functions.invoke('satusehat-sync', {
        body: { action: 'syncLocation', locationId }
      });
      if (error) throw error;
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error syncing SatuSehat location:', error);
      return { success: false, error: error.message || error };
    }
  },

  /**
   * Trigger Edge Function synchronization for Practitioner (Doctor)
   */
  async syncPractitioner(userId) {
    try {
      const { data, error } = await supabase.functions.invoke('satusehat-sync', {
        body: { action: 'syncPractitioner', userId }
      });
      if (error) throw error;
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error syncing SatuSehat practitioner:', error);
      return { success: false, error: error.message || error };
    }
  },

  /**
   * Trigger Edge Function synchronization for Patient
   */
  async syncPatient(patientId) {
    try {
      const { data, error } = await supabase.functions.invoke('satusehat-sync', {
        body: { action: 'syncPatient', patientId }
      });
      if (error) throw error;
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error syncing SatuSehat patient:', error);
      return { success: false, error: error.message || error };
    }
  },

  /**
   * Trigger Edge Function synchronization for Clinical Visit (Encounter, Condition, etc.)
   */
  async syncVisit(visitId) {
    try {
      const { data, error } = await supabase.functions.invoke('satusehat-sync-visit', {
        body: { visitId }
      });
      if (error) throw error;
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error syncing clinical visit data to SatuSehat:', error);
      return { success: false, error: error.message || error };
    }
  },

  /**
   * Fetch Outbox Logs for Clinic Dashboard
   */
  async getOutboxLogs(clinicId) {
    try {
      const { data, error } = await supabase
        .from('satusehat_outbox')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching SatuSehat outbox logs:', error);
      return { success: false, error: error.message || error };
    }
  },

  /**
   * Manual Retry for failed_permanent or failed_retryable outbox items (Admin only)
   * Resets status to 'pending' and attempt_count to 0 so the processor picks it up
   */
  async retryOutboxItem(outboxId) {
    try {
      const { data, error } = await supabase
        .from('satusehat_outbox')
        .update({
          status: 'pending',
          attempt_count: 0,
          next_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', outboxId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error retrying outbox item:', error);
      return { success: false, error: error.message || error };
    }
  },

  /**
   * Manually trigger Outbox Processor Edge Function
   */
  async processOutboxQueue() {
    try {
      const { data, error } = await supabase.functions.invoke('satusehat-outbox-processor');
      if (error) throw error;
      return { success: true, data: data };
    } catch (error) {
      console.error('Error executing outbox processor:', error);
      return { success: false, error: error.message || error };
    }
  }
};
