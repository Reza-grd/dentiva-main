/** Denti di halaman Asisten AI: membuka tab/halaman yang diminta, tawaran "ya", kuis, dan tautan tab Pengaturan. */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const { ai } = vi.hoisted(() => ({
  ai: {
    getStatus: vi.fn(), getProvider: vi.fn(), setEnabled: vi.fn(), ask: vi.fn(),
    feedback: vi.fn(), listKnowledge: vi.fn(), deleteKnowledge: vi.fn(),
  },
}));
vi.mock('../services/aiService', () => ({ aiService: ai }));

import { ToastProvider } from '../components/common/ToastNotification';
import AiAssistantPage from '../components/ai/AiAssistantPage';
import { PAGES } from '../utils/dentiGuide';

const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}{loc.search}</div>;
}
const wrap = () => render(
  <MemoryRouter initialEntries={['/admin/asisten-ai']}><ToastProvider><AiAssistantPage /><Where /></ToastProvider></MemoryRouter>,
);
const where = () => screen.getByTestId('where').textContent;

async function say(text) {
  const box = await screen.findByPlaceholderText(/Tulis pertanyaan/);
  fireEvent.change(box, { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  sessionStorage.clear();
  ai.getStatus.mockResolvedValue({ success: true, data: status });
  ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'gemini', label: 'Google Gemini', free_tier: true } });
  ai.listKnowledge.mockResolvedValue({ success: true, data: [] });
});

describe('Denti membuka halaman yang diminta', () => {
  it('"Buka jadwal dokter" langsung pindah halaman tanpa memanggil AI', async () => {
    wrap();
    await say('Buka jadwal dokter');
    await waitFor(() => expect(where()).toBe('/admin/jadwal-dokter'), { timeout: 3000 });
    expect(ai.ask).not.toHaveBeenCalled();
  });

  it('"X di mana?" menawarkan, lalu "ya" membukanya', async () => {
    wrap();
    await say('layar antrean di mana?');
    expect((await screen.findAllByText(/Mau saya buka sekarang/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Buka .*Layar Antrean/i })).toBeInTheDocument();
    expect(where()).toBe('/admin/asisten-ai');
    await say('ya');
    await waitFor(() => expect(where()).toBe('/layar-antrean'), { timeout: 3000 });
    expect(ai.ask).not.toHaveBeenCalled();
  });

  it('admin diminta membuka data pasien → ditolak sopan, tetap di halaman', async () => {
    wrap();
    await say('buka data pasien');
    expect((await screen.findAllByText(/Admin sengaja hanya melihat angka ringkas/)).length).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 1200));
    expect(where()).toBe('/admin/asisten-ai');
  });

  it('tutorial: "ajarkan cara install dentiva" menjawab langkah-langkah', async () => {
    wrap();
    await say('ajarkan cara install dentiva');
    expect((await screen.findAllByText(/dentiva\.id\/unduh/)).length).toBeGreaterThan(0);
    expect(ai.ask).not.toHaveBeenCalled();
  });
});

describe('Denti sebagai kamus & pemandu harian', () => {
  it('"apa itu HPP" dijawab lokal, lalu "ya" membuka Biaya & Modal', async () => {
    wrap();
    await say('apa itu HPP?');
    expect((await screen.findAllByText(/Harga Pokok Penjualan/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Buka .*Biaya/i })).toBeInTheDocument();
    await say('ya');
    await waitFor(() => expect(where()).toBe('/admin/costing'), { timeout: 3000 });
    expect(ai.ask).not.toHaveBeenCalled();
  });

  it('"checklist harian" menampilkan daftar tugas admin', async () => {
    wrap();
    await say('checklist harian');
    expect((await screen.findAllByText(/checklist harian admin/)).length).toBeGreaterThan(0);
    expect(ai.ask).not.toHaveBeenCalled();
  });

  it('salah ketik ringan tetap dipahami ("apa itu skeling")', async () => {
    wrap();
    await say('apa itu skeling');
    expect((await screen.findAllByText(/karang gigi/)).length).toBeGreaterThan(0);
    expect(ai.ask).not.toHaveBeenCalled();
  });

  it('"pertunjukan" memutar rangkaian gerakan dan "lagi" tidak diteruskan ke AI', async () => {
    wrap();
    await say('semua gerakan');
    expect((await screen.findAllByText(/Pertunjukan lengkap/)).length).toBeGreaterThan(0);
    expect(ai.ask).not.toHaveBeenCalled();
  });
});

describe('Denti seru diajak ngobrol', () => {
  it('kuis gigi: mulai → menyerah → jawaban terungkap', async () => {
    wrap();
    await say('kuis');
    expect((await screen.findAllByText(/Kuis gigi/)).length).toBeGreaterThan(0);
    await say('nyerah');
    expect((await screen.findAllByText(/Jawabannya/)).length).toBeGreaterThan(0);
  });

  it('"gerakan apa saja" memulai atraksi', async () => {
    wrap();
    await say('gerakan apa saja');
    expect((await screen.findAllByText(/atraksi dimulai/i)).length).toBeGreaterThan(0);
  });

  it('pertanyaan data klinik tetap diteruskan ke AI', async () => {
    ai.ask.mockResolvedValue({ success: true, data: { answer: 'Pendapatan Rp 1.000.000.', tools: [], usage_id: 'u1' } });
    wrap();
    await say('Berapa pendapatan bulan ini?');
    expect(await screen.findByText('Pendapatan Rp 1.000.000.')).toBeInTheDocument();
    expect(ai.ask).toHaveBeenCalledTimes(1);
  });
});

describe('Konsistensi pemandu dengan aplikasi', () => {
  const src = (p) => readFileSync(resolve(__dirname, p), 'utf8');
  // `to` bisa berupa teks atau peta per peran
  const targets = () => PAGES.flatMap((p) => (typeof p.to === 'string' ? [p.to] : Object.values(p.to || {})));

  it('setiap tautan ?tab= milik Denti ada di Pengaturan', () => {
    const settings = src('../components/settings/SettingsPage.jsx');
    const tabs = [...new Set(targets().map((to) => /[?&]tab=([\w-]+)/.exec(to)?.[1]).filter(Boolean))];
    expect(tabs.length).toBeGreaterThan(5);
    for (const t of tabs) expect(settings).toContain(`id: '${t}'`);
  });

  it('setiap rute tujuan Denti terdaftar di App.jsx', () => {
    const app = src('../App.jsx');
    const routes = [...new Set(targets().map((to) => to.split('?')[0]))];
    const missing = routes.filter((r) => !app.includes(`path="${r}"`) && !app.includes(`path="${r.replace(/^\//, '')}"`) && !app.includes(`'${r}'`));
    expect(missing).toEqual([]);
  });
});
