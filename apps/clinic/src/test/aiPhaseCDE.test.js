import { describe, it, expect } from 'vitest';
import { findDuplicateExpenses, EXPENSE_CATEGORIES } from '../utils/expenseCategories';
import { toWaNumber, fillRecallTemplate, recallWaLink, monthsSince, DEFAULT_RECALL_TEMPLATE } from '../utils/recallMessage';

describe('deteksi nota ganda', () => {
  const existing = [
    { id: 'a', tanggal_expense: '2026-10-01', jumlah: '250000.00', nomor_nota: 'INV-001' },
    { id: 'b', tanggal_expense: '2026-09-20', jumlah: 99000, nomor_nota: null },
  ];

  it('nomor nota sama (beda huruf/spasi) dianggap ganda', () => {
    const d = findDuplicateExpenses({ tanggal_expense: '2026-10-08', jumlah: 1, nomor_nota: ' inv-001 ' }, existing);
    expect(d.map((e) => e.id)).toEqual(['a']);
  });

  it('jumlah sama dalam ±3 hari dianggap ganda; lebih dari itu tidak', () => {
    expect(findDuplicateExpenses({ tanggal_expense: '2026-10-04', jumlah: 250000 }, existing)).toHaveLength(1);
    expect(findDuplicateExpenses({ tanggal_expense: '2026-10-05', jumlah: 250000 }, existing)).toHaveLength(0);
  });

  it('mengabaikan dirinya sendiri saat mengedit dan jumlah kosong', () => {
    expect(findDuplicateExpenses({ id: 'a', tanggal_expense: '2026-10-01', jumlah: 250000, nomor_nota: 'INV-001' }, existing)).toHaveLength(0);
    expect(findDuplicateExpenses({ tanggal_expense: '2026-09-20', jumlah: 0 }, existing)).toHaveLength(0);
  });

  it('kategori sama dengan daftar di edge function', () => {
    expect(EXPENSE_CATEGORIES).toContain('Lainnya');
    expect(new Set(EXPENSE_CATEGORIES).size).toBe(EXPENSE_CATEGORIES.length);
  });
});

describe('pesan recall', () => {
  it('menormalkan nomor WA Indonesia', () => {
    expect(toWaNumber('0812-3456-7890')).toBe('6281234567890');
    expect(toWaNumber('+62 812 3456 7890')).toBe('6281234567890');
    expect(toWaNumber('81234567890')).toBe('6281234567890');
    expect(toWaNumber('12345')).toBe('');
    expect(toWaNumber(null)).toBe('');
  });

  it('mengisi template dan merapikan nama', () => {
    const msg = fillRecallTemplate('Halo {nama} dari {klinik}. {nama}!', { nama: 'BUDI santoso', klinik: 'Klinik Senyum' });
    expect(msg).toBe('Halo Budi Santoso dari Klinik Senyum. Budi Santoso!');
    expect(fillRecallTemplate('', { nama: '', klinik: '' })).toContain('Bapak/Ibu');
    expect(DEFAULT_RECALL_TEMPLATE).toContain('{nama}');
  });

  it('membuat tautan wa.me hanya untuk nomor valid', () => {
    expect(recallWaLink('08123456789', 'Halo & sampai jumpa')).toBe('https://wa.me/628123456789?text=Halo%20%26%20sampai%20jumpa');
    expect(recallWaLink('abc', 'x')).toBe('');
  });

  it('menghitung bulan sejak kunjungan terakhir', () => {
    const today = new Date(2026, 9, 9); // 9 Okt 2026
    expect(monthsSince('2026-04-09', today)).toBe(6);
    expect(monthsSince('2026-04-10', today)).toBe(5);
    expect(monthsSince('2024-10-09', today)).toBe(24);
    expect(monthsSince('', today)).toBeNull();
  });
});

import { providerNotice } from '../utils/aiProvider';

describe('teks persetujuan sesuai penyedia AI', () => {
  it('Gemini gratis wajib menyebut data dapat dipakai Google', () => {
    const t = providerNotice({ configured: true, provider: 'gemini', free_tier: true });
    expect(t).toContain('Gemini versi gratis');
    expect(t).toContain('meningkatkan layanannya');
  });
  it('Gemini berbayar dan Claude menyebut data tidak dipakai melatih model', () => {
    expect(providerNotice({ configured: true, provider: 'gemini', free_tier: false })).toContain('tidak dipakai');
    expect(providerNotice({ configured: true, provider: 'anthropic' })).toContain('Anthropic Claude');
    expect(providerNotice(null)).toContain('di luar Indonesia');
  });
});

describe('teks persetujuan Groq', () => {
  it('menyebut Groq dan tidak menyebut Google', () => {
    const t = providerNotice({ configured: true, provider: 'groq', free_tier: true });
    expect(t).toContain('Groq');
    expect(t).not.toContain('Google');
  });
});
