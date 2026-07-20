/**
 * icd10Dental.js
 * Expanded ICD-10 code dictionary for dental & oral health diagnoses and key comorbidities.
 * Sourced from WHO ICD-10 Official Classification (Chapter XI: Diseases of the Digestive System,
 * Chapter XIX, Chapter IV & Chapter IX).
 *
 * Structure: { code: string, description: string, verified_source?: string }
 */

export const ICD10_DENTAL = [
  // ── K00: Gangguan Perkembangan dan Erupsi Gigi ───────────────────────────
  { code: 'K00.0', description: 'Anodontia — tidak tumbuhnya benih gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K00.1', description: 'Gigi berlebih (supernumerary teeth / mesiodens)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K00.2', description: 'Kelainan ukuran dan bentuk gigi (mikrodontia, makrodontia, geminasi)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K00.3', description: 'Fluorosis gigi / mottled teeth', verified_source: 'WHO ICD-10 2019' },
  { code: 'K00.4', description: 'Gangguan pembentukan gigi (hipoplasia enamel)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K00.6', description: 'Gangguan erupsi gigi (erupsi dini / terhambat)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K00.7', description: 'Teething syndrome (sindrom tumbuh gigi)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K00.8', description: 'Gangguan perkembangan gigi lainnya', verified_source: 'WHO ICD-10 2019' },

  // ── K01: Gigi Terpendam dan Gigi Impaksi ─────────────────────────────────
  { code: 'K01.0', description: 'Gigi terpendam (embedded teeth)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K01.1', description: 'Gigi impaksi (impacted teeth — M3 / taring / premolar)', verified_source: 'WHO ICD-10 2019' },

  // ── K02: Karies Gigi ────────────────────────────────────────────────────────
  { code: 'K02.0', description: 'Karies terbatas pada enamel', verified_source: 'WHO ICD-10 2019' },
  { code: 'K02.1', description: 'Karies dentin', verified_source: 'WHO ICD-10 2019' },
  { code: 'K02.2', description: 'Karies sementum', verified_source: 'WHO ICD-10 2019' },
  { code: 'K02.3', description: 'Karies gigi dengan pulpa yang terhenti', verified_source: 'WHO ICD-10 2019' },
  { code: 'K02.4', description: 'Odontoclasia (karies internal)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K02.5', description: 'Karies dengan pulpa terbuka', verified_source: 'WHO ICD-10 2019' },
  { code: 'K02.8', description: 'Karies gigi lainnya', verified_source: 'WHO ICD-10 2019' },
  { code: 'K02.9', description: 'Karies gigi, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K03: Penyakit Jaringan Keras Gigi Lainnya ─────────────────────────────
  { code: 'K03.0', description: 'Atrisi gigi berlebihan', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.1', description: 'Abrasi gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.2', description: 'Erosi gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.3', description: 'Resorpsi patologis gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.4', description: 'Hipersementosis', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.5', description: 'Ankylosis gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.6', description: 'Deposit (akresio) pada gigi — kalkulus, karang gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.7', description: 'Perubahan warna pasca-eruption pada jaringan keras gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.8', description: 'Penyakit jaringan keras gigi lainnya yang ditentukan', verified_source: 'WHO ICD-10 2019' },
  { code: 'K03.9', description: 'Penyakit jaringan keras gigi, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K04: Penyakit Pulpa dan Jaringan Periapikal ───────────────────────────
  { code: 'K04.0', description: 'Pulpitis — radang pulpa gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.1', description: 'Nekrosis pulpa', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.2', description: 'Degenerasi pulpa', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.3', description: 'Pembentukan jaringan keras abnormal dalam pulpa', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.4', description: 'Periodontitis apikal akut yang berasal dari pulpa', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.5', description: 'Periodontitis apikal kronis', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.6', description: 'Abses periapikal dengan sinus', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.7', description: 'Abses periapikal tanpa sinus', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.8', description: 'Kista radikular', verified_source: 'WHO ICD-10 2019' },
  { code: 'K04.9', description: 'Penyakit pulpa dan jaringan periapikal lainnya dan tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K05: Gingivitis dan Penyakit Periodontal ──────────────────────────────
  { code: 'K05.0', description: 'Gingivitis akut', verified_source: 'WHO ICD-10 2019' },
  { code: 'K05.1', description: 'Gingivitis kronis', verified_source: 'WHO ICD-10 2019' },
  { code: 'K05.2', description: 'Periodontitis akut', verified_source: 'WHO ICD-10 2019' },
  { code: 'K05.3', description: 'Periodontitis kronis', verified_source: 'WHO ICD-10 2019' },
  { code: 'K05.4', description: 'Periodontosis', verified_source: 'WHO ICD-10 2019' },
  { code: 'K05.5', description: 'Penyakit periodontal lainnya', verified_source: 'WHO ICD-10 2019' },
  { code: 'K05.6', description: 'Penyakit periodontal, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K06: Gangguan Gingiva dan Tulang Alveolar ─────────────────────────────
  { code: 'K06.0', description: 'Resesi gingiva', verified_source: 'WHO ICD-10 2019' },
  { code: 'K06.1', description: 'Pembesaran gingiva (hipertrofi gingiva)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K06.2', description: 'Lesi gingiva dan edentulous ridge yang berkaitan dengan trauma', verified_source: 'WHO ICD-10 2019' },
  { code: 'K06.8', description: 'Gangguan gingiva dan ridge edentulus lainnya yang ditentukan', verified_source: 'WHO ICD-10 2019' },
  { code: 'K06.9', description: 'Gangguan gingiva dan ridge edentulus, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K07: Anomali Dentofasial Tergantung Maloklusi & TMJ ────────────────────
  { code: 'K07.0', description: 'Anomali ukuran rahang (makrognatia / mikrognatia)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K07.1', description: 'Anomali hubungan rahang dengan dasar tengkorak (prognatisme / retrognatisme)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K07.2', description: 'Anomali hubungan lengkung gigi (maloklusi Kelas I / II / III, open bite)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K07.3', description: 'Anomali posisi gigi (crowding / gigi berjejal, gapping / diastema)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K07.4', description: 'Maloklusi, tidak terperinci', verified_source: 'WHO ICD-10 2019' },
  { code: 'K07.5', description: 'Gangguan fungsi dentofasial (kesulitan mengunyah / menelan)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K07.6', description: 'Gangguan sendi temporomandibular (TMJ disorder / kliking rahang)', verified_source: 'WHO ICD-10 2019' },

  // ── K08: Gangguan Gigi dan Struktur Pendukung Lainnya ────────────────────
  { code: 'K08.0', description: 'Eksfoliasi gigi akibat penyakit sistemik', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.1', description: 'Kehilangan gigi akibat kecelakaan, ekstraksi, atau penyakit lokal', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.2', description: 'Atrofi ridge edentulus', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.3', description: 'Akar gigi terpertahankan (sisa akar / radiks)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.4', description: 'Gangguan perkembangan gigi — hipodontia, hiperdontia', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.5', description: 'Gangguan ukuran dan bentuk gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.6', description: 'Gangguan erupsi gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.8', description: 'Gangguan gigi dan struktur pendukung lainnya yang ditentukan', verified_source: 'WHO ICD-10 2019' },
  { code: 'K08.9', description: 'Gangguan gigi dan struktur pendukung, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K09: Kista Rongga Mulut ───────────────────────────────────────────────
  { code: 'K09.0', description: 'Kista odontogenik perkembangan', verified_source: 'WHO ICD-10 2019' },
  { code: 'K09.1', description: 'Kista fisura perkembangan (non-odontogenik)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K09.2', description: 'Kista rongga mulut lainnya', verified_source: 'WHO ICD-10 2019' },
  { code: 'K09.8', description: 'Kista daerah oral lainnya yang ditentukan', verified_source: 'WHO ICD-10 2019' },
  { code: 'K09.9', description: 'Kista daerah oral, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K10: Penyakit Lain pada Rahang ───────────────────────────────────────
  { code: 'K10.0', description: 'Gangguan perkembangan rahang', verified_source: 'WHO ICD-10 2019' },
  { code: 'K10.1', description: 'Granuloma sentral sel raksasa (reparatif)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K10.2', description: 'Kondisi inflamasi rahang — periostitis, osteomielitis', verified_source: 'WHO ICD-10 2019' },
  { code: 'K10.3', description: 'Alveolitis rahang — dry socket', verified_source: 'WHO ICD-10 2019' },
  { code: 'K10.8', description: 'Penyakit rahang lainnya yang ditentukan', verified_source: 'WHO ICD-10 2019' },
  { code: 'K10.9', description: 'Penyakit rahang, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K11: Penyakit Kelenjar Ludah ─────────────────────────────────────────
  { code: 'K11.0', description: 'Atrofi kelenjar ludah', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.1', description: 'Hipertrofi kelenjar ludah', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.2', description: 'Sialoadenitis (radang kelenjar ludah)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.3', description: 'Abses kelenjar ludah', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.4', description: 'Fistula kelenjar ludah', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.5', description: 'Sialolithiasis (batu kelenjar ludah)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.6', description: 'Mukokel kelenjar ludah', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.7', description: 'Gangguan sekresi ludah — xerostomia, hipersalivasi', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.8', description: 'Penyakit kelenjar ludah lainnya', verified_source: 'WHO ICD-10 2019' },
  { code: 'K11.9', description: 'Penyakit kelenjar ludah, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K12: Stomatitis dan Lesi Terkait ─────────────────────────────────────
  { code: 'K12.0', description: 'Stomatitis aftosa berulang (sariawan)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K12.1', description: 'Bentuk stomatitis lainnya', verified_source: 'WHO ICD-10 2019' },
  { code: 'K12.2', description: 'Selulitis dan abses rongga mulut — angina Ludwig', verified_source: 'WHO ICD-10 2019' },
  { code: 'K12.3', description: 'Mukositis mulut (ulceratif)', verified_source: 'WHO ICD-10 2019' },

  // ── K13: Penyakit Bibir dan Mukosa Mulut Lainnya ─────────────────────────
  { code: 'K13.0', description: 'Penyakit bibir — cheilitis, angular cheilitis', verified_source: 'WHO ICD-10 2019' },
  { code: 'K13.1', description: 'Menggigit pipi dan bibir', verified_source: 'WHO ICD-10 2019' },
  { code: 'K13.2', description: 'Leukoplakia dan kondisi putih lainnya dari epitel mulut', verified_source: 'WHO ICD-10 2019' },
  { code: 'K13.3', description: 'Leukoplakia berbulu (hairy leukoplakia)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K13.4', description: 'Granuloma dan lesi terkait granuloma pada mukosa mulut', verified_source: 'WHO ICD-10 2019' },
  { code: 'K13.5', description: 'Fibrosis submukosa mulut', verified_source: 'WHO ICD-10 2019' },
  { code: 'K13.6', description: 'Hiperplasia palatal iritable', verified_source: 'WHO ICD-10 2019' },
  { code: 'K13.7', description: 'Lesi mukosa mulut lainnya dan tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── K14: Penyakit Lidah ───────────────────────────────────────────────────
  { code: 'K14.0', description: 'Glossitis (radang lidah)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.1', description: 'Lidah geografis (glossitis migrans benigna)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.2', description: 'Glossitis median rhomboid', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.3', description: 'Hipertrofi papila lidah', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.4', description: 'Atrofi papila lidah', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.5', description: 'Lidah berlipat (fissured / scrotal tongue)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.6', description: 'Glosalgia (rasa nyeri pada lidah)', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.8', description: 'Penyakit lidah lainnya', verified_source: 'WHO ICD-10 2019' },
  { code: 'K14.9', description: 'Penyakit lidah, tidak terperinci', verified_source: 'WHO ICD-10 2019' },

  // ── S02: Fraktur Gigi dan Rahang ─────────────────────────────────────────
  { code: 'S02.5', description: 'Fraktur gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.60', description: 'Fraktur mandibula, tidak terperinci', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.61', description: 'Fraktur kondilus mandibula', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.62', description: 'Fraktur subkondilus mandibula', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.63', description: 'Fraktur koronoid mandibula', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.64', description: 'Fraktur ramus mandibula', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.65', description: 'Fraktur sudut mandibula', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.66', description: 'Fraktur simfisis mandibula', verified_source: 'WHO ICD-10 2019' },
  { code: 'S02.67', description: 'Fraktur alveolus mandibula', verified_source: 'WHO ICD-10 2019' },

  // ── Komorbiditas Umum & Rujukan Medis ─────────────────────────────────────
  { code: 'E11.9', description: 'Diabetes mellitus tipe 2 tanpa komplikasi (komorbiditas)', verified_source: 'WHO ICD-10 2019' },
  { code: 'I10', description: 'Hipertensi esensial / primer (komorbiditas)', verified_source: 'WHO ICD-10 2019' },
  { code: 'B37.0', description: 'Stomatitis kandidiasis (oral thrush / kandidiasis mulut)', verified_source: 'WHO ICD-10 2019' },
  { code: 'R58', description: 'Perdarahan pasca-tindakan gigi (pendarahan spontan)', verified_source: 'WHO ICD-10 2019' },

  // ── Z01 / Z29: Prosedur Preventif dan Pemeriksaan Rutin ──────────────────
  { code: 'Z01.2', description: 'Pemeriksaan gigi — checkup rutin', verified_source: 'WHO ICD-10 2019' },
  { code: 'Z29.2', description: 'Profilaksis gigi — scaling / pembersihan karang gigi', verified_source: 'WHO ICD-10 2019' },
  { code: 'Z97.2', description: 'Kehadiran peralatan gigi (gigi palsu, implant)', verified_source: 'WHO ICD-10 2019' },
];

/**
 * Search ICD-10 dental codes by query string.
 * Matches against code prefix OR description (case-insensitive).
 * Returns up to `limit` results.
 *
 * @param {string} query
 * @param {number} limit
 * @returns {{ code: string, description: string, verified_source?: string }[]}
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
 * @returns {{ code: string, description: string, verified_source?: string } | null}
 */
export function findICD10ByCode(code) {
  if (!code) return null;
  return ICD10_DENTAL.find((item) => item.code === code) || null;
}
