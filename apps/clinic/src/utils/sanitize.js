import DOMPurify from 'dompurify';

/**
 * Sanitizes input string to prevent XSS attacks.
 * Uses DOMPurify to strip dangerous HTML tags and attributes.
 * @param {string} input - The raw input string
 * @returns {string} - The sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags for standard text inputs
    ALLOWED_ATTR: []
  });
};

/**
 * Encoding output untuk teks yang disisipkan ke string HTML (mis. kuitansi via document.write):
 * semua karakter khusus HTML menjadi entitas, sehingga isian tampil sebagai teks apa adanya.
 * null/undefined → string kosong; angka/boolean diubah ke string.
 * @param {unknown} value
 * @returns {string}
 */
export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Sanitizes rich text input (allows safe HTML tags like b, i, p, etc).
 * @param {string} input - The raw rich text string
 * @returns {string} - The sanitized rich text
 */
export const sanitizeRichText = (input) => {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};
