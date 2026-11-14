import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from '../components/reports/ReportsPage';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

vi.mock('../services/financialService', () => ({
  financialService: {
    getDashboardStatistics: vi.fn(async () => ({ data: { monthRevenue: 5000000, monthExpenses: 2000000, monthNetIncome: 3000000, totalPatients: 120, todayVisits: 6 } })),
    getMonthlyReport: vi.fn(async () => ({
      data: BULAN.map((monthName, i) => ({ monthName, totalRevenue: i === 1 ? 1000000 : i === 2 ? 3000000 : 0, totalExpenses: i === 2 ? 4000000 : 0, netIncome: 0 })),
    })),
  },
}));
vi.mock('../services/treatmentService', () => ({
  treatmentService: { getPopularTreatments: vi.fn(async () => ({ data: [{ nama: 'Scaling', jumlah: 30 }, { nama: 'Tambal', jumlah: 10 }] })) },
}));
vi.mock('../services/dashboardService', () => ({
  dashboardService: { getMonthlyVisits: vi.fn(async () => ({ data: BULAN.map((label, i) => ({ label: label.slice(0, 3), kunjungan: i === 2 ? 12 : 0 })) })) },
}));
vi.mock('../contexts/PermissionsContext', () => ({ usePermission: () => ({ hasFeature: () => false }) }));
vi.mock('../components/common/ToastNotification', () => ({ useToast: () => ({ showToast: vi.fn(), success: vi.fn(), error: vi.fn() }) }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

describe('Laporan Tahunan & Kunjungan', () => {
  it('menampilkan ringkasan bulanan dengan total tahunan, tanpa warna pelangi atau pilihan periode semu', async () => {
    const { container } = render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    expect(await screen.findByText(/Ringkasan bulanan/)).toBeInTheDocument();
    const teks = container.textContent;
    // total tahunan: pendapatan 4 jt, pengeluaran 4 jt, laba 0, kunjungan 12
    const kaki = container.querySelector('tfoot').textContent;
    expect(kaki).toMatch(/Total/);
    expect(kaki).toMatch(/4\.000\.000/);
    expect(kaki).toMatch(/12$/);
    // Maret rugi → merah
    const maret = [...container.querySelectorAll('tbody tr')][2];
    expect(maret.querySelector('.text-red-700')).not.toBeNull();
    // tindakan terpopuler sebagai daftar berurut
    expect(teks).toContain('Scaling');
    expect(teks).not.toMatch(/Periode|Distribusi Treatment|Upgrade Sekarang/);
    expect(container.innerHTML).not.toMatch(/#3b82f6|#ec4899|#8b5cf6/);
  });
});
