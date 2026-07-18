import React from 'react';
import {
  getToothType,
  getCodeInfo,
  getCodeRendering,
  getSurfaceLabel,
  isMesialOnRight,
  isUpperTooth,
  isPrimaryTooth,
} from './OdontogramData';

// ══════════════════════════════════════════════════════════════════════
// SVG GEOMETRY — surface polygons per tooth type
// ══════════════════════════════════════════════════════════════════════

const getIncisorSurfaces = (mr, upper) => {
  const L = mr ? 'D' : 'M', R = mr ? 'M' : 'D';
  const T = upper ? 'B' : 'L', B = upper ? 'L' : 'B';
  return [
    { key: T, type: 'polygon', points: '0,0 100,0 50,50' },
    { key: R, type: 'polygon', points: '100,0 100,100 50,50' },
    { key: B, type: 'polygon', points: '100,100 0,100 50,50' },
    { key: L, type: 'polygon', points: '0,100 0,0 50,50' },
  ];
};

const getPremolarSurfaces = (mr, upper) => {
  const L = mr ? 'D' : 'M', R = mr ? 'M' : 'D';
  const T = upper ? 'B' : 'L', B = upper ? 'L' : 'B';
  return [
    { key: T, type: 'polygon', points: '0,0 100,0 72,28 28,28' },
    { key: R, type: 'polygon', points: '100,0 100,100 72,72 72,28' },
    { key: B, type: 'polygon', points: '100,100 0,100 28,72 72,72' },
    { key: L, type: 'polygon', points: '0,100 0,0 28,28 28,72' },
    { key: 'O', type: 'rect', x: 28, y: 28, width: 44, height: 44 },
  ];
};

const getMolarSurfaces = (mr, upper) => {
  const L = mr ? 'D' : 'M', R = mr ? 'M' : 'D';
  const T = upper ? 'B' : 'L', B = upper ? 'L' : 'B';
  // Oklusal is split into MO and DO. 
  // If Mesial is on the Right (mr), then MO is Right, DO is Left.
  const LO = mr ? 'DO' : 'MO', RO = mr ? 'MO' : 'DO';
  return [
    { key: T,  type: 'polygon', points: '0,0 100,0 72,28 28,28' },
    { key: R,  type: 'polygon', points: '100,0 100,100 72,72 72,28' },
    { key: B,  type: 'polygon', points: '100,100 0,100 28,72 72,72' },
    { key: L,  type: 'polygon', points: '0,100 0,0 28,28 28,72' },
    { key: LO, type: 'rect', x: 28, y: 28, width: 22, height: 44 },
    { key: RO, type: 'rect', x: 50, y: 28, width: 22, height: 44 },
  ];
};

// ── Compute centroid of a surface for dot/label placement ──
const getCentroid = (surf) => {
  if (surf.type === 'rect') {
    return { x: surf.x + surf.width / 2, y: surf.y + surf.height / 2 };
  }
  const pts = surf.points.split(' ').map(p => { const [x, y] = p.split(',').map(Number); return { x, y }; });
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
};

// ══════════════════════════════════════════════════════════════════════
// TOOTH COMPONENT
// ══════════════════════════════════════════════════════════════════════

const Tooth = ({ number, conditions = {}, isSelected, isBridgeTarget, onClick, onSurfaceClick }) => {
  const whole = conditions?.whole;
  const surfs = conditions?.surfaces || {};
  const toothType = getToothType(number);
  const mesialR = isMesialOnRight(number);
  const upper = isUpperTooth(number);
  const primary = isPrimaryTooth(number);

  // Get whole-tooth rendering
  const wholeRender = whole ? getCodeRendering(whole) : null;
  const isXMissing = wholeRender?.isX;

  // Choose surface defs
  let surfaceDefs;
  switch (toothType) {
    case 'incisor':  surfaceDefs = getIncisorSurfaces(mesialR, upper); break;
    case 'premolar': surfaceDefs = getPremolarSurfaces(mesialR, upper); break;
    case 'molar':    surfaceDefs = getMolarSurfaces(mesialR, upper); break;
    default:         surfaceDefs = getPremolarSurfaces(mesialR, upper); break;
  }

  // Colors
  const strokeColor = isSelected ? '#2563EB' : isBridgeTarget ? '#F59E0B' : '#6B7280';
  const strokeW = isSelected ? 2.5 : 1.5;
  const size = primary ? 34 : 42;
  const patternId = `diag-${number}`;

  // Render a single surface element
  const renderSurface = (surf) => {
    const code = surfs[surf.key];
    const render = code ? getCodeRendering(code) : null;
    const fill = render?.fill || (wholeRender?.wholeFill ? wholeRender.wholeFill : '#FFFFFF');
    const surfStroke = render?.strokeOverride || (wholeRender?.wholeBorder || strokeColor);
    const surfStrokeW = render?.strokeWidthOverride || (wholeRender?.wholeStrokeWidth || strokeW);
    const hasPattern = render?.pattern === 'diagonal';
    const hasDot = render?.dot;
    const centroid = getCentroid(surf);
    const label = getSurfaceLabel(surf.key);

    const sharedProps = {
      fill,
      stroke: surfStroke,
      strokeWidth: surfStrokeW,
      strokeLinejoin: 'round',
      className: 'cursor-pointer transition-all duration-100 hover:brightness-[0.85]',
      onClick: (e) => { e.stopPropagation(); onSurfaceClick(number, surf.key, e); },
    };

    return (
      <g key={surf.key}>
        {/* Base shape */}
        {surf.type === 'polygon' ? (
          <polygon points={surf.points} {...sharedProps}>
            <title>{label} ({surf.key})</title>
          </polygon>
        ) : (
          <rect x={surf.x} y={surf.y} width={surf.width} height={surf.height} {...sharedProps}>
            <title>{label} ({surf.key})</title>
          </rect>
        )}

        {/* Diagonal pattern overlay (composite) */}
        {hasPattern && (
          surf.type === 'polygon' ? (
            <polygon points={surf.points} fill={`url(#${patternId})`} stroke="none" className="pointer-events-none" />
          ) : (
            <rect x={surf.x} y={surf.y} width={surf.width} height={surf.height} fill={`url(#${patternId})`} stroke="none" className="pointer-events-none" />
          )
        )}

        {/* Center dot (RCT combos) */}
        {hasDot && (
          <circle cx={centroid.x} cy={centroid.y} r={3.5} fill="#111827" className="pointer-events-none" />
        )}

        {/* Code label on surface */}
        {code && (
          <text
            x={centroid.x} y={centroid.y + 1}
            textAnchor="middle" dominantBaseline="middle"
            fontSize="10" fontWeight="700" fill="#1F2937"
            className="pointer-events-none select-none"
            style={{ textShadow: '0 0 3px rgba(255,255,255,0.9)' }}
          >
            {code.length <= 3 ? code : ''}
          </text>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center mx-[2px] group flex-shrink-0" style={{ width: size + 4 }}>
      {/* Number — above for upper jaw */}
      {upper && (
        <span className={`font-bold text-gray-700 mb-0.5 leading-none select-none ${primary ? 'text-[9px] text-indigo-600' : 'text-[10px]'}`}>
          {number}
        </span>
      )}

      {/* SVG tooth */}
      <div
        className={`relative transition-transform duration-100 group-hover:scale-110 ${
          isSelected ? 'ring-2 ring-blue-500 ring-offset-1 rounded-sm shadow-lg' :
          isBridgeTarget ? 'ring-2 ring-amber-400 ring-offset-1 rounded-sm shadow-md animate-pulse' :
          'hover:shadow-sm'
        } ${primary ? 'rounded-md' : 'rounded-sm'}`}
        style={{ width: size, height: size }}
        onClick={(e) => onClick(number, e)}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Pattern and Filter definitions */}
          <defs>
            <pattern id={patternId} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="#3B82F6" strokeWidth="1.5" opacity="0.45" />
            </pattern>
            <linearGradient id="glossyHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.4" />
              <stop offset="50%" stopColor="white" stopOpacity="0.0" />
              <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
            <filter id="innerBevel" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
              <feOffset dx="-1" dy="-1" result="offsetBlur" />
              <feComposite in="SourceGraphic" in2="offsetBlur" operator="arithmetic" k2="1" k3="-1" result="shadowDiff" />
              <feFlood floodColor="black" floodOpacity="0.2" />
              <feComposite in2="shadowDiff" operator="in" />
              <feComposite in2="SourceGraphic" operator="over" />
            </filter>
          </defs>

          {/* ── MISSING TOOTH (big X) ── */}
          {isXMissing ? (
            <>
              <rect x="0" y="0" width="100" height="100" fill={wholeRender.wholeFill || '#FEE2E2'} stroke={strokeColor} strokeWidth="3" rx={primary ? 8 : 2} filter="url(#innerBevel)" />
              <rect x="0" y="0" width="100" height="100" fill="url(#glossyHighlight)" rx={primary ? 8 : 2} className="pointer-events-none" />
              <line x1="12" y1="12" x2="88" y2="88" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />
              <line x1="88" y1="12" x2="12" y2="88" stroke="#DC2626" strokeWidth="7" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* Base background for whole-tooth conditions */}
              <rect
                x="0" y="0" width="100" height="100"
                fill={wholeRender?.wholeFill || '#FFFFFF'}
                stroke={wholeRender?.wholeBorder || 'none'}
                strokeWidth={wholeRender?.wholeStrokeWidth || 0}
                rx={primary ? 8 : 2}
                filter="url(#innerBevel)"
              />

              {/* Render each surface */}
              {surfaceDefs.map(renderSurface)}
              
              {/* 3D Glossy Overlay (Premium Look) */}
              <rect x="0" y="0" width="100" height="100" fill="url(#glossyHighlight)" rx={primary ? 8 : 2} className="pointer-events-none mix-blend-overlay" />

              {/* Whole-tooth text overlay */}
              {wholeRender?.wholeText && (
                <text
                  x="50" y="52"
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={wholeRender.textSize || 24}
                  fontWeight="800"
                  fill={wholeRender.textColor || '#374151'}
                  className="pointer-events-none select-none"
                  style={{ textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}
                >
                  {wholeRender.wholeText}
                </text>
              )}

              {/* Whole-tooth center dot (for RCT crown combos) */}
              {wholeRender?.dot && !wholeRender?.wholeText && (
                <circle cx="50" cy="50" r="6" fill="#111827" className="pointer-events-none" />
              )}

              {/* Primary tooth indicator */}
              {primary && (
                <circle cx="90" cy="10" r="4" fill="#818CF8" opacity="0.5" className="pointer-events-none">
                  <title>Gigi Susu</title>
                </circle>
              )}
            </>
          )}
        </svg>
      </div>

      {/* Number — below for lower jaw */}
      {!upper && (
        <span className={`font-bold text-gray-700 mt-0.5 leading-none select-none ${primary ? 'text-[9px] text-indigo-600' : 'text-[10px]'}`}>
          {number}
        </span>
      )}
    </div>
  );
};

export default Tooth;