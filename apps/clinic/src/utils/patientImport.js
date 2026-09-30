import * as XLSX from 'xlsx';

/**
 * Impor data pasien dari Excel/CSV (onboarding klinik yang pindah dari sistem lama).
 * Judul kolom dikenali dengan beberapa variasi umum; nilai dinormalisasi agar
 * lolos CHECK constraint tabel patients.
 */
export const IMPORT_COLUMNS = [
  { key: 'nama_lengkap', label: 'Nama Lengkap', aliases: ['nama', 'nama lengkap', 'nama pasien', 'name'], required: true },
  { key: 'tanggal_lahir', label: 'Tanggal Lahir', aliases: ['tanggal lahir', 'tgl lahir', 'tgl. lahir', 'dob', 'birth date'] },
  { key: 'jenis_kelamin', label: 'Jenis Kelamin', aliases: ['jenis kelamin', 'jk', 'l/p', 'gender', 'kelamin'] },
  { key: 'no_wa', label: 'No WhatsApp', aliases: ['no wa', 'no. wa', 'whatsapp', 'wa', 'no hp', 'no. hp', 'hp', 'telepon', 'no telepon', 'no. telepon', 'phone'] },
  { key: 'alamat', label: 'Alamat', aliases: ['alamat', 'address'] },
  { key: 'nik', label: 'NIK', aliases: ['nik', 'no ktp', 'ktp'] },
  { key: 'tempat_lahir', label: 'Tempat Lahir', aliases: ['tempat lahir', 'tmp lahir'] },
  { key: 'pekerjaan', label: 'Pekerjaan', aliases: ['pekerjaan', 'occupation'] },
  { key: 'golongan_darah', label: 'Golongan Darah', aliases: ['golongan darah', 'gol darah', 'gol. darah', 'blood type'] },
];

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Unduh templat kosong dengan judul kolom yang dikenali. */
export function downloadImportTemplate() {
  const header = IMPORT_COLUMNS.map((c) => c.label);
  const example = ['Budi Santoso', '1990-05-17', 'Laki-laki', '0812-3456-7890', 'Jl. Merdeka No. 1, Bandung', '', 'Bandung', 'Wiraswasta', 'O'];
  const ws = XLSX.utils.aoa_to_sheet([header, example]);
  ws['!cols'] = header.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pasien');
  XLSX.writeFile(wb, 'Templat_Impor_Pasien_Dentiva.xlsx');
}

function parseDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'number') {
    // Nomor seri Excel (hari sejak 1899-12-30)
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let y, mo, d;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) [, y, mo, d] = m.map(Number);
  else if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) [, d, mo, y] = m.map(Number); // dd/mm/yyyy (format Indonesia)
  else return 'INVALID';
  // Tolak tanggal mustahil (mis. bulan 13, 31 Februari)
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return 'INVALID';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseGender(v) {
  const s = norm(v);
  if (!s) return null;
  if (['l', 'lk', 'laki', 'laki-laki', 'laki laki', 'pria', 'male', 'm'].includes(s)) return 'Laki-laki';
  if (['p', 'pr', 'perempuan', 'wanita', 'female', 'f', 'w'].includes(s)) return 'Perempuan';
  return 'INVALID';
}

const ageFrom = (iso) => {
  if (!iso) return null;
  const b = new Date(`${iso}T00:00:00`);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a -= 1;
  return a >= 0 && a < 130 ? a : null;
};

/**
 * Baca berkas → { rows: [{ data, errors, line }], unknownHeaders }.
 * data berbentuk kolom tabel patients; errors kosong berarti siap diimpor.
 */
export async function parsePatientFile(file) {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (matrix.length < 2) return { rows: [], unknownHeaders: [], missingRequired: ['Nama Lengkap'] };

  const headers = matrix[0].map(norm);
  const colIndex = {};
  const unknownHeaders = [];
  headers.forEach((h, i) => {
    if (!h) return;
    const col = IMPORT_COLUMNS.find((c) => c.aliases.includes(h) || norm(c.label) === h);
    if (col && colIndex[col.key] === undefined) colIndex[col.key] = i;
    else if (!col) unknownHeaders.push(matrix[0][i]);
  });
  const missingRequired = IMPORT_COLUMNS.filter((c) => c.required && colIndex[c.key] === undefined).map((c) => c.label);

  const seen = new Set();
  const rows = [];
  matrix.slice(1).forEach((r, idx) => {
    const get = (k) => (colIndex[k] === undefined ? '' : r[colIndex[k]]);
    if (r.every((c) => String(c).trim() === '')) return;
    const errors = [];
    const nama = String(get('nama_lengkap')).trim();
    if (nama.length < 2) errors.push('Nama kosong');
    const tgl = parseDate(get('tanggal_lahir'));
    if (tgl === 'INVALID') errors.push('Tanggal lahir tidak dikenali (pakai YYYY-MM-DD atau DD/MM/YYYY)');
    else if (tgl && tgl > new Date().toISOString().slice(0, 10)) errors.push('Tanggal lahir di masa depan');
    const jk = parseGender(get('jenis_kelamin'));
    if (jk === 'INVALID') errors.push('Jenis kelamin harus L/P');
    const nik = String(get('nik')).replace(/\D/g, '');
    if (nik && nik.length !== 16) errors.push('NIK harus 16 digit');
    const wa = String(get('no_wa')).replace(/[^\d+]/g, '');
    const gol = String(get('golongan_darah')).trim().toUpperCase();

    const key = `${norm(nama)}|${tgl || ''}`;
    if (!errors.length && seen.has(key)) errors.push('Duplikat di dalam berkas');
    seen.add(key);

    rows.push({
      line: idx + 2,
      errors,
      data: {
        nama_lengkap: nama,
        tanggal_lahir: tgl && tgl !== 'INVALID' ? tgl : null,
        umur: tgl && tgl !== 'INVALID' ? ageFrom(tgl) : null,
        jenis_kelamin: jk && jk !== 'INVALID' ? jk : null,
        no_wa: wa || null,
        alamat: String(get('alamat')).trim() || null,
        nik: nik || null,
        tempat_lahir: String(get('tempat_lahir')).trim() || null,
        pekerjaan: String(get('pekerjaan')).trim() || null,
        golongan_darah: ['A', 'B', 'AB', 'O'].includes(gol) ? gol : null,
        status: 'active',
      },
    });
  });
  return { rows, unknownHeaders, missingRequired };
}
