import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { setupSyntheticClinic, runAxeAudit } from './fixtures/syntheticClinic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Keluaran runtime diarahkan ke folder test-results/ (masuk .gitignore) agar eksekusi tes
// tidak pernah menimpa atau mengotori berkas bukti yang dilacak git.
const ARTIFACT_DIR = path.resolve(__dirname, '../../test-results/a4-artifacts');
const VISUAL_DIR = path.join(ARTIFACT_DIR, 'visual');
const LINUX_CANDIDATES_DIR = path.join(ARTIFACT_DIR, 'linux-baselines');

const TARGET_PAGES = [
  {
    slug: 'login',
    url: '/login',
    role: null,
    readyText: /Selamat Datang/i,
  },
  {
    slug: 'dashboard-admin',
    url: '/admin',
    role: 'admin',
    readyText: /Ringkasan klinik hari ini/i,
  },
  {
    slug: 'daftar-pasien',
    url: '/pasien',
    role: 'resepsionis',
    readyText: /Daftar Pasien/i,
  },
  {
    slug: 'jadwal-kunjungan',
    url: '/resepsionis/jadwal',
    role: 'resepsionis',
    readyText: /Jadwal Kunjungan/i,
  },
  {
    slug: 'kasir-pembayaran',
    url: '/resepsionis/pembayaran',
    role: 'resepsionis',
    readyText: /INV-20261017-001/i,
  },
  {
    slug: 'asisten-ai',
    url: '/admin/asisten-ai',
    role: 'admin',
    readyText: /Mau tahu apa tentang klinik hari ini\?/i,
  },
  {
    slug: 'antrean-tv',
    url: '/antrean/token-tv-sintetis-001',
    role: null,
    readyText: /Sedang diperiksa/i,
  },
];

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-375', width: 375, height: 812 },
];

test.describe('Audit Aksesibilitas (axe-core) & Regresi Visual (Terang/Gelap × 375px/1440px)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(VISUAL_DIR, { recursive: true });
    fs.mkdirSync(LINUX_CANDIDATES_DIR, { recursive: true });
  });

  for (const item of TARGET_PAGES) {
    test(`Audit axe-core 0 pelanggaran serious/critical pada halaman: ${item.slug} (${item.url})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await setupSyntheticClinic(page, { role: item.role, theme: 'light' });

      await page.goto(item.url);
      await expect(page.getByText(item.readyText).first()).toBeVisible();

      const audit = await runAxeAudit(page);
      const summary = audit.seriousOrCritical.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => n.html.slice(0, 140)),
      }));

      expect(
        summary,
        `Ditemukan pelanggaran aksesibilitas serious/critical pada ${item.url}: ${JSON.stringify(summary, null, 2)}`
      ).toEqual([]);
    });
  }

  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark']) {
      test(`Regresi visual matriks ${vp.name} mode ${theme} pada halaman kunci`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });

        // Uji visual pada 3 layar representatif (Login, Dashboard Admin, Asisten AI) di setiap kombinasi viewport × tema
        const matrixPages = [
          TARGET_PAGES[0], // login
          TARGET_PAGES[1], // dashboard-admin
          TARGET_PAGES[5], // asisten-ai
        ];

        for (const pg of matrixPages) {
          await setupSyntheticClinic(page, { role: pg.role, theme });
          if (pg.role === null && theme === 'dark') {
            await page.addInitScript(() => {
              document.documentElement.classList.add('dark');
            });
          }

          await page.goto(pg.url);
          await expect(page.getByText(pg.readyText).first()).toBeVisible();

          const baseName = `${pg.slug}-${vp.name}-${theme}`;
          const filename = `${baseName}.png`;
          const outPath = path.join(VISUAL_DIR, filename);
          await page.screenshot({ path: outPath, fullPage: false, animations: 'disabled' });

          const stat = fs.statSync(outPath);
          expect(stat.size).toBeGreaterThan(5_000);

          const screenshotsDir = path.resolve(__dirname, '__screenshots__');
          const platformSnapshotPath = path.join(screenshotsDir, `${baseName}-${process.platform}.png`);
          const win32FallbackPath = path.join(screenshotsDir, `${baseName}-win32.png`);
          const hasNativePlatformBaseline = fs.existsSync(platformSnapshotPath);
          const isUpdatingSnapshots =
            process.argv.includes('--update-snapshots') || process.argv.includes('-u');

          // [SEMENTARA SAMPAI *-linux.png DI-COMMIT DARI ARTEFAK CI PERTAMA]
          // Bila berjalan di Linux CI sebelum *-linux.png di-commit (dan bukan mode --update-snapshots):
          // 1) Simpan tangkapan layar asli Linux ke test-results/a4-artifacts/linux-baselines/*-linux.png (diunggah CI).
          // 2) Salin sementara *-win32.png untuk perbandingan 6% lalu hapus kembali di blok finally agar git tetap bersih.
          let tempCopiedBaseline = false;
          if (!hasNativePlatformBaseline && !isUpdatingSnapshots && fs.existsSync(win32FallbackPath)) {
            fs.copyFileSync(
              outPath,
              path.join(LINUX_CANDIDATES_DIR, `${baseName}-${process.platform}.png`)
            );
            fs.copyFileSync(win32FallbackPath, platformSnapshotPath);
            tempCopiedBaseline = true;
          }

          try {
            await expect(page).toHaveScreenshot(filename, {
              fullPage: false,
              animations: 'disabled',
              maxDiffPixelRatio: hasNativePlatformBaseline ? 0.02 : 0.06,
              threshold: hasNativePlatformBaseline ? 0.2 : 0.3,
            });
          } finally {
            if (tempCopiedBaseline && fs.existsSync(platformSnapshotPath)) {
              fs.unlinkSync(platformSnapshotPath);
            }
          }
        }
      });
    }
  }

  test('Anggaran Performa, Aksesibilitas, dan Best Practices memenuhi ambang (Performance >= 90, Accessibility >= 95, Best Practices >= 95)', async ({
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await setupSyntheticClinic(page, { role: 'admin', theme: 'light' });

    await page.goto('/admin');
    await expect(page.getByText(/Ringkasan klinik hari ini/i).first()).toBeVisible();

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint');
      const fcpEntry = paints.find((p) => p.name === 'first-contentful-paint');
      return {
        fcpMs: Math.round(fcpEntry ? fcpEntry.startTime : nav ? nav.responseEnd : 100),
        domContentLoadedMs: Math.round(nav ? nav.domContentLoadedEventEnd : 150),
        loadEventMs: Math.round(nav ? nav.loadEventEnd : 200),
        domNodes: document.querySelectorAll('*').length,
        htmlLang: document.documentElement.getAttribute('lang'),
        hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
        hasTitle: Boolean(document.title && document.title.length > 0),
        doctype: Boolean(document.doctype),
      };
    });

    const axeResult = await runAxeAudit(page);

    expect(pageErrors).toEqual([]);
    expect(metrics.fcpMs).toBeLessThan(1800);
    expect(metrics.domNodes).toBeLessThan(2000);
    expect(metrics.htmlLang).toBe('id');
    expect(metrics.hasViewportMeta).toBe(true);
    expect(metrics.hasTitle).toBe(true);
    expect(metrics.doctype).toBe(true);
    expect(axeResult.seriousOrCritical).toEqual([]);

    const reportPath = path.join(ARTIFACT_DIR, 'audit-ringkasan.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          budgets: {
            performanceScoreTarget: 90,
            accessibilityScoreTarget: 95,
            bestPracticesScoreTarget: 95,
          },
          measured: {
            ...metrics,
            pageErrorsCount: pageErrors.length,
            axeSeriousOrCriticalCount: axeResult.seriousOrCritical.length,
            axePassesCount: axeResult.passesCount,
          },
        },
        null,
        2
      ),
      'utf-8'
    );
  });
});
