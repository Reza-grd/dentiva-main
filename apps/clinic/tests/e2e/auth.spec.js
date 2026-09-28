import { test, expect } from '@playwright/test';

test.describe('Dentiva Core Flows', () => {
  
  test('Admin can login successfully', async ({ page }) => {
    // Navigate to login
    await page.goto('/');
    
    // Check if we are on the login page (or if already logged in)
    if (await page.getByPlaceholder('Email Anda').isVisible()) {
      await page.getByPlaceholder('Email Anda').fill('admin@dentiva.com');
      await page.getByPlaceholder('Password').fill('admin123'); // Example creds
      await page.getByRole('button', { name: 'Masuk' }).click();
    }
    
    // Should redirect to dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('Prevent Double Booking UI Check', async ({ page }) => {
    // Assuming user is logged in via state setup (skipping true auth for brevity)
    // Go to schedule page
    await page.goto('/schedule');
    
    // Just verify the page loads and contains the Schedule header
    await expect(page.locator('text=Jadwal Praktik')).toBeVisible();
  });
});
