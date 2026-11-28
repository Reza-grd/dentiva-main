/**
 * Recall berbasis SOP: logika usulan & halaman Recall bertab (layanan tiruan).
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usulanRecall, validasiKeputusan, tambahHari, teksJarak, teksHariLagi, pesanRecallSop } from '../utils/recallSop';

const { recall, auth } = vi.hoisted(() => ({
  recall: {
    daftar: vi.fn(), ringkasan: vi.fn(), ubahStatus: vi.fn(), simpanKeputusan: vi.fn(),
    candidates: vi.fn(), markContacted: vi.fn(),
  },
  auth: { role: 'resepsionis' },
}));
vi.mock('../services/recallService', () => ({ recallService: recall }));
vi.mock('../services/aiService', () => ({ aiService: { getStatus: vi.fn().mockResolvedValue({ success: false }) } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: { role: auth.role } }) }));
vi.mock('../contexts/ClinicSettingsContext', () => ({
  useClinicSettings: () => ({ settings: { clinic_name: 'Klinik Senyum' }, updateSettings: vi.fn() }),
}));

import { ToastProvider } from '../components/common/ToastNotification';
import RecallPage from '../components/recall/RecallPage';

const SOP = [
  { treatment_id: 'psa', perlu: true, interval_hari: 7, wajib: true, tujuan: 'Lanjutan PSA', nama_treatment: 'PSA' },
  { treatment_id: 'scl', perlu: true, interval_hari: 180, wajib: false, tujuan: 'Kontrol rutin', nama_treatment: 'Scaling' },
  { treatment_id: 'cbt', perlu: false, interval_hari: null, wajib: false, nama_treatment: 'Cabut' },
];

describe('usulanRecall', () => {
  it('memakai jarak terpendek & wajib bila salah satu wajib', () => {
    expect(usulanRecall(['scl', 'psa'], SOP)).toMatchObject({ keputusan: 'perlu', interval_hari: 7, wajib: true, tujuan: 'Lanjutan PSA', sumber: 'sop' });
  });
  it('perawatan "tidak perlu" saja → tidak_perlu; tanpa SOP → null', () => {
    expect(usulanRecall(['cbt'], SOP)).toMatchObject({ keputusan: 'tidak_perlu', wajib: false });
    expect(usulanRecall(['cbt', 'scl'], SOP)).toMatchObject({ keputusan: 'perlu', interval_hari: 180, wajib: false });
    expect(usulanRecall(['lain'], SOP)).toBeNull();
    expect(usulanRecall([], SOP)).toBeNull();
  });
  it('validasi, tanggal, & teks', () => {
    expect(validasiKeputusan({ keputusan: 'perlu', interval_hari: 0 })).toMatch(/1–730/);
    expect(validasiKeputusan({ keputusan: 'perlu', interval_hari: 7.5 })).toMatch(/1–730/);
    expect(validasiKeputusan({ keputusan: 'perlu', interval_hari: 14 })).toBe('');
    expect(validasiKeputusan({ keputusan: 'belum' })).toBe('');
    expect(validasiKeputusan({})).toMatch(/Pilih/);
    expect(tambahHari('2026-12-28', 7)).toBe('2027-01-04');
    expect(teksJarak(14)).toBe('14 hari (2 minggu)');
    expect(teksJarak(180)).toBe('180 hari (± 6 bulan)');
    expect(teksHariLagi(-3)).toBe('lewat 3 hari');
    expect(pesanRecallSop({ nama: 'BUDI santoso', klinik: 'Klinik Senyum', tanggal: '2026-12-05', tujuan: 'Lanjutan PSA' }))
      .toMatch(/^Halo Budi Santoso, .*Klinik Senyum.*5 Desember 2026 untuk lanjutan PSA/);
  });
});

const BARIS = [
  { id: 'r1', patient_id: 'p1', visit_id: 'v1', no_rm: 'RM-001', nama_lengkap: 'Budi', no_wa: '081234567890', wa_consent: true, tanggal_kunjungan: '2026-11-20',
    dokter_nama: 'drg. Ani', keputusan: 'perlu', interval_hari: 7, tanggal_target: '2026-11-27', hari_lagi: -1, wajib: true, tujuan: 'Lanjutan PSA', status: 'menunggu', catatan: null },
  { id: 'r2', patient_id: 'p2', visit_id: 'v2', no_rm: 'RM-002', nama_lengkap: 'Siti', no_wa: '', wa_consent: false, tanggal_kunjungan: '2026-06-01',
    keputusan: 'perlu', interval_hari: 180, tanggal_target: '2026-11-28', hari_lagi: 0, wajib: false, tujuan: null, status: 'diingatkan', catatan: null },
];
const wrap = () => render(<MemoryRouter><ToastProvider><RecallPage /></ToastProvider></MemoryRouter>);

describe('Halaman Recall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.role = 'resepsionis';
    recall.daftar.mockImplementation(async (tab) => ({ success: true, data: tab === 'jatuh_tempo' ? BARIS : [] }));
    recall.ringkasan.mockResolvedValue({ success: true, data: { jatuh_tempo: 2, wajib_jatuh_tempo: 1, terlewat: 0, minta_ganti: 0, belum: 3 } });
    recall.ubahStatus.mockResolvedValue({ success: true, data: {} });
    recall.simpanKeputusan.mockResolvedValue({ success: true, data: {} });
  });

  it('jatuh tempo: label WAJIB, WA berisi tanggal & tujuan, membuka WA mencatat "diingatkan"', async () => {
    wrap();
    const baris = (await screen.findByText('Budi')).closest('tr');
    expect(within(baris).getByText('WAJIB')).toBeInTheDocument();
    expect(within(baris).getByText('lewat 1 hari')).toBeInTheDocument();
    const link = within(baris).getByRole('link', { name: /Kirim WA/ });
    expect(decodeURIComponent(link.getAttribute('href'))).toMatch(/wa\.me\/6281234567890\?text=Halo Budi.*Klinik Senyum.*lanjutan PSA/);
    fireEvent.click(link);
    await waitFor(() => expect(recall.ubahStatus).toHaveBeenCalledWith('r1', 'diingatkan', null));
    expect(within(screen.getByText('Siti').closest('tr')).getByText('Tanpa izin WA')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Minta ganti/ })).not.toBeInTheDocument();
  });

  it('tidak jadi wajib beralasan', async () => {
    wrap();
    const baris = (await screen.findByText('Budi')).closest('tr');
    fireEvent.click(within(baris).getByRole('button', { name: /Tidak jadi/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Simpan' }));
    expect(recall.ubahStatus).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Alasan'), { target: { value: 'Pindah kota' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(recall.ubahStatus).toHaveBeenCalledWith('r1', 'tidak_jadi', 'Pindah kota'));
  });

  it('belum ditentukan: resepsionis hanya melihat, dokter bisa menentukan; dokter tidak melihat tab Pasien lama', async () => {
    recall.daftar.mockImplementation(async (tab) => ({ success: true, data: tab === 'belum' ? [{ ...BARIS[0], id: 'r9', keputusan: 'belum', status: null, wajib: false }] : [] }));
    const { unmount } = wrap();
    expect(screen.getByRole('tab', { name: /Pasien lama/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Belum ditentukan/ }));
    expect(await screen.findByText('Menunggu keputusan dokter')).toBeInTheDocument();
    unmount();

    auth.role = 'dokter';
    wrap();
    expect(screen.queryByRole('tab', { name: /Pasien lama/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Belum ditentukan/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Tentukan/ }));
    fireEvent.click(screen.getByRole('button', { name: '2 minggu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    await waitFor(() => expect(recall.simpanKeputusan).toHaveBeenCalledWith('v1', expect.objectContaining({ keputusan: 'perlu', interval_hari: 14 })));
  });
});
