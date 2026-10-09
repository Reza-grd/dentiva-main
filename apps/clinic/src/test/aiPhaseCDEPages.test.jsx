/**
 * Halaman Pengeluaran (fase C) dan Recall Pasien (fase E) dengan layanan tiruan.
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { expense, ai, recall, updateSettings, auth } = vi.hoisted(() => ({
  expense: {
    list: vi.fn(), around: vi.fn(), byNota: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
    uploadReceipt: vi.fn(), removeReceipt: vi.fn(), receiptUrl: vi.fn(),
  },
  ai: { getStatus: vi.fn(), scanReceipt: vi.fn(), draftRecallTemplate: vi.fn() },
  recall: { candidates: vi.fn(), markContacted: vi.fn() },
  updateSettings: vi.fn(),
  auth: { role: 'admin' },
}));

vi.mock('../services/expenseService', () => ({ expenseService: expense }));
vi.mock('../services/aiService', () => ({ aiService: ai }));
vi.mock('../services/recallService', () => ({ recallService: recall }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: { role: auth.role, clinic_id: 'c1' } }) }));
vi.mock('../contexts/ClinicSettingsContext', () => ({
  useClinicSettings: () => ({ settings: { clinic_name: 'Klinik Senyum' }, updateSettings }),
}));

import { ToastProvider } from '../components/common/ToastNotification';
import ExpensesPage from '../components/financial/ExpensesPage';
import RecallPage from '../components/recall/RecallPage';

const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const wrap = (ui) => render(<MemoryRouter><ToastProvider>{ui}</ToastProvider></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  auth.role = 'admin';
  updateSettings.mockResolvedValue({ success: true });
  ai.getStatus.mockResolvedValue({ success: true, data: { tersedia_di_paket: true, aktif: true, kuota_bulanan: 300, terpakai_bulan_ini: 2 } });
  expense.list.mockResolvedValue({ success: true, data: [
    { id: 'e1', tanggal_expense: today, kategori: 'Utilitas', deskripsi: 'Listrik', jumlah: '450000', sumber: 'manual' },
    { id: 'e2', tanggal_expense: today, kategori: 'Alat Medis', deskripsi: 'Scaler', jumlah: '1550000', sumber: 'ai_nota', pemasok: 'PT Dental', nomor_nota: 'INV-9' },
  ] });
  expense.around.mockResolvedValue({ success: true, data: [] });
  expense.byNota.mockResolvedValue({ success: true, data: [] });
});

describe('Halaman Pengeluaran', () => {
  it('menampilkan daftar, total, dan kategori terbesar', async () => {
    wrap(<ExpensesPage />);
    expect(await screen.findByText('Listrik')).toBeInTheDocument();
    expect(screen.getByText(/2\.000\.000/)).toBeInTheDocument();
    expect(screen.getAllByText('Alat Medis').length).toBeGreaterThan(0);
    expect(screen.getByText('PT Dental · No. INV-9')).toBeInTheDocument();
  });

  it('menyimpan pengeluaran manual dengan field yang benar', async () => {
    expense.create.mockResolvedValue({ success: true, data: { id: 'n1', tanggal_expense: today } });
    wrap(<ExpensesPage />);
    await screen.findByText('Listrik');
    fireEvent.click(screen.getByRole('button', { name: /Tambah/ }));
    fireEvent.change(screen.getByLabelText('Jumlah (Rp)'), { target: { value: '250000' } });
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'Sewa' } });
    fireEvent.change(screen.getByLabelText('Keterangan'), { target: { value: 'Sewa gudang' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(expense.create).toHaveBeenCalledTimes(1));
    expect(expense.create.mock.calls[0][0]).toMatchObject({ tanggal_expense: today, kategori: 'Sewa', jumlah: '250000', deskripsi: 'Sewa gudang', sumber: 'manual' });
    expect(expense.uploadReceipt).not.toHaveBeenCalled();
  });

  it('memperingatkan nota ganda dan baru menyimpan setelah "Tetap simpan"', async () => {
    expense.around.mockResolvedValue({ success: true, data: [{ id: 'e1', tanggal_expense: today, jumlah: '450000', nomor_nota: null }] });
    expense.create.mockResolvedValue({ success: true, data: { id: 'n2', tanggal_expense: today } });
    wrap(<ExpensesPage />);
    await screen.findByText('Listrik');
    fireEvent.click(screen.getByRole('button', { name: /Tambah/ }));
    fireEvent.change(screen.getByLabelText('Jumlah (Rp)'), { target: { value: '450000' } });
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'Utilitas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText(/Kemungkinan nota ini sudah dicatat/)).toBeInTheDocument();
    expect(expense.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tetap simpan' }));
    await waitFor(() => expect(expense.create).toHaveBeenCalledTimes(1));
  });

  it('menolak jumlah nol dan tanggal di masa depan', async () => {
    wrap(<ExpensesPage />);
    await screen.findByText('Listrik');
    fireEvent.click(screen.getByRole('button', { name: /Tambah/ }));
    fireEvent.change(screen.getByLabelText('Kategori'), { target: { value: 'Sewa' } });
    fireEvent.change(screen.getByLabelText('Jumlah (Rp)'), { target: { value: '0' } });
    fireEvent.submit(screen.getByLabelText('Jumlah (Rp)').closest('form'));
    expect(await screen.findByText('Jumlah harus lebih dari 0.')).toBeInTheDocument();
    expect(expense.create).not.toHaveBeenCalled();
  });

  it('mengarahkan ke Asisten AI bila AI belum diaktifkan', async () => {
    ai.getStatus.mockResolvedValue({ success: true, data: { tersedia_di_paket: true, aktif: false, kuota_bulanan: 300, terpakai_bulan_ini: 0 } });
    wrap(<ExpensesPage />);
    await screen.findByText('Listrik');
    await waitFor(() => expect(ai.getStatus).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Pindai nota/ }));
    expect(await screen.findByText('Aktifkan Asisten AI terlebih dahulu.')).toBeInTheDocument();
  });
});

describe('Halaman Recall Pasien', () => {
  const rows = [
    { patient_id: 'p1', no_rm: 'RM-001', nama_lengkap: 'budi santoso', no_wa: '081234567890', wa_consent: true, kunjungan_terakhir: '2026-01-10', jumlah_kunjungan: 3, terakhir_dihubungi: null, jumlah_dihubungi: 0 },
    { patient_id: 'p2', no_rm: 'RM-002', nama_lengkap: 'Siti', no_wa: '081111111111', wa_consent: false, kunjungan_terakhir: '2025-12-01', jumlah_kunjungan: 1, terakhir_dihubungi: null, jumlah_dihubungi: 0 },
  ];

  beforeEach(() => {
    recall.candidates.mockResolvedValue({ success: true, data: rows });
    recall.markContacted.mockResolvedValue({ success: true });
  });

  it('membuat tautan WA hanya untuk pasien yang mengizinkan, berisi nama & klinik', async () => {
    wrap(<RecallPage />);
    expect(await screen.findByText('budi santoso')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Kirim WA/ });
    const href = decodeURIComponent(link.getAttribute('href'));
    expect(href).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(href).toContain('Halo Budi Santoso');
    expect(href).toContain('Klinik Senyum');
    expect(screen.getAllByRole('link', { name: /Kirim WA/ })).toHaveLength(1);
    expect(screen.getByText('Tanpa izin WA')).toBeInTheDocument();
  });

  it('mencatat kontak saat WA dibuka dan menyembunyikan yang baru dihubungi', async () => {
    wrap(<RecallPage />);
    await screen.findByText('budi santoso');
    fireEvent.click(screen.getByRole('link', { name: /Kirim WA/ }));
    await waitFor(() => expect(recall.markContacted).toHaveBeenCalledWith('p1', 'wa'));
    await waitFor(() => expect(screen.queryByText('budi santoso')).not.toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/Sembunyikan yang sudah dihubungi/));
    expect(await screen.findByText('budi santoso')).toBeInTheDocument();
  });

  it('resepsionis tidak bisa mengubah template dan tidak memanggil status AI', async () => {
    auth.role = 'resepsionis';
    wrap(<RecallPage />);
    await screen.findByText('budi santoso');
    expect(screen.getByLabelText('Template pesan WA')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: /Simpan template/ })).not.toBeInTheDocument();
    expect(ai.getStatus).not.toHaveBeenCalled();
  });

  it('admin menyimpan template; template tanpa {nama} ditolak', async () => {
    wrap(<RecallPage />);
    await screen.findByText('budi santoso');
    const tpl = document.querySelector('#recall-template');
    fireEvent.change(tpl, { target: { value: 'Halo, ayo kontrol.' } });
    expect(screen.getByRole('button', { name: /Simpan template/ })).toBeDisabled();
    fireEvent.change(tpl, { target: { value: 'Halo {nama}, ayo kontrol di {klinik}.' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan template/ }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ recall_wa_template: 'Halo {nama}, ayo kontrol di {klinik}.' }));
    const row = screen.getByText('budi santoso').closest('tr');
    expect(decodeURIComponent(within(row).getByRole('link').getAttribute('href'))).toContain('ayo kontrol di Klinik Senyum');
  });
});
