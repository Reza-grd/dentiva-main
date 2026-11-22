import * as XLSX from 'xlsx';
import { daftarBulan, formatTanggal, tanggalWib } from './periodeEkspor';

/**
 * "Ekspor Lengkap Klinik": menyusun satu workbook Excel dengan sheet yang SELALU sama urutan & judul kolomnya
 * (mudah dibandingkan antarperiode dan dibaca akuntan). Fungsi ini murni (tanpa jaringan) agar bisa diuji;
 * pengambilan data ada di services/eksporService.js.
 */

const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v) || 0);
const bulat = (v) => Math.round(n(v));
const persen = (a, b) => (n(b) > 0 ? Math.round((n(a) / n(b)) * 1000) / 10 : 0);
const LABEL_METODE = { cash: 'Tunai', tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', debit: 'Kartu debit', kredit: 'Kartu kredit', card: 'Kartu' };
const LABEL_STATUS = { paid: 'Lunas', pending: 'Belum lunas', unpaid: 'Belum lunas', partial: 'Sebagian', refunded: 'Dikembalikan', cancelled: 'Dibatalkan' };
const label = (peta, v) => peta[String(v || '').toLowerCase()] || v || '';

export const URUTAN_SHEET = [
  'Ringkasan', 'Laporan Bulanan', 'Transaksi', 'Pengeluaran', 'Biaya Overhead',
  'Tindakan & HPP', 'Rekap Tindakan', 'Stok Bahan', 'Mutasi Stok', 'Pembelian Bahan', 'Keterangan',
];

/** Hitung angka ringkasan dari data mentah (dipakai sheet Ringkasan & diuji terpisah). */
export function hitungRingkasan(d) {
  const lunas = (d.pembayaran || []).filter((p) => String(p.status_pembayaran).toLowerCase() === 'paid');
  const pendapatan = lunas.reduce((s, p) => s + n(p.total_bayar), 0);
  const pengeluaran = (d.pengeluaran || []).reduce((s, e) => s + n(e.jumlah), 0);
  const pembelianBahan = (d.pembelian || []).reduce((s, b) => s + n(b.total_harga), 0);
  const nilaiPersediaan = (d.bahan || []).reduce((s, b) => s + n(b.stok_saat_ini) * n(b.harga_rata2), 0);
  const biayaBahanTindakan = (d.tindakan || []).reduce((s, t) => s + n(t.biaya_bahan), 0);
  return {
    pendapatan,
    transaksiLunas: lunas.length,
    transaksiBelumLunas: (d.pembayaran || []).length - lunas.length,
    piutang: (d.pembayaran || []).filter((p) => String(p.status_pembayaran).toLowerCase() !== 'paid' && !['cancelled', 'refunded'].includes(String(p.status_pembayaran).toLowerCase()))
      .reduce((s, p) => s + Math.max(0, n(p.total_bayar) - n(p.jumlah_bayar)), 0),
    pengeluaran,
    labaBersih: pendapatan - pengeluaran,
    marginPersen: persen(pendapatan - pengeluaran, pendapatan),
    pembelianBahan,
    nilaiPersediaan,
    biayaBahanTindakan,
    kunjungan: n(d.hitungan?.kunjungan),
    pasienBaru: n(d.hitungan?.pasien_baru),
    bahanMenipis: (d.bahan || []).filter((b) => b.is_active !== false && n(b.stok_minimum) > 0 && n(b.stok_saat_ini) <= n(b.stok_minimum)).length,
  };
}

/** Susun semua sheet → [{ nama, baris: any[][], uang: number[] (indeks kolom rupiah), lebar: number[] }]. */
export function susunEksporLengkap(d, { sertakanNama = false } = {}) {
  const { periode } = d;
  const r = hitungRingkasan(d);
  const sheets = [];
  const tambah = (nama, baris, uang = [], lebar = []) => sheets.push({ nama, baris, uang, lebar });

  tambah('Ringkasan', [
    ['Ekspor Lengkap Klinik — Dentiva'],
    ['Klinik', d.klinik?.name || ''],
    ['Periode', `${periode.label} (${formatTanggal(periode.mulai)} s.d. ${formatTanggal(periode.akhir)})`],
    ['Dibuat', `${d.dibuatPada || ''} oleh ${d.dibuatOleh || ''}`],
    [],
    ['KEUANGAN', 'Nilai (Rp)'],
    ['Pendapatan (pembayaran lunas)', bulat(r.pendapatan)],
    ['Pengeluaran', bulat(r.pengeluaran)],
    ['Laba bersih', bulat(r.labaBersih)],
    ['Margin laba (%)', r.marginPersen],
    ['Piutang (transaksi belum lunas)', bulat(r.piutang)],
    [],
    ['OPERASIONAL', 'Jumlah'],
    ['Transaksi lunas', r.transaksiLunas],
    ['Transaksi belum lunas / lainnya', r.transaksiBelumLunas],
    ['Kunjungan', r.kunjungan],
    ['Pasien baru', r.pasienBaru],
    [],
    ['BAHAN', 'Nilai (Rp)'],
    ['Pembelian bahan dalam periode', bulat(r.pembelianBahan)],
    ['Biaya bahan terpakai untuk tindakan', bulat(r.biayaBahanTindakan)],
    ['Nilai persediaan (posisi saat ekspor)', bulat(r.nilaiPersediaan)],
    ['Jumlah bahan di bawah stok minimum', r.bahanMenipis],
  ], [1], [42, 48]);
  // Baris margin, jumlah, dll. bukan rupiah: format uang hanya untuk baris bertanda Rp (ditangani penulis lewat `uangBaris`).
  sheets[0].uangBaris = [6, 7, 8, 10, 19, 20, 21];
  sheets[0].uang = [];

  // Laporan bulanan
  const perBulan = Object.fromEntries(daftarBulan(periode.mulai, periode.akhir).map((b) => [b.kunci, { ...b, pend: 0, trx: 0, peng: 0 }]));
  (d.pembayaran || []).forEach((p) => {
    if (String(p.status_pembayaran).toLowerCase() !== 'paid') return;
    const k = tanggalWib(p.tanggal_pembayaran).slice(0, 7);
    if (perBulan[k]) { perBulan[k].pend += n(p.total_bayar); perBulan[k].trx += 1; }
  });
  (d.pengeluaran || []).forEach((e) => { const k = String(e.tanggal_expense).slice(0, 7); if (perBulan[k]) perBulan[k].peng += n(e.jumlah); });
  const bulanan = Object.values(perBulan);
  tambah('Laporan Bulanan', [
    ['Bulan', 'Pendapatan', 'Jumlah transaksi', 'Pengeluaran', 'Laba bersih', 'Margin (%)'],
    ...bulanan.map((b) => [b.label, bulat(b.pend), b.trx, bulat(b.peng), bulat(b.pend - b.peng), persen(b.pend - b.peng, b.pend)]),
    ['TOTAL', bulat(r.pendapatan), r.transaksiLunas, bulat(r.pengeluaran), bulat(r.labaBersih), r.marginPersen],
  ], [1, 3, 4], [18, 16, 16, 16, 16, 11]);

  const kolomNama = sertakanNama ? ['Nama pasien'] : [];
  tambah('Transaksi', [
    ['Tanggal', 'No. invoice', 'No. RM', ...kolomNama, 'Total tindakan', 'Biaya tambahan', 'Diskon', 'Total tagihan', 'Dibayar', 'Kembalian', 'Metode', 'Status', 'Kasir', 'Keterangan'],
    ...(d.pembayaran || []).map((p) => [
      tanggalWib(p.tanggal_pembayaran), p.invoice_number || '', p.no_rm || '', ...(sertakanNama ? [p.nama_pasien || ''] : []),
      bulat(p.total_treatment), bulat(p.biaya_tambahan), bulat(p.diskon), bulat(p.total_bayar), bulat(p.jumlah_bayar), bulat(p.kembalian),
      label(LABEL_METODE, p.metode_pembayaran), label(LABEL_STATUS, p.status_pembayaran), p.kasir || '', p.keterangan_tambahan || '',
    ]),
  ], [3, 4, 5, 6, 7, 8].map((i) => i + kolomNama.length), [12, 20, 12, ...(sertakanNama ? [24] : []), 14, 14, 12, 14, 14, 12, 12, 12, 18, 24]);

  tambah('Pengeluaran', [
    ['Tanggal', 'Kategori', 'Deskripsi', 'Pemasok', 'No. nota', 'Jumlah', 'Sumber'],
    ...(d.pengeluaran || []).map((e) => [e.tanggal_expense, e.kategori || '', e.deskripsi || '', e.pemasok || '', e.nomor_nota || '', bulat(e.jumlah), e.sumber || '']),
    ['TOTAL', '', '', '', '', bulat(r.pengeluaran), ''],
  ], [5], [12, 18, 32, 20, 14, 14, 12]);

  tambah('Biaya Overhead', [
    ['Nama biaya', 'Kategori', 'Per bulan', 'Aktif', 'Catatan'],
    ...(d.overhead || []).map((o) => [o.nama_biaya || '', o.kategori || '', bulat(o.jumlah_bulanan), o.aktif === false ? 'Tidak' : 'Ya', o.catatan || '']),
  ], [2], [28, 18, 14, 8, 30]);

  const tindakan = d.tindakan || [];
  tambah('Tindakan & HPP', [
    ['Tanggal', 'Tindakan', 'Gigi', 'Qty', 'Harga satuan', 'Subtotal', 'Biaya bahan', 'Overhead', 'Total modal', 'Margin', 'Margin (%)'],
    ...tindakan.map((t) => [t.tanggal || '', t.nama || '', t.gigi || '', n(t.qty) || 1, bulat(t.harga_satuan), bulat(t.subtotal), bulat(t.biaya_bahan), bulat(t.overhead), bulat(t.total_modal),
      t.total_modal === null || t.total_modal === undefined ? '' : bulat(n(t.subtotal) - n(t.total_modal)),
      t.total_modal === null || t.total_modal === undefined ? '' : persen(n(t.subtotal) - n(t.total_modal), t.subtotal)]),
  ], [4, 5, 6, 7, 8, 9], [12, 28, 6, 6, 14, 14, 14, 14, 14, 14, 11]);

  const rekap = {};
  tindakan.forEach((t) => {
    const k = t.nama || '(tanpa nama)';
    rekap[k] ||= { nama: k, qty: 0, pend: 0, modal: 0, adaModal: false };
    rekap[k].qty += n(t.qty) || 1;
    rekap[k].pend += n(t.subtotal);
    if (t.total_modal !== null && t.total_modal !== undefined) { rekap[k].modal += n(t.total_modal); rekap[k].adaModal = true; }
  });
  tambah('Rekap Tindakan', [
    ['Tindakan', 'Jumlah', 'Pendapatan', 'Total modal', 'Margin', 'Margin (%)'],
    ...Object.values(rekap).sort((a, b) => b.pend - a.pend).map((x) => [x.nama, x.qty, bulat(x.pend), x.adaModal ? bulat(x.modal) : '',
      x.adaModal ? bulat(x.pend - x.modal) : '', x.adaModal ? persen(x.pend - x.modal, x.pend) : '']),
  ], [2, 3, 4], [30, 10, 16, 16, 16, 11]);

  tambah('Stok Bahan', [
    ['Kode', 'Nama bahan', 'Kategori', 'Satuan', 'Stok', 'Stok minimum', 'Harga rata-rata', 'Nilai persediaan', 'Status', 'Kedaluwarsa terdekat', 'Aktif'],
    ...(d.bahan || []).map((b) => {
      const menipis = n(b.stok_minimum) > 0 && n(b.stok_saat_ini) <= n(b.stok_minimum);
      return [b.kode_bahan || '', b.nama_bahan || '', b.kategori || '', b.satuan_dasar || '', n(b.stok_saat_ini), n(b.stok_minimum), bulat(b.harga_rata2),
        bulat(n(b.stok_saat_ini) * n(b.harga_rata2)), menipis ? 'Menipis' : 'Aman', b.kadaluarsa_terdekat || '', b.is_active === false ? 'Tidak' : 'Ya'];
    }),
  ], [6, 7], [12, 28, 16, 10, 10, 12, 14, 16, 10, 16, 8]);

  tambah('Mutasi Stok', [
    ['Tanggal', 'Bahan', 'Jenis', 'Jumlah', 'Stok sebelum', 'Stok sesudah', 'Harga saat itu', 'Nilai', 'Referensi', 'Catatan'],
    ...(d.mutasi || []).map((m) => [tanggalWib(m.created_at), m.nama_bahan || '', m.tipe || '', n(m.jumlah), n(m.stok_sebelum), n(m.stok_sesudah),
      bulat(m.harga_saat_itu), bulat(Math.abs(n(m.jumlah)) * n(m.harga_saat_itu)), m.referensi_tipe || '', m.catatan || '']),
  ], [6, 7], [12, 28, 12, 10, 12, 12, 14, 14, 14, 30]);

  tambah('Pembelian Bahan', [
    ['Tanggal', 'Bahan', 'Jumlah beli', 'Jumlah (satuan dasar)', 'Harga satuan beli', 'Total', 'Pemasok', 'No. faktur', 'Kedaluwarsa'],
    ...(d.pembelian || []).map((b) => [b.tanggal || '', b.nama_bahan || '', n(b.jumlah_beli), n(b.jumlah_dasar), bulat(b.harga_satuan_beli), bulat(b.total_harga), b.supplier || '', b.no_faktur || '', b.tanggal_kadaluarsa || '']),
    ['TOTAL', '', '', '', '', bulat(r.pembelianBahan), '', '', ''],
  ], [4, 5], [12, 28, 12, 18, 16, 14, 20, 16, 12]);

  tambah('Keterangan', [
    ['Istilah', 'Arti'],
    ['Pendapatan', 'Jumlah "Total tagihan" transaksi berstatus Lunas, menurut tanggal pembayaran (WIB). Sama dengan halaman Laporan.'],
    ['Pengeluaran', 'Semua catatan pengeluaran pada periode (menurut tanggal pengeluaran).'],
    ['Laba bersih', 'Pendapatan dikurangi pengeluaran. Belum memperhitungkan penyusutan atau pajak.'],
    ['Piutang', 'Sisa tagihan transaksi yang belum lunas (tidak termasuk yang dibatalkan/dikembalikan).'],
    ['Tindakan & HPP', 'Tindakan menurut tanggal kunjungan. Total modal = biaya bahan + bagian overhead saat tindakan dicatat; kosong bila belum dihitung.'],
    ['Stok Bahan', 'Posisi stok SAAT berkas dibuat (bukan per akhir periode). Nilai persediaan = stok × harga rata-rata.'],
    ['Mutasi Stok', 'Semua perubahan stok pada periode: masuk, keluar (pemakaian), penyesuaian/opname.'],
    ['Data pasien', sertakanNama ? 'Berkas ini memuat nama pasien — simpan dengan aman (UU PDP).' : 'Pasien ditampilkan dengan No. RM saja (tanpa nama).'],
  ], [], [22, 100]);

  return sheets;
}

/** Tulis sheet → workbook XLSX (format rupiah "#,##0", baris judul tebal tidak didukung SheetJS CE). */
export function buatWorkbook(sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet(s.baris);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = 1; R <= range.e.r; R += 1) {
      const kolom = s.uangBaris ? (s.uangBaris.includes(R) ? [1] : []) : s.uang;
      kolom.forEach((C) => {
        const sel = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (sel && sel.t === 'n') sel.z = '#,##0';
      });
    }
    if (s.lebar?.length) ws['!cols'] = s.lebar.map((w) => ({ wch: w }));
    if (s.nama !== 'Ringkasan' && s.nama !== 'Keterangan' && s.baris.length > 1) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: range.e.c } }) };
    XLSX.utils.book_append_sheet(wb, ws, s.nama);
  });
  return wb;
}

export function namaBerkasEkspor(klinik, periode) {
  const aman = (s) => String(s || '').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `Dentiva_Ekspor_${aman(klinik) || 'Klinik'}_${periode.mulai}_sd_${periode.akhir}.xlsx`;
}
