/**
 * Deteksi platform: web (browser/PWA) vs aplikasi desktop (Tauri).
 *
 * Di desktop, window.location.origin bernilai "http://tauri.localhost" /
 * "tauri://localhost" — bukan alamat publik — sehingga tautan yang dibagikan ke
 * pasien (booking, layar antrean) dan redirect email harus memakai PUBLIC_APP_URL.
 */
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const FALLBACK_PUBLIC_URL = 'https://dentiva-main.vercel.app';

export const PUBLIC_APP_URL = (
  import.meta.env.VITE_PUBLIC_APP_URL ||
  (isDesktop || typeof window === 'undefined' ? FALLBACK_PUBLIC_URL : window.location.origin)
).replace(/\/+$/, '');

/** Buka tautan di browser bawaan sistem (desktop) atau tab baru (web). */
export async function openExternal(url) {
  if (isDesktop) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    return openUrl(url);
  }
  window.open(url, '_blank', 'noopener');
}

/**
 * Desktop: tautan eksternal (<a href="https://…">, wa.me, mailto:, tel:) dibuka di
 * browser sistem, bukan di jendela aplikasi.
 */
export function installDesktopLinkHandler() {
  if (!isDesktop) return;
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
    if (!a) return;
    let url;
    try { url = new URL(a.href, window.location.href); } catch { return; }
    const external = ['mailto:', 'tel:'].includes(url.protocol)
      || (['http:', 'https:'].includes(url.protocol) && url.origin !== window.location.origin);
    if (external) {
      e.preventDefault();
      openExternal(url.href);
    }
  }, true);
}
