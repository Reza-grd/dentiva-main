/** Eira Agen: alur pindai nota → pesan ke Eira (periksa duplikat, catat pengeluaran + stok masuk). */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { ai, resize } = vi.hoisted(() => ({
  ai: {
    getStatus: vi.fn(), getProvider: vi.fn(), setEnabled: vi.fn(), ask: vi.fn(), feedback: vi.fn(),
    listKnowledge: vi.fn(), deleteKnowledge: vi.fn(), applyActions: vi.fn(), rejectActions: vi.fn(), undoAction: vi.fn(), scanReceipt: vi.fn(),
  },
  resize: vi.fn(),
}));
vi.mock('../services/aiService', () => ({ aiService: ai }));
vi.mock('../utils/imageResize', () => ({ resizeImageToJpeg: resize }));

import { ToastProvider } from '../components/common/ToastNotification';
import AiAssistantPage from '../components/ai/AiAssistantPage';
import { notaMessage } from '../utils/notaMessage';

const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };
const DRAFT = {
  adalah_nota: true, tanggal: '2026-10-12', pemasok: 'CV Medika Jaya', nomor_nota: 'MJ-088', total: 1850000, kategori: 'Bahan & Alat Habis Pakai',
  items: [{ nama: 'Sarung tangan nitril M', jumlah: 10, harga: 650000 }, { nama: 'Masker bedah', jumlah: 20, harga: 1200000 }],
};

describe('notaMessage', () => {
  it('memuat pemasok, tanggal, nomor, total, barang, dan instruksi periksa duplikat', () => {
    const m = notaMessage(DRAFT);
    expect(m).toMatch(/Pemasok: CV Medika Jaya/);
    expect(m).toMatch(/Nomor nota: MJ-088/);
    expect(m).toMatch(/Total Rp 1\.850\.000/);
    expect(m).toMatch(/Sarung tangan nitril M ×10 \(Rp 650\.000\)/);
    expect(m).toMatch(/periksa dulu apakah nota ini sudah tercatat/);
    expect(m).toMatch(/masukkan ke stok/);
  });

  it('selalu ≤ 1000 karakter walau nota panjang, dan menyebut sisa barang', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ nama: `Bahan nomor ${i + 1} dengan nama lumayan panjang`, jumlah: i + 1, harga: 10000 * (i + 1) }));
    const m = notaMessage({ ...DRAFT, items });
    expect(m.length).toBeLessThanOrEqual(1000);
    expect(m).toMatch(/dan \d+ barang lain/);
    expect(m).toMatch(/periksa dulu apakah nota ini sudah tercatat/);
  });

  it('nota minim (tanpa barang/total) tetap menghasilkan pesan yang valid', () => {
    const m = notaMessage({ adalah_nota: true, items: [] });
    expect(m).toMatch(/^Saya pindai nota\./);
    expect(m.length).toBeLessThanOrEqual(1000);
  });
});

describe('Halaman Asisten AI: tombol pindai nota', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    ai.getStatus.mockResolvedValue({ success: true, data: status });
    ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'anthropic', label: 'Claude' } });
    ai.listKnowledge.mockResolvedValue({ success: true, data: [] });
    resize.mockResolvedValue({ base64: 'QUJD', mediaType: 'image/jpeg', blob: new Blob(['x']), width: 10, height: 10 });
  });
  const wrap = () => render(<MemoryRouter initialEntries={['/admin/asisten-ai']}><ToastProvider><AiAssistantPage /></ToastProvider></MemoryRouter>);
  const pick = async () => {
    const input = await screen.findByTestId('nota-input');
    fireEvent.change(input, { target: { files: [new File(['x'], 'nota.jpg', { type: 'image/jpeg' })] } });
  };

  it('foto nota dipindai lalu dikirim sebagai pertanyaan ke Eira Agen', async () => {
    ai.scanReceipt.mockResolvedValue({ success: true, data: { draft: DRAFT, status } });
    ai.ask.mockResolvedValue({ success: true, data: { answer: 'Saya baca **2 baris** dari nota CV Medika Jaya.', tools: ['cari_pengeluaran'], usage_id: 'u', actions: [], status } });
    wrap();
    await pick();
    await waitFor(() => expect(ai.scanReceipt).toHaveBeenCalledWith('QUJD', 'image/jpeg'));
    await waitFor(() => expect(ai.ask).toHaveBeenCalled());
    const sent = ai.ask.mock.calls[0][0];
    expect(sent).toMatch(/Saya pindai nota/);
    expect(sent).toMatch(/CV Medika Jaya/);
    expect(await screen.findByText(/Saya baca/)).toBeInTheDocument();
  });

  it('foto yang bukan nota tidak dikirim ke Eira', async () => {
    ai.scanReceipt.mockResolvedValue({ success: true, data: { draft: { adalah_nota: false, items: [] }, status } });
    wrap();
    await pick();
    await waitFor(() => expect(ai.scanReceipt).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(ai.ask).not.toHaveBeenCalled();
    expect(await screen.findByText(/sepertinya bukan nota/)).toBeInTheDocument();
  });

  it('gagal memindai → pesan galat, tidak ada pertanyaan', async () => {
    ai.scanReceipt.mockResolvedValue({ success: false, error: 'Nota tidak berhasil dibaca.' });
    wrap();
    await pick();
    expect(await screen.findByText(/Nota tidak berhasil dibaca/)).toBeInTheDocument();
    expect(ai.ask).not.toHaveBeenCalled();
  });
});
