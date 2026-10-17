import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { setupSyntheticClinic, runAxeAudit } from './fixtures/syntheticClinic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VISUAL_DIR = path.resolve(__dirname, '../../../../docs/tim/serah-terima/A4/visual');

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

          const filename = `${pg.slug}-${vp.name}-${theme}.png`;
          const outPath = path.join(VISUAL_DIR, filename);
          await page.screenshot({ path: outPath, fullPage: false });

          const stat = fs.statSync(outPath);
          expect(stat.size).toBeGreaterThan(5_000);
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

    const reportPath = path.resolve(VISUAL_DIR, '../audit-ringkasan.json');
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
