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
const wrap = () => render(
  <MemoryRouter initialEntries={['/admin']}>
    <Routes>
      <Route path="/admin" element={<AiBriefCard />} />
      <Route path="/admin/asisten-ai" element={<AskTarget />} />
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
    expect(ai.getBrief).toHaveBeenCalledWith(false);
  });

  it('tombol perbarui meminta laporan baru', async () => {
    ai.getBrief.mockResolvedValue({ success: true, data: { brief, generated_at: new Date().toISOString() } });
    wrap();
    await screen.findByText(brief.ringkasan);
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui laporan' }));
    await waitFor(() => expect(ai.getBrief).toHaveBeenLastCalledWith(true));
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
