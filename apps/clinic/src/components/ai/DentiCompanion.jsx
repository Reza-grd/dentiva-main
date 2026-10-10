import React from 'react';
import DentiMascot from '../mascot/DentiMascot';
import './denti-companion.css';

/**
 * Denti sebagai pendamping Asisten AI: maskot hidup + gelembung ucapan.
 * Klik Denti → onPoke (reaksi lucu). `state` dikendalikan halaman (useDentiDirector).
 */
export default function DentiCompanion({ state, line, onPoke, size = 104, compact = false }) {
  return (
    <div className={`denti-companion ${compact ? 'denti-companion--compact' : ''}`}>
      <button type="button" className="denti-companion__avatar" onClick={onPoke}
        aria-label="Colek Denti" title="Colek Denti">
        <DentiMascot state={state} size={size} title="Denti, asisten AI Dentiva" />
      </button>
      {line && (
        <p key={line} className="denti-companion__bubble" aria-live="polite">
          <span className="denti-companion__name">Denti</span>
          {line}
        </p>
      )}
    </div>
  );
}
