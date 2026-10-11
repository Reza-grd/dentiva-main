/**
 * Tes regresi untuk bug yang ditemukan audit 30 Sep 2026 (docs/audit-2026-09-30.md).
 * Setiap tes gagal pada kode sebelum perbaikan.
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const rpc = vi.fn();
const fromBuilder = (rows) => {
  const b = {
    select: vi.fn(() => b), eq: vi.fn(() => b), order: vi.fn(() => b), in: vi.fn(() => b),
    then: (cb) => Promise.resolve(cb({ data: rows, error: null })),
  };
  return b;
};

vi.mock('../services/supabase', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: vi.fn(() => fromBuilder([
      { id: 'p1', name: 'Starter', price_monthly: 299000, price_yearly: 2990000, max_users: 3, max_patients: 1000, features: {} },
      { id: 'p3', name: 'Enterprise', price_monthly: 1499000, price_yearly: 14990000, max_users: 9999, max_patients: 99999, features: { priority_support: true } },
    ])),
    functions: { invoke: vi.fn() },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: { role: 'admin' } }),
  isPendingSignup: (u) => Boolean(u?.user_metadata?.signup_clinic),
}));
vi.mock('../contexts/PermissionsContext', () => ({
  usePermission: () => ({ plan: null, subscription: null }),
}));

import { ToastProvider, useToast } from '../components/common/ToastNotification';
import PricingPage from '../pages/PricingPage';
import QueueDisplay from '../components/queue/QueueDisplay';
import { validateClinicForm } from '../components/auth/RegisterClinicPage';
import { encryptionService } from '../services/encryptionService';

beforeEach(() => rpc.mockReset());

describe('Halaman Pricing (#2 crash useToast @dentiva/ui)', () => {
  it('tampil di dalam ToastProvider aplikasi tanpa error', async () => {
    render(<ToastProvider><PricingPage /></ToastProvider>);
    expect(await screen.findByText('Starter')).toBeInTheDocument();
  });

  it('Enterprise ditampilkan "tanpa batas", bukan angka 9999, dan tanpa klaim jaringan klinik', async () => {
    render(<ToastProvider><PricingPage /></ToastProvider>);
    expect(await screen.findByText('Pengguna tanpa batas')).toBeInTheDocument();
    expect(screen.queryByText(/jaringan klinik/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/9999/)).not.toBeInTheDocument();
  });
});

describe('Toast (#2b toast.showToast tidak ada)', () => {
  it('menyediakan showToast untuk tombol fitur terkunci', () => {
    let api;
    const Probe = () => { api = useToast(); return null; };
    render(<ToastProvider><Probe /></ToastProvider>);
    expect(typeof api.showToast).toBe('function');
  });
});

describe('Layar antrean TV (#4 data minimal)', () => {
  it('menampilkan nomor & inisial dari server, tanpa query tabel pasien', async () => {
    rpc.mockResolvedValue({
      data: { ok: true, clinic_name: 'Klinik Senyum', visits: [
        { no: 1, initials: 'B. S.', doctor: 'drg. Ani', time: '09:00', status: 'ongoing' },
        { no: 2, initials: 'R.', doctor: 'drg. Ani', time: '09:30', status: 'waiting' },
      ] },
      error: null,
    });
    render(
      <MemoryRouter initialEntries={['/antrean/tok']}>
        <Routes><Route path="/antrean/:token" element={<QueueDisplay />} /></Routes>
      </MemoryRouter>,
    );
    // Pasien yang dipanggil: nomor besar + inisial; antrean berikutnya: nomor + inisial
    expect(await screen.findByText('B. S.')).toBeInTheDocument();
    expect(document.querySelector('.qd-hero__no')).toHaveTextContent('01');
    expect(screen.getByText('R.')).toBeInTheDocument();
    expect(document.querySelector('.qd-next__no')).toHaveTextContent('02');
    expect(screen.getAllByText('Klinik Senyum').length).toBeGreaterThan(0);
    expect(rpc).toHaveBeenCalledWith('get_queue_display', { p_token: 'tok' });
  });

  it('tautan tidak valid menampilkan petunjuk, bukan data', async () => {
    rpc.mockResolvedValue({ data: { ok: false, reason: 'invalid' }, error: null });
    render(
      <MemoryRouter initialEntries={['/antrean/salah']}>
        <Routes><Route path="/antrean/:token" element={<QueueDisplay />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/tidak valid atau sudah dicabut/)).toBeInTheDocument();
  });
});

describe('Pendaftaran klinik mandiri — validasi formulir', () => {
  it('menolak nama pendek & nomor telepon tidak valid', () => {
    const e = validateClinicForm({ clinicName: 'AB', clinicPhone: '12', ownerName: 'X', ownerPhone: 'abc' });
    expect(Object.keys(e).sort()).toEqual(['clinicName', 'clinicPhone', 'ownerName', 'ownerPhone']);
  });
  it('menerima data lengkap', () => {
    expect(validateClinicForm({
      clinicName: 'Klinik Gigi Sehat', clinicPhone: '0812-3456-7890', ownerName: 'drg. Rina', ownerPhone: '081234567890',
    })).toEqual({});
  });
});

describe('Enkripsi — dekripsi batch', () => {
  it('hanya nilai PGP: yang dikirim ke server; teks biasa diteruskan apa adanya', async () => {
    rpc.mockResolvedValue({ data: ['Budi'], error: null });
    const out = await encryptionService.decryptBatch(['PGP:abc', '0812', null]);
    expect(rpc).toHaveBeenCalledWith('decrypt_batch', { p_payloads: ['PGP:abc'] });
    expect(out).toEqual(['Budi', '0812', null]);
  });
});

describe('Layar antrean lama tanpa token', () => {
  it('menampilkan petunjuk membuat tautan', async () => {
    rpc.mockResolvedValue({ data: { ok: false, reason: 'invalid' }, error: null });
    render(<MemoryRouter initialEntries={['/queue-display']}><Routes><Route path="/queue-display" element={<QueueDisplay />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('get_queue_display', { p_token: '' }));
    fireEvent.click(document.body);
    expect(await screen.findByText(/menu Layar Antrean/)).toBeInTheDocument();
  });
});
