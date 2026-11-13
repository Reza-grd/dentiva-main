/** Biaya & Modal: tiga kelompok (Gudang, Resep & HPP, Biaya Operasional), ringkasan, dan tautan ?tab=…&sub=… */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const data = vi.hoisted(() => ({ bahan: [], biaya: [] }));
vi.mock('../services/inventoryService', () => ({ inventoryService: { getMasterBahan: () => Promise.resolve({ success: true, data: data.bahan }) } }));
vi.mock('../services/costingService', () => ({ costingService: { getOverheadCosts: () => Promise.resolve({ success: true, data: data.biaya }) } }));
// Isi tiap tab diganti penanda (isi aslinya diuji terpisah)
vi.mock('../components/costing/OverheadCosts', () => ({ default: () => <div>ISI biaya-operasional</div> }));
vi.mock('../components/costing/MasterBahan', () => ({ default: () => <div>ISI daftar-bahan</div> }));
vi.mock('../components/costing/TreatmentBOM', () => ({ default: () => <div>ISI resep-bahan</div> }));
vi.mock('../components/costing/MaterialPurchases', () => ({ default: () => <div>ISI stok-masuk</div> }));
vi.mock('../components/costing/StockMovements', () => ({ default: () => <div>ISI kartu-stok</div> }));
vi.mock('../components/costing/StockOpname', () => ({ default: () => <div>ISI stok-opname</div> }));
vi.mock('../components/costing/ProfitabilityReport', () => ({ default: () => <div>ISI profitabilitas</div> }));

import CostingDashboard from '../components/costing/CostingDashboard';

function Where() { const l = useLocation(); return <div data-testid="where">{l.search}</div>; }
const wrap = (path = '/admin/costing') => render(<MemoryRouter initialEntries={[path]}><CostingDashboard /><Where /></MemoryRouter>);

beforeEach(() => {
  data.bahan = [
    { id: 1, is_active: true, stok_saat_ini: 10, stok_minimum: 5, harga_rata2: 1000 },
    { id: 2, is_active: true, stok_saat_ini: 2, stok_minimum: 5, harga_rata2: 5000 },
    { id: 3, is_active: true, stok_saat_ini: 0, stok_minimum: 1, harga_rata2: 9000 },
    { id: 4, is_active: false, stok_saat_ini: 100, stok_minimum: 1, harga_rata2: 1000 },
  ];
  data.biaya = [{ aktif: true, jumlah_bulanan: 8000000 }, { aktif: true, jumlah_bulanan: 1500000 }, { aktif: false, jumlah_bulanan: 999 }];
});

describe('Biaya & Modal', () => {
  it('menampilkan tiga kelompok; bawaan Gudang → Daftar Bahan', () => {
    wrap();
    for (const n of [/Gudang/, /Resep & HPP/, /Biaya Operasional/]) expect(screen.getByRole('tab', { name: n })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Gudang/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('ISI daftar-bahan')).toBeInTheDocument();
    for (const n of ['Daftar Bahan', 'Stok Masuk', 'Kartu Stok', 'Stok Opname']) expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
  });

  it('ringkasan: nilai stok, bahan perlu dipesan, biaya operasional (hanya yang aktif)', async () => {
    wrap();
    expect(await screen.findByText('Rp 20.000')).toBeInTheDocument(); // 10×1.000 + 2×5.000 + 0×9.000
    expect(screen.getByText('3 bahan aktif')).toBeInTheDocument();
    expect(screen.getByText('2 bahan')).toBeInTheDocument();
    expect(screen.getByText('1 habis · 1 menipis')).toBeInTheDocument();
    expect(screen.getByText('Rp 9.500.000')).toBeInTheDocument();
    expect(screen.queryByText(/Langkah awal/)).toBeNull();
  });

  it('tautan ?tab=resep&sub=profit membuka Profitabilitas; berpindah kelompok memperbarui URL', async () => {
    wrap('/admin/costing?tab=resep&sub=profit');
    expect(screen.getByText('ISI profitabilitas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Biaya Operasional/ }));
    expect(screen.getByText('ISI biaya-operasional')).toBeInTheDocument();
    expect(screen.getByTestId('where').textContent).toBe('?tab=operasional');
    await screen.findByText('Rp 9.500.000');
  });

  it('tombol "Catat stok masuk" langsung membuka Gudang → Stok Masuk', async () => {
    wrap('/admin/costing?tab=operasional');
    fireEvent.click(screen.getByRole('button', { name: /Catat stok masuk/ }));
    expect(screen.getByText('ISI stok-masuk')).toBeInTheDocument();
    expect(screen.getByTestId('where').textContent).toBe('?tab=gudang&sub=masuk');
    await screen.findByText('Rp 20.000');
  });

  it('klinik baru: panduan langkah awal tampil dan mengarahkan ke bagian yang tepat', async () => {
    data.bahan = []; data.biaya = [];
    wrap();
    expect(await screen.findByText(/Langkah awal agar HPP terhitung otomatis/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Isi biaya operasional bulanan/ }));
    await waitFor(() => expect(screen.getByText('ISI biaya-operasional')).toBeInTheDocument());
  });
});
