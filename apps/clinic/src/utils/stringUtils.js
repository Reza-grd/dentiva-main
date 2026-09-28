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
