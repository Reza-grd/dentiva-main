import dentivaPreset from '@dentiva/ui/tailwind-preset';

/** Skala warna dari --color-accent: <500 dicampur putih, 500–600 = aksen, >600 dicampur hitam. */
function primer() {
  const campur = (lawan, persen) =>
    `color-mix(in srgb, color-mix(in srgb, var(--color-accent) ${persen}%, ${lawan}) calc(<alpha-value> * 100%), transparent)`;
  return {
    50: campur('white', 7), 100: campur('white', 14), 200: campur('white', 28), 300: campur('white', 45),
    400: campur('white', 70), 500: campur('white', 100), 600: campur('white', 100),
    700: campur('black', 85), 800: campur('black', 70), 900: campur('black', 55),
  };
}

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
        // Skala "primary-50…900" dipakai halaman lama (Jadwal Dokter, Biaya & Modal, dll.) tetapi dulu
        // tidak pernah didefinisikan → tombol putih di atas putih. Kini diturunkan dari warna aksen klinik.
        primary: primer(),
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
