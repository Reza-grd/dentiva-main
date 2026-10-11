/** Denti Pemandu (widget mengambang) — tersedia untuk semua peran, memakai otak lokal tanpa kuota AI. */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const auth = vi.hoisted(() => ({ profile: { role: 'admin', full_name: 'Rina Sari' } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: auth.profile }) }));

import DentiGuideWidget from '../components/ai/DentiGuideWidget';

function Where() {
  const loc = useLocation();
  return (
    <>
      <div data-testid="where">{loc.pathname}{loc.search}</div>
      <div data-testid="state">{JSON.stringify(loc.state || null)}</div>
    </>
  );
}
const wrap = (path = '/admin') => render(<MemoryRouter initialEntries={[path]}><DentiGuideWidget /><Where /></MemoryRouter>);
const where = () => screen.getByTestId('where').textContent;
const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /Buka Denti/ }));
async function say(text) {
  fireEvent.change(screen.getByLabelText('Tulis pesan untuk Denti'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
  auth.profile = { role: 'admin', full_name: 'Rina Sari' };
});

describe('Denti Pemandu', () => {
  it('tombol mengambang membuka panel dengan sapaan & tombol saran sesuai peran', () => {
    auth.profile = { role: 'dokter', full_name: 'Alya Putri' };
    wrap('/dokter');
    expect(screen.queryByRole('dialog')).toBeNull();
    openPanel();
    expect(screen.getByRole('dialog', { name: /Denti/ })).toBeInTheDocument();
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

  it('tersembunyi di halaman Asisten AI (sudah ada Denti di sana) dan Esc menutup panel', () => {
    const { unmount } = wrap('/admin/asisten-ai');
    expect(screen.queryByRole('button', { name: /Buka Denti/ })).toBeNull();
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
