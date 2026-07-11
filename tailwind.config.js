/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
        primary: {
          50: '#e8f0f9',
          100: '#c5d9ef',
          200: '#9ec0e4',
          300: '#77a7d9',
          400: '#5994d1',
          500: '#3b82c9',
          600: '#0F4C81',
          700: '#0d4070',
          800: '#0a3460',
          900: '#072850',
        },
        secondary: {
          50: '#e0f7fc',
          100: '#b3ecf8',
          200: '#80e0f3',
          300: '#4dd4ee',
          400: '#26caeb',
          500: '#00B4D8',
          600: '#0099bb',
          700: '#007d9e',
          800: '#006381',
          900: '#004d64',
        },
        accent: {
          50: '#fff2ed',
          100: '#ffddd1',
          200: '#ffc7b3',
          300: '#ffb194',
          400: '#ff9d76',
          500: '#FF6B35',
          600: '#e85a24',
          700: '#cc4b18',
          800: '#b03d0f',
          900: '#933008',
        },
        dental: {
          blue: '#0F4C81',
          cyan: '#00B4D8',
          orange: '#FF6B35',
          green: '#10b981',
          red: '#ef4444',
          yellow: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'glow': 'var(--shadow-glow)',
        'sidebar': '4px 0 24px rgba(15, 76, 129, 0.12)',
        'navbar': '0 2px 12px rgba(15, 76, 129, 0.08)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
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
