/** Eira Agen: kartu usulan di halaman Asisten AI — setujui, tolak, setujui semua, batalkan, galat, kedaluwarsa. */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const { ai } = vi.hoisted(() => ({
  ai: {
    getStatus: vi.fn(), getProvider: vi.fn(), setEnabled: vi.fn(), ask: vi.fn(), feedback: vi.fn(),
    listKnowledge: vi.fn(), deleteKnowledge: vi.fn(), applyActions: vi.fn(), rejectActions: vi.fn(), undoAction: vi.fn(),
  },
}));
vi.mock('../services/aiService', () => ({ aiService: ai }));

import { ToastProvider } from '../components/common/ToastNotification';
import AiAssistantPage from '../components/ai/AiAssistantPage';
import AgentActions, { EXPIRES_MS } from '../components/ai/AgentActions';

const status = { paket: 'Pro', tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 1 };
const A1 = {
  id: '11111111-1111-4111-8111-111111111111', jenis: 'pengeluaran_catat',
  pratinjau: { judul: 'Catat pengeluaran Rp 1.250.000', rincian: ['2026-10-14 · Utilitas · Rp 1.250.000', 'Listrik Oktober'], peringatan: ['Mirip dengan pengeluaran yang sudah ada'], risiko: 'rendah' },
};
const A2 = {
  id: '22222222-2222-4222-8222-222222222222', jenis: 'tindakan_harga_massal',
  pratinjau: { judul: 'Ubah harga 12 tindakan (+5%)', rincian: ['Scaling: Rp 300.000 → Rp 315.000'], peringatan: [], risiko: 'tinggi' },
};

function Where() { return <div data-testid="where">{useLocation().pathname}</div>; }
const wrap = (ui) => render(<MemoryRouter initialEntries={['/admin/asisten-ai']}><ToastProvider>{ui}<Where /></ToastProvider></MemoryRouter>);

describe('AgentActions (komponen)', () => {
  const setup = (actions) => {
    const onChange = vi.fn(); const onApplied = vi.fn();
    wrap(<AgentActions actions={actions} onChange={onChange} onApplied={onApplied} />);
    return { onChange, onApplied };
  };
  const pend = (a, extra = {}) => ({ ...a, state: 'pending', at: Date.now(), error: '', ...extra });

  beforeEach(() => { vi.clearAllMocks(); });

  it('menampilkan judul, rincian, peringatan, tingkat risiko, dan menegaskan data belum berubah', () => {
    setup([pend(A1)]);
    expect(screen.getByText('Catat pengeluaran Rp 1.250.000')).toBeInTheDocument();
    expect(screen.getByText('Listrik Oktober')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Mirip dengan pengeluaran');
    expect(screen.getByText('Risiko rendah')).toBeInTheDocument();
    expect(screen.getByText(/Data baru berubah setelah Anda menyetujui/)).toBeInTheDocument();
  });

  it('Setujui → memanggil applyActions, menandai Dijalankan, dan melaporkan ke induk', async () => {
    ai.applyActions.mockResolvedValue({ success: true, data: { ok: true, dijalankan: 1, tindakan: [{ id: A1.id, bisa_batal: true }] } });
    const { onChange, onApplied } = setup([pend(A1)]);
    fireEvent.click(screen.getByRole('button', { name: /Setujui: Catat pengeluaran/ }));
    await waitFor(() => expect(ai.applyActions).toHaveBeenCalledWith([A1.id]));
    await waitFor(() => expect(onApplied).toHaveBeenCalled());
    const last = onChange.mock.calls.at(-1)[0];
    expect(last[0]).toMatchObject({ id: A1.id, state: 'applied', bisaBatal: true });
  });

  it('galat server (mis. harga berubah) ditampilkan di kartu dan kartu tetap menunggu', async () => {
    ai.applyActions.mockResolvedValue({ success: false, error: 'Harga "Scaling" sudah berubah sejak usulan dibuat.' });
    const { onChange } = setup([pend(A2)]);
    fireEvent.click(screen.getByRole('button', { name: /Setujui: Ubah harga/ }));
    await waitFor(() => expect(onChange.mock.calls.length).toBeGreaterThan(1));
    const last = onChange.mock.calls.at(-1)[0];
    expect(last[0].state).toBe('pending');
    expect(last[0].error).toMatch(/sudah berubah/);
  });

  it('Tolak → rejectActions dan status ditolak', async () => {
    ai.rejectActions.mockResolvedValue({ success: true, data: { ok: true, ditolak: 1 } });
    const { onChange } = setup([pend(A1)]);
    fireEvent.click(screen.getByRole('button', { name: /Tolak: Catat pengeluaran/ }));
    await waitFor(() => expect(ai.rejectActions).toHaveBeenCalledWith([A1.id]));
    await waitFor(() => expect(onChange.mock.calls.at(-1)[0][0].state).toBe('rejected'));
  });

  it('beberapa usulan → "Setujui semua" satu paket', async () => {
    ai.applyActions.mockResolvedValue({ success: true, data: { ok: true, dijalankan: 2, tindakan: [{ id: A1.id, bisa_batal: true }, { id: A2.id, bisa_batal: true }] } });
    const { onChange } = setup([pend(A1), pend(A2)]);
    expect(screen.getByText(/satu paket/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Setujui semua \(2\)/ }));
    await waitFor(() => expect(ai.applyActions).toHaveBeenCalledWith([A1.id, A2.id]));
    await waitFor(() => expect(onChange.mock.calls.at(-1)[0].every((a) => a.state === 'applied')).toBe(true));
  });

  it('usulan yang sudah dijalankan: Batalkan hanya bila bisa dibatalkan; Batalkan memanggil undoAction', async () => {
    ai.undoAction.mockResolvedValue({ success: true, data: { ok: true } });
    const { onChange } = setup([{ ...A1, state: 'applied', bisaBatal: true, at: Date.now() }, { ...A2, state: 'applied', bisaBatal: false, at: Date.now() }]);
    expect(screen.getAllByText('Dijalankan')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^Batalkan:/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Setujui semua/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Batalkan: Catat pengeluaran/ }));
    await waitFor(() => expect(ai.undoAction).toHaveBeenCalledWith(A1.id));
    await waitFor(() => expect(onChange.mock.calls.at(-1)[0][0].state).toBe('undone'));
  });

  it('usulan lewat 30 menit tampil kedaluwarsa tanpa tombol setuju', () => {
    setup([pend(A1, { at: Date.now() - EXPIRES_MS - 1000 })]);
    expect(screen.getByText('Kedaluwarsa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Setujui/ })).toBeNull();
  });

  it('"Lihat di …" membuka halaman yang tepat', () => {
    setup([{ ...A1, state: 'applied', bisaBatal: false, at: Date.now() }]);
    fireEvent.click(screen.getByRole('button', { name: /Lihat di Pengeluaran/ }));
    expect(screen.getByTestId('where').textContent).toBe('/admin/pengeluaran');
  });
});

describe('Halaman Asisten AI menampilkan usulan dari jawaban Eira', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    sessionStorage.clear();
    ai.getStatus.mockResolvedValue({ success: true, data: status });
    ai.getProvider.mockResolvedValue({ success: true, data: { configured: true, provider: 'anthropic', label: 'Claude' } });
    ai.listKnowledge.mockResolvedValue({ success: true, data: [] });
  });

  it('jawaban beserta kartu; setujui → tindakan dijalankan', async () => {
    ai.ask.mockResolvedValue({ success: true, data: {
      answer: 'Saya siapkan **1 usulan** pengeluaran. Silakan periksa dan setujui di kartu.', tools: ['cari_pengeluaran', 'usulkan_pengeluaran_catat'],
      usage_id: 'u1', actions: [A1], status,
    } });
    ai.applyActions.mockResolvedValue({ success: true, data: { ok: true, dijalankan: 1, tindakan: [{ id: A1.id, bisa_batal: true }] } });
    wrap(<AiAssistantPage />);
    const box = await screen.findByPlaceholderText(/Tulis pertanyaan/);
    fireEvent.change(box, { target: { value: 'Catat pengeluaran listrik Oktober Rp 1.250.000' } });
    fireEvent.click(screen.getByRole('button', { name: /Kirim/ }));
    await waitFor(() => expect(ai.ask).toHaveBeenCalled());
    const card = await screen.findByRole('article', { name: /Catat pengeluaran Rp 1.250.000/ });
    expect(within(card).getByText('Listrik Oktober')).toBeInTheDocument();
    expect(screen.getByText(/Cari pengeluaran/)).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: /Setujui/ }));
    await waitFor(() => expect(ai.applyActions).toHaveBeenCalledWith([A1.id]));
    await waitFor(() => expect(within(card).getByText('Dijalankan')).toBeInTheDocument());
  });
});
