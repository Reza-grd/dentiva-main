import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { dentiSvg, DENTI_STATES } from './dentiSvg';
import './denti.css';

/**
 * Denti — maskot AI Dentiva.
 *   <DentiMascot state="idle|wave|call|think|talk|celebrate|sleep" kid={false} size={220} />
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
 * Sutradara sederhana: mainkan keadaan sementara lalu kembali ke keadaan dasar.
 *   const { state, play } = useDentiDirector('idle');
 *   play('call', 6000);   // memanggil pasien 6 detik, lalu kembali 'idle'
 */
export function useDentiDirector(base = 'idle') {
  const [state, setState] = useState(base);
  const timer = useRef(null);
  useEffect(() => { setState(base); }, [base]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const play = useCallback((next, ms = 5000) => {
    clearTimeout(timer.current);
    setState(next);
    if (ms > 0) timer.current = setTimeout(() => setState(base), ms);
  }, [base]);
  return { state, play };
}
