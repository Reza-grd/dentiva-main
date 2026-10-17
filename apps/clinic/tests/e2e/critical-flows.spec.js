import { test, expect } from '@playwright/test';
import { setupSyntheticClinic } from './fixtures/syntheticClinic.js';

test.describe('Alur Kritis Klinik: Pasien, Jadwal, Kasir, Antrean TV, dan Pengaturan', () => {
  test('Daftar Pasien (/pasien): menampilkan daftar pasien sintetis dan memfilter pencarian', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'resepsionis' });

    await page.goto('/pasien');
    await expect(page.getByRole('heading', { name: 'Daftar Pasien' })).toBeVisible();
    await expect(page.getByText('Budi Santoso')).toBeVisible();
    await expect(page.getByText('Siti Rahmawati')).toBeVisible();

    // Cari pasien berdasarkan nama pada kolom pencarian tabel pasien
    const searchInput = page.getByPlaceholder(/Cari nama, No\. RM/i);
    await searchInput.fill('Siti');
    await expect(page.locator('#main-content').getByText('Siti Rahmawati')).toBeVisible();
  });

  test('Jadwal Kunjungan (/resepsionis/jadwal & /dokter/jadwal): melihat slot dokter dan menambah jadwal kunjungan baru', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'dokter' });

    await page.goto('/dokter/jadwal');
    await expect(page.getByRole('heading', { name: 'Jadwal Kunjungan' })).toBeVisible();
    await expect(page.getByText('Budi Santoso').first()).toBeVisible();

    // Buka modal Tambah Jadwal
    await page.getByRole('button', { name: /Tambah Jadwal/i }).click();
    await expect(page.getByRole('heading', { name: 'Tambah Jadwal Kunjungan' })).toBeVisible();

    // Cari dan pilih pasien
    await page.getByPlaceholder('Cari nama / No RM pasien...').fill('Budi');
    await page.getByRole('button', { name: /Budi Santoso/i }).click();

    // Isi keluhan dan simpan jadwal
    await page.getByPlaceholder('Keluhan pasien...').fill('Kontrol rutin pasca scaling');
    await page.getByRole('button', { name: 'Simpan Jadwal' }).click();

    // Modal tertutup dan keluhan baru tampil di daftar kunjungan
    await expect(page.getByRole('heading', { name: 'Tambah Jadwal Kunjungan' })).toBeHidden();
    await expect(page.getByText(/Kontrol rutin pasca scaling/i)).toBeVisible();
  });

  test('Kasir & Pembayaran (/resepsionis/pembayaran & /pembayaran/:visitId): menampilkan daftar invoice dan memproses tagihan', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'resepsionis' });

    await page.goto('/resepsionis/pembayaran');
    await expect(page.getByText('INV-20261017-001')).toBeVisible();
    await expect(page.getByText('INV-20261017-002')).toBeVisible();
    await expect(page.getByText('Budi Santoso').first()).toBeVisible();
    await expect(page.getByText('Siti Rahmawati').first()).toBeVisible();

    // Filter status Lunas
    await page.getByLabel('Filter status pembayaran').selectOption('paid');
    await expect(page.getByText('INV-20261017-001')).toBeVisible();
  });

  test('Layar Antrean TV (/layar-antrean & /antrean/:token): membuat tautan TV baru dan menampilkan antrean publik tanpa PII', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'admin' });

    // 1. Admin membuat tautan baru di /layar-antrean
    await page.goto('/layar-antrean');
    await expect(page.getByRole('heading', { name: 'Layar Antrean', exact: true })).toBeVisible();
    await expect(page.getByText('TV Ruang Tunggu Utama')).toBeVisible();

    await page.getByPlaceholder(/Nama layar/i).fill('TV Ruang Tunggu Lantai 2');
    await page.getByRole('button', { name: 'Buat tautan' }).click();

    await expect(page.getByText(/hanya ditampilkan sekali/i)).toBeVisible();
    await expect(page.locator('code')).toContainText('/antrean/token-tv-sintetis-baru-777');

    // 2. Buka layar antrean publik /antrean/:token
    await page.goto('/antrean/token-tv-sintetis-baru-777');
    await expect(page.getByRole('heading', { name: 'Klinik Gigi Senyum Sintetis' })).toBeVisible();
    await expect(page.getByText('Sedang diperiksa')).toBeVisible();
    await expect(page.getByText('B. S.').first()).toBeVisible();
    await expect(page.getByText('S. R.').first()).toBeVisible();

    // Pastikan nama lengkap pasien TIDAK bocor di layar TV publik
    await expect(page.getByText('Budi Santoso')).toHaveCount(0);
    await expect(page.getByText('RM-2026-0001')).toHaveCount(0);
  });

  test('Pengaturan Klinik (/admin/pengaturan): memperbarui profil klinik dan menyimpan perubahan', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'admin' });

    await page.goto('/admin/pengaturan');
    await expect(page.getByRole('heading', { name: 'Profil Klinik' })).toBeVisible();

    const clinicNameInput = page.locator('input[type="text"]').first();
    await clinicNameInput.fill('Klinik Gigi Senyum Sintetis Utama');

    await page.getByRole('button', { name: /Simpan Perubahan/i }).click();
    await expect(page.getByText('Tersimpan')).toBeVisible();
  });
});
