/**
 * DENTI — maskot AI Dentiva (konsep visual v3 · HD Multi-LOD).
 *
 * Bentuk: kepala lebar membulat dengan visor hitam besar + aksen sudut biru, headphone di kedua
 * sisi (muka biru, cincin emas) dengan "antena sisi" berupa sirip cahaya, tubuh telur porselen
 * dengan panel biru bawah dan lampu dada bercincin emas, lengan terpisah berbentuk kapsul membulat (ujung biru,
 * gelang emas), cincin orbit berpartikel, dan cincin cahaya tempat melayang. Tanpa antena atas.
 *
 * Sistem Level of Detail (LOD):
 *   - `mini`    (≤ 72 px)  : Tanpa <filter>, kontras tepi diperkuat, garis (stroke) dipertebal agar ≥ 1–1,5 px fisik.
 *   - `standar` (≤ 160 px) : Vektor murni tanpa blur filter pada grup bergerak, ketebalan garis menengah.
 *   - `hero`    (> 160 px) : Detail penuh HD dengan pencahayaan radial & bayangan vektor tajam tanpa rasterisasi bitmap.
 *
 * SVG dipecah menjadi BAGIAN (rig) yang digerakkan denti.css lewat data-state / data-kid / data-lod:
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
 * Koordinat viewBox 0 0 400 480.
 */
export const DENTI_STATES = [
  'idle', 'happy', 'wave', 'talk', 'think', 'call', 'celebrate', 'sleep', 'wake',
  // aksi tambahan
  'brush', 'tooth', 'dance', 'spin', 'laugh', 'love', 'shy', 'surprise', 'sorry', 'scan', 'point', 'thanks',
  'nod', 'clap',
  // gerakan & ekspresi tambahan (v4)
  'wink', 'cheer', 'jump', 'bow', 'shrug', 'cool', 'sigh', 'idea', 'confused', 'peek', 'excited', 'salute',
  // gerakan & ekspresi tambahan (v5)
  'angry', 'cry', 'dizzy', 'stretch', 'search', 'phone', 'coffee', 'flex',
  // 50 ekspresi & gerakan tambahan (v6)
  'grateful', 'proud', 'worried', 'nervous', 'blush', 'sulk', 'hopeful', 'relieved',
  'disappointed', 'gloomy', 'cozy', 'shock', 'giggle', 'smug', 'curious', 'suspicious',
  'determined', 'focused', 'overwhelmed', 'dreamy', 'yawn', 'tired', 'sick', 'freezing',
  'hot', 'hungry', 'welcome', 'goodbye', 'thumbsup', 'heart_hands', 'pray', 'whisper',
  'shush', 'listen', 'slowclap', 'facepalm', 'party', 'birthday', 'gift', 'flag',
  'sing', 'loading', 'success', 'warning', 'error', 'lock', 'shield', 'hourglass',
  'chart', 'money',
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

/** Parameter ketebalan garis & detail berdasarkan LOD agar selalu ≥ 1 piksel fisik dan kontras tepi ≥ 3:1 terhadap putih. */
const LOD_SPEC = {
  mini: {
    shellStroke: 5.5,
    partStroke: 4.5,
    finStroke: 3.5,
    visorRimStroke: 3.8,
    bracketStroke: 6.5,
    chestGoldStroke: 7,
    eyeHappyStroke: 14,
    eyeSleepStroke: 10,
    eyeWowStroke: 9,
    mouthSmileStroke: 7.5,
    mouthOStroke: 6,
    earGoldStroke: 5.5,
    armBandStroke: 6,
    // #567bb0 vs #ffffff = 4.30:1; #2e5288 vs #ffffff = 7.72:1 (jauh di atas syarat >= 3:1)
    edgeTopColor: '#567bb0',
    edgeTopOpacity: '1',
    edgeBottomColor: '#2e5288',
    edgeBottomOpacity: '1',
  },
  standar: {
    shellStroke: 3.2,
    partStroke: 2.6,
    finStroke: 2.2,
    visorRimStroke: 2.6,
    bracketStroke: 5,
    chestGoldStroke: 5.8,
    eyeHappyStroke: 12.8,
    eyeSleepStroke: 8.8,
    eyeWowStroke: 7.8,
    mouthSmileStroke: 6,
    mouthOStroke: 4.8,
    earGoldStroke: 4.6,
    armBandStroke: 5,
    // #6488bc vs #ffffff = 3.57:1; #3b629b vs #ffffff = 6.03:1
    edgeTopColor: '#6488bc',
    edgeTopOpacity: '1',
    edgeBottomColor: '#3b629b',
    edgeBottomOpacity: '1',
  },
  hero: {
    shellStroke: 2.4,
    partStroke: 2,
    finStroke: 1.6,
    visorRimStroke: 2.2,
    bracketStroke: 4.4,
    chestGoldStroke: 5.2,
    eyeHappyStroke: 12,
    eyeSleepStroke: 8,
    eyeWowStroke: 7,
    mouthSmileStroke: 5.2,
    mouthOStroke: 4.2,
    earGoldStroke: 4.2,
    armBandStroke: 4.6,
    // #6b8fc2 vs #ffffff = 3.30:1; #436aa3 vs #ffffff = 5.33:1
    edgeTopColor: '#6b8fc2',
    edgeTopOpacity: '1',
    edgeBottomColor: '#436aa3',
    edgeBottomOpacity: '1',
  },
};

export function dentiSvg(uid = 'd', lod = 'hero') {
  const cfg = LOD_SPEC[lod] || LOD_SPEC.hero;
  const hasGlow = lod !== 'mini';
  const g = (n) => `${uid}-${n}`;
  const url = (n) => `url(#${g(n)})`;
  // posisi diletakkan di <g> pembungkus agar transform animasi CSS tidak menimpanya
  const at = (x, y, sc, inner) => `<g transform="translate(${x} ${y})${sc ? ` scale(${sc})` : ''}">${inner}</g>`;
  const armPropsL = `
      <g class="d-clip"><g transform="translate(0 116) rotate(53)">
        <rect x="-24" y="-32" width="48" height="64" rx="5" fill="#fff" stroke="${url('gold')}" stroke-width="3"/>
        <rect x="-10" y="-38" width="20" height="10" rx="3" fill="${url('gold')}"/>
        <path d="M-14 -14 H14 M-14 -2 H14 M-14 10 H6" stroke="#7cc4ff" stroke-width="3" stroke-linecap="round"/>
        <path d="M-12 20 l4 4 l9 -10" fill="none" stroke="#3ddc84" stroke-width="3.5" stroke-linecap="round"/>
      </g></g>
      <g class="d-book"><g transform="translate(0 116) rotate(53)">
        <path d="M-32 -22 H-2 V24 H-32 Z M2 -22 H32 V24 H2 Z" fill="#fff" stroke="#7cc4ff" stroke-width="3" stroke-linejoin="round"/>
        <path d="M-25 -10 H-9 M-25 0 H-9 M-25 10 H-9 M9 -10 H25 M9 0 H25 M9 10 H25" stroke="#bcd0e8" stroke-width="2.5" stroke-linecap="round"/>
      </g></g>`;
  const armPropsR2 = `
      <g class="d-thumb"><g transform="translate(0 118) rotate(150)">
        <rect x="-15" y="-4" width="30" height="27" rx="10" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/>
        <path d="M-6 -4 V-24 Q-6 -33 2 -31 Q9 -29 9 -20 V-4" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/>
      </g></g>
      <g class="d-mic"><g transform="translate(0 114) rotate(150)">
        <rect x="-4" y="-8" width="8" height="32" rx="4" fill="#4a5568"/>
        <circle cy="-18" r="12" fill="#c9d4e6" stroke="${url('gold')}" stroke-width="3"/>
      </g></g>
      <g class="d-flag"><g transform="translate(0 112) rotate(150)">
        <path d="M0 16 V-74" stroke="#b78a4c" stroke-width="4" stroke-linecap="round"/>
        <g class="d-flagcloth"><rect x="2" y="-74" width="46" height="12" fill="#ff4d5a"/><rect x="2" y="-62" width="46" height="12" fill="#fff" stroke="#e5e9f2"/></g>
      </g></g>`;
  const armProps = (side) => (side === 'l' ? armPropsL : side === 'r' ? `
      <g class="d-lens">
        <path d="M0 98 V122" stroke="${url('gold')}" stroke-width="8" stroke-linecap="round"/>
        <circle cx="0" cy="140" r="20" fill="#bfeeff" fill-opacity=".28" stroke="${url('gold')}" stroke-width="6"/>
        <path d="M-11 133 Q-8 126 0 124" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>
      </g>
      <g class="d-phone">
        <rect x="-11" y="92" width="22" height="44" rx="6" fill="#0b1426" stroke="${url('gold')}" stroke-width="2.5"/>
        <rect x="-7" y="97" width="14" height="30" rx="3" fill="#5fd0ff" opacity=".85"/>
        <circle cx="0" cy="131.5" r="1.8" fill="#fff4de"/>
      </g>
      <g class="d-cup">
        <path d="M-9 100 L9 100 L14 136 L-14 136 Z" fill="#fff" stroke="${url('gold')}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M13 108 Q28 112 22 128 Q19 134 13 132" fill="none" stroke="${url('gold')}" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="0" cy="136" rx="14" ry="3.2" fill="#8a5a34"/>
      </g>${armPropsR2}` : '');
  const arm = (side, x) => `
    <g class="d-arm-${side}"><g transform="translate(${x} 322) rotate(${side === 'l' ? 22 : -22})">
      <path d="${ARM}" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/>
      <path d="${ARM_CAP}" fill="${url('blue')}"/>
      <path d="M-26 20 C-12 28 12 28 26 20" stroke="${url('gold')}" stroke-width="${cfg.armBandStroke}" fill="none" stroke-linecap="round"/>
      <path d="M-15 32 C-15 52 -14 70 -12 82" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>${armProps(side)}
    </g></g>`;
  const ear = (side, cx, face) => `
    <g class="d-ear-${side}">
      <rect x="${cx - 20}" y="122" width="40" height="88" rx="20" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/>
      <ellipse cx="${face}" cy="166" rx="18" ry="36" fill="none" stroke="${url('gold')}" stroke-width="${cfg.earGoldStroke}"/>
      <ellipse class="d-ear-face" cx="${face}" cy="166" rx="13" ry="29" fill="${url('blue')}"/>
      <ellipse cx="${face - (side === 'l' ? 3 : -3)}" cy="152" rx="4" ry="9" fill="#fff" opacity=".75"/>
    </g>`;
  const fin = (side) => side === 'l'
    ? `<g class="d-fin-l"><path d="M60 128 C42 108 40 78 52 56 C66 72 72 102 68 128 Z" fill="${url('fin')}" stroke="${url('edge')}" stroke-width="${cfg.finStroke}"/></g>`
    : `<g class="d-fin-r"><path d="M340 128 C358 108 360 78 348 56 C334 72 328 102 332 128 Z" fill="${url('fin')}" stroke="${url('edge')}" stroke-width="${cfg.finStroke}"/></g>`;

  return `
<defs>
  <linearGradient id="${g('shell')}" x1=".25" y1="0" x2=".65" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".58" stop-color="#f0f5fc"/><stop offset="1" stop-color="#c8d6ec"/>
  </linearGradient>
  <linearGradient id="${g('edge')}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${cfg.edgeTopColor}" stop-opacity="${cfg.edgeTopOpacity}"/><stop offset="1" stop-color="${cfg.edgeBottomColor}" stop-opacity="${cfg.edgeBottomOpacity}"/>
  </linearGradient>
  <linearGradient id="${g('visor')}" x1="0" y1="0" x2=".3" y2="1">
    <stop offset="0" stop-color="#162138"/><stop offset=".55" stop-color="#070c18"/><stop offset="1" stop-color="#03050b"/>
  </linearGradient>
  <linearGradient id="${g('eye')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f2fdff"/><stop offset="1" stop-color="#56c8ff"/>
  </linearGradient>
  <linearGradient id="${g('blue')}" x1="0" y1="0" x2=".4" y2="1">
    <stop offset="0" stop-color="#d6f0ff"/><stop offset=".5" stop-color="#76c2ff"/><stop offset="1" stop-color="#2979e6"/>
  </linearGradient>
  <linearGradient id="${g('fin')}" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#3b8cf0"/><stop offset="1" stop-color="#cfeaff"/>
  </linearGradient>
  <radialGradient id="${g('gold')}" cx=".35" cy=".3" r=".9">
    <stop offset="0" stop-color="#fff5e0"/><stop offset=".55" stop-color="#ecc994"/><stop offset="1" stop-color="#b38444"/>
  </radialGradient>
  <radialGradient id="${g('core')}" cx=".42" cy=".38" r=".7">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".48" stop-color="#8be0ff"/><stop offset="1" stop-color="#267ce8"/>
  </radialGradient>
  <radialGradient id="${g('halo')}">
    <stop offset="0" stop-color="#5fbaff" stop-opacity=".55"/><stop offset=".6" stop-color="#5fbaff" stop-opacity=".18"/><stop offset="1" stop-color="#5fbaff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="${g('eyeGlow')}">
    <stop offset="0" stop-color="#7ce8ff" stop-opacity=".52"/><stop offset=".5" stop-color="#38bdf8" stop-opacity=".2"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="${g('coreGlow')}">
    <stop offset="0" stop-color="#8be8ff" stop-opacity=".75"/><stop offset=".52" stop-color="#38bdf8" stop-opacity=".28"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="${g('bodyClip')}"><path d="${BODY}"/></clipPath>
  <clipPath id="${g('visorClip')}"><path d="${VISOR}"/></clipPath>
  <linearGradient id="${g('scan')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5fbaff" stop-opacity="0"/><stop offset="1" stop-color="#5fbaff" stop-opacity=".35"/>
  </linearGradient>
</defs>

<!-- cincin orbit (di belakang badan — gerak mengitari via CSS offset-path, tanpa SMIL) -->
<g class="d-orbit" transform="rotate(-14 200 252)">
  <path id="${g('orbit')}" d="M22 252 a178 64 0 1 0 356 0 a178 64 0 1 0 -356 0" fill="none" stroke="#e6c698" stroke-width="1.8" opacity=".4"/>
  <circle class="d-orbit-dot d-orbit-dot-1" cx="0" cy="0" r="4.5" fill="#fff1d6"/>
  <circle class="d-orbit-dot d-orbit-dot-2" cx="0" cy="0" r="3.5" fill="#a9e4ff"/>
</g>

<g class="d-shadow">
  <ellipse cx="200" cy="466" rx="140" ry="22" fill="${url('halo')}"/>
  <ellipse class="d-ring-1" cx="200" cy="464" rx="122" ry="16" fill="none" stroke="#6cc4ff" stroke-width="${lod === 'mini' ? 4 : 2.8}" opacity=".82"/>
  <ellipse class="d-ring-2" cx="200" cy="464" rx="88" ry="11" fill="none" stroke="#ecca97" stroke-width="${lod === 'mini' ? 3.5 : 2.4}" opacity=".88"/>
  <ellipse class="d-ring-3" cx="200" cy="464" rx="54" ry="7" fill="none" stroke="#a9e4ff" stroke-width="${lod === 'mini' ? 2.5 : 1.8}" opacity=".65"/>
</g>

<g class="d-lean"><g class="d-root">
  <g class="d-figure">
    <!-- tubuh -->
    <g class="d-body">
      <path d="${BODY}" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.shellStroke}"/>
      <g clip-path="url(#${g('bodyClip')})">
        <ellipse cx="112" cy="420" rx="46" ry="62" fill="${url('blue')}" opacity=".88"/>
        <ellipse cx="288" cy="420" rx="46" ry="62" fill="${url('blue')}" opacity=".88"/>
        <path d="M150 300 C162 288 178 282 196 281" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".95"/>
      </g>
      <path d="M152 404 C174 424 226 424 248 404" stroke="#8faad4" stroke-width="${lod === 'mini' ? 3 : 2}" fill="none" opacity=".6"/>
      <g class="d-chest">
        ${hasGlow ? `<circle class="d-chest-glow" cx="200" cy="336" r="44" fill="${url('coreGlow')}"/>` : `<circle cx="200" cy="336" r="35" fill="${url('halo')}"/>`}
        <circle cx="200" cy="336" r="29" fill="#0b1324"/>
        <circle cx="200" cy="336" r="29" fill="none" stroke="${url('gold')}" stroke-width="${cfg.chestGoldStroke}"/>
        ${hasGlow ? `<circle cx="200" cy="336" r="25" fill="${url('coreGlow')}"/>` : ''}
        <circle class="d-chest-core" cx="200" cy="336" r="20" fill="${url('core')}"/>
        <ellipse cx="193" cy="328" rx="6" ry="4" fill="#fff" opacity=".9"/>
        <g class="d-chest-heart">${at(200, 323, 1.15, `<path d="${HEART}" fill="#ff8fb8"/>`)}</g>
      </g>
    </g>

    <!-- leher -->
    <ellipse cx="200" cy="266" rx="54" ry="12" fill="#0d1628"/>
    <ellipse cx="200" cy="264" rx="44" ry="6" fill="none" stroke="#6cc4ff" stroke-width="${lod === 'mini' ? 3.5 : 2.2}" opacity=".8"/>

    <!-- kepala -->
    <g class="d-head">
      ${fin('l')}
      ${fin('r')}
      ${ear('l', 66, 58)}
      ${ear('r', 334, 342)}
      <path d="${HEAD}" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.shellStroke}"/>
      <path d="M104 98 C124 76 152 66 186 64" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".95"/>

      <g class="d-visor">
        <path d="${VISOR}" fill="${url('visor')}"/>
        ${hasGlow ? `<ellipse class="d-visor-glow" cx="200" cy="166" rx="98" ry="64" fill="${url('eyeGlow')}" opacity=".58"/>` : ''}
        <path class="d-visor-rim" d="${VISOR}" fill="none" stroke="#5fbaff" stroke-width="${cfg.visorRimStroke}" opacity=".75"/>
        <path d="M128 112 C156 100 196 98 236 102" stroke="#fff" stroke-opacity=".22" stroke-width="8" fill="none" stroke-linecap="round"/>
        <g class="d-brackets" fill="none" stroke="#6fdcff" stroke-width="${cfg.bracketStroke}" stroke-linecap="round">
          ${hasGlow ? `<g stroke="#38bdf8" stroke-opacity=".28" stroke-width="${cfg.bracketStroke + 6}"><path d="M120 134 v-10 q0 -8 8 -8 h10"/><path d="M280 134 v-10 q0 -8 -8 -8 h-10"/><path d="M120 194 v10 q0 8 8 8 h10"/><path d="M280 194 v10 q0 8 -8 8 h-10"/></g>` : ''}
          <path d="M120 134 v-10 q0 -8 8 -8 h10"/><path d="M280 134 v-10 q0 -8 -8 -8 h-10"/>
          <path d="M120 194 v10 q0 8 8 8 h10"/><path d="M280 194 v10 q0 8 -8 8 h-10"/>
        </g>
        <g clip-path="url(#${g('visorClip')})"><g class="d-scan">
          <rect x="96" y="66" width="208" height="28" fill="${url('scan')}"/>
          <rect x="96" y="93" width="208" height="3" fill="#8fe8ff"/>
        </g></g>
      </g>

      <g class="d-gaze">
      <g class="d-eyes">
        <g class="d-eye-open">
          ${hasGlow ? `<ellipse class="d-eye-glow" cx="162" cy="160" rx="34" ry="40" fill="${url('eyeGlow')}"/><ellipse class="d-eye-glow" cx="238" cy="160" rx="34" ry="40" fill="${url('eyeGlow')}"/>` : ''}
          <ellipse class="d-eye d-eye-l" cx="162" cy="160" rx="17" ry="21" fill="${url('eye')}"/>
          <ellipse class="d-eye d-eye-r" cx="238" cy="160" rx="17" ry="21" fill="${url('eye')}"/>
        </g>
        <g class="d-eye-happy" fill="none" stroke="${url('eye')}" stroke-width="${cfg.eyeHappyStroke}" stroke-linecap="round">
          ${hasGlow ? `<ellipse cx="162" cy="158" rx="34" ry="26" fill="${url('eyeGlow')}" stroke="none"/><ellipse cx="238" cy="158" rx="34" ry="26" fill="${url('eyeGlow')}" stroke="none"/>` : ''}
          <path d="M140 170 Q162 140 184 170"/><path d="M216 170 Q238 140 260 170"/>
        </g>
        <g class="d-eye-sleep" fill="none" stroke="${url('eye')}" stroke-width="${cfg.eyeSleepStroke}" stroke-linecap="round">
          <path d="M142 164 Q162 176 182 164"/><path d="M218 164 Q238 176 258 164"/>
        </g>
        <g class="d-eye-wow" fill="none" stroke="${url('eye')}" stroke-width="${cfg.eyeWowStroke}">
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
      <g class="d-brows" fill="none" stroke="#ff8a7a" stroke-width="9" stroke-linecap="round">
        <path d="M134 126 L190 148"/><path d="M266 126 L210 148"/>
      </g>
      <g class="d-tears" fill="#9fe0ff">
        ${at(146, 184, 0, `<path class="d-tear d-tear-1" d="${DROP}"/>`)}
        ${at(254, 184, 0, `<path class="d-tear d-tear-2" d="${DROP}"/>`)}
        ${at(176, 188, 0, `<path class="d-tear d-tear-3" d="${DROP}"/>`)}
        ${at(224, 188, 0, `<path class="d-tear d-tear-4" d="${DROP}"/>`)}
      </g>
      <g class="d-spirals" fill="none" stroke="${url('eye')}" stroke-width="6" stroke-linecap="round">
        <g transform="translate(162 160)"><path class="d-spiral" d="M0 0 a4 4 0 0 1 8 0 a8 8 0 0 1 -16 0 a12 12 0 0 1 24 0 a16 16 0 0 1 -32 0"/></g>
        <g transform="translate(238 160)"><path class="d-spiral d-spiral-r" d="M0 0 a4 4 0 0 1 8 0 a8 8 0 0 1 -16 0 a12 12 0 0 1 24 0 a16 16 0 0 1 -32 0"/></g>
      </g>
      <g class="d-brows-w" fill="none" stroke="#bfeeff" stroke-width="7" stroke-linecap="round">
        <path d="M138 142 L186 124"/><path d="M262 142 L214 124"/>
      </g>
      <g class="d-xeyes" fill="none" stroke="#ff8a8a" stroke-width="9" stroke-linecap="round">
        <path d="M146 144 L178 176 M178 144 L146 176"/><path d="M222 144 L254 176 M254 144 L222 176"/>
      </g>
      <g class="d-eye-star" fill="${url('eye')}">
        ${at(162, 160, 1.7, `<path d="${STAR}"/>`)}${at(238, 160, 1.7, `<path d="${STAR}"/>`)}
      </g>
      <g class="d-eye-coin">
        <circle cx="162" cy="160" r="19" fill="${url('gold')}" stroke="#fff4de" stroke-width="3"/><text x="162" y="170" text-anchor="middle" font-size="27" font-weight="800" fill="#7a5420" font-family="Inter, system-ui, sans-serif">$</text>
        <circle cx="238" cy="160" r="19" fill="${url('gold')}" stroke="#fff4de" stroke-width="3"/><text x="238" y="170" text-anchor="middle" font-size="27" font-weight="800" fill="#7a5420" font-family="Inter, system-ui, sans-serif">$</text>
      </g>
      </g>

      <g class="d-gaze-soft"><g class="d-mouth">
        ${hasGlow ? `<ellipse class="d-mouth-glow" cx="200" cy="202" rx="30" ry="18" fill="${url('eyeGlow')}"/>` : ''}
        <path class="d-mouth-smile" d="M184 196 Q200 210 216 196" fill="none" stroke="#9ee6ff" stroke-width="${cfg.mouthSmileStroke}" stroke-linecap="round"/>
        <ellipse class="d-mouth-talk" cx="200" cy="200" rx="11" ry="7" fill="#9ee6ff"/>
        <ellipse class="d-mouth-o" cx="200" cy="202" rx="7" ry="8" fill="none" stroke="#9ee6ff" stroke-width="${cfg.mouthOStroke}"/>
        <path class="d-mouth-sad" d="M186 208 Q200 196 214 208" fill="none" stroke="#9ee6ff" stroke-width="${cfg.mouthSmileStroke}" stroke-linecap="round"/>
        <path class="d-mouth-flat" d="M186 206 H214" fill="none" stroke="#9ee6ff" stroke-width="${cfg.mouthSmileStroke}" stroke-linecap="round"/>
        <path class="d-mouth-wavy" d="M182 206 q4 -8 8 0 t8 0 t8 0 t8 0" fill="none" stroke="#9ee6ff" stroke-width="${cfg.mouthSmileStroke}" stroke-linecap="round"/>
        <path class="d-mouth-grin" d="M176 194 Q200 224 224 194 Z" fill="#9ee6ff"/>
      </g></g>

      <g class="d-cheeks">
        <ellipse cx="134" cy="196" rx="15" ry="8" fill="#ff9cc0" opacity=".55"/>
        <ellipse cx="266" cy="196" rx="15" ry="8" fill="#ff9cc0" opacity=".55"/>
      </g>
      <g class="d-mask"><path d="M156 192 Q200 184 244 192 L240 224 Q200 238 160 224 Z" fill="#e9f7ff" stroke="#7cc4ff" stroke-width="3"/><path d="M164 203 H236 M166 213 H234" stroke="#bcd9f5" stroke-width="2"/><path d="M156 194 Q136 190 130 176 M244 194 Q264 190 270 176" fill="none" stroke="#7cc4ff" stroke-width="3"/></g>
      <g class="d-hat"><path d="M168 72 L200 4 L232 72 Z" fill="#ff8fb8" stroke="#fff" stroke-width="2"/><path d="M178 52 H222 M187 34 H213" stroke="#fff4de" stroke-width="4" stroke-linecap="round"/><circle cx="200" cy="4" r="8" fill="#ffd76a"/></g>
      <g class="d-finger"><rect x="193" y="188" width="14" height="48" rx="7" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/><path d="M184 232 Q200 252 216 232 L216 246 Q200 266 184 246 Z" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/></g>
      <g class="d-whisper"><ellipse cx="256" cy="208" rx="20" ry="27" transform="rotate(-20 256 208)" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/><path d="M244 192 l10 -9 M249 202 l13 -7" stroke="#9fb7dc" stroke-width="3" stroke-linecap="round"/></g>
      <g class="d-earhand"><path d="M330 168 Q362 146 360 190 Q356 218 330 206 Z" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/><path d="M342 176 q8 -2 8 8" fill="none" stroke="#9fb7dc" stroke-width="3" stroke-linecap="round"/></g>
      <g class="d-facepalm"><ellipse cx="200" cy="170" rx="56" ry="42" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/><path d="M160 150 V128 M181 142 V118 M204 140 V116 M227 144 V122" stroke="#9fb7dc" stroke-width="3.5" stroke-linecap="round"/></g>
    </g>

    ${arm('l', 90)}
    ${arm('r', 310)}

    <!-- properti -->
    <g class="d-brush"><g transform="translate(234 238) rotate(38) scale(1.15)">
      <rect x="-30" y="-4.5" width="62" height="9" rx="4.5" fill="${url('blue')}" stroke="#fff" stroke-opacity=".6"/>
      <rect x="-52" y="-6.5" width="24" height="13" rx="5" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/>
      <g stroke="#bfeeff" stroke-width="3.4" stroke-linecap="round"><path d="M-47 -8 v-9"/><path d="M-40 -8 v-9"/><path d="M-33 -8 v-9"/></g>
    </g></g>
    <g class="d-foam" fill="#fff">
      <circle class="d-bub d-bub-1" cx="180" cy="214" r="6"/><circle class="d-bub d-bub-2" cx="214" cy="190" r="5"/>
      <circle class="d-bub d-bub-3" cx="190" cy="230" r="4"/><circle class="d-bub d-bub-4" cx="172" cy="196" r="3.5"/>
    </g>
    <g class="d-tooth">${at(200, 6, 0, `
      <circle r="50" fill="${url('halo')}"/>
      <path d="${TOOTH}" fill="${url('shell')}" stroke="#7cc4ff" stroke-width="3"/>
      <path d="M-15 -18 C-19 -10 -19 -2 -16 6" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g fill="#fff4de">${at(32, -26, .6, `<path class="d-tooth-star" d="${STAR}"/>`)}${at(-34, 20, .45, `<path class="d-tooth-star d-tooth-star-2" d="${STAR}"/>`)}</g>`)}
    </g>
  </g>
</g></g>

<g class="d-fx">
  <g class="d-sparks" fill="#fff1d6">
    <circle class="d-spark d-spark-1" cx="34" cy="250" r="3.5"/>
    <circle class="d-spark d-spark-2" cx="372" cy="214" r="3"/>
    <circle class="d-spark d-spark-3" cx="356" cy="388" r="2.5"/>
    <circle class="d-spark d-spark-4" cx="56" cy="400" r="2.5"/>
  </g>
  <g class="d-bubble">
    <rect x="316" y="-6" width="88" height="54" rx="27" fill="#0b1426" fill-opacity=".92" stroke="${url('gold')}" stroke-width="3"/>
    <circle cx="318" cy="60" r="7" fill="#0b1426" stroke="#ecca97" stroke-width="2.2"/>
    <circle cx="306" cy="76" r="4" fill="#0b1426" stroke="#ecca97" stroke-width="2"/>
    <g fill="#bfeeff"><circle class="d-bdot d-bdot-1" cx="342" cy="21" r="6"/><circle class="d-bdot d-bdot-2" cx="360" cy="21" r="6"/><circle class="d-bdot d-bdot-3" cx="378" cy="21" r="6"/></g>
  </g>
  <g class="d-waves" fill="none" stroke="#ecca97" stroke-linecap="round">
    <path class="d-wave d-wave-1" d="M368 146 q14 20 0 40" stroke-width="${lod === 'mini' ? 6 : 4.5}"/>
    <path class="d-wave d-wave-2" d="M382 130 q24 36 0 72" stroke-width="${lod === 'mini' ? 5.5 : 4}"/>
    <path class="d-wave d-wave-3" d="M396 114 q34 52 0 104" stroke-width="${lod === 'mini' ? 5 : 3.5}"/>
  </g>
  <g class="d-stars" fill="#fff4de">
    ${at(40, 92, 0, `<path class="d-star d-star-1" d="${STAR}"/>`)}
    ${at(368, 64, .8, `<path class="d-star d-star-2" d="${STAR}"/>`)}
    ${at(384, 318, .65, `<path class="d-star d-star-3" d="${STAR}"/>`)}
    ${at(24, 352, .7, `<path class="d-star d-star-4" d="${STAR}"/>`)}
    ${at(200, 18, .6, `<path class="d-star d-star-5" d="${STAR}"/>`)}
  </g>
  <g class="d-hearts" fill="#ff8fb8">
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
  <g class="d-exclaim" fill="${url('gold')}">
    <rect x="193" y="-36" width="14" height="40" rx="7"/><circle cx="200" cy="18" r="7.5"/>
  </g>
  <g class="d-haha" fill="#ecca97" font-family="Inter, system-ui, sans-serif" font-weight="700">
    <text class="d-ha d-ha-1" x="300" y="70" font-size="30">ha</text>
    <text class="d-ha d-ha-2" x="30" y="96" font-size="26">ha</text>
    <text class="d-ha d-ha-3" x="326" y="26" font-size="22">ha!</text>
  </g>
  <g class="d-bulb">
    <circle cx="200" cy="-14" r="24" fill="#ffe9a8" stroke="#ecca97" stroke-width="3"/>
    <path d="M188 6 H212 V16 Q212 22 206 22 H194 Q188 22 188 16 Z" fill="#c9a56a"/>
    <path d="M190 -14 Q200 -2 210 -14" fill="none" stroke="#ecca97" stroke-width="3" stroke-linecap="round"/>
    <g stroke="#ffe9a8" stroke-width="4" stroke-linecap="round"><path d="M200 -50 V-60"/><path d="M168 -34 L160 -42"/><path d="M232 -34 L240 -42"/><path d="M160 -12 H150"/><path d="M240 -12 H250"/></g>
  </g>
  <g class="d-quest" fill="${url('gold')}" font-family="Inter, system-ui, sans-serif" font-weight="800">
    <text class="d-q d-q-1" x="300" y="50" font-size="54">?</text>
    <text class="d-q d-q-2" x="56" y="76" font-size="34">?</text>
  </g>
  <g class="d-puffs" fill="#ffd5cc" opacity=".9">
    <circle class="d-puff d-puff-1" cx="58" cy="96" r="9"/><circle class="d-puff d-puff-2" cx="70" cy="80" r="6"/>
    <circle class="d-puff d-puff-3" cx="342" cy="96" r="9"/><circle class="d-puff d-puff-4" cx="330" cy="80" r="6"/>
  </g>
  <g class="d-vein" fill="none" stroke="#ff6b6b" stroke-width="5" stroke-linecap="round">
    ${at(320, 70, 1, `<path d="M-12 -4 Q-4 -4 -4 -12 M12 -4 Q4 -4 4 -12 M-12 4 Q-4 4 -4 12 M12 4 Q4 4 4 12"/>`)}
  </g>
  <g class="d-steam" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8">
    <path class="d-steam-1" d="M362 196 q-8 -12 0 -22 q8 -10 0 -22"/><path class="d-steam-2" d="M378 200 q-8 -12 0 -22 q8 -10 0 -22"/>
  </g>
  <g class="d-dizzy" fill="#fff4de">
    ${at(128, 36, 1.1, `<path d="${STAR}"/>`)}${at(272, 36, 1.1, `<path d="${STAR}"/>`)}${at(200, 0, 1.1, `<path d="${STAR}"/>`)}${at(200, 76, .9, `<path d="${STAR}"/>`)}
  </g>
  <g class="d-cloud">
    <g fill="#b9c6dc" stroke="#8fa3c4" stroke-width="2"><circle cx="158" cy="12" r="20"/><circle cx="200" cy="-4" r="26"/><circle cx="242" cy="12" r="20"/><rect x="158" y="12" width="84" height="20" rx="10" stroke="none"/></g>
    <g fill="#7cc4ff">${at(172, 46, .8, `<path class="d-rain d-rain-1" d="${DROP}"/>`)}${at(200, 50, .8, `<path class="d-rain d-rain-2" d="${DROP}"/>`)}${at(228, 46, .8, `<path class="d-rain d-rain-3" d="${DROP}"/>`)}</g>
  </g>
  <g class="d-snow" fill="#e8f7ff" stroke="#8fd0ff" stroke-width="1.5">
    ${at(60, 90, .6, `<path class="d-flake d-flake-1" d="${STAR}"/>`)}${at(340, 110, .5, `<path class="d-flake d-flake-2" d="${STAR}"/>`)}${at(40, 220, .45, `<path class="d-flake d-flake-3" d="${STAR}"/>`)}${at(366, 250, .6, `<path class="d-flake d-flake-4" d="${STAR}"/>`)}${at(120, 40, .5, `<path class="d-flake d-flake-5" d="${STAR}"/>`)}
  </g>
  <g class="d-sun">
    <g stroke="#ffd76a" stroke-width="4" stroke-linecap="round"><path d="M340 6 V-6 M340 74 V86 M300 40 H288 M380 40 H392 M312 12 L304 4 M368 12 L376 4 M312 68 L304 76 M368 68 L376 76"/></g>
    <circle cx="340" cy="40" r="22" fill="#ffd76a" stroke="#ffb347" stroke-width="3"/>
  </g>
  <g class="d-thermo">${at(342, 150, 0, `<rect x="-6" y="-34" width="12" height="52" rx="6" fill="#fff" stroke="#9fb7dc" stroke-width="2"/><circle cy="22" r="10" fill="#ff6b6b" stroke="#9fb7dc" stroke-width="2"/><rect x="-2.5" y="-8" width="5" height="30" fill="#ff6b6b"/>`)}</g>
  <g class="d-hourglass" fill="none" stroke="${url('gold')}" stroke-width="4" stroke-linecap="round">${at(200, 12, 1.35, `<path d="M-15 -24 H15 M-15 24 H15 M-12 -24 Q-12 -4 0 0 Q-12 4 -12 24 M12 -24 Q12 -4 0 0 Q12 4 12 24"/><path d="M-6 20 H6" stroke="#ffd76a"/>`)}</g>
  <g class="d-spinner">${at(200, 12, 1.35, `<circle r="20" fill="none" stroke="#bfeeff" stroke-width="5" opacity=".3"/><circle class="d-spin-arc" r="20" fill="none" stroke="${url('gold')}" stroke-width="6" stroke-linecap="round" stroke-dasharray="32 100"/>`)}</g>
  <g class="d-check">${at(336, 46, 0, `<circle r="24" fill="#3ddc84" stroke="#fff" stroke-width="3"/><path d="M-11 1 L-3 10 L12 -9" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`)}</g>
  <g class="d-warn">${at(336, 46, 0, `<path d="M0 -26 L26 20 H-26 Z" fill="#ffcc33" stroke="#e09b00" stroke-width="3" stroke-linejoin="round"/><rect x="-3.5" y="-12" width="7" height="20" rx="3.5" fill="#5b3a00"/><circle cy="14" r="4" fill="#5b3a00"/>`)}</g>
  <g class="d-lock">${at(336, 46, 0, `<path d="M-10 -4 V-14 a10 10 0 0 1 20 0 V-4" fill="none" stroke="${url('gold')}" stroke-width="6"/><rect x="-18" y="-4" width="36" height="28" rx="6" fill="${url('gold')}" stroke="#b78a4c" stroke-width="2"/><circle cy="9" r="4" fill="#5b3a00"/>`)}</g>
  <g class="d-shield">${at(336, 46, 0, `<path d="M0 -28 L24 -17 V4 Q24 22 0 31 Q-24 22 -24 4 V-17 Z" fill="#5fbaff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M-10 2 L-3 10 L11 -8" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>`)}</g>
  <g class="d-chart">${at(336, 50, 0, `<rect x="-26" y="2" width="12" height="22" rx="2" fill="#7cc4ff"/><rect x="-6" y="-10" width="12" height="34" rx="2" fill="#5fbaff"/><rect x="14" y="-24" width="12" height="48" rx="2" fill="#3f8ff0"/><path d="M-28 -8 L-6 -24 L8 -16 L28 -38" fill="none" stroke="#3ddc84" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`)}</g>
  <g class="d-cake">${at(200, 398, 0, `<ellipse cy="28" rx="50" ry="9" fill="#e8eef9"/><rect x="-36" y="-6" width="72" height="34" rx="7" fill="#ffd1dc"/><rect x="-36" y="-6" width="72" height="13" rx="6" fill="#fff"/><rect x="-3" y="-28" width="6" height="22" rx="2" fill="#7cc4ff"/><path class="d-flame" d="M0 -44 q-7 9 0 16 q7 -7 0 -16" fill="#ffb347"/>`)}</g>
  <g class="d-gift">${at(200, 404, 0, `<rect x="-32" y="-12" width="64" height="46" rx="6" fill="#ff8fb8"/><rect x="-7" y="-12" width="14" height="46" fill="#fff4de"/><rect x="-32" y="5" width="64" height="11" fill="#fff4de" opacity=".9"/><path d="M0 -12 q-20 -24 -24 -6 q5 9 24 6 q19 3 24 -6 q-4 -18 -24 6" fill="#fff4de"/>`)}</g>
  <g class="d-aura">
    ${at(54, 232, 1.3, `<path class="d-flame" d="M0 -34 Q18 -10 8 10 Q4 20 -2 20 Q-16 14 -10 -6 Q-4 6 0 -2 Q-2 -16 0 -34Z" fill="#ff9a3c"/>`)}${at(346, 232, 1.3, `<path class="d-flame d-flame-2" d="M0 -34 Q18 -10 8 10 Q4 20 -2 20 Q-16 14 -10 -6 Q-4 6 0 -2 Q-2 -16 0 -34Z" fill="#ff9a3c"/>`)}
  </g>
  <g class="d-growl" fill="${url('gold')}" font-family="Inter, system-ui, sans-serif" font-weight="800" font-size="20"><text x="200" y="462" text-anchor="middle">grrrk…</text></g>
  <g class="d-heartbig">${at(200, 8, 2.4, `<path d="${HEART}" fill="#ff8fb8"/>`)}</g>
  <g class="d-pray">${at(200, 322, 0, `<ellipse rx="14" ry="26" transform="rotate(-14)" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/><ellipse rx="14" ry="26" transform="rotate(14)" fill="${url('shell')}" stroke="${url('edge')}" stroke-width="${cfg.partStroke}"/>`)}</g>
  <g class="d-glitch"><rect x="88" y="118" width="224" height="7" fill="#ff5c8a" opacity=".65"/><rect x="100" y="176" width="200" height="5" fill="#5cffd0" opacity=".6"/><rect x="92" y="210" width="216" height="6" fill="#5c8aff" opacity=".6"/></g>
  <g class="d-sweat">${at(318, 96, 0, `<path d="${DROP}" fill="#a9e4ff"/>`)}</g>
  <g class="d-arrows" fill="none" stroke="${url('gold')}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path class="d-arrow d-arrow-1" d="M64 232 l-13 13 l13 13"/>
    <path class="d-arrow d-arrow-2" d="M44 232 l-13 13 l13 13"/>
    <path class="d-arrow d-arrow-3" d="M24 232 l-13 13 l13 13"/>
  </g>
</g>`;
}
