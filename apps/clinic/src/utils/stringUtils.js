/**
 * Escapes/strips PostgREST-significant characters from a raw search term
 * before it's placed inside .ilike() / .or() strings.
 * Handles `,` `(` `)` `%` `*` and others that might break the filter syntax.
 * 
 * @param {string} term 
 * @returns {string} sanitized term
 */
export const sanitizeSearchTerm = (term) => {
  if (!term) return '';
  // Remove PostgREST significant characters that break .or() strings or .ilike() patterns
  return term.replace(/[,()%*"]/g, '').trim();
};

/** Nama panggilan untuk sapaan: kata pertama setelah gelar ("drg. Sinta Maharani, Sp.Ort" → "Sinta"). */
const GELAR_DEPAN = /^(drg|dr|prof|ir|h|hj|ns|apt|bd|ners|tn|ny|nn|sdr|sdri|bpk|ibu)\.?$/i;
export const namaPanggilan = (fullName) => {
  const kata = String(fullName || '').replace(/,.*$/, '').trim().split(/\s+/).filter(Boolean);
  const n = (kata.find((w) => !GELAR_DEPAN.test(w)) || '').replace(/[^\p{L}'-]/gu, '');
  return n ? n.charAt(0).toUpperCase() + n.slice(1) : '';
};
