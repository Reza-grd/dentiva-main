// ─────────────────────────────────────────────────────────────────────
// DENTAL CODE SYSTEM v6.0 — Complete Symbol Definitions for Dentiva
// ─────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════
// SECTION 1: ALL DENTAL CODES
// ══════════════════════════════════════════════════════════════════════

export const DENTAL_CODES = [
  // ── Restorations / Fillings ──
  { code: 'amf',     nama: 'Amalgam filling',        warna: '#9CA3AF', tipe: 'surface', kategori: 'restorasi',  swatch: '■' },
  { code: 'cof',     nama: 'Composite filling',      warna: '#93C5FD', tipe: 'surface', kategori: 'restorasi',  swatch: '//' },
  { code: 'fis',     nama: 'Pit & fissure sealant',  warna: '#6EE7B7', tipe: 'surface', kategori: 'restorasi',  swatch: 'S' },
  { code: 'car',     nama: 'Caries / temp filling',  warna: '#FCA5A5', tipe: 'surface', kategori: 'restorasi',  swatch: '□' },

  // ── Endodontic / Tooth Vitality ──
  { code: 'nvt',     nama: 'Non-vital tooth',        warna: '#4B5563', tipe: 'surface', kategori: 'endodontik', swatch: '●' },
  { code: 'rct',     nama: 'Root canal treatment',   warna: '#A78BFA', tipe: 'surface', kategori: 'endodontik', swatch: '⊕' },
  { code: 'amf-rct', nama: 'Amalgam + RCT',          warna: '#9CA3AF', tipe: 'surface', kategori: 'endodontik', swatch: '■●' },
  { code: 'cof-rct', nama: 'Composite + RCT',        warna: '#93C5FD', tipe: 'surface', kategori: 'endodontik', swatch: '//●' },

  // ── Tooth Status / Eruption ──
  { code: 'sou',     nama: 'Sound (normal)',          warna: '#D1FAE5', tipe: 'whole', kategori: 'status',   text: '✓' },
  { code: 'non',     nama: 'Missing (unknown)',       warna: '#E5E7EB', tipe: 'whole', kategori: 'status',   text: '?' },
  { code: 'une',     nama: 'Un-erupted',              warna: '#C7D2FE', tipe: 'whole', kategori: 'status',   text: 'U' },
  { code: 'pre',     nama: 'Partially erupted',       warna: '#FDE68A', tipe: 'whole', kategori: 'status',   text: 'P' },
  { code: 'mis',     nama: 'Missing (extracted)',     warna: '#FECACA', tipe: 'whole', kategori: 'status',   text: '✕', isX: true },
  { code: 'rrx',     nama: 'Retained root',           warna: '#FED7AA', tipe: 'whole', kategori: 'status',   text: '⎾' },

  // ── Anomaly & Fracture ──
  { code: 'ano',     nama: 'Anomaly',                 warna: '#FCD34D', tipe: 'surface', kategori: 'anomali',  swatch: '△' },
  { code: 'cfr',     nama: 'Fracture',                warna: '#FDBA74', tipe: 'surface', kategori: 'anomali',  swatch: 'F' },

  // ── Crowns & Implants ──
  { code: 'fmc',     nama: 'Full metal crown',        warna: '#9CA3AF', tipe: 'whole', kategori: 'mahkota',  text: 'FMC' },
  { code: 'fmc-rct', nama: 'Metal crown + RCT',       warna: '#9CA3AF', tipe: 'whole', kategori: 'mahkota',  text: 'FMC', dot: true },
  { code: 'poc',     nama: 'Porcelain crown',         warna: '#F3F4F6', tipe: 'whole', kategori: 'mahkota',  text: 'POC', border: '#D1D5DB' },
  { code: 'ipx-poc', nama: 'Implant + porcelain',     warna: '#DBEAFE', tipe: 'whole', kategori: 'mahkota',  text: '⬡' },

  // ── Bridges & Dentures ──
  { code: 'meb',         nama: 'Metal bridge',        warna: '#D1D5DB', tipe: 'bridge', kategori: 'bridge',  text: 'MB' },
  { code: 'poc-bridge',  nama: 'Porcelain bridge',    warna: '#E5E7EB', tipe: 'bridge', kategori: 'bridge',  text: 'PB', border: '#D1D5DB' },
  { code: 'frm',         nama: 'Frame denture',       warna: '#C7D2FE', tipe: 'whole',  kategori: 'bridge',  text: 'FRM' },
  { code: 'acr',         nama: 'Acrylic denture',     warna: '#FECACA', tipe: 'whole',  kategori: 'bridge',  text: 'ACR' },

  // ── Migration / Rotation ──
  { code: 'arrow',  nama: 'Migration / rotation',     warna: '#93C5FD', tipe: 'whole', kategori: 'migrasi',  text: '→' },
];

// Pontic code (auto-applied during bridge creation)
export const CODE_PON = { code: 'PON', nama: 'Pontic', warna: '#E5E7EB', tipe: 'whole', kategori: 'bridge', text: 'PON' };

// ══════════════════════════════════════════════════════════════════════
// SECTION 2: CODE LOOKUP & FILTERING
// ══════════════════════════════════════════════════════════════════════

const CODE_MAP = new Map([...DENTAL_CODES, CODE_PON].map(c => [c.code, c]));

export const getCodeInfo = (code) => CODE_MAP.get(code) || null;

export const SURFACE_CODES = DENTAL_CODES.filter(c => c.tipe === 'surface');
export const WHOLE_CODES   = DENTAL_CODES.filter(c => c.tipe === 'whole');
export const BRIDGE_CODES  = DENTAL_CODES.filter(c => c.tipe === 'bridge');

// Grouped by category for popup sections
export const CODE_CATEGORIES = [
  { key: 'restorasi',  label: 'Restorasi / Tambalan',      icon: '', codes: DENTAL_CODES.filter(c => c.kategori === 'restorasi') },
  { key: 'endodontik', label: 'Endodontik',                 icon: '', codes: DENTAL_CODES.filter(c => c.kategori === 'endodontik') },
  { key: 'status',     label: 'Status Gigi',                icon: '', codes: DENTAL_CODES.filter(c => c.kategori === 'status') },
  { key: 'anomali',    label: 'Anomali & Fraktur',          icon: '',  codes: DENTAL_CODES.filter(c => c.kategori === 'anomali') },
  { key: 'mahkota',    label: 'Mahkota (Crown) & Implan',   icon: '', codes: DENTAL_CODES.filter(c => c.kategori === 'mahkota') },
  { key: 'bridge',     label: 'Bridge & Gigi Tiruan',       icon: '', codes: DENTAL_CODES.filter(c => c.kategori === 'bridge') },
  { key: 'migrasi',    label: 'Migrasi / Rotasi',           icon: '',  codes: DENTAL_CODES.filter(c => c.kategori === 'migrasi') },
];

// ══════════════════════════════════════════════════════════════════════
// SECTION 3: SURFACE RENDERING INSTRUCTIONS
// ══════════════════════════════════════════════════════════════════════

/**
 * Returns rendering instructions for how a code appears on a surface or whole tooth.
 */
export const getCodeRendering = (code) => {
  switch (code) {
    // Surface fills
    case 'amf':     return { fill: '#9CA3AF' };
    case 'cof':     return { fill: '#DBEAFE', pattern: 'diagonal' };
    case 'fis':     return { fill: '#6EE7B7' };
    case 'car':     return { fill: '#FEE2E2', strokeOverride: '#EF4444', strokeWidthOverride: 3 };
    case 'nvt':     return { fill: '#4B5563' };
    case 'rct':     return { fill: '#C4B5FD' };
    case 'amf-rct': return { fill: '#9CA3AF', dot: true };
    case 'cof-rct': return { fill: '#DBEAFE', pattern: 'diagonal', dot: true };
    case 'ano':     return { fill: '#FCD34D' };
    case 'cfr':     return { fill: '#FDBA74' };
    // Whole fills
    case 'sou':         return { wholeFill: '#D1FAE5', wholeText: '✓', textColor: '#059669' };
    case 'non':         return { wholeFill: '#F3F4F6', wholeText: '?', textColor: '#6B7280', textSize: 32 };
    case 'une':         return { wholeFill: '#E0E7FF', wholeText: 'U', textColor: '#4338CA', textSize: 28 };
    case 'pre':         return { wholeFill: '#FEF3C7', wholeText: 'P', textColor: '#92400E', textSize: 28 };
    case 'mis':         return { wholeFill: '#FEE2E2', isX: true };
    case 'rrx':         return { wholeFill: '#FFEDD5', wholeText: '⎾', textColor: '#9A3412', textSize: 36 };
    case 'fmc':         return { wholeFill: '#9CA3AF', wholeText: null };
    case 'fmc-rct':     return { wholeFill: '#9CA3AF', dot: true };
    case 'poc':         return { wholeFill: '#F9FAFB', wholeBorder: '#9CA3AF', wholeStrokeWidth: 4 };
    case 'ipx-poc':     return { wholeFill: '#DBEAFE', wholeText: '⬡', textColor: '#1D4ED8', textSize: 30 };
    case 'meb':         return { wholeFill: '#D1D5DB', wholeText: 'MB', textColor: '#374151', textSize: 20 };
    case 'poc-bridge':  return { wholeFill: '#F3F4F6', wholeBorder: '#9CA3AF', wholeStrokeWidth: 3, wholeText: 'PB', textColor: '#374151', textSize: 20 };
    case 'frm':         return { wholeFill: '#E0E7FF', wholeText: 'FRM', textColor: '#3730A3', textSize: 18 };
    case 'acr':         return { wholeFill: '#FECACA', wholeText: 'ACR', textColor: '#991B1B', textSize: 18 };
    case 'arrow':       return { wholeFill: '#DBEAFE', wholeText: '→', textColor: '#1D4ED8', textSize: 36 };
    case 'PON':         return { wholeFill: '#E5E7EB', wholeText: 'PON', textColor: '#6B7280', textSize: 18 };
    default:            return { fill: '#E5E7EB' };
  }
};

// ══════════════════════════════════════════════════════════════════════
// SECTION 4: TOOTH CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════

const INCISORS_CANINES = new Set([
  11,12,13,21,22,23,31,32,33,41,42,43,
  51,52,53,61,62,63,71,72,73,81,82,83,
]);
const PREMOLARS = new Set([14,15,24,25,34,35,44,45]);
const MOLARS = new Set([
  16,17,18,26,27,28,36,37,38,46,47,48,
  54,55,64,65,74,75,84,85,
]);

export const getToothType = (n) => {
  const num = Number(n);
  if (INCISORS_CANINES.has(num)) return 'incisor';
  if (PREMOLARS.has(num)) return 'premolar';
  if (MOLARS.has(num)) return 'molar';
  const u = num % 10;
  const q = Math.floor(num / 10);
  if (u >= 1 && u <= 3) return 'incisor';
  if (u >= 4 && u <= 5) return (q >= 5 && q <= 8) ? 'molar' : 'premolar';
  return 'molar';
};

export const getSurfacesForTooth = (n) => {
  switch (getToothType(n)) {
    case 'incisor':  return ['M','D','B','L'];
    case 'premolar': return ['M','D','B','L','O'];
    case 'molar':    return ['M','D','B','L','MO','DO'];
    default:         return ['M','D','B','L','O'];
  }
};

export const getQuadrant      = (n) => Math.floor(Number(n) / 10);
export const isUpperTooth     = (n) => { const q = getQuadrant(n); return q===1||q===2||q===5||q===6; };
export const isPrimaryTooth   = (n) => { const q = getQuadrant(n); return q >= 5 && q <= 8; };
export const isMesialOnRight  = (n) => { const q = getQuadrant(n); return q===1||q===4||q===5||q===8; };

const SURFACE_LABELS = { M:'Mesial', D:'Distal', B:'Bukal/Labial', L:'Lingual/Palatal', O:'Oklusal', MO:'Mesio-Oklusal', DO:'Disto-Oklusal' };
export const getSurfaceLabel  = (k) => SURFACE_LABELS[k] || k;

export const getToothTypeLabel = (n) => {
  switch (getToothType(n)) {
    case 'incisor':  return 'Insisif/Kaninus';
    case 'premolar': return 'Premolar';
    case 'molar':    return 'Molar';
    default:         return '';
  }
};

// ══════════════════════════════════════════════════════════════════════
// SECTION 5: BRIDGE HELPERS
// ══════════════════════════════════════════════════════════════════════

const UPPER_PERM    = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_PERM    = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
const UPPER_PRIMARY = [55,54,53,52,51,61,62,63,64,65];
const LOWER_PRIMARY = [85,84,83,82,81,71,72,73,74,75];

/**
 * Returns an ordered array of teeth between (and including) two teeth in the same arch.
 * Returns null if the two teeth are not in the same row.
 */
export const getTeethBetween = (t1, t2) => {
  for (const row of [UPPER_PERM, LOWER_PERM, UPPER_PRIMARY, LOWER_PRIMARY]) {
    const i1 = row.indexOf(Number(t1));
    const i2 = row.indexOf(Number(t2));
    if (i1 !== -1 && i2 !== -1) {
      const start = Math.min(i1, i2);
      const end   = Math.max(i1, i2);
      return row.slice(start, end + 1);
    }
  }
  return null;
};
