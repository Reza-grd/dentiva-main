/**
 * Pengaturan klinik hanya dimuat bila ada sesi (tamu di halaman login tidak punya hak baca → dulu galat 401/42501),
 * dan dimuat ulang ketika pengguna lain masuk tanpa memuat ulang halaman.
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';

let sesiAwal = null;
let pendengar = null;
const getSettings = vi.fn();

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: sesiAwal } })),
      onAuthStateChange: vi.fn((cb) => { pendengar = cb; return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
    },
  },
}));
vi.mock('../services/clinicSettingsService', () => ({
  clinicSettingsService: { getSettings: (...a) => getSettings(...a), updateSettingsBulk: vi.fn() },
}));
vi.mock('../components/common/ToastNotification', () => ({ useToast: () => ({}) }));

import { ClinicSettingsProvider, useClinicSettings } from '../contexts/ClinicSettingsContext';

let terakhir;
function Intip() { terakhir = useClinicSettings(); return null; }
const pasang = () => render(<ClinicSettingsProvider><Intip /></ClinicSettingsProvider>);

describe('ClinicSettingsProvider & sesi', () => {
  beforeEach(() => {
    sesiAwal = null; pendengar = null; terakhir = undefined;
    getSettings.mockReset().mockResolvedValue({ success: true, data: { clinic_name: 'Klinik Uji' } });
    try { localStorage.clear(); } catch { /* abaikan */ }
  });

  it('tanpa sesi: tidak meminta pengaturan ke server, loading selesai', async () => {
    pasang();
    await waitFor(() => expect(terakhir.loading).toBe(false));
    expect(getSettings).not.toHaveBeenCalled();
  });

  it('dengan sesi: memuat sekali walau getSession & INITIAL_SESSION sama-sama datang', async () => {
    sesiAwal = { user: { id: 'u1' } };
    pasang();
    act(() => pendengar('INITIAL_SESSION', sesiAwal));
    await waitFor(() => expect(terakhir.settings.clinic_name).toBe('Klinik Uji'));
    act(() => pendengar('TOKEN_REFRESHED', sesiAwal));
    expect(getSettings).toHaveBeenCalledTimes(1);
  });

  it('masuk setelah halaman login: pengaturan dimuat saat SIGNED_IN', async () => {
    pasang();
    await waitFor(() => expect(terakhir.loading).toBe(false));
    expect(getSettings).not.toHaveBeenCalled();
    await act(async () => { pendengar('SIGNED_IN', { user: { id: 'u2' } }); });
    await waitFor(() => expect(getSettings).toHaveBeenCalledTimes(1));
    expect(terakhir.settings.clinic_name).toBe('Klinik Uji');
  });
});
