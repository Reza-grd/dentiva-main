import { defineConfig, devices } from '@playwright/test';

const SUPABASE_SYNTHETIC_URL = 'http://127.0.0.1:54321';
const SUPABASE_SYNTHETIC_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{platform}{ext}',
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
      animations: 'disabled',
    },
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    contextOptions: {
      reducedMotion: 'reduce',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : 'chrome',
      },
    },
  ],
  webServer: {
    // KESELAMATAN: Jangan pernah memakai ulang dist/ yang mungkin berisi URL produksi (api.dentiva.id).
    // Selalu build segar ke dist-e2e dengan env sintetis terisolasi (VITE_E2E_ISOLATED_ENV=1) lalu preview dari dist-e2e.
    command:
      'npx vite build --mode desktop --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      VITE_E2E_ISOLATED_ENV: '1',
      VITE_SUPABASE_URL: SUPABASE_SYNTHETIC_URL,
      VITE_SUPABASE_ANON_KEY: SUPABASE_SYNTHETIC_ANON_KEY,
    },
  },
});
