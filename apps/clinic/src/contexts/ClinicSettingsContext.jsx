import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clinicSettingsService } from '../services/clinicSettingsService';
import { supabase } from '../services/supabase';
import { aalSesi, sesiPerluMfa } from './AuthContext';
import { useToast } from '../components/common/ToastNotification';

const ClinicSettingsContext = createContext(null);

export const useClinicSettings = () => {
  const context = useContext(ClinicSettingsContext);
  if (!context) {
    throw new Error('useClinicSettings must be used within a ClinicSettingsProvider');
  }
  return context;
};

/** Seperti useClinicSettings, tetapi mengembalikan null bila dipakai di luar provider (halaman publik, tes). */
export const useClinicSettingsOptional = () => useContext(ClinicSettingsContext);

export const ClinicSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    const defaults = {
      clinic_name: 'Dentiva Dental Clinic',
      clinic_phone: '',
      wa_payment_confirmation_enabled: 'true',
      wa_reminder_h1_day_enabled: 'true',
      wa_reminder_h1_hour_enabled: 'true',
      wa_post_treatment_education_enabled: 'false',
      primary_color: '#0F4C81',
      secondary_color: '#00B4D8',
      accent_color: '#F59E0B'
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

  // Muat pengaturan hanya bila ada sesi (tamu tidak punya hak baca → galat 401/42501 di halaman login),
  // dan muat ulang saat pengguna lain masuk tanpa memuat ulang halaman.
  useEffect(() => {
    let kunciTerakhir = null;
    const sesuaikan = (session) => {
      const id = session?.user?.id ?? null;
      // Tanpa sesi, atau sesi masih menunggu kode MFA (database menolak sampai aal2): jangan meminta dulu.
      if (!id || sesiPerluMfa(session)) { kunciTerakhir = null; setLoading(false); return; }
      // Kunci = pengguna + level sesi: muat ulang setelah verifikasi MFA, abaikan penyegaran token biasa.
      const kunci = `${id}:${aalSesi(session)}`;
      if (kunci === kunciTerakhir) return;
      kunciTerakhir = kunci;
      loadSettings();
    };
    supabase.auth.getSession().then(({ data }) => sesuaikan(data?.session)).catch(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => sesuaikan(session));
    return () => data?.subscription?.unsubscribe();
  }, [loadSettings]);

  // Inject CSS Variables for Dynamic Branding
  useEffect(() => {
    const root = document.documentElement;
    if (settings.primary_color) root.style.setProperty('--color-primary', settings.primary_color);
    if (settings.secondary_color) root.style.setProperty('--color-secondary', settings.secondary_color);
    if (settings.accent_color) root.style.setProperty('--color-warning', settings.accent_color);
  }, [settings.primary_color, settings.secondary_color, settings.accent_color]);

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
