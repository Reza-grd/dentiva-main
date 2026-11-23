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

const DEFAULTS = {
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
const CACHE_KEY = 'clinic_settings';

/** Cache: { pemilik: user_id, data }. Format lama (objek pengaturan langsung) dianggap tanpa pemilik. */
const bacaCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed.data && typeof parsed.data === 'object'
      ? { pemilik: parsed.pemilik ?? null, data: parsed.data }
      : { pemilik: null, data: parsed };
  } catch {
    return null;
  }
};
const hapusCache = () => { try { localStorage.removeItem(CACHE_KEY); } catch { /* storage tidak tersedia */ } };

export const ClinicSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...(bacaCache()?.data || {}) }));
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadSettings = useCallback(async (pemilik) => {
    setLoading(true);
    const { success, data, error } = await clinicSettingsService.getSettings();
    if (success && data) {
      setSettings(prev => {
        const updated = { ...prev, ...data };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ pemilik: pemilik ?? null, data: updated }));
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
  // Pengaturan klinik lain tidak boleh terbawa: saat sesi hilang (keluar, sesi kedaluwarsa, gagal keluar karena
  // jaringan) atau pengguna berganti, cache & tampilan dikembalikan ke bawaan.
  useEffect(() => {
    let kunciTerakhir = null;
    const kosongkan = () => { hapusCache(); setSettings({ ...DEFAULTS }); };
    const sesuaikan = (session) => {
      const id = session?.user?.id ?? null;
      if (!id) { kunciTerakhir = null; kosongkan(); setLoading(false); return; }
      const pemilikCache = bacaCache()?.pemilik;
      if (pemilikCache && pemilikCache !== id) kosongkan();
      // Sesi masih menunggu kode MFA (database menolak sampai aal2): jangan meminta dulu.
      if (sesiPerluMfa(session)) { kunciTerakhir = null; setLoading(false); return; }
      // Kunci = pengguna + level sesi: muat ulang setelah verifikasi MFA, abaikan penyegaran token biasa.
      const kunci = `${id}:${aalSesi(session)}`;
      if (kunci === kunciTerakhir) return;
      kunciTerakhir = kunci;
      loadSettings(id);
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
      const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
      await loadSettings(data?.session?.user?.id);
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
