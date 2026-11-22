import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const gantiEmail = vi.fn();
const buatKodeWa = vi.fn();
vi.mock('../services/akunService', () => ({
  akunService: {
    gantiEmail: (...a) => gantiEmail(...a),
    buatKodeWa: (...a) => buatKodeWa(...a),
    daftarTautanWa: vi.fn(async () => ({ ok: true, data: [{ id: 't1', nomor_tersamar: '+62 812-••••-7890', dibuat_pada: '2026-11-15T01:00:00Z', terakhir_dipakai: null }] })),
    putuskanWa: vi.fn(async () => ({ ok: true })),
  },
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: 'lama@klinik.test' }, userProfile: { role: 'admin' } }) }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('../components/common/ToastNotification', () => ({ useToast: () => toast }));

import PengaturanAkun from '../components/profile/PengaturanAkun';

describe('Pengaturan akun: ganti email & WhatsApp Eira', () => {
  beforeEach(() => { gantiEmail.mockReset(); buatKodeWa.mockReset(); });

  it('ganti email wajib password & email berbeda, lalu memanggil server', async () => {
    render(<PengaturanAkun />);
    fireEvent.click(screen.getByRole('button', { name: 'Ganti email' }));
    fireEvent.change(screen.getByLabelText('Email baru'), { target: { value: 'LAMA@klinik.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan email baru/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sama dengan email saat ini');

    fireEvent.change(screen.getByLabelText('Email baru'), { target: { value: 'baru@klinik.test' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan email baru/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('password');
    expect(gantiEmail).not.toHaveBeenCalled();

    gantiEmail.mockResolvedValue({ ok: false, error: 'Password saat ini salah.' });
    fireEvent.change(screen.getByLabelText(/Password saat ini/), { target: { value: 'salah123' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan email baru/ }));
    expect(await screen.findByText('Password saat ini salah.')).toBeInTheDocument();
    expect(gantiEmail).toHaveBeenCalledWith('baru@klinik.test', 'salah123');
  });

  it('menampilkan nomor tertaut (tersamar) dan kode tautan setelah dibuat', async () => {
    buatKodeWa.mockResolvedValue({ ok: true, kode: '482913', kedaluwarsa: new Date(Date.now() + 600_000).toISOString() });
    render(<PengaturanAkun />);
    expect(await screen.findByText('+62 812-••••-7890')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tautkan nomor lain/ }));
    await waitFor(() => expect(screen.getByText('DENTIVA 482913')).toBeInTheDocument());
  });
});
