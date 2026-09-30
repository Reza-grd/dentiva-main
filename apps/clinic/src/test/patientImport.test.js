import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parsePatientFile } from '../utils/patientImport';

const fileFrom = (aoa) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Pasien');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return { name: 'pasien.xlsx', arrayBuffer: async () => buf };
};

describe('Impor pasien dari Excel', () => {
  it('mengenali variasi judul kolom & menormalkan nilai', async () => {
    const { rows, unknownHeaders, missingRequired } = await parsePatientFile(fileFrom([
      ['Nama Pasien', 'Tgl Lahir', 'L/P', 'No HP', 'Alamat', 'Kolom Lain'],
      ['Budi Santoso', '17/05/1990', 'L', '0812-3456-7890', 'Bandung', 'x'],
      ['Siti Aminah', '1985-01-02', 'Perempuan', '+62 813 1111 2222', '', ''],
    ]));
    expect(missingRequired).toEqual([]);
    expect(unknownHeaders).toEqual(['Kolom Lain']);
    expect(rows.map((r) => r.errors)).toEqual([[], []]);
    expect(rows[0].data).toMatchObject({ nama_lengkap: 'Budi Santoso', tanggal_lahir: '1990-05-17', jenis_kelamin: 'Laki-laki', no_wa: '081234567890' });
    expect(rows[1].data).toMatchObject({ tanggal_lahir: '1985-01-02', jenis_kelamin: 'Perempuan', no_wa: '+6281311112222', alamat: null });
  });

  it('menerima nomor seri tanggal Excel', async () => {
    const { rows } = await parsePatientFile(fileFrom([['Nama', 'Tanggal Lahir'], ['Andi', 32874]]));
    expect(rows[0].data.tanggal_lahir).toBe('1990-01-01');
  });

  it('menandai baris bermasalah tanpa menghentikan impor', async () => {
    const { rows } = await parsePatientFile(fileFrom([
      ['Nama', 'Tanggal Lahir', 'JK', 'NIK'],
      ['', '1990-01-01', 'L', ''],
      ['Ana', '31-13-2020', 'X', '123'],
      ['Dewi', '2001-02-03', 'P', '3273010101010001'],
      ['Dewi', '2001-02-03', 'P', ''],
    ]));
    expect(rows[0].errors).toContain('Nama kosong');
    expect(rows[1].errors.length).toBe(3);
    expect(rows[2].errors).toEqual([]);
    expect(rows[3].errors).toContain('Duplikat di dalam berkas');
  });

  it('melaporkan kolom Nama yang hilang', async () => {
    const { missingRequired } = await parsePatientFile(fileFrom([['Alamat'], ['Bandung']]));
    expect(missingRequired).toEqual(['Nama Lengkap']);
  });
});
