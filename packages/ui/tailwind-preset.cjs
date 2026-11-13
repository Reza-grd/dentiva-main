/**
 * Tailwind preset shared by apps/clinic and apps/console.
 * Maps the semantic CSS variables (see ./tokens.css) to Tailwind utilities
 * so every @dentiva/ui component renders identically in both apps.
 *
 * @type {import('tailwindcss').Config}
 */
const tema = (v) => `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`;

module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      // Variabel tema berisi kode hex, sehingga pengubah opasitas Tailwind (mis. bg-accent-primary/10)
      // dulu tidak menghasilkan CSS sama sekali. <alpha-value> + color-mix membuatnya bekerja.
      colors: {
        background: tema('--color-bg'),
        card: tema('--color-card'),
        border: tema('--color-border'),
        'text-primary': tema('--color-text'),
        'text-muted': tema('--color-muted'),
        'accent-primary': tema('--color-accent'),
        'accent-secondary': tema('--color-accent-secondary'),
        'dark-base': tema('--color-dark-base'),
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
