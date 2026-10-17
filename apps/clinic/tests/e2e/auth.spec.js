import { test, expect } from '@playwright/test';
import { setupSyntheticClinic, SYNTHETIC_USERS } from './fixtures/syntheticClinic.js';

test.describe('Autentikasi, Tantangan MFA, dan Proteksi Peran (RBAC)', () => {
  test('Login sebagai Admin mengarahkan ke /admin dan menampilkan ringkasan klinik', async ({ page }) => {
    await setupSyntheticClinic(page);

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Selamat Datang/i })).toBeVisible();

    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.admin.email);
    await page.getByPlaceholder('••••••••').fill(SYNTHETIC_USERS.admin.password);
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /Manajer Klinik/i })).toBeVisible();
  });

  test('Login sebagai Dokter mengarahkan ke /dokter dan memuat daftar pasien hari ini', async ({ page }) => {
    await setupSyntheticClinic(page);

    await page.goto('/login');
    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.dokter.email);
    await page.getByPlaceholder('••••••••').fill(SYNTHETIC_USERS.dokter.password);
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/dokter$/);
    await expect(page.getByText(/drg\. Sinta Maharani/i).first()).toBeVisible();
  });

  test('Login sebagai Resepsionis mengarahkan ke /resepsionis dan menampilkan antrean hari ini', async ({ page }) => {
    await setupSyntheticClinic(page);

    await page.goto('/login');
    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.resepsionis.email);
    await page.getByPlaceholder('••••••••').fill(SYNTHETIC_USERS.resepsionis.password);
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/resepsionis$/);
    await expect(page.getByRole('heading', { name: /Rina Puspita/i })).toBeVisible();
  });

  test('Login dengan password salah menampilkan pesan galat dan tetap di /login', async ({ page }) => {
    await setupSyntheticClinic(page);

    await page.goto('/login');
    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.admin.email);
    await page.getByPlaceholder('••••••••').fill('PasswordSalah999!');
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/Invalid login credentials|Email atau password salah/i)).toBeVisible();
  });

  test('Simulasi tantangan MFA TOTP ketika bendera fitur MFA aktif memverifikasi faktor aal2', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'admin', mfaEnabled: true });

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /Manajer Klinik/i })).toBeVisible();

    // Verifikasi alur challenge & verify TOTP terhadap endpoint Auth Supabase sintetis
    const mfaResult = await page.evaluate(async () => {
      const challengeRes = await fetch(
        'http://127.0.0.1:54321/auth/v1/factors/factor-totp-sintetis-001/challenge',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer synthetic-jwt-admin-aal1',
          },
        }
      );
      const challenge = await challengeRes.json();

      const badVerifyRes = await fetch(
        'http://127.0.0.1:54321/auth/v1/factors/factor-totp-sintetis-001/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer synthetic-jwt-admin-aal1',
          },
          body: JSON.stringify({ challenge_id: challenge.id, code: '000000' }),
        }
      );

      const goodVerifyRes = await fetch(
        'http://127.0.0.1:54321/auth/v1/factors/factor-totp-sintetis-001/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer synthetic-jwt-admin-aal1',
          },
          body: JSON.stringify({ challenge_id: challenge.id, code: '123456' }),
        }
      );
      const goodVerify = await goodVerifyRes.json();

      return {
        challengeId: challenge.id,
        badStatus: badVerifyRes.status,
        goodStatus: goodVerifyRes.status,
        upgradedToken: goodVerify.access_token,
      };
    });

    expect(mfaResult.challengeId).toBe('challenge-totp-001');
    expect(mfaResult.badStatus).toBe(422);
    expect(mfaResult.goodStatus).toBe(200);
    expect(mfaResult.upgradedToken).toContain('aal2');
  });

  test('Proteksi RBAC: Resepsionis ditolak saat membuka halaman khusus Admin (/admin/pengaturan)', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'resepsionis' });

    await page.goto('/admin/pengaturan');
    await expect(page.getByRole('heading', { name: 'Akses Ditolak' })).toBeVisible();
    await expect(page.getByText(/Anda tidak memiliki izin untuk mengakses halaman ini/i)).toBeVisible();

    await page.getByRole('button', { name: /Kembali ke Dashboard/i }).click();
    await expect(page).toHaveURL(/\/resepsionis$/);
  });

  test('Proteksi RBAC: Dokter ditolak saat membuka halaman Kasir Resepsionis (/resepsionis/pembayaran)', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'dokter' });

    await page.goto('/resepsionis/pembayaran');
    await expect(page.getByRole('heading', { name: 'Akses Ditolak' })).toBeVisible();
  });

  test('Pengguna belum login yang mengakses rute terlindungi dialihkan ke /login', async ({ page }) => {
    await setupSyntheticClinic(page);

    await page.goto('/pasien');
    await expect(page).toHaveURL(/\/login$/);
  });
});
