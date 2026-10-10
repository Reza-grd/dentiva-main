/** Denti pintar di Asisten AI: obrolan ringan tanpa kuota, topik analisis, ekspresi dari isi jawaban. */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { smallTalk, topicOf, moodForAnswer, moodForBrief } from '../utils/dentiMood';

const { ai } = vi.hoisted(() => ({
  ai: {
    getStatus: vi.fn(), getProvider: vi.fn(), setEnabled: vi.fn(), ask: vi.fn(),
    feedback: vi.fn(), listKnowledge: vi.fn(), deleteKnowledge: vi.fn(),
  },
}));
vi.mock('../services/aiService', () => ({ aiService: ai }));

import { ToastProvider } from '../components/common/ToastNotification';
import AiAssistantPage from '../components/ai/AiAssistantPage';

describe('Aturan Denti', () => {
  it('obrolan ringan dikenali; pertanyaan data tidak', () => {
    expect(smallTalk('Terima kasih!', { name: 'Rina' })).toMatchObject({ state: 'love', reply: expect.stringContaining('Rina') });
    expect(smallTalk('kamu pintar banget')).toMatchObject({ state: 'shy' });
    expect(smallTalk('kamu siapa?')).toMatchObject({ state: 'wave' });
    expect(smallTalk('ceritakan lelucon dong')).toMatchObject({ state: 'laugh' });
    expect(smallTalk('joget dong')).toMatchObject({ state: 'dance' });
    expect(smallTalk('Halo', { greeting: 'Selamat Pagi' })).toMatchObject({ state: 'wave', reply: expect.stringContaining('Selamat Pagi') });
    expect(smallTalk('halo, berapa pendapatan bulan ini?')).toBeNull();
    expect(smallTalk('terima kasih, sekarang cek stok bahan')).toBeNull();
    expect(smallTalk('stop')).toBeNull();
  });

  it('topik analisis ditebak dari pertanyaan', () => {
    expect(topicOf('Berapa pendapatan bulan ini?')).toBe('data pendapatan');
    expect(topicOf('Bahan apa yang hampir kadaluarsa?')).toBe('stok bahan');
    expect(topicOf('Bagaimana cara membuat tautan layar antrean?')).toBe('panduan Dentiva');
    expect(topicOf('Tolong ringkas')).toBe('data klinik');
  });

  it('ekspresi mengikuti isi jawaban', () => {
    expect(moodForAnswer('Pendapatan naik 12% dan tertinggi tahun ini.').state).toBe('celebrate');
    expect(moodForAnswer('Ada 3 bahan kadaluarsa dan stok menipis.').state).toBe('surprise');
    expect(moodForAnswer('Kunjungan menurun dan 2 tagihan belum dibayar.').state).toBe('think');
    expect(moodForAnswer('Buka menu Pengaturan, lalu klik Layar Antrean.').state).toBe('point');
    expect(moodForAnswer('Jumlah pasien: 40.').state).toBe('happy');
    expect(moodForAnswer('', { error: true }).state).toBe('sorry');
  });

  it('ekspresi catatan Dashboard dari tingkat poin', () => {
    expect(moodForBrief({ poin: [{ tingkat: 'penting' }, { tingkat: 'baik' }] })).toBe('think');
    expect(moodForBrief({ poin: [{ tingkat: 'baik' }, { tingkat: 'perhatian' }] })).toBe('happy');
    expect(moodForBrief({ poin: [{ tingkat: 'perhatian' }] })).toBe('talk');
  });
});

describe('Denti di halaman Asisten AI', () => {
  const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };
  const wrap = () => render(<MemoryRouter><ToastProvider><AiAssistantPage /></ToastProvider></MemoryRouter>);
  const send = async (text) => {
    const box = await screen.findByPlaceholderText(/Tulis pertanyaan/);
    fireEvent.change(box, { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    ai.getStatus.mockResolvedValue({ success: true, data: status });
    ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'gemini', label: 'Google Gemini' } });
  });

  it('menyapa saat dibuka; obrolan ringan dijawab Denti tanpa memanggil AI', async () => {
    wrap();
    expect(await screen.findByText(/Saya Denti — tanyakan apa saja/)).toBeInTheDocument();
    await send('terima kasih');
    expect(await screen.findByText('Dijawab langsung oleh Denti · tidak memakai kuota')).toBeInTheDocument();
    expect(ai.ask).not.toHaveBeenCalled();
    expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'love');
  });

  it('pertanyaan data: Denti memindai lalu bereaksi pada jawaban; obrolan ringan tidak ikut riwayat AI', async () => {
    let resolve;
    ai.ask.mockReturnValue(new Promise((r) => { resolve = r; }));
    wrap();
    await send('halo');
    await screen.findByText('Dijawab langsung oleh Denti · tidak memakai kuota');
    await send('Berapa pendapatan bulan ini?');
    expect(await screen.findByText('Menganalisis data pendapatan…')).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'scan'));
    expect(ai.ask).toHaveBeenCalledWith('Berapa pendapatan bulan ini?', []);
    resolve({ success: true, data: { answer: 'Pendapatan naik 15% dibanding bulan lalu.', tools: [], usage_id: 'u1' } });
    expect(await screen.findByText('Kabar baik!')).toBeInTheDocument();
    expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'celebrate');
  });

  it('Denti bisa dicolek', async () => {
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: 'Colek Denti' }));
    expect(await screen.findByText('Hihi, geli!')).toBeInTheDocument();
    expect(document.querySelector('svg.denti')).toHaveAttribute('data-state', 'laugh');
  });
});
