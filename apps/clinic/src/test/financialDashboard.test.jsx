import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FinancialDashboard from '../components/financial/FinancialDashboard';

vi.mock('../services/financialService', () => ({
  financialService: {
    getFinancialSummary: vi.fn(async () => ({ success: true, data: { totalRevenue: 12500000, totalExpenses: 4000000, netIncome: 8500000, profitMargin: 68 } })),
    getRevenueByPeriod: vi.fn(async () => ({ success: true, data: [{ tanggal: '2026-11-10', total_revenue: 2500000, total_transactions: 4 }] })),
    getExpensesByCategory: vi.fn(async () => ({ success: true, data: [{ kategori: 'Bahan', total: 1000000 }, { kategori: 'Sewa', total: 3000000 }] })),
  },
}));
vi.mock('../services/paymentService', () => ({ paymentService: {} }));
// jsdom tidak punya ResizeObserver (dipakai ResponsiveContainer Recharts)
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };


describe('Laporan Keuangan', () => {
  it('menampilkan laba rugi ringkas & kategori terurut, tanpa emoji atau judul Inggris', async () => {
    const { container } = render(<MemoryRouter><FinancialDashboard /></MemoryRouter>);
    expect(await screen.findByText('Laba rugi ringkas')).toBeInTheDocument();
    const teks = container.textContent;
    expect(teks).not.toMatch(/Financial Health|Quick Stats|💰|📊|⚠️|✅|👍/u);
    expect(teks).toContain('Margin laba sehat');
    expect(teks).toMatch(/\(Rp\s?4\.000\.000\)/);
    // kategori diurutkan dari pengeluaran terbesar
    const kategori = [...container.querySelectorAll('section li span.truncate')].map((e) => e.textContent);
    expect(kategori).toEqual(['Sewa', 'Bahan']);
    expect(teks).toContain('75%');
  });
});
