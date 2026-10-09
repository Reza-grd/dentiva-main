/** Basis pengetahuan Asisten AI: penilaian 👍/👎, tanya ulang, jawaban instan, daftar terverifikasi. */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { ai } = vi.hoisted(() => ({
  ai: {
    getStatus: vi.fn(), getProvider: vi.fn(), setEnabled: vi.fn(), ask: vi.fn(),
    feedback: vi.fn(), listKnowledge: vi.fn(), deleteKnowledge: vi.fn(),
  },
}));
vi.mock('../services/aiService', () => ({ aiService: ai }));

import { ToastProvider } from '../components/common/ToastNotification';
import AiAssistantPage from '../components/ai/AiAssistantPage';

const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };
const wrap = () => render(<MemoryRouter><ToastProvider><AiAssistantPage /></ToastProvider></MemoryRouter>);

async function askQuestion(text) {
  const box = await screen.findByPlaceholderText(/Tulis pertanyaan/);
  fireEvent.change(box, { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn(); // tidak ada di jsdom
  sessionStorage.clear();
  ai.getStatus.mockResolvedValue({ success: true, data: status });
  ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'gemini', label: 'Google Gemini', free_tier: true } });
  ai.feedback.mockResolvedValue({ success: true, data: { saved: true } });
  ai.listKnowledge.mockResolvedValue({ success: true, data: [] });
});

describe('Penilaian jawaban Asisten AI', () => {
  it('👍 Tepat menyimpan jawaban sebagai terverifikasi', async () => {
    ai.ask.mockResolvedValue({ success: true, data: { answer: 'Pendapatan bulan ini Rp 250.000.', tools: [], usage_id: 'u1' } });
    wrap();
    await askQuestion('Berapa pendapatan bulan ini?');
    expect(await screen.findByText('Pendapatan bulan ini Rp 250.000.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jawaban tepat' }));
    await waitFor(() => expect(ai.feedback).toHaveBeenCalledWith('u1', true));
    expect(await screen.findByText('Disimpan sebagai jawaban terverifikasi')).toBeInTheDocument();
  });

  it('👎 Kurang tepat + catatan → dinilai salah lalu ditanyakan ulang dengan catatan', async () => {
    ai.ask
      .mockResolvedValueOnce({ success: true, data: { answer: 'Jawaban pertama.', tools: [], usage_id: 'u1' } })
      .mockResolvedValueOnce({ success: true, data: { answer: 'Jawaban perbaikan.', tools: ['ringkasan_pendapatan'], usage_id: 'u2' } });
    wrap();
    await askQuestion('Berapa pendapatan bulan lalu?');
    await screen.findByText('Jawaban pertama.');
    fireEvent.click(screen.getByRole('button', { name: 'Jawaban kurang tepat' }));
    fireEvent.change(screen.getByLabelText('Apa yang kurang tepat'), { target: { value: 'periodenya salah' } });
    fireEvent.click(screen.getByRole('button', { name: /Tanyakan ulang/ }));
    await waitFor(() => expect(ai.feedback).toHaveBeenCalledWith('u1', false, 'periodenya salah'));
    await waitFor(() => expect(ai.ask).toHaveBeenLastCalledWith('Berapa pendapatan bulan lalu?', [], { retry: true, note: 'periodenya salah' }));
    expect(await screen.findByText('Jawaban perbaikan.')).toBeInTheDocument();
    expect(screen.getByText('Jawaban diperbaiki')).toBeInTheDocument();
    expect(screen.getByText(/Dinilai kurang tepat/)).toBeInTheDocument();
  });

  it('jawaban dari basis pengetahuan ditandai instan', async () => {
    ai.ask.mockResolvedValue({ success: true, data: { answer: 'Buka Pengaturan → Layar Antrean TV.', tools: [], usage_id: 'u3', cached: true } });
    wrap();
    await askQuestion('Bagaimana cara membuat tautan layar antrean TV?');
    expect(await screen.findByText(/Jawaban terverifikasi · instan/)).toBeInTheDocument();
  });

  it('daftar jawaban terverifikasi dapat dibuka dan dihapus', async () => {
    ai.listKnowledge.mockResolvedValue({ success: true, data: [
      { id: 'k1', question: 'Di mana mengubah warna tema klinik?', answer: 'Buka Pengaturan.', kind: 'panduan', hit_count: 3, updated_at: new Date().toISOString() },
    ] });
    ai.deleteKnowledge.mockResolvedValue({ success: true });
    wrap();
    fireEvent.click(await screen.findByRole('button', { name: /Jawaban terverifikasi/ }));
    expect(await screen.findByText('Di mana mengubah warna tema klinik?')).toBeInTheDocument();
    expect(screen.getByText(/Panduan · dipakai 3×/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hapus jawaban/ }));
    await waitFor(() => expect(ai.deleteKnowledge).toHaveBeenCalledWith('k1'));
    await waitFor(() => expect(screen.queryByText('Di mana mengubah warna tema klinik?')).not.toBeInTheDocument());
  });
});
