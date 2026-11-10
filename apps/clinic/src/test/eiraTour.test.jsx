import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LANGKAH, LANJUTAN, langkahUntuk } from '../components/tour/tourSteps';
import { DENTI_STATES } from '../components/mascot/dentiSvg';
import { smallTalk } from '../utils/dentiMood';

const src = (p) => readFileSync(resolve(__dirname, p), 'utf8');
const app = src('../App.jsx');
const adaRute = (r) => app.includes(`path="${r}"`) || app.includes(`path="${r}/*"`);
const jalurMenu = (target) => /^\[data-tur="(\/[^"]*)"\]$/.exec(target || '')?.[1];

describe('Tur pengenalan Eira', () => {
  for (const peran of Object.keys(LANGKAH)) {
    describe(peran, () => {
      const langkah = langkahUntuk(peran);

      it('punya judul, isi, dan pose Eira yang valid di setiap langkah', () => {
        for (const s of langkah) {
          expect(s.judul?.length, s.judul).toBeGreaterThan(3);
          expect(s.isi?.length, s.judul).toBeGreaterThan(20);
          expect(DENTI_STATES, `${peran}: ${s.judul}`).toContain(s.pose);
        }
      });

      it('setiap menu yang disorot dan setiap tujuan adalah rute yang terdaftar', () => {
        const rute = [
          ...langkah.map((s) => jalurMenu(s.target)).filter(Boolean),
          ...langkah.map((s) => s.ke).filter(Boolean),
          ...(LANJUTAN[peran] || []).map(([, ke]) => ke),
        ];
        expect(rute.length).toBeGreaterThan(3);
        expect(rute.filter((r) => !adaRute(r))).toEqual([]);
      });

      it('setiap contoh pertanyaan dijawab Eira (bukan "belum paham")', () => {
        const tanpaJawaban = langkah.filter((s) => s.tanya).filter((s) => !smallTalk(s.tanya, { role: peran, name: 'Uji', seed: 1, now: new Date() })?.reply);
        expect(tanpaJawaban.map((s) => s.tanya)).toEqual([]);
      });
    });
  }

  it('menu samping dan bilah atas memasang penanda data-tur', () => {
    expect(src('../components/common/Sidebar.jsx')).toContain('data-tur={item.path}');
    expect(src('../components/layout/TopBar.jsx')).toContain('data-tur="cari"');
  });
});

describe('namaPanggilan', () => {
  it('melewati gelar dan tanda baca', async () => {
    const { namaPanggilan } = await import('../utils/stringUtils');
    expect(namaPanggilan('drg. Sinta Maharani')).toBe('Sinta');
    expect(namaPanggilan('Dr. drg. Budi Santoso, Sp.Ort')).toBe('Budi');
    expect(namaPanggilan('rina puspita')).toBe('Rina');
    expect(namaPanggilan('Admin')).toBe('Admin');
    expect(namaPanggilan('')).toBe('');
  });
});
