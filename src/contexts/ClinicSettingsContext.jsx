import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clinicSettingsService } from '../services/clinicSettingsService';
import { useToast } from '../components/common/ToastNotification';

const ClinicSettingsContext = createContext(null);

export const useClinicSettings = () => {
  const context = useContext(ClinicSettingsContext);
  if (!context) {
    throw new Error('useClinicSettings must be used within a ClinicSettingsProvider');
  }
  return context;
};

export const ClinicSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const defaults = {
      clinic_name: 'Dentiva Dental Clinic',
      clinic_phone: '',
      wa_payment_confirmation_enabled: 'true',
      wa_reminder_h1_day_enabled: 'true',
      wa_reminder_h1_hour_enabled: 'true',
      wa_post_treatment_education_enabled: 'false'
    };
    try {
      const cached = localStorage.getItem('clinic_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return { ...defaults, ...parsed };
        }
      }
    } catch (e) {
      console.error('Failed to parse clinic_settings from localStorage:', e);
    }
    return defaults;
  });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    const { success, data, error } = await clinicSettingsService.getSettings();
    if (success && data) {
      setSettings(prev => {
        const updated = { ...prev, ...data };
        try {
          localStorage.setItem('clinic_settings', JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to save settings to localStorage:', e);
        }
        return updated;
      });
    } else if (error) {
      console.error('Failed to load clinic settings:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSettings = async (settingsObj) => {
    setLoading(true);
    const { success, data, error } = await clinicSettingsService.updateSettingsBulk(settingsObj);
    if (success) {
      await loadSettings();
      setLoading(false);
      return { success: true };
    } else {
      console.error('Failed to save settings bulk:', error);
      setLoading(false);
      return { success: false, error };
    }
  };

  const value = {
    settings,
    loading,
    refreshSettings: loadSettings,
    updateSettings
  };

  return (
    <ClinicSettingsContext.Provider value={value}>
      {children}
    </ClinicSettingsContext.Provider>
  );
};

export default ClinicSettingsContext;
