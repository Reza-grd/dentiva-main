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

// Mode "desktop" (Tauri): tanpa service worker PWA — pembaruan lewat updater Tauri,
// dan dev server tidak membuka browser.
export default defineConfig(({ mode }) => ({
  // Saat build E2E (VITE_E2E_ISOLATED_ENV=1), arahkan envDir ke folder fixture tanpa .env
  // agar berkas .env/.env.local produksi di mesin pengembang tidak pernah ikut terbaca.
  envDir: process.env.VITE_E2E_ISOLATED_ENV ? './tests/e2e/fixtures' : undefined,
  plugins: [
    react(),
    mode !== 'desktop' && VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Halaman (HTML) TIDAK di-precache: setiap kunjungan mengambil versi terbaru dari server dulu
        // (NetworkFirst), sehingga deploy baru langsung tampil tanpa harus memuat ulang dua kali.
        // Bila offline, halaman terakhir dari cache tetap dipakai. Aset ber-hash tetap di-precache.
        globPatterns: ['**/*.{js,css,ico,png,svg}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'dentiva-halaman', networkTimeoutSeconds: 5, expiration: { maxEntries: 20 } },
          },
        ],
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
    open: mode !== 'desktop',
    strictPort: mode === 'desktop'
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
          'vendor-quill': ['react-quill-new'],
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
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', 'dist-e2e/**']
  }
}))
