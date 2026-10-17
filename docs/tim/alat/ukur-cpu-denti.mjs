// Ukur CPU saat diam (idle) Denti untuk satu commit — alat tinjauan Ketua (17 Okt 2026).
// Pakai (dari akar repo, butuh @playwright/test + Google Chrome):
//   node docs/tim/alat/ukur-cpu-denti.mjs <commit> [lod=hero] [lebar=220] [jumlah=1]
//   EXTRA_CSS='.denti .d-orbit-dot{animation:none!important}' node docs/tim/alat/ukur-cpu-denti.mjs HEAD   # isolasi penyebab
// Hasil acuan (Chrome, DPR 2, satu Denti state idle, 5 detik; TaskDuration = % waktu main thread sibuk):
//   A1 53f3011 hero 0,59% · mini 0,25% | A1b 1781c32 hero 21,04% | A1c 86db5ac hero 18,69% · mini 0,17%
//   A1c dengan animasi orbit dimatikan: hero 0,44%  → penyebab = animasi offset-path partikel orbit (A1b).
// Batas lulus yang ditetapkan Ketua: hero & standar ≤ 1,0%, mini ≤ 0,5%.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
const require = createRequire(join(root, 'apps/clinic/package.json'));
const { chromium } = require('@playwright/test');

const [commit = 'HEAD', lod = 'hero', size = '220', count = '1'] = process.argv.slice(2);
const sha = execSync(`git rev-parse --short ${commit}`).toString().trim();
const dir = join(tmpdir(), 'dentiva-ukur-cpu', sha);
mkdirSync(dir, { recursive: true });
const show = (p) => execSync(`git show ${sha}:apps/clinic/src/components/mascot/${p}`, { maxBuffer: 1 << 26 }).toString();
writeFileSync(join(dir, 'dentiSvg.mjs'), show('dentiSvg.js'));
const css = show('denti.css');
const { dentiSvg } = await import(pathToFileURL(join(dir, 'dentiSvg.mjs')).href);

const w = Number(size);
const h = Math.round((w * 480) / 400);
let body = '';
for (let i = 0; i < Number(count); i++) {
  body += `<svg class="denti" viewBox="0 0 400 480" width="${w}" height="${h}" data-state="idle" data-lod="${lod}" data-kid="false" data-blink="1">${dentiSvg(`d${i}`, lod)}</svg>`;
}
const html = join(dir, `halaman-${lod}.html`);
writeFileSync(html, `<!doctype html><meta charset=utf-8><style>${css}${process.env.EXTRA_CSS || ''}</style><body style="margin:0;background:#fff">${body}</body>`);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1280, height: 800 } });
await page.goto(pathToFileURL(html).href);
await page.waitForTimeout(1500);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
const a = await metrics();
const t0 = Date.now();
await page.waitForTimeout(5000);
const b = await metrics();
const dt = (Date.now() - t0) / 1000;
const pct = (k) => (((b[k] - a[k]) / dt) * 100).toFixed(2);
console.log(`${sha} lod=${lod} ${w}px ×${count}: TaskDuration ${pct('TaskDuration')}% | Layout ${pct('LayoutDuration')}% | RecalcStyle ${pct('RecalcStyleDuration')}% | Script ${pct('ScriptDuration')}%`);
await browser.close();
