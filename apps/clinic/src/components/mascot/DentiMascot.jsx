import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { dentiSvg, DENTI_STATES } from './dentiSvg';
import './denti.css';

/** Durasi satu putaran rangkaian (ms) — dipakai sutradara sebagai bawaan. */
export const DENTI_DURATIONS = { call: 6000, wake: 6000, celebrate: 2400, spin: 2000, surprise: 2000, thanks: 3200 };

/**
 * Denti — maskot AI Dentiva.
 *   <DentiMascot state="idle|happy|wave|…|thanks" (lihat DENTI_STATES) kid={false} size={220} />
 * Markup SVG berasal dari konstanta internal (bukan input pengguna), jadi aman disisipkan.
 */
export default function DentiMascot({ state = 'idle', kid = false, size = 220, className = '', title = 'Denti, asisten AI Dentiva' }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const markup = useMemo(() => dentiSvg(`denti${uid}`), [uid]);
  const safeState = DENTI_STATES.includes(state) ? state : 'idle';
  return (
    <svg
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
 */
export function useDentiDirector(base = 'idle') {
  const [state, setState] = useState(base);
  const timers = useRef([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => { setState(base); }, [base]);
  useEffect(() => clear, []);

  const sequence = useCallback((steps) => {
    clear();
    let at = 0;
    steps.forEach(([s, ms]) => {
      const dur = ms ?? DENTI_DURATIONS[s] ?? 4000;
      if (at === 0) setState(s); // langkah pertama langsung aktif
      else timers.current.push(setTimeout(() => setState(s), at));
      at += dur;
    });
    timers.current.push(setTimeout(() => setState(base), at));
  }, [base]);

  const play = useCallback((next, ms) => sequence([[next, ms]]), [sequence]);
  return { state, play, sequence };
}
