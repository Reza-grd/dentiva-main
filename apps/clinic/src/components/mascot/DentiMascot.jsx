import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { dentiSvg, DENTI_STATES } from './dentiSvg';
import './denti.css';

/** Durasi satu putaran rangkaian (ms) — dipakai sutradara sebagai bawaan. */
export const DENTI_DURATIONS = {
  call: 6000, wake: 6000, celebrate: 2400, spin: 2000, surprise: 2000, thanks: 3200, nod: 1800, clap: 2000,
  wink: 1500, cheer: 2400, jump: 1600, bow: 2200, shrug: 1900, cool: 2600, sigh: 2300, idea: 2400, confused: 2400, peek: 2400,
  excited: 2200, salute: 2000,
};

const clamp = (v) => Math.max(-1, Math.min(1, v));
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Denti — maskot AI Dentiva.
 *   <DentiMascot state="idle|happy|wave|…|thanks" (lihat DENTI_STATES) kid={false} size={220} />
 * Markup SVG berasal dari konstanta internal (bukan input pengguna), jadi aman disisipkan.
 */
export default function DentiMascot({
  state = 'idle', kid = false, size = 220, className = '', title = 'Denti, asisten AI Dentiva', track = false, look = null,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const markup = useMemo(() => dentiSvg(`denti${uid}`), [uid]);
  const safeState = DENTI_STATES.includes(state) ? state : 'idle';
  const ref = useRef(null);
  // Kedip alami: tempo & jeda acak per Denti, kadang kedip dua kali
  const life = useMemo(() => ({
    style: { '--blink': `${(4.2 + Math.random() * 2.8).toFixed(2)}s`, '--blink-delay': `${(-Math.random() * 4).toFixed(2)}s` },
    blink: Math.random() < 0.3 ? '2' : '1',
  }), []);

  // Arah pandang: `look` ({x, y} −1…1) diutamakan; selain itu mengikuti kursor bila `track`
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return undefined;
    const set = (x, y) => { el.style.setProperty('--look-x', clamp(x).toFixed(3)); el.style.setProperty('--look-y', clamp(y).toFixed(3)); };
    if (look) { set(look.x, look.y); return undefined; }
    if (!track) { set(0, 0); return undefined; }
    let raf = 0;
    let last = null;
    const apply = () => {
      raf = 0;
      if (!last) return;
      const r = el.getBoundingClientRect();
      set((last.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), (last.clientY - (r.top + r.height * 0.35)) / (window.innerHeight / 2));
    };
    const onMove = (e) => { last = e; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [track, look?.x, look?.y]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <svg
      ref={ref}
      style={life.style}
      data-blink={life.blink}
      className={`denti ${className}`}
      viewBox="0 0 400 480"
      width={size}
      height={(size * 480) / 400}
      data-state={safeState}
      data-kid={kid ? 'true' : 'false'}
      role="img"
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/**
 * Sutradara: mainkan keadaan sementara atau rangkaian, lalu kembali ke keadaan dasar.
 *   const { state, play, sequence } = useDentiDirector('idle');
 *   play('call');                                   // 1 putaran (6 dtk) lalu 'idle'
 *   play('talk', 8000);                              // 8 dtk lalu 'idle'
 *   sequence([['wake'], ['wave', 3000]]);            // bangun → menyapa → 'idle'
 *   settle();                                        // potong rangkaian, kembali ke dasar
 * Bila keadaan dasar berubah saat rangkaian berjalan, rangkaian tidak terpotong; dasar baru dipakai sesudahnya.
 */
export function useDentiDirector(base = 'idle') {
  const [state, setState] = useState(base);
  const timers = useRef([]);
  const playing = useRef(false); // rangkaian sementara sedang diputar
  const baseRef = useRef(base);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  // Keadaan dasar berubah: langsung dipakai, kecuali sedang memutar rangkaian (dipakai setelah selesai).
  useEffect(() => {
    baseRef.current = base;
    if (!playing.current) setState(base);
  }, [base]);
  useEffect(() => clear, []);

  const sequence = useCallback((steps) => {
    clear();
    playing.current = true;
    let at = 0;
    steps.forEach(([s, ms]) => {
      const dur = ms ?? DENTI_DURATIONS[s] ?? 4000;
      if (at === 0) setState(s); // langkah pertama langsung aktif
      else timers.current.push(setTimeout(() => setState(s), at));
      at += dur;
    });
    timers.current.push(setTimeout(() => { playing.current = false; setState(baseRef.current); }, at));
  }, []);

  const play = useCallback((next, ms) => sequence([[next, ms]]), [sequence]);
  /** Hentikan rangkaian yang sedang berjalan dan kembali ke keadaan dasar sekarang juga. */
  const settle = useCallback(() => { clear(); playing.current = false; setState(baseRef.current); }, []);
  return { state, play, sequence, settle };
}
