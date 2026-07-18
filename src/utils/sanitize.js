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
