/**
 * Tailwind preset shared by apps/clinic and apps/console.
 * Maps the semantic CSS variables (see ./tokens.css) to Tailwind utilities
 * so every @dentiva/ui component renders identically in both apps.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        card: 'var(--color-card)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text)',
        'text-muted': 'var(--color-muted)',
        'accent-primary': 'var(--color-accent)',
        'accent-secondary': 'var(--color-accent-secondary)',
        'dark-base': 'var(--color-dark-base)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        full: 'var(--radius-full)',
      },
    },
  },
};
