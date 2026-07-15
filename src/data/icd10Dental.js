/**
 * icd10Dental.js
 * Static ICD-10 code dictionary for common dental and oral health diagnoses.
 * Sourced from ICD-10 Chapter XI (Diseases of the digestive system), covering
 * the most frequently used codes in dental clinical practice in Indonesia.
 *
 * Structure: { code: string, description: string }
 * description uses Indonesian clinical terminology.
 */

export const ICD10_DENTAL = [
  // ── K02: Karies Gigi ────────────────────────────────────────────────────────
  { code: 'K02.0', description: 'Karies terbatas pada enamel' },
  { code: 'K02.1', description: 'Karies dentin' },
  { code: 'K02.2', description: 'Karies sementum' },
  { code: 'K02.3', description: 'Karies gigi dengan pulpa yang terhenti' },
  { code: 'K02.4', description: 'Odontocl asia (karies internal)' },
  { code: 'K02.5', description: 'Karies dengan pulpa terbuka' },
  { code: 'K02.8', description: 'Karies gigi lainnya' },
  { code: 'K02.9', description: 'Karies gigi, tidak terperinci' },

  // ── K03: Penyakit Jaringan Keras Gigi Lainnya ─────────────────────────────
  { code: 'K03.0', description: 'Atrisi gigi berlebihan' },
  { code: 'K03.1', description: 'Abrasi gigi' },
  { code: 'K03.2', description: 'Erosi gigi' },
  { code: 'K03.3', description: 'Resorpsi patologis gigi' },
  { code: 'K03.4', description: 'Hipersementosis' },
  { code: 'K03.5', description: 'Ankylosis gigi' },
  { code: 'K03.6', description: 'Deposit (akresio) pada gigi — kalkulus, karang gigi' },
  { code: 'K03.7', description: 'Perubahan warna pasca-eruption pada jaringan keras gigi' },
  { code: 'K03.8', description: 'Penyakit jaringan keras gigi lainnya yang ditentukan' },
  { code: 'K03.9', description: 'Penyakit jaringan keras gigi, tidak terperinci' },

  // ── K04: Penyakit Pulpa dan Jaringan Periapikal ───────────────────────────
  { code: 'K04.0', description: 'Pulpitis — radang pulpa gigi' },
  { code: 'K04.1', description: 'Nekrosis pulpa' },
  { code: 'K04.2', description: 'Degenerasi pulpa' },
  { code: 'K04.3', description: 'Pembentukan jaringan keras abnormal dalam pulpa' },
  { code: 'K04.4', description: 'Periodontitis apikal akut yang berasal dari pulpa' },
  { code: 'K04.5', description: 'Periodontitis apikal kronis' },
  { code: 'K04.6', description: 'Abses periapikal dengan sinus' },
  { code: 'K04.7', description: 'Abses periapikal tanpa sinus' },
  { code: 'K04.8', description: 'Kista radikular' },
  { code: 'K04.9', description: 'Penyakit pulpa dan jaringan periapikal lainnya dan tidak terperinci' },

  // ── K05: Gingivitis dan Penyakit Periodontal ──────────────────────────────
  { code: 'K05.0', description: 'Gingivitis akut' },
  { code: 'K05.1', description: 'Gingivitis kronis' },
  { code: 'K05.2', description: 'Periodontitis akut' },
  { code: 'K05.3', description: 'Periodontitis kronis' },
  { code: 'K05.4', description: 'Periodontosis' },
  { code: 'K05.5', description: 'Penyakit periodontal lainnya' },
  { code: 'K05.6', description: 'Penyakit periodontal, tidak terperinci' },

  // ── K06: Gangguan Gingiva dan Tulang Alveolar ─────────────────────────────
  { code: 'K06.0', description: 'Resesi gingiva' },
  { code: 'K06.1', description: 'Pembesaran gingiva (hipertrofi gingiva)' },
  { code: 'K06.2', description: 'Lesi gingiva dan edentulous ridge yang berkaitan dengan trauma' },
  { code: 'K06.8', description: 'Gangguan gingiva dan ridge edentulus lainnya yang ditentukan' },
  { code: 'K06.9', description: 'Gangguan gingiva dan ridge edentulus, tidak terperinci' },

  // ── K08: Gangguan Gigi dan Struktur Pendukung Lainnya ────────────────────
  { code: 'K08.0', description: 'Eksfoliasi gigi akibat penyakit sistemik' },
  { code: 'K08.1', description: 'Kehilangan gigi akibat kecelakaan, ekstraksi, atau penyakit lokal' },
  { code: 'K08.2', description: 'Atrofi ridge edentulus' },
  { code: 'K08.3', description: 'Akar gigi terpertahankan (sisa akar)' },
  { code: 'K08.4', description: 'Gangguan perkembangan gigi — hipodontia, hiperdontia' },
  { code: 'K08.5', description: 'Gangguan ukuran dan bentuk gigi' },
  { code: 'K08.6', description: 'Gangguan erupsi gigi' },
  { code: 'K08.8', description: 'Gangguan gigi dan struktur pendukung lainnya yang ditentukan' },
  { code: 'K08.9', description: 'Gangguan gigi dan struktur pendukung, tidak terperinci' },

  // ── K09: Kista Rongga Mulut ───────────────────────────────────────────────
  { code: 'K09.0', description: 'Kista odontogenik perkembangan' },
  { code: 'K09.1', description: 'Kista fisura perkembangan (non-odontogenik)' },
  { code: 'K09.2', description: 'Kista rongga mulut lainnya' },
  { code: 'K09.8', description: 'Kista daerah oral lainnya yang ditentukan' },
  { code: 'K09.9', description: 'Kista daerah oral, tidak terperinci' },

  // ── K10: Penyakit Lain pada Rahang ───────────────────────────────────────
  { code: 'K10.0', description: 'Gangguan perkembangan rahang' },
  { code: 'K10.1', description: 'Granuloma sentral sel raksasa (reparatif)' },
  { code: 'K10.2', description: 'Kondisi inflamasi rahang — periostitis, osteomielitis' },
  { code: 'K10.3', description: 'Alveolitis rahang — dry socket' },
  { code: 'K10.8', description: 'Penyakit rahang lainnya yang ditentukan' },
  { code: 'K10.9', description: 'Penyakit rahang, tidak terperinci' },

  // ── K11: Penyakit Kelenjar Ludah ─────────────────────────────────────────
  { code: 'K11.0', description: 'Atrofi kelenjar ludah' },
  { code: 'K11.1', description: 'Hipertrofi kelenjar ludah' },
  { code: 'K11.2', description: 'Sialoadenitis (radang kelenjar ludah)' },
  { code: 'K11.3', description: 'Abses kelenjar ludah' },
  { code: 'K11.4', description: 'Fistula kelenjar ludah' },
  { code: 'K11.5', description: 'Sialolithiasis (batu kelenjar ludah)' },
  { code: 'K11.6', description: 'Mukokel kelenjar ludah' },
  { code: 'K11.7', description: 'Gangguan sekresi ludah — xerostomia, hipersalivasi' },
  { code: 'K11.8', description: 'Penyakit kelenjar ludah lainnya' },
  { code: 'K11.9', description: 'Penyakit kelenjar ludah, tidak terperinci' },

  // ── K12: Stomatitis dan Lesi Terkait ─────────────────────────────────────
  { code: 'K12.0', description: 'Stomatitis aftosa berulang (sariawan)' },
  { code: 'K12.1', description: 'Bentuk stomatitis lainnya' },
  { code: 'K12.2', description: 'Selulitis dan abses rongga mulut — angina Ludwig' },
  { code: 'K12.3', description: 'Mukositis mulut (ulceratif)' },

  // ── K13: Penyakit Bibir dan Mukosa Mulut Lainnya ─────────────────────────
  { code: 'K13.0', description: 'Penyakit bibir — cheilitis, angular cheilitis' },
  { code: 'K13.1', description: 'Menggigit pipi dan bibir' },
  { code: 'K13.2', description: 'Leukoplakia dan kondisi putih lainnya dari epitel mulut' },
  { code: 'K13.3', description: 'Leukoplakia berbulu (hairy leukoplakia)' },
  { code: 'K13.4', description: 'Granuloma dan lesi terkait granuloma pada mukosa mulut' },
  { code: 'K13.5', description: 'Fibrosis submukosa mulut' },
  { code: 'K13.6', description: 'Hiperplasia palatal iritable' },
  { code: 'K13.7', description: 'Lesi mukosa mulut lainnya dan tidak terperinci' },

  // ── K14: Penyakit Lidah ───────────────────────────────────────────────────
  { code: 'K14.0', description: 'Glossitis (radang lidah)' },
  { code: 'K14.1', description: 'Lidah geografis (glossitis migrans benigna)' },
  { code: 'K14.2', description: 'Glossitis median rhomboid' },
  { code: 'K14.3', description: 'Hipertrofi papila lidah' },
  { code: 'K14.4', description: 'Atrofi papila lidah' },
  { code: 'K14.5', description: 'Lidah berlipat (fissured/scrotal tongue)' },
  { code: 'K14.6', description: 'Glosalgia (rasa nyeri pada lidah)' },
  { code: 'K14.8', description: 'Penyakit lidah lainnya' },
  { code: 'K14.9', description: 'Penyakit lidah, tidak terperinci' },

  // ── S02: Fraktur Gigi dan Rahang ─────────────────────────────────────────
  { code: 'S02.5', description: 'Fraktur gigi' },
  { code: 'S02.60', description: 'Fraktur mandibula, tidak terperinci' },
  { code: 'S02.61', description: 'Fraktur kondilus mandibula' },
  { code: 'S02.62', description: 'Fraktur subkondilus mandibula' },
  { code: 'S02.63', description: 'Fraktur koronoid mandibula' },
  { code: 'S02.64', description: 'Fraktur ramus mandibula' },
  { code: 'S02.65', description: 'Fraktur sudut mandibula' },
  { code: 'S02.66', description: 'Fraktur simfisis mandibula' },
  { code: 'S02.67', description: 'Fraktur alveolus mandibula' },

  // ── Z01 / Z29: Prosedur Preventif dan Pemeriksaan Rutin ──────────────────
  { code: 'Z01.2', description: 'Pemeriksaan gigi — checkup rutin' },
  { code: 'Z29.2', description: 'Profilaksis gigi — scaling / pembersihan karang gigi' },
  { code: 'Z97.2', description: 'Kehadiran peralatan gigi (gigi palsu, implant)' },
];

/**
 * Search ICD-10 dental codes by query string.
 * Matches against code prefix OR description (case-insensitive).
 * Returns up to `limit` results.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {{ code: string, description: string }[]}
 */
export function searchICD10(query, limit = 10) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  return ICD10_DENTAL.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
  ).slice(0, limit);
}

/**
 * Find a single ICD-10 entry by its exact code.
 * Returns null if not found.
 *
 * @param {string} code
 * @returns {{ code: string, description: string } | null}
 */
export function findICD10ByCode(code) {
  if (!code) return null;
  return ICD10_DENTAL.find((item) => item.code === code) || null;
}
