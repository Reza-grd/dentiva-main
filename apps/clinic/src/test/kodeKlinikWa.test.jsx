/** Pengaturan WhatsApp → kode klinik (identitas pesan ke pasien). */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DEFAULT_REMINDER_DAY, DEFAULT_REMINDER_HOUR } from '../utils/waTemplates';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../services/supabase', () => ({ supabase: { rpc } }));

import { ToastProvider } from '../components/common/ToastNotification';
import KodeKlinikWa, { contohIdentitas } from '../components/settings/KodeKlinikWa';

const pasang = () => render(<ToastProvider><KodeKlinikWa /></ToastProvider>);

describe('Kode klinik WA', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockImplementation(async (nama, args) => (nama === 'kode_klinik_saya' ? { data: 'SNYM', error: null } : { data: args.p_kode, error: null }));
  });

  it('menampilkan kode tersimpan & contoh baris identitas tanpa emoji', async () => {
    pasang();
    expect(await screen.findByDisplayValue('SNYM')).toBeInTheDocument();
    expect(screen.getByText('SNYM · RM-000123 · Budi S.')).toBeInTheDocument();
    expect(/\p{Extended_Pictographic}/u.test(contohIdentitas('SMLE'))).toBe(false);
  });

  it('hanya huruf kapital, minimal 3; menyimpan lewat RPC', async () => {
    pasang();
    const input = await screen.findByDisplayValue('SNYM');
    fireEvent.change(input, { target: { value: 'sm1' } });
    expect(input).toHaveValue('SM');
    expect(screen.getByRole('button', { name: 'Simpan kode' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'smle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan kode' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('kode_klinik_ubah', { p_kode: 'SMLE' }));
  });

  it('template pengingat bawaan tanpa emoji', () => {
    for (const t of [DEFAULT_REMINDER_DAY, DEFAULT_REMINDER_HOUR]) {
      expect(/\p{Extended_Pictographic}/u.test(t)).toBe(false);
      expect(t).toContain('{nama}');
    }
  });
});
