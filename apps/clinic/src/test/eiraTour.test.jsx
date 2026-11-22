import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { LANGKAH, LANJUTAN, langkahUntuk, babUntuk } from '../components/tour/tourSteps';
import { DENTI_STATES } from '../components/mascot/dentiSvg';
import { smallTalk } from '../utils/dentiMood';

const src = (p) => readFileSync(resolve(__dirname, p), 'utf8');
const app = src('../App.jsx');
const ruteApp = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const adaRute = (r) => {
  const jalur = r.split('?')[0];
  return ruteApp.some((p) => {
    const pola = new RegExp(`^${p.replace(/\/\*$/, '(/.*)?').replace(/:[^/]+/g, '[^/]+')}$`);
    return pola.test(jalur);
  });
};
// Seluruh sumber komponen — untuk memastikan teks sasaran tur benar-benar ada di aplikasi.
const semuaJsx = (dir) => readdirSync(dir).flatMap((f) => {
  const p = resolve(dir, f);
  return statSync(p).isDirectory() ? semuaJsx(p) : /\.jsx?$/.test(f) ? [readFileSync(p, 'utf8')] : [];
});
const sumber = semuaJsx(resolve(__dirname, '../components')).join(' ').replace(/\s+/g, ' ');
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

      it('setiap langkah punya bab, dan bab tersusun berurutan tanpa terpecah', () => {
        expect(langkah.every((s) => s.bab)).toBe(true);
        const bab = babUntuk(langkah).map((b) => b.nama);
        expect(new Set(bab).size).toBe(bab.length);
        expect(bab.length).toBeGreaterThan(4);
      });

      it('setiap halaman menu dibuka dan isinya disorot (bukan hanya menu)', () => {
        const isi = langkah.filter((s) => s.ke && (s.teks || (s.target && !jalurMenu(s.target))));
        expect(isi.length).toBeGreaterThan(langkah.filter((s) => jalurMenu(s.target)).length);
      });

      it('setiap teks sasaran ada di sumber aplikasi', () => {
        const hilang = langkah.filter((s) => s.teks).filter((s) => !sumber.includes(s.teks));
        expect(hilang.map((s) => s.teks)).toEqual([]);
      });

      it('setiap contoh pertanyaan dijawab Eira (bukan "belum paham")', () => {
        const tanpaJawaban = langkah.filter((s) => s.tanya).filter((s) => !smallTalk(s.tanya, { role: peran, name: 'Uji', seed: 1, now: new Date() })?.reply);
        expect(tanpaJawaban.map((s) => s.tanya)).toEqual([]);
      });
    });
  }

  it('dokter berlatih rekam medis di pasien simulasi', () => {
    expect(LANGKAH.dokter.filter((s) => s.ke === '/rekam-medis/simulasi').length).toBeGreaterThan(10);
    expect(LANGKAH.dokter.some((s) => s.coba)).toBe(true);
  });

  it('mode simulasi rekam medis tidak pernah menulis ke database', () => {
    const rm = src('../components/medical-record/MedicalRecordForm.jsx');
    // muat: kembali sebelum mengambil data pasien
    expect(rm.indexOf('if (simulasi) {')).toBeLessThan(rm.indexOf('patientService.getPatientWithDetails'));
    // simpan: berhenti setelah validasi, sebelum layanan penyimpanan
    const simpan = rm.slice(rm.indexOf('const handleSaveAll'));
    expect(simpan.indexOf('if (simulasi)')).toBeGreaterThan(-1);
    expect(simpan.indexOf('if (simulasi)')).toBeLessThan(simpan.indexOf('patientService.saveMedicalHistory'));
    // unggah media & surat rujukan tidak tersedia di simulasi
    expect(rm).toMatch(/simulasi \? \(\s*<div className="glass-panel/);
    expect(rm).toContain("simulasi ? toast.info('Surat rujukan");
    expect(src('../components/medical-record/MedicalRecordList.jsx')).toContain("navigate('/rekam-medis/simulasi')");
  });

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
