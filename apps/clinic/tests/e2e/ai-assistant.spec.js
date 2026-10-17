import { test, expect } from '@playwright/test';
import { setupSyntheticClinic } from './fixtures/syntheticClinic.js';

test.describe('Asisten AI & Siklus Kartu Usulan Tindakan (AgentActions)', () => {
  test('Mengirim pertanyaan ke Asisten AI dan memverifikasi alur Setujui, Batalkan, serta Tolak pada kartu usulan', async ({ page }) => {
    await setupSyntheticClinic(page, { role: 'admin' });

    await page.goto('/admin/asisten-ai');
    await expect(page.getByText(/Mau tahu apa tentang klinik hari ini\?/i)).toBeVisible();

    // Kirim pertanyaan bisnis yang memicu pemanggilan aiService.ask() dan kartu AgentActions
    const promptText = 'Catat pengeluaran listrik bulan ini Rp 1.250.000 dan tinjau tarif scaling';
    await page.locator('#ai-question').fill(promptText);
    await page.getByRole('button', { name: /Kirim/i }).click();

    // Verifikasi jawaban asisten dan grup kartu usulan tampil
    await expect(page.getByText(/Pendapatan Hari Ini:/i)).toBeVisible();
    const actionGroup = page.getByRole('group', { name: 'Usulan tindakan Denti' });
    await expect(actionGroup).toBeVisible();

    const cardApprove = actionGroup.getByRole('article', {
      name: 'Catat pengeluaran listrik Rp 1.250.000',
    });
    const cardReject = actionGroup.getByRole('article', {
      name: 'Naikkan tarif Scaling & Polishing menjadi Rp 385.000',
    });

    await expect(cardApprove).toBeVisible();
    await expect(cardReject).toBeVisible();

    // 1. Klik Setujui pada kartu pertama -> status menjadi "Dijalankan" dan muncul tombol "Batalkan"
    await page
      .getByRole('button', { name: 'Setujui: Catat pengeluaran listrik Rp 1.250.000' })
      .click();
    await expect(cardApprove.getByText('Dijalankan')).toBeVisible();

    // 2. Klik Batalkan pada kartu pertama -> status berubah menjadi "Dibatalkan"
    await page
      .getByRole('button', { name: 'Batalkan: Catat pengeluaran listrik Rp 1.250.000' })
      .click();
    await expect(cardApprove.getByText('Dibatalkan')).toBeVisible();

    // 3. Klik Tolak pada kartu kedua -> status berubah menjadi "Ditolak"
    await page
      .getByRole('button', {
        name: 'Tolak: Naikkan tarif Scaling & Polishing menjadi Rp 385.000',
      })
      .click();
    await expect(cardReject.getByText('Ditolak')).toBeVisible();
  });
});
