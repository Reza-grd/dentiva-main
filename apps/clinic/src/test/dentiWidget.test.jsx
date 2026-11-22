/** Eira (widget mengambang) — semua peran memakai otak lokal; admin dengan Asisten AI aktif juga dijawab AI di tempat. */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const auth = vi.hoisted(() => ({ profile: { role: 'admin', full_name: 'Rina Sari' } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: auth.profile }) }));
// Asisten AI dikendalikan tes: bawaan = belum aktif (seperti klinik yang belum menyalakan AI)
const ai = vi.hoisted(() => ({ status: { aktif: false, tersedia_di_paket: true, kuota_bulanan: 300, terpakai_bulan_ini: 0 }, ask: null }));
vi.mock('../services/aiService', () => ({
  aiService: {
    getStatus: () => Promise.resolve({ success: true, data: ai.status }),
    ask: (...a) => ai.ask(...a),
    applyActions: () => Promise.resolve({ success: true, data: { applied: [] } }),
    rejectActions: () => Promise.resolve({ success: true }),
    undoAction: () => Promise.resolve({ success: true }),
  },
}));

import DentiGuideWidget from '../components/ai/DentiGuideWidget';
import { ToastProvider } from '../components/common/ToastNotification';

function Where() {
  const loc = useLocation();
  return (
    <>
      <div data-testid="where">{loc.pathname}{loc.search}</div>
      <div data-testid="state">{JSON.stringify(loc.state || null)}</div>
    </>
  );
}
const wrap = (path = '/admin') => render(<ToastProvider><MemoryRouter initialEntries={[path]}><DentiGuideWidget /><Where /></MemoryRouter></ToastProvider>);
const where = () => screen.getByTestId('where').textContent;
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /Buka Eira/ }));
async function say(text) {
  fireEvent.change(screen.getByLabelText('Tulis pesan untuk Eira'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
  auth.profile = { role: 'admin', full_name: 'Rina Sari' };
  ai.status = { aktif: false, tersedia_di_paket: true, kuota_bulanan: 300, terpakai_bulan_ini: 0 };
  ai.ask = vi.fn();
});

describe('Eira Pemandu', () => {
  it('tombol mengambang membuka panel dengan sapaan & tombol saran sesuai peran', () => {
    auth.profile = { role: 'dokter', full_name: 'Alya Putri' };
    wrap('/dokter');
    expect(screen.queryByRole('dialog')).toBeNull();
    openPanel();
    expect(screen.getByRole('dialog', { name: /Eira/ })).toBeInTheDocument();
    expect(screen.getByText(/Saya/, { selector: '.denti-widget__md p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajarkan cara mengisi rekam medis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buka jadwal hari ini' })).toBeInTheDocument();
  });

  it('saran awal menyesuaikan halaman yang sedang dibuka', () => {
    auth.profile = { role: 'resepsionis', full_name: 'Sinta' };
    wrap('/resepsionis/pembayaran');
    openPanel();
    expect(screen.getByRole('button', { name: 'Ajarkan cara menerima pembayaran' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checklist harian' })).toBeInTheDocument();
  });

  it('dokter: tombol saran mengajarkan cara, lalu tombol "Buka" pindah halaman', async () => {
    auth.profile = { role: 'dokter', full_name: 'Alya Putri' };
    wrap('/dokter');
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Ajarkan cara mengisi rekam medis' }));
    expect((await screen.findAllByText(/Simpan Rekam Medis/)).length).toBeGreaterThan(0);
    fireEvent.click(await screen.findByRole('button', { name: /Buka Rekam Medis/ }));
    expect(where()).toBe('/dokter/rekam-medis');
  });

  it('resepsionis: checklist harian khusus resepsionis', async () => {
    auth.profile = { role: 'resepsionis', full_name: 'Sinta' };
    wrap('/resepsionis');
    openPanel();
    await say('checklist harian');
    expect((await screen.findAllByText(/checklist harian resepsionis/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Layar Antrean/).length).toBeGreaterThan(0);
  });

  it('admin: "buka laporan" langsung pindah halaman', async () => {
    wrap('/admin');
    openPanel();
    await say('buka laporan');
    await waitFor(() => expect(where()).toBe('/admin/laporan'), { timeout: 3000 });
  });

  it('peran dibatasi: dokter diminta membuka kasir → ditolak, tetap di halaman', async () => {
    auth.profile = { role: 'dokter', full_name: 'Alya' };
    wrap('/dokter');
    openPanel();
    await say('buka kasir');
    expect((await screen.findAllByText(/dilakukan \*?\*?resepsionis|resepsionis/i)).length).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 1100));
    expect(where()).toBe('/dokter');
  });

  it('kamus istilah dijawab lokal untuk semua peran', async () => {
    auth.profile = { role: 'resepsionis', full_name: 'Sinta' };
    wrap('/resepsionis');
    openPanel();
    await say('apa itu recall');
    expect((await screen.findAllByText(/kontrol kembali/)).length).toBeGreaterThan(0);
  });

  it('pertanyaan data: admin diarahkan ke Asisten AI membawa pertanyaannya', async () => {
    wrap('/admin');
    openPanel();
    await say('berapa pendapatan bulan ini');
    fireEvent.click(await screen.findByRole('button', { name: /Tanya Asisten AI/ }));
    expect(where()).toBe('/admin/asisten-ai');
    expect(JSON.parse(screen.getByTestId('state').textContent)).toEqual({ ask: 'berapa pendapatan bulan ini' });
  });

  it('admin dengan Asisten AI aktif: pertanyaan data dijawab AI di widget (bertahap) + kartu usulan', async () => {
    ai.status = { aktif: true, tersedia_di_paket: true, kuota_bulanan: 300, terpakai_bulan_ini: 12 };
    ai.ask = vi.fn(async (q, history, opts) => {
      opts.onDelta('Pendapatan bulan ini ');
      opts.onDelta('**Rp 12.500.000**.');
      return { success: true, data: {
        answer: 'Pendapatan bulan ini **Rp 12.500.000**. Saya siapkan pencatatan stok masuk.',
        status: { aktif: true, tersedia_di_paket: true, kuota_bulanan: 300, terpakai_bulan_ini: 13 },
        actions: [{ id: 'a1', jenis: 'stok_masuk', pratinjau: { judul: 'Stok masuk Lidocaine 2 box', risiko: 'rendah' } }],
      } };
    });
    wrap('/admin/costing');
    openPanel();
    expect(await screen.findByText(/AI 12\/300 bulan ini/)).toBeInTheDocument();
    await say('berapa pendapatan bulan ini');
    await waitFor(() => expect(ai.ask).toHaveBeenCalledTimes(1));
    expect(ai.ask.mock.calls[0][0]).toBe('berapa pendapatan bulan ini');
    expect((await screen.findAllByText(/Rp 12\.500\.000/)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Stok masuk Lidocaine 2 box/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Setujui/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Tanya Asisten AI/ })).toBeNull();
    expect(where()).toBe('/admin/costing'); // tetap di halaman yang sama
    expect(await screen.findByText(/AI 13\/300 bulan ini/)).toBeInTheDocument();
  });

  it('admin dengan Asisten AI aktif: navigasi & istilah tetap lokal (tanpa kuota)', async () => {
    ai.status = { aktif: true, tersedia_di_paket: true, kuota_bulanan: 300, terpakai_bulan_ini: 0 };
    wrap('/admin');
    openPanel();
    await screen.findByText(/AI 0\/300 bulan ini/);
    await say('apa itu HPP');
    expect((await screen.findAllByText(/Harga Pokok Penjualan/)).length).toBeGreaterThan(0);
    expect(ai.ask).not.toHaveBeenCalled();
  });

  it('pertanyaan data: dokter tidak ditawari Asisten AI, malah diberi arahan', async () => {
    auth.profile = { role: 'dokter', full_name: 'Alya' };
    wrap('/dokter');
    openPanel();
    await say('berapa pendapatan bulan ini');
    expect((await screen.findAllByText(/belum paham/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Tanya Asisten AI/ })).toBeNull();
  });

  it('bantuan untuk dokter/resepsionis tidak menyebut analisis keuangan admin', async () => {
    auth.profile = { role: 'dokter', full_name: 'Alya' };
    wrap('/dokter');
    openPanel();
    await say('kamu bisa apa');
    expect((await screen.findAllByText(/Pemandu/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/titik impas \(BEP\)/)).toBeNull();
  });

  it('tersembunyi di halaman Asisten AI (sudah ada Eira di sana) dan Esc menutup panel', () => {
    const { unmount } = wrap('/admin/asisten-ai');
    expect(screen.queryByRole('button', { name: /Buka Eira/ })).toBeNull();
    unmount();
    wrap('/admin');
    openPanel();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('percakapan tersimpan per sesi tab', async () => {
    wrap('/admin');
    openPanel();
    await say('apa itu scaling');
    await screen.findAllByText(/karang gigi/);
    expect(JSON.parse(sessionStorage.getItem('dentiva-denti-widget')).some((m) => m.role === 'user' && m.content === 'apa itu scaling')).toBe(true);
  });
});
