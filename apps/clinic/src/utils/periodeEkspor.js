// Pilihan periode untuk "Ekspor Lengkap Klinik". Semua tanggal lokal (WIB) berformat YYYY-MM-DD, akhir inklusif.

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const PRESET_PERIODE = [
  { id: 'bulan_ini', label: 'Bulan ini' },
  { id: 'bulan_lalu', label: 'Bulan lalu' },
  { id: 'kuartal_ini', label: 'Kuartal ini' },
  { id: 'kuartal_lalu', label: 'Kuartal lalu' },
  { id: 'semester_ini', label: 'Semester ini' },
  { id: 'tahun_ini', label: 'Tahun ini' },
  { id: 'tahun_lalu', label: 'Tahun lalu' },
  { id: 'rentang', label: 'Rentang tanggal sendiri' },
];

/** Batas rentang ekspor (hari) agar berkas tetap ringan dibuka di Excel. */
export const MAKS_HARI = 731;

/**
 * Hitung periode dari preset. `rentang` memakai {mulai, akhir} masukan pengguna.
 * Hasil: { mulai, akhir, label } atau { error }.
 */
export function hitungPeriode(preset, { hari = new Date(), mulai, akhir } = {}) {
  const y = hari.getFullYear();
  const m = hari.getMonth();
  const rentangBulan = (y0, m0, jumlah) => ({ mulai: iso(new Date(y0, m0, 1)), akhir: iso(new Date(y0, m0 + jumlah, 0)) });
  let p;
  switch (preset) {
    case 'bulan_ini':
      p = { ...rentangBulan(y, m, 1), label: `${BULAN[m]} ${y}` };
      p.akhir = iso(hari) < p.akhir ? iso(hari) : p.akhir;
      break;
    case 'bulan_lalu': {
      const d = new Date(y, m - 1, 1);
      p = { ...rentangBulan(d.getFullYear(), d.getMonth(), 1), label: `${BULAN[d.getMonth()]} ${d.getFullYear()}` };
      break;
    }
    case 'kuartal_ini': {
      const q = Math.floor(m / 3);
      p = { ...rentangBulan(y, q * 3, 3), label: `Kuartal ${q + 1} ${y}` };
      p.akhir = iso(hari) < p.akhir ? iso(hari) : p.akhir;
      break;
    }
    case 'kuartal_lalu': {
      const d = new Date(y, Math.floor(m / 3) * 3 - 3, 1);
      p = { ...rentangBulan(d.getFullYear(), d.getMonth(), 3), label: `Kuartal ${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}` };
      break;
    }
    case 'semester_ini': {
      const s = m < 6 ? 0 : 6;
      p = { ...rentangBulan(y, s, 6), label: `Semester ${s ? 2 : 1} ${y}` };
      p.akhir = iso(hari) < p.akhir ? iso(hari) : p.akhir;
      break;
    }
    case 'tahun_ini':
      p = { mulai: `${y}-01-01`, akhir: iso(hari), label: `Tahun ${y}` };
      break;
    case 'tahun_lalu':
      p = { mulai: `${y - 1}-01-01`, akhir: `${y - 1}-12-31`, label: `Tahun ${y - 1}` };
      break;
    case 'rentang': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai || '') || !/^\d{4}-\d{2}-\d{2}$/.test(akhir || '')) return { error: 'Isi tanggal mulai dan akhir.' };
      if (mulai > akhir) return { error: 'Tanggal mulai harus sebelum tanggal akhir.' };
      p = { mulai, akhir, label: `${formatTanggal(mulai)} – ${formatTanggal(akhir)}` };
      break;
    }
    default:
      return { error: 'Pilih periode.' };
  }
  const hariRentang = Math.round((new Date(`${p.akhir}T00:00:00`) - new Date(`${p.mulai}T00:00:00`)) / 86400000) + 1;
  if (hariRentang > MAKS_HARI) return { error: 'Rentang maksimal 2 tahun per berkas. Pecah menjadi beberapa ekspor.' };
  return p;
}

export function formatTanggal(isoStr) {
  const [y, m, d] = String(isoStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${BULAN[m - 1].slice(0, 3)} ${y}`;
}

/** Daftar bulan (YYYY-MM) yang tercakup periode, untuk sheet laporan bulanan. */
export function daftarBulan(mulai, akhir) {
  const out = [];
  let [y, m] = mulai.slice(0, 7).split('-').map(Number);
  const [y2, m2] = akhir.slice(0, 7).split('-').map(Number);
  while (y < y2 || (y === y2 && m <= m2)) {
    out.push({ kunci: `${y}-${String(m).padStart(2, '0')}`, label: `${BULAN[m - 1]} ${y}` });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** Batas waktu WIB untuk kolom timestamptz: [mulai 00:00 WIB, akhir+1 00:00 WIB). */
export function batasWaktuWib(mulai, akhir) {
  const besok = new Date(`${akhir}T00:00:00Z`);
  besok.setUTCDate(besok.getUTCDate() + 1);
  return { dari: `${mulai}T00:00:00+07:00`, sebelum: `${besok.toISOString().slice(0, 10)}T00:00:00+07:00` };
}

/** Tanggal WIB (YYYY-MM-DD) dari timestamptz ISO. */
export function tanggalWib(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 10);
  return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
