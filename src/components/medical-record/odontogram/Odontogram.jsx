import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Tooth from './Tooth';
import {
  CODE_CATEGORIES,
  getToothType,
  getToothTypeLabel,
  getSurfacesForTooth,
  getSurfaceLabel,
  getCodeInfo,
  getTeethBetween,
} from './OdontogramData';
import { X, Eraser, Info } from 'lucide-react';
import { useToast } from '../../common/ToastNotification';

// Helper: calculate pop-up position — center on viewport, then nudge to avoid covering the clicked tooth
const calculatePopupPosition = (rect, x, y, popupWidth, popupHeight) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 12; // minimum distance from viewport edges
  let newMaxHeight = vh * 0.8;

  // 1. Start by centering the popup in the viewport
  let left = Math.round((vw - popupWidth) / 2);
  let top = Math.round((vh - popupHeight) / 2);

  // 2. If we have the clicked element's bounding rect, nudge so the popup doesn't cover it
  if (rect) {
    const popupRight = left + popupWidth;
    const popupBottom = top + popupHeight;

    // Check if the centered popup overlaps the clicked tooth rect
    const overlapsHorizontally = left < rect.right && popupRight > rect.left;
    const overlapsVertically = top < rect.bottom && popupBottom > rect.top;

    if (overlapsHorizontally && overlapsVertically) {
      // Calculate available space on each side of the tooth element
      const spaceLeft = rect.left - pad;
      const spaceRight = vw - rect.right - pad;
      const spaceAbove = rect.top - pad;
      const spaceBelow = vh - rect.bottom - pad;

      // Decide whether to nudge horizontally or vertically
      // Prefer vertical nudge (above/below) to keep popup centered horizontally
      if (spaceBelow >= popupHeight) {
        // Place below the tooth
        top = rect.bottom + 8;
      } else if (spaceAbove >= popupHeight) {
        // Place above the tooth
        top = rect.top - popupHeight - 8;
      } else if (spaceRight >= popupWidth) {
        // Place to the right of the tooth
        left = rect.right + 8;
      } else if (spaceLeft >= popupWidth) {
        // Place to the left of the tooth
        left = rect.left - popupWidth - 8;
      } else {
        // Not enough space anywhere fully — place below/above with scroll, pick bigger side
        if (spaceBelow >= spaceAbove) {
          top = rect.bottom + 8;
          newMaxHeight = spaceBelow;
        } else {
          top = rect.top - popupHeight - 8;
          newMaxHeight = spaceAbove;
        }
      }
    }
  }

  // 3. Clamp to viewport bounds
  if (left < pad) left = pad;
  if (left + popupWidth > vw - pad) left = vw - popupWidth - pad;
  if (top < pad) top = pad;
  if (top + popupHeight > vh - pad) top = Math.max(pad, vh - popupHeight - pad);

  return { left, top, maxHeight: newMaxHeight };
};

// ══════════════════════════════════════════════════════════════════════
// UNIFIED CODE POPUP — floating context menu for clicks
// ══════════════════════════════════════════════════════════════════════
const UnifiedCodePopup = ({
  toothNumber,
  surfaceKey, // Can be null if whole tooth clicked
  currentSurfaceCode,
  currentWholeCode,
  rect,
  x,
  y,
  onSelect,
  onClear,
  onClose,
}) => {
  const ref = useRef(null);
  const [pos, setPos] = useState(() => {
    const calc = calculatePopupPosition(rect, x, y, 320, 450);
    return { left: calc.left, top: calc.top };
  });

  const [maxHeight, setMaxHeight] = useState('60vh');

  useEffect(() => {
    if (!ref.current) return;
    const rectBounds = ref.current.getBoundingClientRect();
    const popupWidth = 320; // Fixed width of the popup
    const popupHeight = rectBounds.height > 0 ? rectBounds.height : 450; // Fallback height estimate

    const calc = calculatePopupPosition(rect, x, y, popupWidth, popupHeight);
    
    setPos({ left: calc.left, top: calc.top });
    setMaxHeight(`${calc.maxHeight}px`);
  }, [x, y, rect]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const timer = requestAnimationFrame(() => {
      document.addEventListener('mousedown', onClick, true);
      document.addEventListener('touchstart', onClick, true);
    });
    return () => {
      cancelAnimationFrame(timer);
      document.removeEventListener('mousedown', onClick, true);
      document.removeEventListener('touchstart', onClick, true);
    };
  }, [onClose]);

  // Removed scroll listener to fix popup closing when scrolling internally.
  // Mousedown listener is sufficient for closing when clicking outside.

  const toothTypeLabel = getToothTypeLabel(toothNumber);
  const surfaceLabel = surfaceKey ? getSurfaceLabel(surfaceKey) : 'Seluruh Gigi';

  const renderCodeButton = (sym) => {
    const isActive = (sym.tipe === 'surface' && currentSurfaceCode === sym.code) || 
                     (sym.tipe !== 'surface' && currentWholeCode === sym.code);
    return (
      <button
        key={sym.code}
        onClick={() => onSelect(sym.code)}
        className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-150 border ${
          isActive
            ? 'ring-2 ring-[var(--color-accent)] border-[var(--color-accent)]/80 bg-[var(--color-accent)]/10 shadow-sm scale-105'
            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm active:scale-95'
        }`}
        title={sym.nama}
      >
        {sym.swatch ? (
          <div className="w-4 h-4 rounded shadow-sm flex items-center justify-center font-bold text-[8px] flex-shrink-0" style={{ backgroundColor: sym.warna, color: '#000' }}>{sym.swatch}</div>
        ) : (
          <div className="w-4 h-4 rounded shadow-sm flex items-center justify-center font-bold text-[8px] bg-white dark:bg-gray-950 border flex-shrink-0" style={{ borderColor: sym.border || sym.warna, color: sym.warna }}>{sym.text}</div>
        )}
        <span>{sym.code}</span>
      </button>
    );
  };

  return createPortal(
    <div ref={ref} className="fixed z-[9999] animate-scale-in" style={{ left: pos.left, top: pos.top }}>
      <div className="bg-white/95 dark:bg-[#14171F]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden" style={{ width: 320, boxShadow: '0 20px 60px -12px rgba(0,0,0,0.3)' }}>
        <div className="px-4 py-3.5 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary,var(--color-accent))] flex items-center justify-between">
          <div className="text-white">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black">{toothNumber}</span>
              <span className="text-white/40 text-xs">•</span>
              <span className="text-sm font-semibold">{surfaceLabel}</span>
              {surfaceKey && <span className="text-white/60 text-[10px] font-medium">({surfaceKey})</span>}
            </div>
            <p className="text-[10px] text-white/70 mt-0.5">{toothTypeLabel}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-3.5 space-y-4 overflow-y-auto" style={{ maxHeight }}>
          {CODE_CATEGORIES.map(cat => (
            <div key={cat.key}>
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <span>{cat.icon}</span> {cat.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cat.codes.map(renderCodeButton)}
              </div>
            </div>
          ))}
        </div>

        {(currentSurfaceCode || currentWholeCode) && (
          <div className="px-3.5 pb-3.5 pt-2.5 border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30">
            <button
              onClick={onClear}
              aria-label={`Hapus kondisi gigi ${toothNumber}`}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-455 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-900/30 transition-colors active:scale-[0.98]"
            >
              <Eraser size={13} />
              Hapus Kondisi Gigi {toothNumber} {surfaceKey ? `(${surfaceKey})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ══════════════════════════════════════════════════════════════════════
// MAIN ODONTOGRAM COMPONENT
// ══════════════════════════════════════════════════════════════════════
const Odontogram = ({
  conditions: toothConditions = {},
  onChange: setToothConditions,
  onClear: clearTooth,
}) => {
  const toast = useToast();
  const [popup, setPopup] = useState(null); // { toothNumber, surfaceKey, rect, x, y }
  const [bridgeMode, setBridgeMode] = useState(null); // { startTooth: number, code: string }

  const closePopup = useCallback(() => setPopup(null), []);

  const handleToothClick = useCallback((toothNumber, event) => {
    if (bridgeMode) {
      handleBridgeCompletion(toothNumber);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const rectObj = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
    setPopup(prev => {
      if (prev?.toothNumber === toothNumber && !prev.surfaceKey) return null;
      return { toothNumber, surfaceKey: null, rect: rectObj, x: event.clientX, y: event.clientY };
    });
  }, [bridgeMode, popup]);

  const handleSurfaceClick = useCallback((toothNumber, surfaceKey, event) => {
    if (bridgeMode) {
      handleBridgeCompletion(toothNumber);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const rectObj = {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
    setPopup(prev => {
      if (prev?.toothNumber === toothNumber && prev?.surfaceKey === surfaceKey) return null;
      return { toothNumber, surfaceKey, rect: rectObj, x: event.clientX, y: event.clientY };
    });
  }, [bridgeMode, popup]);

  const handleBridgeCompletion = (endTooth) => {
    const startTooth = bridgeMode.startTooth;
    const bridgeCode = bridgeMode.code;
    const teeth = getTeethBetween(startTooth, endTooth);
    
    if (!teeth || teeth.length < 2) {
      toast.error('Gigi tidak berada dalam baris yang sama. Pilih gigi akhir yang benar.');
      return; // Keep bridge mode active so they can try again
    }

    setToothConditions(prev => {
      const next = { ...prev };
      teeth.forEach((t, idx) => {
        const isAbutment = (idx === 0 || idx === teeth.length - 1);
        const code = isAbutment ? bridgeCode : 'PON';
        next[t] = { whole: code, surfaces: {} }; // Clear surfaces for bridge
      });
      return next;
    });

    toast.success(`Bridge diterapkan dari gigi ${startTooth} ke ${endTooth}`);
    setBridgeMode(null);
  };

  const handlePopupSelect = useCallback((code) => {
    if (!popup) return;
    const { toothNumber, surfaceKey } = popup;
    const codeInfo = getCodeInfo(code);

    if (codeInfo.tipe === 'bridge') {
      setBridgeMode({ startTooth: toothNumber, code });
      toast.info(`Mode Bridge: Klik gigi target akhir untuk ${codeInfo.nama}`);
      setPopup(null);
      return;
    }

    if (codeInfo.tipe === 'surface') {
      const validSurfaces = getSurfacesForTooth(toothNumber);
      // If a whole tooth was clicked, we need a surface to apply a surface code.
      // Or we can just default to O or M, or error out.
      if (!surfaceKey) {
        toast.error('Pilih permukaan gigi spesifik untuk menerapkan kode ini.');
        return;
      }
      if (!validSurfaces.includes(surfaceKey)) {
        toast.error(`Permukaan tidak valid untuk gigi ${toothNumber}`);
        return;
      }
      setToothConditions(prev => {
        const current = prev[toothNumber] || { whole: null, surfaces: {} };
        return { ...prev, [toothNumber]: { whole: null, surfaces: { ...current.surfaces, [surfaceKey]: code } } };
      });
    } else if (codeInfo.tipe === 'whole') {
      setToothConditions(prev => ({
        ...prev,
        [toothNumber]: { ...(prev[toothNumber] || {}), whole: code, surfaces: {} }
      }));
    }
    setPopup(null);
  }, [popup, setToothConditions, toast]);

  const handlePopupClear = useCallback(() => {
    if (!popup) return;
    const { toothNumber, surfaceKey } = popup;
    if (surfaceKey) {
      setToothConditions(prev => {
        const current = prev[toothNumber];
        if (!current) return prev;
        const newSurfaces = { ...current.surfaces };
        delete newSurfaces[surfaceKey];
        return { ...prev, [toothNumber]: { ...current, surfaces: newSurfaces } };
      });
    } else {
      clearTooth(toothNumber);
    }
    setPopup(null);
  }, [popup, setToothConditions, clearTooth]);

  const renderRow = (teethArray, isPrimary = false) => (
    <div className="flex justify-center items-end">
      {teethArray.map((num, idx) => (
        <React.Fragment key={num}>
          {idx === Math.floor(teethArray.length / 2) && (
            <div className="w-[1.5px] h-12 bg-gray-200 dark:bg-gray-800 mx-2 self-center" />
          )}
          <Tooth
            number={num}
            conditions={toothConditions[num]}
            isSelected={popup?.toothNumber === num}
            isBridgeTarget={bridgeMode?.startTooth === num}
            onClick={(n, e) => handleToothClick(n, e || { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 })}
            onSurfaceClick={handleSurfaceClick}
          />
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#14171F] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-850 overflow-hidden relative">
      <div className="px-6 py-4.5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-blue-50/10 dark:from-gray-900/50 dark:to-gray-900/20 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Odontogram Digital</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Klik langsung pada permukaan gigi untuk memilih kode simbol
          </p>
        </div>
        {bridgeMode && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/30 text-xs font-bold animate-pulse">
            <Info size={14} />
            Mode Bridge: Pilih gigi akhir...
            <button onClick={() => setBridgeMode(null)} className="ml-2 text-gray-450 hover:text-red-500">✕</button>
          </div>
        )}
      </div>

      <div className="p-6 overflow-x-auto pb-8">
        <div className="min-w-[820px] max-w-4xl mx-auto flex flex-col gap-2">
          <div className="flex justify-between px-8 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <span>Kanan Atas (Q1)</span>
            <span>Kiri Atas (Q2)</span>
          </div>

          <div className="flex flex-col gap-3 mb-2">
            {renderRow([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
            {renderRow([55, 54, 53, 52, 51, 61, 62, 63, 64, 65], true)}
          </div>

          <div className="w-full border-t-2 border-dashed border-gray-200 dark:border-gray-805 my-4 relative">
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white dark:bg-[#14171F] px-4 text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-widest">
              Garis Oklusal
            </span>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {renderRow([85, 84, 83, 82, 81, 71, 72, 73, 74, 75], true)}
            {renderRow([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
          </div>

          <div className="flex justify-between px-8 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-2">
            <span>Kanan Bawah (Q4)</span>
            <span>Kiri Bawah (Q3)</span>
          </div>
        </div>
      </div>



      {popup && (
        <UnifiedCodePopup
          toothNumber={popup.toothNumber}
          surfaceKey={popup.surfaceKey}
          currentSurfaceCode={popup.surfaceKey ? toothConditions[popup.toothNumber]?.surfaces?.[popup.surfaceKey] : null}
          currentWholeCode={toothConditions[popup.toothNumber]?.whole}
          rect={popup.rect}
          x={popup.x}
          y={popup.y}
          onSelect={handlePopupSelect}
          onClear={handlePopupClear}
          onClose={closePopup}
        />
      )}
    </div>
  );
};

export default Odontogram;