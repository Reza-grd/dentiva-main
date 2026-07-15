import { supabase } from './supabase.js';

export const clinicSettingsService = {
  /**
   * Fetch all settings as a key-value pair object
   */
  async getSettings() {
    try {
      const { data, error } = await supabase
        .from('clinic_settings')
        .select('key, value');

      if (error) throw error;

      const settings = {};
      (data || []).forEach((row) => {
        settings[row.key] = row.value;
      });

      return { success: true, data: settings };
    } catch (error) {
      console.error('Error fetching clinic settings:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update a single setting
   */
  async updateSetting(key, value) {
    try {
      const { data, error } = await supabase
        .from('clinic_settings')
        .upsert(
          [{ key, value, updated_at: new Date().toISOString() }],
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update multiple settings in bulk
   */
  async updateSettingsBulk(settingsObj) {
    try {
      const rows = Object.entries(settingsObj).map(([key, value]) => ({
        key,
        value: value === null || value === undefined ? '' : String(value),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('clinic_settings')
        .upsert(rows, { onConflict: 'key' })
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating settings bulk:', error);
      return { success: false, error: error.message };
    }
  }
};
