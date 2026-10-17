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

  test('Login gagal menampilkan pesan galat generik yang sama untuk email tidak terdaftar maupun sandi salah', async ({ page }) => {
    await setupSyntheticClinic(page);

    await page.goto('/login');
    // Kasus 1: Email tidak terdaftar di sistem
    await page.getByPlaceholder('nama@email.com').fill('tidak-terdaftar@klinik-sintetis.test');
    await page.getByPlaceholder('••••••••').fill('PasswordApaSaja123!');
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    const alertBox = page.getByRole('alert');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText('Email atau password salah.');

    // Kasus 2: Email terdaftar tetapi password salah -> pesan harus identik (tidak membedakan)
    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.admin.email);
    await page.getByPlaceholder('••••••••').fill('PasswordSalah999!');
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toContainText('Email atau password salah.');
  });

  test('Login saat galat jaringan menampilkan pesan "Tidak dapat terhubung ke server. Periksa koneksi Anda."', async ({
    page,
  }) => {
    await setupSyntheticClinic(page, { authErrorMode: 'network' });

    await page.goto('/login');
    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.admin.email);
    await page.getByPlaceholder('••••••••').fill(SYNTHETIC_USERS.admin.password);
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    const alertBox = page.getByRole('alert');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText('Tidak dapat terhubung ke server. Periksa koneksi Anda.');
  });

  test('Login saat terkena batas laju (429) menampilkan pesan "Terlalu banyak percobaan. Coba lagi beberapa menit lagi."', async ({
    page,
  }) => {
    await setupSyntheticClinic(page, { authErrorMode: 'rate_limit' });

    await page.goto('/login');
    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.admin.email);
    await page.getByPlaceholder('••••••••').fill(SYNTHETIC_USERS.admin.password);
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    const alertBox = page.getByRole('alert');
    await expect(alertBox).toBeVisible();
    await expect(alertBox).toContainText('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
  });

  test('Pemblokir host non-localhost memastikan 0 permintaan keluar saat login & navigasi serta memblokir akses ke api.dentiva.id', async ({
    page,
  }) => {
    const fx = await setupSyntheticClinic(page);

    await page.goto('/login');
    await page.getByPlaceholder('nama@email.com').fill(SYNTHETIC_USERS.admin.email);
    await page.getByPlaceholder('••••••••').fill(SYNTHETIC_USERS.admin.password);
    await page.getByRole('button', { name: /Masuk ke Sistem/i }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /Manajer Klinik/i })).toBeVisible();

    // Pastikan selama alur login dan pemuatan dashboard tidak ada satu pun permintaan keluar ke host non-localhost
    expect(
      fx.getBlockedRequests(),
      `Terdeteksi permintaan keluar ke host non-localhost: ${JSON.stringify(fx.getBlockedRequests())}`
    ).toEqual([]);

    // Verifikasi bahwa percobaan paksa memanggil host produksi (api.dentiva.id) langsung di-abort dan tercatat oleh pemblokir
    const externalAttemptFailed = await page.evaluate(async () => {
      try {
        await fetch('https://api.dentiva.id/auth/v1/token?grant_type=password', {
          method: 'POST',
        });
        return false;
      } catch {
        return true;
      }
    });
    expect(externalAttemptFailed).toBe(true);
    expect(fx.getBlockedRequests().length).toBe(1);
    expect(fx.getBlockedRequests()[0].url).toContain('https://api.dentiva.id/auth/v1/token');
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
