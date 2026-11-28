/** Pengaturan → SOP Recall → sakelar pesan recall WhatsApp otomatis. */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { getSettings, updateSetting } = vi.hoisted(() => ({ getSettings: vi.fn(), updateSetting: vi.fn() }));
vi.mock('../services/clinicSettingsService', () => ({ clinicSettingsService: { getSettings, updateSetting } }));

import { ToastProvider } from '../components/common/ToastNotification';
import RecallWaOtomatis, { CONTOH_PESAN_RECALL, KUNCI_RECALL_WA } from '../components/settings/RecallWaOtomatis';

const pasang = () => render(<ToastProvider><RecallWaOtomatis /></ToastProvider>);

describe('Recall WA otomatis', () => {
  beforeEach(() => {
    getSettings.mockReset(); updateSetting.mockReset();
    updateSetting.mockResolvedValue({ success: true });
  });

  it('bawaan mati; menyalakan menyimpan "true"', async () => {
    getSettings.mockResolvedValue({ success: true, data: {} });
    pasang();
    const s = await screen.findByRole('switch', { name: 'Pesan recall otomatis lewat WhatsApp' });
    await waitFor(() => expect(s).not.toBeDisabled());
    expect(s).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(s);
    await waitFor(() => expect(updateSetting).toHaveBeenCalledWith(KUNCI_RECALL_WA, 'true'));
    await waitFor(() => expect(s).toHaveAttribute('aria-checked', 'true'));
  });

  it('membaca nilai tersimpan & mematikan; contoh pesan tanpa emoji', async () => {
    getSettings.mockResolvedValue({ success: true, data: { [KUNCI_RECALL_WA]: 'true' } });
    pasang();
    const s = await screen.findByRole('switch');
    await waitFor(() => expect(s).toHaveAttribute('aria-checked', 'true'));
    fireEvent.click(s);
    await waitFor(() => expect(updateSetting).toHaveBeenCalledWith(KUNCI_RECALL_WA, 'false'));
    expect(/\p{Extended_Pictographic}/u.test(CONTOH_PESAN_RECALL.join('\n'))).toBe(false);
  });
});
