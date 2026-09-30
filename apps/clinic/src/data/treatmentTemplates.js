/**
 * Tarif standar untuk klinik baru (Master Treatment → "Impor tarif standar").
 * Kode ICD-9-CM diambil dari data/icd9cmDental.js (CMS ICD-9-CM Vol 3) sehingga
 * tindakan langsung siap dikirim sebagai Procedure SATUSEHAT.
 * Harga hanya CONTOH kisaran klinik gigi umum di Indonesia — klinik wajib
 * menyesuaikan sebelum dipakai di kasir.
 */
export const TREATMENT_TEMPLATES = [
  { kode_treatment: 'PMR-001', nama_treatment: 'Pemeriksaan & Konsultasi', kategori: 'Pemeriksaan', harga_dasar: 100000, durasi_menit: 15, tier: 'ringan', kode_icd9cm: null },
  { kode_treatment: 'RAD-001', nama_treatment: 'Foto Rontgen Periapikal', kategori: 'Pemeriksaan', harga_dasar: 100000, durasi_menit: 10, tier: 'ringan', kode_icd9cm: '87.12' },
  { kode_treatment: 'RAD-002', nama_treatment: 'Foto Rontgen Panoramik', kategori: 'Pemeriksaan', harga_dasar: 250000, durasi_menit: 15, tier: 'ringan', kode_icd9cm: '87.11' },
  { kode_treatment: 'PRV-001', nama_treatment: 'Scaling & Polishing (Pembersihan Karang Gigi)', kategori: 'Perawatan', harga_dasar: 350000, durasi_menit: 45, tier: 'ringan', kode_icd9cm: '96.54' },
  { kode_treatment: 'RST-001', nama_treatment: 'Tambal Gigi Komposit (1 bidang)', kategori: 'Perawatan', harga_dasar: 300000, durasi_menit: 30, tier: 'sedang', kode_icd9cm: '23.2' },
  { kode_treatment: 'RST-002', nama_treatment: 'Tambal Gigi Komposit (2+ bidang)', kategori: 'Perawatan', harga_dasar: 450000, durasi_menit: 45, tier: 'sedang', kode_icd9cm: '23.2' },
  { kode_treatment: 'RST-003', nama_treatment: 'Tambal Gigi Glass Ionomer (GIC)', kategori: 'Perawatan', harga_dasar: 250000, durasi_menit: 30, tier: 'ringan', kode_icd9cm: '23.2' },
  { kode_treatment: 'RST-004', nama_treatment: 'Inlay / Onlay', kategori: 'Perawatan', harga_dasar: 1500000, durasi_menit: 60, tier: 'berat', kode_icd9cm: '23.3' },
  { kode_treatment: 'EKS-001', nama_treatment: 'Cabut Gigi Anak (Sulung)', kategori: 'Bedah', harga_dasar: 150000, durasi_menit: 20, tier: 'ringan', kode_icd9cm: '23.01' },
  { kode_treatment: 'EKS-002', nama_treatment: 'Cabut Gigi Dewasa (Tetap)', kategori: 'Bedah', harga_dasar: 300000, durasi_menit: 30, tier: 'sedang', kode_icd9cm: '23.09' },
  { kode_treatment: 'BDH-001', nama_treatment: 'Pengambilan Sisa Akar (Bedah)', kategori: 'Bedah', harga_dasar: 500000, durasi_menit: 45, tier: 'sedang', kode_icd9cm: '23.11' },
  { kode_treatment: 'BDH-002', nama_treatment: 'Odontektomi (Gigi Impaksi)', kategori: 'Bedah', harga_dasar: 2500000, durasi_menit: 90, tier: 'berat', kode_icd9cm: '23.19' },
  { kode_treatment: 'BDH-003', nama_treatment: 'Insisi & Drainase Abses', kategori: 'Bedah', harga_dasar: 400000, durasi_menit: 30, tier: 'sedang', kode_icd9cm: '24.0' },
  { kode_treatment: 'BDH-004', nama_treatment: 'Eksisi Mukokel / Lesi Gusi', kategori: 'Bedah', harga_dasar: 800000, durasi_menit: 45, tier: 'sedang', kode_icd9cm: '24.31' },
  { kode_treatment: 'BDH-005', nama_treatment: 'Alveoloplasti', kategori: 'Bedah', harga_dasar: 1000000, durasi_menit: 60, tier: 'berat', kode_icd9cm: '24.5' },
  { kode_treatment: 'END-001', nama_treatment: 'Perawatan Saluran Akar (PSA) per Kunjungan', kategori: 'Perawatan', harga_dasar: 600000, durasi_menit: 60, tier: 'berat', kode_icd9cm: '23.70' },
  { kode_treatment: 'END-002', nama_treatment: 'Pulpotomi', kategori: 'Perawatan', harga_dasar: 350000, durasi_menit: 40, tier: 'sedang', kode_icd9cm: '23.71' },
  { kode_treatment: 'END-003', nama_treatment: 'Pulpektomi', kategori: 'Perawatan', harga_dasar: 450000, durasi_menit: 45, tier: 'sedang', kode_icd9cm: '23.72' },
  { kode_treatment: 'PER-001', nama_treatment: 'Gingivektomi / Gingivoplasti (per regio)', kategori: 'Perawatan', harga_dasar: 1200000, durasi_menit: 60, tier: 'berat', kode_icd9cm: '24.2' },
  { kode_treatment: 'PRS-001', nama_treatment: 'Mahkota Gigi (Crown) PFM', kategori: 'Prostodonti', harga_dasar: 2500000, durasi_menit: 60, tier: 'berat', kode_icd9cm: '23.41' },
  { kode_treatment: 'PRS-002', nama_treatment: 'Jembatan Gigi (Bridge) per Unit', kategori: 'Prostodonti', harga_dasar: 2500000, durasi_menit: 60, tier: 'berat', kode_icd9cm: '23.42' },
  { kode_treatment: 'PRS-003', nama_treatment: 'Gigi Tiruan Lepasan Akrilik (1 gigi)', kategori: 'Prostodonti', harga_dasar: 600000, durasi_menit: 45, tier: 'sedang', kode_icd9cm: '23.43' },
  { kode_treatment: 'PRS-004', nama_treatment: 'Gigi Tiruan Lengkap (per rahang)', kategori: 'Prostodonti', harga_dasar: 3500000, durasi_menit: 60, tier: 'berat', kode_icd9cm: '23.43' },
  { kode_treatment: 'EST-001', nama_treatment: 'Bleaching (Pemutihan Gigi)', kategori: 'Estetik', harga_dasar: 2000000, durasi_menit: 60, tier: 'sedang', kode_icd9cm: null },
  { kode_treatment: 'EST-002', nama_treatment: 'Veneer Komposit (per gigi)', kategori: 'Estetik', harga_dasar: 1000000, durasi_menit: 45, tier: 'sedang', kode_icd9cm: null },
];
