import React, { useEffect, useMemo, useRef, useState } from 'react';
import DentiMascot from '../mascot/DentiMascot';
import './denti-companion.css';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Teks muncul huruf demi huruf (selesai ≤ 0,65 dtk berapa pun panjangnya). */
function useTypewriter(text) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (!text || reducedMotion()) { setShown(text); return undefined; }
    const per = Math.min(18, 650 / text.length);
    const start = Date.now();
    setShown('');
    const t = setInterval(() => {
      const n = Math.min(text.length, Math.ceil((Date.now() - start) / per));
      setShown(text.slice(0, n));
      if (n >= text.length) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [text]);
  return shown;
}

const CONFETTI_COLORS = ['#ecca97', '#7dd3ff', '#ff8fb8', '#a9e4ff', 'var(--color-accent)', '#fff1d6'];

/** Ledakan konfeti singkat di sekitar Eira setiap kali `burst` berubah. */
function Confetti({ burst }) {
  const pieces = useMemo(() => (burst ? Array.from({ length: 22 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
    const dist = 60 + Math.random() * 70;
    return {
      id: `${burst}-${i}`,
      style: {
        '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist - 30}px`, '--rot': `${Math.random() * 720 - 360}deg`,
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length], animationDelay: `${Math.random() * 0.12}s`,
        width: i % 3 ? 7 : 5, height: i % 3 ? 4 : 9,
      },
    };
  }) : []), [burst]);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!burst || reducedMotion()) return undefined;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, [burst]);
  if (!visible) return null;
  return <span className="denti-confetti" aria-hidden="true">{pieces.map((p) => <i key={p.id} style={p.style} />)}</span>;
}

/**
 * Eira sebagai pendamping Asisten AI: maskot hidup + gelembung ucapan yang "mengetik".
 *   track  → mata & badan mengikuti kursor;  look → arah pandang tetap ({x, y} −1…1)
 *   burst  → angka yang berubah memicu konfeti;  onPoke → diklik;  onHover → kursor masuk
 */
export default function DentiCompanion({ state, line, onPoke, onHover, size = 104, compact = false, track = false, look = null, burst = 0 }) {
  const typed = useTypewriter(line || '');
  const hoverAt = useRef(0);
  return (
    <div className={`denti-companion ${compact ? 'denti-companion--compact' : ''}`}>
      <button type="button" className="denti-companion__avatar" onClick={onPoke}
        onPointerEnter={() => { if (onHover && Date.now() - hoverAt.current > 45000) { hoverAt.current = Date.now(); onHover(); } }}
        aria-label="Colek Eira" title="Colek Eira">
        <DentiMascot state={state} size={size} track={track} look={look} title="Eira, asisten AI Dentiva" />
        <Confetti burst={burst} />
      </button>
      {line && (
        <>
          <span className="sr-only" aria-live="polite">Eira: {line}</span>
          <p className="denti-companion__bubble" aria-hidden="true">
            <span className="denti-companion__name">Eira</span>
            {typed}
            {typed.length < line.length && <span className="denti-companion__caret" />}
          </p>
        </>
      )}
    </div>
  );
}
