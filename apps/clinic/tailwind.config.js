import dentivaPreset from '@dentiva/ui/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [dentivaPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Fondasi desain v3 (Nov 2026): Onest untuk teks, Newsreader untuk judul halaman.
      fontFamily: {
        sans: ['Onest', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
      },
      // Akar dokumen 14px → text-xs bawaan hanya 10,5px. Teks terkecil kini 12px.
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
      },
      // Sudut menurut fungsi: lg = input & tombol, 2xl = kartu, 3xl = jendela/modal
      borderRadius: {
        '3xl': '16px',
      },
      colors: {
        gold: 'color-mix(in srgb, var(--color-gold) calc(<alpha-value> * 100%), transparent)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
      }
    },
  },
  plugins: [],
}
