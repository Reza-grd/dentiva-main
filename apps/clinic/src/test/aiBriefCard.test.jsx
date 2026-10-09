import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const { ai } = vi.hoisted(() => ({ ai: { getBrief: vi.fn() } }));
vi.mock('../services/aiService', () => ({ aiService: ai }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: { role: 'admin', full_name: 'reza granda' } }) }));

import AiBriefCard from '../components/dashboard/AiBriefCard';

function AskTarget() {
  const loc = useLocation();
  return <p>Halaman AI: {loc.state?.ask}</p>;
}
const wrap = (variant = 'admin') => render(
  <MemoryRouter initialEntries={['/home']}>
    <Routes>
      <Route path="/home" element={<AiBriefCard variant={variant} />} />
      <Route path="/admin/asisten-ai" element={<AskTarget />} />
      <Route path="/booking-requests" element={<p>Halaman booking</p>} />
    </Routes>
  </MemoryRouter>,
);

const brief = {
  ringkasan: 'Pendapatan bulan ini Rp 250.000, turun dibanding periode yang sama bulan lalu.',
  poin: [
    { tingkat: 'penting', judul: '2 kunjungan belum dibayar', teks: 'Perkiraan nilai Rp 400.000 dalam 30 hari terakhir.' },
    { tingkat: 'baik', judul: 'Stok aman', teks: 'Tidak ada bahan di bawah stok minimum.' },
  ],
  saran: 'Tagih dua kunjungan yang belum dibayar hari ini.',
};

beforeEach(() => vi.clearAllMocks());

describe('Kartu Asisten AI di Dashboard', () => {
  it('menyapa dengan nama, menampilkan ringkasan, poin, dan langkah hari ini', async () => {
    ai.getBrief.mockResolvedValue({ success: true, data: { brief, generated_at: new Date().toISOString(), cached: true } });
    wrap();
    expect(await screen.findByText(brief.ringkasan)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /, Reza\.$/ })).toBeInTheDocument();
    expect(screen.getByText('2 kunjungan belum dibayar')).toBeInTheDocument();
    expect(screen.getByText('Penting')).toBeInTheDocument();
    expect(screen.getByText('Kabar baik')).toBeInTheDocument();
    expect(screen.getByText(brief.saran)).toBeInTheDocument();
    expect(ai.getBrief).toHaveBeenCalledWith(false, 'admin');
  });

  it('tombol perbarui meminta laporan baru', async () => {
    ai.getBrief.mockResolvedValue({ success: true, data: { brief, generated_at: new Date().toISOString() } });
    wrap();
    await screen.findByText(brief.ringkasan);
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui laporan' }));
    await waitFor(() => expect(ai.getBrief).toHaveBeenLastCalledWith(true, 'admin'));
  });

  it('kolom tanya membuka Asisten AI dengan pertanyaannya', async () => {
    ai.getBrief.mockResolvedValue({ success: true, data: { brief, generated_at: new Date().toISOString() } });
    wrap();
    await screen.findByText(brief.ringkasan);
    fireEvent.change(screen.getByLabelText('Tanyakan pada Asisten AI'), { target: { value: 'Berapa BEP klinik?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim pertanyaan' }));
    expect(await screen.findByText('Halaman AI: Berapa BEP klinik?')).toBeInTheDocument();
  });

  it('mengajak mengaktifkan bila AI tersedia di paket tetapi belum aktif', async () => {
    ai.getBrief.mockResolvedValue({ success: false, error: 'belum aktif', httpStatus: 403, status: { tersedia_di_paket: true, aktif: false } });
    wrap();
    expect(await screen.findByRole('button', { name: /Aktifkan Asisten AI/ })).toBeInTheDocument();
  });

  it('disembunyikan bila AI belum dikonfigurasi atau tidak ada di paket', async () => {
    ai.getBrief.mockResolvedValue({ success: false, error: 'x', httpStatus: 503 });
    const { container } = wrap();
    await waitFor(() => expect(container.querySelector('.ai-brief')).toBeNull());
  });
});

describe('Catatan belum tersedia', () => {
  it('menampilkan jadwal otomatis dan tombol "Susun sekarang" yang meminta catatan baru', async () => {
    ai.getBrief.mockResolvedValueOnce({ success: true, data: { brief: null, empty: true } })
      .mockResolvedValueOnce({ success: true, data: { brief, generated_at: new Date().toISOString() } });
    wrap();
    expect(await screen.findByText(/disiapkan otomatis pukul 00.00 dan 12.00 WIB/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Susun sekarang/ }));
    await waitFor(() => expect(ai.getBrief).toHaveBeenLastCalledWith(true, 'admin'));
    expect(await screen.findByText(brief.ringkasan)).toBeInTheDocument();
  });
});

describe('Kartu tugas resepsionis', () => {
  const staffBrief = {
    ringkasan: 'Hari ini 3 pasien menunggu; drg. Ahmad praktik 08:00–17:00.',
    poin: [
      { tingkat: 'penting', judul: '2 booking menunggu konfirmasi', teks: 'Konfirmasi agar pasien mendapat kepastian jadwal.', aksi: 'booking' },
      { tingkat: 'perhatian', judul: '4 pasien besok', teks: 'Kirim pengingat sore ini.' },
    ],
    saran: 'Konfirmasi booking online terlebih dahulu.',
  };

  it('memakai mode staf, tanpa kolom tanya, tombol membuka halaman terkait', async () => {
    ai.getBrief.mockResolvedValue({ success: true, data: { brief: staffBrief, generated_at: new Date().toISOString() } });
    wrap('staff');
    expect(await screen.findByText(staffBrief.ringkasan)).toBeInTheDocument();
    expect(ai.getBrief).toHaveBeenCalledWith(false, 'staff');
    expect(screen.getByText(/Tugas meja depan hari ini/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Tanyakan pada Asisten AI')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Buka/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Buka booking/ }));
    expect(await screen.findByText('Halaman booking')).toBeInTheDocument();
  });

  it('disembunyikan untuk resepsionis bila admin belum mengaktifkan AI', async () => {
    ai.getBrief.mockResolvedValue({ success: false, error: 'x', httpStatus: 403, status: { tersedia_di_paket: true, aktif: false } });
    const { container } = wrap('staff');
    await waitFor(() => expect(ai.getBrief).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('.ai-brief')).toBeNull());
  });

  it('menandai catatan lama saat layanan AI sedang ramai', async () => {
    ai.getBrief.mockResolvedValue({ success: true, data: { brief: staffBrief, generated_at: new Date().toISOString(), stale: true } });
    wrap('staff');
    expect(await screen.findByText(/Layanan AI sedang ramai/)).toBeInTheDocument();
  });
});
