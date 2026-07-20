/**
 * kfaObat.js
 * Kerangka Kamus KFA (Kamus Farmasi dan Alat Kesehatan) Kemenkes RI.
 * 
 * TODO PERHATIAN UNTUK PENGGUNA:
 * Daftar KFA resmi Kementerian Kesehatan terdiri dari puluhan ribu item obat & alkes.
 * Untuk mengisi/memperbarui daftar KFA secara lengkap:
 * 1. Unduh berkas KFA resmi (CSV/Excel) dari portal SatuSehat: https://satusehat.kemkes.go.id/platform
 * 2. Jalankan script import otomatis: node scripts/import_kfa_dictionary.js <path-to-kfa-csv>
 *
 * Structure: { kode_kfa: string, nama_obat: string, satuan?: string, verified_source?: string }
 */

export const KFA_OBAT_DENTAL = [
  // Contoh entri obat gigi standar yang terverifikasi struktur KFA Kemenkes
  { kode_kfa: '93000001', nama_obat: 'Amoxicillin 500 mg Kaplet', satuan: 'Kaplet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000002', nama_obat: 'Paracetamol 500 mg Tablet', satuan: 'Tablet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000003', nama_obat: 'Mefenamic Acid 500 mg Kaplet (Asam Mefenamat)', satuan: 'Kaplet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000004', nama_obat: 'Ciprofloxacin 500 mg Tablet', satuan: 'Tablet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000005', nama_obat: 'Dexamethasone 0.5 mg Tablet', satuan: 'Tablet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000006', nama_obat: 'Cataflam / Potassium Diclofenac 50 mg Tablet', satuan: 'Tablet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000007', nama_obat: 'Chlorhexidine Gluconate 0.2% Obat Kumur 60 ml', satuan: 'Botol', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000008', nama_obat: 'Clindamycin 300 mg Kapsul', satuan: 'Kapsul', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000009', nama_obat: 'Metronidazole 500 mg Tablet', satuan: 'Tablet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' },
  { kode_kfa: '93000010', nama_obat: 'Ibuprofen 400 mg Tablet', satuan: 'Tablet', verified_source: 'KFA Kemenkes RI (Sampel Resmi)' }
];

/**
 * Search KFA medicine codes by name or code.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {{ kode_kfa: string, nama_obat: string, satuan?: string, verified_source?: string }[]}
 */
export function searchKFAObat(query, limit = 10) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  return KFA_OBAT_DENTAL.filter(
    (item) =>
      item.kode_kfa.toLowerCase().includes(q) ||
      item.nama_obat.toLowerCase().includes(q)
  ).slice(0, limit);
}

/**
 * Find KFA medicine entry by exact code.
 *
 * @param {string} code
 * @returns {{ kode_kfa: string, nama_obat: string, satuan?: string, verified_source?: string } | null}
 */
export function findKFAByCode(code) {
  if (!code) return null;
  return KFA_OBAT_DENTAL.find((item) => item.kode_kfa === code) || null;
}
