/**
 * icd9cmDental.js
 * Static ICD-9-CM procedure code dictionary for dental clinical interventions.
 * Sourced from CMS / WHO ICD-9-CM Volume 3 (Procedure Codes), covering
 * official codes for dental extractions, restorations, endodontics, periodontics, and X-rays.
 *
 * Structure: { code: string, description: string, category: string, verified_source?: string }
 */

export const ICD9CM_DENTAL = [
  // ── 23.0 - 23.1: Ekstraksi Gigi & Bedah Mulut ─────────────────────────────
  { code: '23.01', description: 'Ekstraksi gigi sulung (pencabutan gigi anak)', category: 'Ekstraksi', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.09', description: 'Ekstraksi gigi tetap (pencabutan gigi dewasa)', category: 'Ekstraksi', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.11', description: 'Pengambilan sisa akar gigi secara bedah', category: 'Bedah Mulut', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.19', description: 'Odontektomi / operasi impaksi gigi (pembedahan gigi terpendam)', category: 'Bedah Mulut', verified_source: 'CMS ICD-9-CM Vol 3' },

  // ── 23.2 - 23.4: Restorasi, Inlay, Crown & Prostitusi ──────────────────────
  { code: '23.2', description: 'Restorasi gigi dengan penambalan (komposit / glass ionomer)', category: 'Restorasi', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.3', description: 'Restorasi gigi dengan inlay / onlay', category: 'Restorasi', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.41', description: 'Pemasangan mahkota gigi (crown)', category: 'Prostodonsia', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.42', description: 'Pemasangan jembatan gigi tetap (fixed bridge)', category: 'Prostodonsia', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.43', description: 'Pemasangan gigi tiruan lepasan (denture)', category: 'Prostodonsia', verified_source: 'CMS ICD-9-CM Vol 3' },

  // ── 23.7: Perawatan Saluran Akar (Endodontik) ────────────────────────────
  { code: '23.70', description: 'Perawatan saluran akar gigi (PSA / Endodontik)', category: 'Endodontik', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.71', description: 'Pulpotomi pulpa gigi', category: 'Endodontik', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.72', description: 'Pulpektomi pulpa gigi', category: 'Endodontik', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '23.73', description: 'Apikoektomi (reseksi apeks akar gigi)', category: 'Endodontik', verified_source: 'CMS ICD-9-CM Vol 3' },

  // ── 24.0 - 24.5: Periodonsia & Operasi Gusi/Rahang ────────────────────────
  { code: '24.0', description: 'Insisi gusi / drainase abses rongga mulut', category: 'Periodonsia', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '24.12', description: 'Biopsi gusi / mukosa mulut', category: 'Diagnostik', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '24.2', description: 'Gingivektomi / gingivoplasti (pemotongan gusi)', category: 'Periodonsia', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '24.31', description: 'Eksisi lesi gusi / eksisi mukokel', category: 'Bedah Mulut', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '24.4', description: 'Eksisi kista / lesi tulang rahang', category: 'Bedah Mulut', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '24.5', description: 'Alveoloplasti (perataan tulang alveolar)', category: 'Bedah Mulut', verified_source: 'CMS ICD-9-CM Vol 3' },

  // ── 87.11 - 87.12: Radiologi Gigi ────────────────────────────────────────
  { code: '87.11', description: 'Foto Rontgen Panoramik (Full-mouth dental X-ray)', category: 'Radiologi', verified_source: 'CMS ICD-9-CM Vol 3' },
  { code: '87.12', description: 'Foto Rontgen Periapikal / Bitewing (Dental X-ray)', category: 'Radiologi', verified_source: 'CMS ICD-9-CM Vol 3' },

  // ── 96.54: Preventif / Profilaksis ───────────────────────────────────────
  { code: '96.54', description: 'Scaling & Polishing (pembersihan karang gigi)', category: 'Preventif', verified_source: 'CMS ICD-9-CM Vol 3' }
];

/**
 * Search ICD-9-CM dental procedures by query string.
 * Matches against code prefix OR description (case-insensitive).
 *
 * @param {string} query
 * @param {number} limit
 * @returns {{ code: string, description: string, category: string, verified_source?: string }[]}
 */
export function searchICD9CM(query, limit = 10) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  return ICD9CM_DENTAL.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  ).slice(0, limit);
}

/**
 * Find a single ICD-9-CM entry by its exact code.
 * Returns null if not found.
 *
 * @param {string} code
 * @returns {{ code: string, description: string, category: string, verified_source?: string } | null}
 */
export function findICD9CMByCode(code) {
  if (!code) return null;
  return ICD9CM_DENTAL.find((item) => item.code === code) || null;
}
