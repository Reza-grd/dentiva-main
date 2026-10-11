/**
 * DENTI — maskot AI Dentiva (konsep visual v3).
 *
 * Bentuk: kepala lebar membulat dengan visor hitam besar + aksen sudut biru, headphone di kedua
 * sisi (muka biru, cincin emas) dengan "antena sisi" berupa sirip cahaya, tubuh telur porselen
 * dengan panel biru bawah dan lampu dada bercincin emas, lengan terpisah berbentuk kapsul membulat (ujung biru,
 * gelang emas), cincin orbit berpartikel, dan cincin cahaya tempat melayang. Tanpa antena atas.
 *
 * SVG dipecah menjadi BAGIAN (rig) yang digerakkan denti.css lewat data-state / data-kid:
 *   .d-orbit (di belakang) · .d-shadow (cincin bawah) · .d-root (badan melayang)
 *   .d-arm-l / .d-arm-r (sendi bahu) · .d-body + .d-chest · .d-head (sendi leher)
 *   .d-fin-l / .d-fin-r · .d-ear-l / .d-ear-r · .d-visor + .d-brackets
 *   .d-eyes: .d-eye-open | .d-eye-happy | .d-eye-sleep | .d-eye-wow
 *   .d-mouth: .d-mouth-smile | .d-mouth-talk | .d-mouth-o · .d-cheeks
 *   .d-fx: .d-bubble · .d-waves · .d-stars · .d-hearts · .d-zzz · .d-sparks · .d-notes · .d-exclaim
 *          · .d-haha · .d-sweat · .d-arrows
 *   Properti: .d-brush + .d-foam (sikat gigi) · .d-tooth (gigi berkilau) · .d-chest-heart · .d-scan (visor)
 *   Ekspresi tambahan: .d-eye-heart · .d-lids (mata sedih) · .d-mouth-sad
 *   Hidup: .d-lean (condong ke arah kursor) · .d-gaze / .d-gaze-soft (mata & mulut mengikuti kursor) — lewat --look-x/--look-y
 * Lengan digambar SETELAH kepala agar tangan bisa tampil di depan wajah (dagu, headphone, malu).
 * Koordinat viewBox 0 0 400 480. Partikel orbit memakai SMIL <animateMotion>.
 */
export const DENTI_STATES = [
  'idle', 'happy', 'wave', 'talk', 'think', 'call', 'celebrate', 'sleep', 'wake',
  // aksi tambahan
  'brush', 'tooth', 'dance', 'spin', 'laugh', 'love', 'shy', 'surprise', 'sorry', 'scan', 'point', 'thanks',
  'nod', 'clap',
  // gerakan & ekspresi tambahan (v4)
  'wink', 'cheer', 'jump', 'bow', 'shrug', 'cool', 'sigh', 'idea', 'confused', 'peek', 'excited', 'salute',
];

const ARM = 'M-27 0 A27 27 0 0 1 27 0 C27 32 25 62 23 82 C21 106 -21 106 -23 82 C-25 62 -27 32 -27 0 Z';
const ARM_CAP = 'M-27 0 A27 27 0 0 1 27 0 L27 10 C16 17 -16 17 -27 10 Z';
const BODY = 'M200 270 C258 270 290 306 290 354 C290 410 252 444 200 444 C148 444 110 410 110 354 C110 306 142 270 200 270 Z';
const HEAD = 'M200 56 C282 56 330 84 330 152 L330 176 C330 236 290 262 200 262 C110 262 70 236 70 176 L70 152 C70 84 118 56 200 56 Z';
const VISOR = 'M200 88 C270 88 304 106 304 160 L304 176 C304 222 274 240 200 240 C126 240 96 222 96 176 L96 160 C96 106 130 88 200 88 Z';
const HEART = 'M0 4 C-6 -3 -14 0 -13 7 C-12 13 -4 17 0 21 C4 17 12 13 13 7 C14 0 6 -3 0 4 Z';
const STAR = 'M0 -14 C2 -3 3 -2 14 0 C3 2 2 3 0 14 C-2 3 -3 2 -14 0 C-3 -2 -2 -3 0 -14Z';
const TOOTH = 'M-24 -26 C-32 -18 -32 0 -26 12 C-22 22 -20 34 -14 34 C-8 34 -6 18 0 18 C6 18 8 34 14 34 C20 34 22 22 26 12 C32 0 32 -18 24 -26 C16 -33 8 -30 0 -26 C-8 -30 -16 -33 -24 -26 Z';
const NOTE = 'M-7 0 A7 5.5 -20 1 0 7 0 A7 5.5 -20 1 0 -7 0 Z M5 -1 V-30 L17 -26 V-20 L7.5 -23.5 V-1 Z';
const DROP = 'M0 -12 C6 -2 9 3 9 7 A9 9 0 0 1 -9 7 C-9 3 -6 -2 0 -12Z';

export function dentiSvg(uid = 'd') {
  const g = (n) => `${uid}-${n}`;
  const url = (n) => `url(#${g(n)})`;
  // posisi diletakkan di <g> pembungkus agar transform animasi CSS tidak menimpanya
  const at = (x, y, sc, inner) => `<g transform="translate(${x} ${y})${sc ? ` scale(${sc})` : ''}">${inner}</g>`;
  const arm = (side, x) => `
    <g class="d-arm-${side}"><g transform="translate(${x} 322) rotate(${side === 'l' ? 22 : -22})">
      <path d="${ARM}" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="1.5"/>
      <path d="${ARM_CAP}" fill="${url('blue')}"/>
      <path d="M-26 20 C-12 28 12 28 26 20" stroke="${url('gold')}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M-15 32 C-15 52 -14 70 -12 82" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>
    </g></g>`;
  const ear = (side, cx, face) => `
    <g class="d-ear-${side}">
      <rect x="${cx - 20}" y="122" width="40" height="88" rx="20" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="1.5"/>
      <ellipse cx="${face}" cy="166" rx="18" ry="36" fill="none" stroke="${url('gold')}" stroke-width="4"/>
      <ellipse class="d-ear-face" cx="${face}" cy="166" rx="13" ry="29" fill="${url('blue')}"/>
      <ellipse cx="${face - (side === 'l' ? 3 : -3)}" cy="152" rx="4" ry="9" fill="#fff" opacity=".7"/>
    </g>`;
  const fin = (side) => side === 'l'
    ? `<g class="d-fin-l"><path d="M60 128 C42 108 40 78 52 56 C66 72 72 102 68 128 Z" fill="${url('fin')}" stroke="#fff" stroke-opacity=".75" stroke-width="1.2"/></g>`
    : `<g class="d-fin-r"><path d="M340 128 C358 108 360 78 348 56 C334 72 328 102 332 128 Z" fill="${url('fin')}" stroke="#fff" stroke-opacity=".75" stroke-width="1.2"/></g>`;

  return `
<defs>
  <linearGradient id="${g('shell')}" x1=".25" y1="0" x2=".65" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef3fa"/><stop offset="1" stop-color="#c3d1e8"/>
  </linearGradient>
  <linearGradient id="${g('edge')}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#8fb0e0" stop-opacity=".55"/>
  </linearGradient>
  <linearGradient id="${g('visor')}" x1="0" y1="0" x2=".3" y2="1">
    <stop offset="0" stop-color="#18223a"/><stop offset=".55" stop-color="#070b16"/><stop offset="1" stop-color="#03050b"/>
  </linearGradient>
  <linearGradient id="${g('eye')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ecfcff"/><stop offset="1" stop-color="#5cc9ff"/>
  </linearGradient>
  <linearGradient id="${g('blue')}" x1="0" y1="0" x2=".4" y2="1">
    <stop offset="0" stop-color="#d6f0ff"/><stop offset=".5" stop-color="#7cc4ff"/><stop offset="1" stop-color="#2f7fe8"/>
  </linearGradient>
  <linearGradient id="${g('fin')}" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#3f8ff0" stop-opacity=".95"/><stop offset="1" stop-color="#d8f0ff" stop-opacity=".9"/>
  </linearGradient>
  <radialGradient id="${g('gold')}" cx=".35" cy=".3" r=".9">
    <stop offset="0" stop-color="#fff4de"/><stop offset=".55" stop-color="#ecca97"/><stop offset="1" stop-color="#b78a4c"/>
  </radialGradient>
  <radialGradient id="${g('core')}" cx=".42" cy=".38" r=".7">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#8fe0ff"/><stop offset="1" stop-color="#2a7ee8"/>
  </radialGradient>
  <radialGradient id="${g('halo')}">
    <stop offset="0" stop-color="#5fbaff" stop-opacity=".7"/><stop offset="1" stop-color="#5fbaff" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="${g('bodyClip')}"><path d="${BODY}"/></clipPath>
  <clipPath id="${g('visorClip')}"><path d="${VISOR}"/></clipPath>
  <linearGradient id="${g('scan')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5fbaff" stop-opacity="0"/><stop offset="1" stop-color="#5fbaff" stop-opacity=".35"/>
  </linearGradient>
  <filter id="${g('glow')}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="${g('bigglow')}" x="-80%" y="-80%" width="260%" height="260%">
    <feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="${g('soft')}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="${g('shadow')}" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#020611" flood-opacity=".55"/>
  </filter>
</defs>

<!-- cincin orbit (di belakang badan) -->
<g class="d-orbit" transform="rotate(-14 200 252)">
  <path id="${g('orbit')}" d="M22 252 a178 64 0 1 0 356 0 a178 64 0 1 0 -356 0" fill="none" stroke="#e6c698" stroke-width="1.3" opacity=".35"/>
  <circle r="4.5" fill="#fff1d6" filter="url(#${g('glow')})"><animateMotion dur="9s" repeatCount="indefinite"><mpath href="#${g('orbit')}"/></animateMotion></circle>
  <circle r="3" fill="#a9e4ff" filter="url(#${g('glow')})"><animateMotion dur="9s" begin="-4.5s" repeatCount="indefinite"><mpath href="#${g('orbit')}"/></animateMotion></circle>
</g>

<g class="d-shadow">
  <ellipse cx="200" cy="466" rx="140" ry="22" fill="${url('halo')}" filter="url(#${g('soft')})"/>
  <ellipse class="d-ring-1" cx="200" cy="464" rx="122" ry="16" fill="none" stroke="#6cc4ff" stroke-width="2.5" opacity=".8" filter="url(#${g('glow')})"/>
  <ellipse class="d-ring-2" cx="200" cy="464" rx="88" ry="11" fill="none" stroke="#ecca97" stroke-width="2.2" opacity=".85"/>
  <ellipse class="d-ring-3" cx="200" cy="464" rx="54" ry="7" fill="none" stroke="#a9e4ff" stroke-width="1.6" opacity=".6"/>
</g>

<g class="d-lean"><g class="d-root">
  <g filter="url(#${g('shadow')})">
    <!-- tubuh -->
    <g class="d-body">
      <path d="${BODY}" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="2"/>
      <g clip-path="url(#${g('bodyClip')})">
        <ellipse cx="112" cy="420" rx="46" ry="62" fill="${url('blue')}" opacity=".85"/>
        <ellipse cx="288" cy="420" rx="46" ry="62" fill="${url('blue')}" opacity=".85"/>
        <path d="M150 300 C162 288 178 282 196 281" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".95"/>
      </g>
      <path d="M152 404 C174 424 226 424 248 404" stroke="#9fb7dc" stroke-width="1.6" fill="none" opacity=".5"/>
      <g class="d-chest">
        <circle cx="200" cy="336" r="29" fill="#0b1324"/>
        <circle cx="200" cy="336" r="29" fill="none" stroke="${url('gold')}" stroke-width="5"/>
        <circle class="d-chest-core" cx="200" cy="336" r="20" fill="${url('core')}" filter="url(#${g('bigglow')})"/>
        <ellipse cx="193" cy="328" rx="6" ry="4" fill="#fff" opacity=".85"/>
        <g class="d-chest-heart">${at(200, 323, 1.15, `<path d="${HEART}" fill="#ff8fb8" filter="url(#${g('glow')})"/>`)}</g>
      </g>
    </g>

    <!-- leher -->
    <ellipse cx="200" cy="266" rx="54" ry="12" fill="#0d1628"/>
    <ellipse cx="200" cy="264" rx="44" ry="6" fill="none" stroke="#6cc4ff" stroke-width="2" opacity=".7"/>

    <!-- kepala -->
    <g class="d-head">
      ${fin('l')}
      ${fin('r')}
      ${ear('l', 66, 58)}
      ${ear('r', 334, 342)}
      <path d="${HEAD}" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="2"/>
      <path d="M104 98 C124 76 152 66 186 64" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".95"/>

      <g class="d-visor">
        <path d="${VISOR}" fill="${url('visor')}"/>
        <path class="d-visor-rim" d="${VISOR}" fill="none" stroke="#5fbaff" stroke-width="1.8" opacity=".5"/>
        <path d="M128 112 C156 100 196 98 236 102" stroke="#fff" stroke-opacity=".2" stroke-width="8" fill="none" stroke-linecap="round"/>
        <g class="d-brackets" fill="none" stroke="#6fdcff" stroke-width="4" stroke-linecap="round" filter="url(#${g('glow')})">
          <path d="M120 134 v-10 q0 -8 8 -8 h10"/><path d="M280 134 v-10 q0 -8 -8 -8 h-10"/>
          <path d="M120 194 v10 q0 8 8 8 h10"/><path d="M280 194 v10 q0 8 -8 8 h-10"/>
        </g>
        <g clip-path="url(#${g('visorClip')})"><g class="d-scan">
          <rect x="96" y="66" width="208" height="28" fill="${url('scan')}"/>
          <rect x="96" y="93" width="208" height="3" fill="#8fe8ff"/>
        </g></g>
      </g>

      <g class="d-gaze">
      <g class="d-eyes" filter="url(#${g('glow')})">
        <g class="d-eye-open">
          <ellipse class="d-eye d-eye-l" cx="162" cy="160" rx="17" ry="21" fill="${url('eye')}"/>
          <ellipse class="d-eye d-eye-r" cx="238" cy="160" rx="17" ry="21" fill="${url('eye')}"/>
        </g>
        <g class="d-eye-happy" fill="none" stroke="${url('eye')}" stroke-width="12" stroke-linecap="round">
          <path d="M140 170 Q162 140 184 170"/><path d="M216 170 Q238 140 260 170"/>
        </g>
        <g class="d-eye-sleep" fill="none" stroke="${url('eye')}" stroke-width="8" stroke-linecap="round">
          <path d="M142 164 Q162 176 182 164"/><path d="M218 164 Q238 176 258 164"/>
        </g>
        <g class="d-eye-wow" fill="none" stroke="${url('eye')}" stroke-width="7">
          <circle cx="162" cy="160" r="18"/><circle cx="238" cy="160" r="18"/>
        </g>
        <g class="d-eye-heart" fill="#ff8fb8">
          ${at(162, 143, 1.75, `<path class="d-eyeheart" d="${HEART}"/>`)}
          ${at(238, 143, 1.75, `<path class="d-eyeheart" d="${HEART}"/>`)}
        </g>
      </g>
      <g class="d-lids" fill="#070b16">
        <path d="M136 128 L190 128 L190 146 L136 166 Z"/><path d="M264 128 L210 128 L210 146 L264 166 Z"/>
      </g>
      <g class="d-shades">
        <path d="M130 138 H192 V170 Q192 188 172 188 H150 Q130 188 130 168 Z" fill="#05080f" stroke="${url('gold')}" stroke-width="3"/>
        <path d="M208 138 H270 V168 Q270 188 250 188 H228 Q208 188 208 170 Z" fill="#05080f" stroke="${url('gold')}" stroke-width="3"/>
        <path d="M192 148 H208" stroke="${url('gold')}" stroke-width="4" stroke-linecap="round"/>
        <path d="M138 146 L158 146 L146 166 Z" fill="#fff" opacity=".22"/><path d="M216 146 L236 146 L224 166 Z" fill="#fff" opacity=".22"/>
      </g>
      </g>

      <g class="d-gaze-soft"><g class="d-mouth" filter="url(#${g('glow')})">
        <path class="d-mouth-smile" d="M184 196 Q200 210 216 196" fill="none" stroke="#9ee6ff" stroke-width="5" stroke-linecap="round"/>
        <ellipse class="d-mouth-talk" cx="200" cy="200" rx="11" ry="7" fill="#9ee6ff"/>
        <ellipse class="d-mouth-o" cx="200" cy="202" rx="7" ry="8" fill="none" stroke="#9ee6ff" stroke-width="4"/>
        <path class="d-mouth-sad" d="M186 208 Q200 196 214 208" fill="none" stroke="#9ee6ff" stroke-width="5" stroke-linecap="round"/>
      </g></g>

      <g class="d-cheeks">
        <ellipse cx="134" cy="196" rx="15" ry="8" fill="#ff9cc0" opacity=".5"/>
        <ellipse cx="266" cy="196" rx="15" ry="8" fill="#ff9cc0" opacity=".5"/>
      </g>
    </g>

    ${arm('l', 90)}
    ${arm('r', 310)}

    <!-- properti -->
    <g class="d-brush"><g transform="translate(234 238) rotate(38) scale(1.15)">
      <rect x="-30" y="-4.5" width="62" height="9" rx="4.5" fill="${url('blue')}" stroke="#fff" stroke-opacity=".6"/>
      <rect x="-52" y="-6.5" width="24" height="13" rx="5" fill="${url('shell')}" stroke="${url('edge')}"/>
      <g stroke="#bfeeff" stroke-width="3.4" stroke-linecap="round"><path d="M-47 -8 v-9"/><path d="M-40 -8 v-9"/><path d="M-33 -8 v-9"/></g>
    </g></g>
    <g class="d-foam" fill="#fff">
      <circle class="d-bub d-bub-1" cx="180" cy="214" r="6"/><circle class="d-bub d-bub-2" cx="214" cy="190" r="5"/>
      <circle class="d-bub d-bub-3" cx="190" cy="230" r="4"/><circle class="d-bub d-bub-4" cx="172" cy="196" r="3.5"/>
    </g>
    <g class="d-tooth">${at(200, 6, 0, `
      <circle r="50" fill="${url('halo')}"/>
      <path d="${TOOTH}" fill="${url('shell')}" stroke="#7cc4ff" stroke-width="2.5"/>
      <path d="M-15 -18 C-19 -10 -19 -2 -16 6" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g fill="#fff4de" filter="url(#${g('glow')})">${at(32, -26, .6, `<path class="d-tooth-star" d="${STAR}"/>`)}${at(-34, 20, .45, `<path class="d-tooth-star d-tooth-star-2" d="${STAR}"/>`)}</g>`)}
    </g>
  </g>
</g></g>

<g class="d-fx">
  <g class="d-sparks" fill="#fff1d6">
    <circle class="d-spark d-spark-1" cx="34" cy="250" r="3.5" filter="url(#${g('glow')})"/>
    <circle class="d-spark d-spark-2" cx="372" cy="214" r="3" filter="url(#${g('glow')})"/>
    <circle class="d-spark d-spark-3" cx="356" cy="388" r="2.5" filter="url(#${g('glow')})"/>
    <circle class="d-spark d-spark-4" cx="56" cy="400" r="2.5" filter="url(#${g('glow')})"/>
  </g>
  <g class="d-bubble">
    <rect x="316" y="-6" width="88" height="54" rx="27" fill="#0b1426" fill-opacity=".9" stroke="${url('gold')}" stroke-width="2.5"/>
    <circle cx="318" cy="60" r="7" fill="#0b1426" stroke="#ecca97" stroke-width="2"/>
    <circle cx="306" cy="76" r="4" fill="#0b1426" stroke="#ecca97" stroke-width="1.6"/>
    <g fill="#bfeeff"><circle class="d-bdot d-bdot-1" cx="342" cy="21" r="6"/><circle class="d-bdot d-bdot-2" cx="360" cy="21" r="6"/><circle class="d-bdot d-bdot-3" cx="378" cy="21" r="6"/></g>
  </g>
  <g class="d-waves" fill="none" stroke="#ecca97" stroke-linecap="round">
    <path class="d-wave d-wave-1" d="M368 146 q14 20 0 40" stroke-width="4.5"/>
    <path class="d-wave d-wave-2" d="M382 130 q24 36 0 72" stroke-width="4"/>
    <path class="d-wave d-wave-3" d="M396 114 q34 52 0 104" stroke-width="3.5"/>
  </g>
  <g class="d-stars" fill="#fff4de" filter="url(#${g('glow')})">
    ${at(40, 92, 0, `<path class="d-star d-star-1" d="${STAR}"/>`)}
    ${at(368, 64, .8, `<path class="d-star d-star-2" d="${STAR}"/>`)}
    ${at(384, 318, .65, `<path class="d-star d-star-3" d="${STAR}"/>`)}
    ${at(24, 352, .7, `<path class="d-star d-star-4" d="${STAR}"/>`)}
    ${at(200, 18, .6, `<path class="d-star d-star-5" d="${STAR}"/>`)}
  </g>
  <g class="d-hearts" fill="#ff8fb8" filter="url(#${g('glow')})">
    ${at(52, 60, .9, `<path class="d-heart d-heart-1" d="${HEART}"/>`)}
    ${at(352, 40, .7, `<path class="d-heart d-heart-2" d="${HEART}"/>`)}
    ${at(70, 240, .6, `<path class="d-heart d-heart-3" d="${HEART}"/>`)}
    ${at(336, 226, .8, `<path class="d-heart d-heart-4" d="${HEART}"/>`)}
  </g>
  <g class="d-zzz" fill="#bfeeff" font-family="Inter, system-ui, sans-serif" font-weight="600">
    <text class="d-z d-z-1" x="300" y="78" font-size="24">z</text>
    <text class="d-z d-z-2" x="324" y="52" font-size="30">z</text>
    <text class="d-z d-z-3" x="352" y="22" font-size="38">Z</text>
  </g>
  <g class="d-notes">
    ${at(54, 150, 0, `<path class="d-note d-note-1" d="${NOTE}" fill="#ecca97"/>`)}
    ${at(352, 112, 1.2, `<path class="d-note d-note-2" d="${NOTE}" fill="#a9e4ff"/>`)}
    ${at(344, 276, .9, `<path class="d-note d-note-3" d="${NOTE}" fill="#ecca97"/>`)}
  </g>
  <g class="d-exclaim" fill="${url('gold')}" filter="url(#${g('glow')})">
    <rect x="193" y="-36" width="14" height="40" rx="7"/><circle cx="200" cy="18" r="7.5"/>
  </g>
  <g class="d-haha" fill="#ecca97" font-family="Inter, system-ui, sans-serif" font-weight="700">
    <text class="d-ha d-ha-1" x="300" y="70" font-size="30">ha</text>
    <text class="d-ha d-ha-2" x="30" y="96" font-size="26">ha</text>
    <text class="d-ha d-ha-3" x="326" y="26" font-size="22">ha!</text>
  </g>
  <g class="d-bulb" filter="url(#${g('glow')})">
    <circle cx="200" cy="-14" r="24" fill="#ffe9a8" stroke="#ecca97" stroke-width="3"/>
    <path d="M188 6 H212 V16 Q212 22 206 22 H194 Q188 22 188 16 Z" fill="#c9a56a"/>
    <path d="M190 -14 Q200 -2 210 -14" fill="none" stroke="#ecca97" stroke-width="3" stroke-linecap="round"/>
    <g stroke="#ffe9a8" stroke-width="4" stroke-linecap="round"><path d="M200 -50 V-60"/><path d="M168 -34 L160 -42"/><path d="M232 -34 L240 -42"/><path d="M160 -12 H150"/><path d="M240 -12 H250"/></g>
  </g>
  <g class="d-quest" fill="${url('gold')}" font-family="Inter, system-ui, sans-serif" font-weight="800" filter="url(#${g('glow')})">
    <text class="d-q d-q-1" x="300" y="50" font-size="54">?</text>
    <text class="d-q d-q-2" x="56" y="76" font-size="34">?</text>
  </g>
  <g class="d-sweat">${at(318, 96, 0, `<path d="${DROP}" fill="#a9e4ff"/>`)}</g>
  <g class="d-arrows" fill="none" stroke="${url('gold')}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path class="d-arrow d-arrow-1" d="M64 232 l-13 13 l13 13"/>
    <path class="d-arrow d-arrow-2" d="M44 232 l-13 13 l13 13"/>
    <path class="d-arrow d-arrow-3" d="M24 232 l-13 13 l13 13"/>
  </g>
</g>`;
}
