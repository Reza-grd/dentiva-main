import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Cloudflare Turnstile (CAPTCHA) untuk login, daftar, dan lupa password.
// Site key bersifat publik; VITE_TURNSTILE_SITE_KEY=off mematikan widget (mis. untuk uji lokal).
const BAWAAN = '0x4AAAAAAGMx-16yVqRjfyI3';
const dariEnv = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
export const TURNSTILE_SITE_KEY = dariEnv === 'off' ? '' : dariEnv || BAWAAN;

const SKRIP = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let muatSkrip;
function pastikanSkrip() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!muatSkrip) {
    muatSkrip = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SKRIP;
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => { muatSkrip = null; reject(new Error('Skrip verifikasi keamanan gagal dimuat')); };
      document.head.appendChild(s);
    });
  }
  return muatSkrip;
}

/**
 * <Turnstile ref={r} /> lalu saat kirim formulir: `const token = await r.current.ambilToken()`
 * (menunggu verifikasi selesai, maks. 20 dtk) dan setelah permintaan selesai: `r.current.reset()`
 * (token hanya bisa dipakai sekali). Tanpa site key → ambilToken() mengembalikan undefined.
 */
const Turnstile = forwardRef(function Turnstile({ className = '' }, ref) {
  const wadah = useRef(null);
  const idWidget = useRef(null);
  const token = useRef('');
  const penunggu = useRef([]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    let batal = false;
    pastikanSkrip().then((ts) => {
      if (batal || !wadah.current || idWidget.current != null) return;
      idWidget.current = ts.render(wadah.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: 'id',
        appearance: 'interaction-only',
        callback: (t) => { token.current = t; penunggu.current.splice(0).forEach((f) => f(t)); },
        'expired-callback': () => { token.current = ''; },
        'error-callback': () => { token.current = ''; },
      });
    }).catch(() => {});
    return () => {
      batal = true;
      if (idWidget.current != null && window.turnstile) window.turnstile.remove(idWidget.current);
      idWidget.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    ambilToken() {
      if (!TURNSTILE_SITE_KEY) return Promise.resolve(undefined);
      if (token.current) return Promise.resolve(token.current);
      return new Promise((resolve, reject) => {
        const waktu = setTimeout(() => reject(new Error('Verifikasi keamanan belum selesai. Tunggu sebentar lalu coba lagi.')), 20000);
        penunggu.current.push((t) => { clearTimeout(waktu); resolve(t); });
      });
    },
    reset() {
      token.current = '';
      if (idWidget.current != null && window.turnstile) window.turnstile.reset(idWidget.current);
    },
  }), []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={wadah} className={`flex justify-center empty:hidden ${className}`} />;
});

export default Turnstile;
