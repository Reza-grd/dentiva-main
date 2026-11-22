import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { hitungPeriode, daftarBulan, batasWaktuWib, tanggalWib } from '../utils/periodeEkspor';
import { susunEksporLengkap, hitungRingkasan, buatWorkbook, namaBerkasEkspor, URUTAN_SHEET } from '../utils/eksporLengkap';

const HARI = new Date(2026, 10, 23); // 23 Nov 2026

describe('hitungPeriode', () => {
  it.each([
    ['bulan_ini', '2026-11-01', '2026-11-23', 'November 2026'],
    ['bulan_lalu', '2026-10-01', '2026-10-31', 'Oktober 2026'],
    ['kuartal_ini', '2026-10-01', '2026-11-23', 'Kuartal 4 2026'],
    ['kuartal_lalu', '2026-07-01', '2026-09-30', 'Kuartal 3 2026'],
    ['semester_ini', '2026-07-01', '2026-11-23', 'Semester 2 2026'],
    ['tahun_ini', '2026-01-01', '2026-11-23', 'Tahun 2026'],
    ['tahun_lalu', '2025-01-01', '2025-12-31', 'Tahun 2025'],
  ])('%s', (preset, mulai, akhir, label) => {
    expect(hitungPeriode(preset, { hari: HARI })).toEqual({ mulai, akhir, label });
  });

  it('bulan lalu di bulan Januari pindah ke Desember tahun sebelumnya; Februari kabisat', () => {
    expect(hitungPeriode('bulan_lalu', { hari: new Date(2027, 0, 5) })).toMatchObject({ mulai: '2026-12-01', akhir: '2026-12-31' });
    expect(hitungPeriode('bulan_lalu', { hari: new Date(2028, 2, 2) })).toMatchObject({ mulai: '2028-02-01', akhir: '2028-02-29' });
    expect(hitungPeriode('kuartal_lalu', { hari: new Date(2027, 1, 1) })).toMatchObject({ mulai: '2026-10-01', akhir: '2026-12-31' });
  });

  it('rentang sendiri divalidasi', () => {
    expect(hitungPeriode('rentang', { mulai: '2026-03-05', akhir: '2026-04-20' })).toMatchObject({ mulai: '2026-03-05', akhir: '2026-04-20' });
    expect(hitungPeriode('rentang', { mulai: '2026-05-01', akhir: '2026-04-01' }).error).toMatch(/sebelum/);
    expect(hitungPeriode('rentang', { mulai: '', akhir: '2026-04-01' }).error).toBeTruthy();
    expect(hitungPeriode('rentang', { mulai: '2022-01-01', akhir: '2026-01-01' }).error).toMatch(/2 tahun/);
  });

  it('daftar bulan & batas waktu WIB', () => {
    expect(daftarBulan('2025-11-15', '2026-02-02').map((b) => b.kunci)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(batasWaktuWib('2026-10-01', '2026-10-31')).toEqual({ dari: '2026-10-01T00:00:00+07:00', sebelum: '2026-11-01T00:00:00+07:00' });
    expect(tanggalWib('2026-10-31T18:30:00Z')).toBe('2026-11-01'); // 01.30 WIB
  });
});

const DATA = {
  periode: { mulai: '2026-10-01', akhir: '2026-11-30', label: 'Uji' },
  klinik: { name: 'Klinik Uji' },
  pembayaran: [
    { tanggal_pembayaran: '2026-10-05T03:00:00Z', invoice_number: 'INV-1', no_rm: 'RM-001', nama_pasien: 'Budi', total_treatment: 500000, diskon: 0, total_bayar: 500000, jumlah_bayar: 500000, metode_pembayaran: 'cash', status_pembayaran: 'paid', kasir: 'Rina' },
    { tanggal_pembayaran: '2026-11-02T03:00:00Z', invoice_number: 'INV-2', no_rm: 'RM-002', total_bayar: 300000, jumlah_bayar: 100000, metode_pembayaran: 'transfer', status_pembayaran: 'pending' },
    { tanggal_pembayaran: '2026-11-10T03:00:00Z', invoice_number: 'INV-3', no_rm: 'RM-003', total_bayar: 250000, jumlah_bayar: 250000, metode_pembayaran: 'qris', status_pembayaran: 'paid' },
  ],
  pengeluaran: [{ tanggal_expense: '2026-10-10', kategori: 'Sewa', jumlah: 200000 }, { tanggal_expense: '2026-11-11', kategori: 'Listrik', jumlah: 50000 }],
  overhead: [{ nama_biaya: 'Sewa', jumlah_bulanan: 2000000, aktif: true }],
  tindakan: [
    { tanggal: '2026-10-05', nama: 'Tambal', qty: 1, harga_satuan: 300000, subtotal: 300000, biaya_bahan: 40000, overhead: 60000, total_modal: 100000 },
    { tanggal: '2026-11-10', nama: 'Tambal', qty: 1, harga_satuan: 250000, subtotal: 250000, biaya_bahan: 40000, overhead: 60000, total_modal: 100000 },
    { tanggal: '2026-10-05', nama: 'Konsultasi', qty: 1, harga_satuan: 200000, subtotal: 200000, total_modal: null },
  ],
  bahan: [
    { kode_bahan: 'B1', nama_bahan: 'Komposit', stok_saat_ini: 10, stok_minimum: 12, harga_rata2: 50000, kadaluarsa_terdekat: '2027-01-01' },
    { kode_bahan: 'B2', nama_bahan: 'Kapas', stok_saat_ini: 100, stok_minimum: 10, harga_rata2: 100 },
  ],
  mutasi: [{ created_at: '2026-10-05T03:00:00Z', nama_bahan: 'Komposit', tipe: 'keluar', jumlah: -1, stok_sebelum: 11, stok_sesudah: 10, harga_saat_itu: 50000 }],
  pembelian: [{ tanggal: '2026-10-01', nama_bahan: 'Komposit', jumlah_beli: 1, jumlah_dasar: 11, harga_satuan_beli: 550000, total_harga: 550000 }],
  hitungan: { kunjungan: 7, pasien_baru: 3 },
};

describe('susunEksporLengkap', () => {
  it('ringkasan: pendapatan hanya transaksi lunas, piutang, laba, persediaan', () => {
    const r = hitungRingkasan(DATA);
    expect(r.pendapatan).toBe(750000);
    expect(r.transaksiLunas).toBe(2);
    expect(r.piutang).toBe(200000);
    expect(r.pengeluaran).toBe(250000);
    expect(r.labaBersih).toBe(500000);
    expect(r.marginPersen).toBe(66.7);
    expect(r.nilaiPersediaan).toBe(510000);
    expect(r.bahanMenipis).toBe(1);
  });

  it('urutan sheet selalu tetap dan laporan bulanan per bulan', () => {
    const sheets = susunEksporLengkap(DATA);
    expect(sheets.map((s) => s.nama)).toEqual(URUTAN_SHEET);
    const bulanan = sheets.find((s) => s.nama === 'Laporan Bulanan').baris;
    expect(bulanan[1]).toEqual(['Oktober 2026', 500000, 1, 200000, 300000, 60]);
    expect(bulanan[2]).toEqual(['November 2026', 250000, 1, 50000, 200000, 80]);
    expect(bulanan.at(-1)[0]).toBe('TOTAL');
  });

  it('nama pasien hanya ikut bila dipilih', () => {
    const tanpa = susunEksporLengkap(DATA).find((s) => s.nama === 'Transaksi').baris;
    expect(tanpa[0]).not.toContain('Nama pasien');
    expect(JSON.stringify(tanpa)).not.toContain('Budi');
    const dengan = susunEksporLengkap(DATA, { sertakanNama: true }).find((s) => s.nama === 'Transaksi').baris;
    expect(dengan[0][3]).toBe('Nama pasien');
    expect(dengan[1][3]).toBe('Budi');
    expect(dengan[1].at(-4)).toBe('Tunai');
    expect(dengan[1].at(-3)).toBe('Lunas');
  });

  it('rekap tindakan: margin kosong bila modal belum dihitung', () => {
    const rekap = susunEksporLengkap(DATA).find((s) => s.nama === 'Rekap Tindakan').baris;
    expect(rekap[1]).toEqual(['Tambal', 2, 550000, 200000, 350000, 63.6]);
    expect(rekap[2]).toEqual(['Konsultasi', 1, 200000, '', '', '']);
  });

  it('workbook dapat ditulis & dibaca ulang dengan format rupiah', () => {
    const wb = buatWorkbook(susunEksporLengkap(DATA));
    const baca = XLSX.read(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
    expect(baca.SheetNames).toEqual(URUTAN_SHEET);
    const ringkas = XLSX.utils.sheet_to_json(baca.Sheets.Ringkasan, { header: 1 });
    expect(ringkas.find((b) => b[0] === 'Laba bersih')[1]).toBe(500000);
    expect(wb.Sheets.Ringkasan.B7.z).toBe('#,##0');
    expect(wb.Sheets.Ringkasan.B10.z).toBeUndefined(); // margin (%) bukan rupiah
    expect(namaBerkasEkspor('Klinik Gigi Sehat & Ceria', DATA.periode)).toBe('Dentiva_Ekspor_Klinik_Gigi_Sehat_Ceria_2026-10-01_sd_2026-11-30.xlsx');
  });
});
