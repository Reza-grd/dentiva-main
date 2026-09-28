import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Kunci enkripsi TIDAK BOLEH ikut ter-bundle ke JavaScript publik (semua VITE_* bersifat publik).
if (process.env.VITE_ENCRYPTION_KEY) {
  throw new Error(
    '[SECURITY] VITE_ENCRYPTION_KEY terdeteksi di environment build. Hapus dari Vercel/.env; ' +
    'migrasikan data lama dengan scripts/migrate_encryption.js (pakai LEGACY_ENCRYPTION_KEY).'
  )
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'Dentiva Enterprise',
        short_name: 'Dentiva',
        description: 'Dental Clinic Management System',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-excel': ['xlsx'],
          'vendor-charts': ['recharts'],
          'vendor-quill': ['react-quill'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['lucide-react', 'framer-motion'],
          'vendor-utils': ['date-fns', 'zod', 'dompurify']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']
  }
})
