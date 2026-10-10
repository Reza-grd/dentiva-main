/**
 * DENTI — maskot AI Dentiva (desain orisinal Dentiva, v2).
 *
 * SVG dipecah menjadi BAGIAN (rig) yang digerakkan oleh denti.css lewat atribut
 * data-state / data-kid pada elemen <svg class="denti">:
 *
 *   .d-shadow   cincin cahaya & bayangan (di luar .d-root, tidak ikut melayang)
 *   .d-root     seluruh badan (melayang)
 *     .d-arm-l / .d-arm-r   lengan melayang (sendi di bahu)
 *     .d-body   tubuh telur + .d-chest (cincin cahaya bergambar "D")
 *     .d-head   kepala (sendi di leher)
 *       .d-petal-l / .d-petal-r   kelopak cahaya di pod telinga
 *       .d-visor  kaca wajah + .d-visor-rim
 *       .d-eyes   .d-eye-open | .d-eye-happy | .d-eye-sleep  (dipilih menurut state)
 *       .d-mouth  .d-mouth-smile | .d-mouth-talk
 *       .d-cheeks pipi merona (mode anak)
 *   .d-fx       .d-waves (memanggil, dari pod telinga kanan) .d-stars (rayakan / anak) .d-dots (berpikir) .d-zzz (tidur)
 *
 * Ciri khas Denti: kepala squircle dengan dua lekukan mahkota (isyarat gigi), tanpa antena,
 * pod telinga bercincin emas dengan kelopak cahaya, cincin dada berhuruf "D".
 * Semua koordinat dalam viewBox 0 0 400 480.
 */
export const DENTI_STATES = ['idle', 'wave', 'call', 'think', 'talk', 'celebrate', 'sleep'];

export function dentiSvg(uid = 'd') {
  const g = (n) => `${uid}-${n}`;
  return `
<defs>
  <linearGradient id="${g('shell')}" x1="0.2" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#f1f5fb"/><stop offset="1" stop-color="#cdd8ea"/>
  </linearGradient>
  <linearGradient id="${g('shellEdge')}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset="1" stop-color="#9fb4d6" stop-opacity=".6"/>
  </linearGradient>
  <linearGradient id="${g('visor')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1d2b48"/><stop offset=".6" stop-color="#0a1222"/><stop offset="1" stop-color="#050913"/>
  </linearGradient>
  <linearGradient id="${g('eye')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#eaf6ff"/><stop offset="1" stop-color="#6fb6ff"/>
  </linearGradient>
  <linearGradient id="${g('petal')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d9ecff"/><stop offset="1" stop-color="#5a9cf0"/>
  </linearGradient>
  <radialGradient id="${g('gold')}" cx=".35" cy=".3" r=".8">
    <stop offset="0" stop-color="#fff3dc"/><stop offset=".55" stop-color="#e6c698"/><stop offset="1" stop-color="#b48a4c"/>
  </radialGradient>
  <radialGradient id="${g('halo')}">
    <stop offset="0" stop-color="#7ec8ff" stop-opacity=".6"/><stop offset="1" stop-color="#7ec8ff" stop-opacity="0"/>
  </radialGradient>
  <filter id="${g('glow')}" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="${g('soft')}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
  <filter id="${g('shadow')}" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#020611" flood-opacity=".55"/>
  </filter>
</defs>

<g class="d-shadow">
  <ellipse cx="200" cy="458" rx="120" ry="20" fill="url(#${g('halo')})" filter="url(#${g('soft')})"/>
  <ellipse class="d-ring-outer" cx="200" cy="456" rx="92" ry="12" fill="none" stroke="#7ec8ff" stroke-width="2.5" opacity=".75"/>
  <ellipse class="d-ring-inner" cx="200" cy="456" rx="58" ry="7" fill="none" stroke="#e6c698" stroke-width="2" opacity=".7"/>
</g>

<g class="d-root">
  <g filter="url(#${g('shadow')})">
    <!-- tubuh -->
    <g class="d-body">
      <path d="M200 266 C256 266 280 302 280 344 C280 394 247 424 200 424 C153 424 120 394 120 344 C120 302 144 266 200 266 Z"
            fill="url(#${g('shell')})" stroke="url(#${g('shellEdge')})" stroke-width="2"/>
      <path d="M146 312 C152 292 170 280 192 278" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>
      <path d="M150 398 C170 414 230 414 250 398" stroke="#9fb4d6" stroke-width="2" fill="none" opacity=".45"/>
      <g class="d-chest">
        <circle cx="200" cy="334" r="25" fill="url(#${g('visor')})"/>
        <circle cx="200" cy="334" r="25" fill="none" stroke="url(#${g('gold')})" stroke-width="4"/>
        <path class="d-chest-glyph" d="M192 322 v24 h6 c9 0 14 -5 14 -12 c0 -7 -5 -12 -14 -12 z" fill="none" stroke="#a9d8ff" stroke-width="4" stroke-linejoin="round" filter="url(#${g('glow')})"/>
      </g>
    </g>

    <!-- lengan kiri (sendi bahu 128,300) -->
    <g class="d-arm-l"><g transform="rotate(16 128 300)">
      <rect x="109" y="294" width="38" height="96" rx="19" fill="url(#${g('shell')})" stroke="url(#${g('shellEdge')})" stroke-width="1.5"/>
      <rect x="109" y="352" width="38" height="8" rx="4" fill="url(#${g('gold')})"/>
      <rect x="109" y="360" width="38" height="30" rx="15" fill="#7fb6f2" opacity=".55"/>
    </g></g>
    <!-- lengan kanan (sendi bahu 272,300) -->
    <g class="d-arm-r"><g transform="rotate(-16 272 300)">
      <rect x="253" y="294" width="38" height="96" rx="19" fill="url(#${g('shell')})" stroke="url(#${g('shellEdge')})" stroke-width="1.5"/>
      <rect x="253" y="352" width="38" height="8" rx="4" fill="url(#${g('gold')})"/>
      <rect x="253" y="360" width="38" height="30" rx="15" fill="#7fb6f2" opacity=".55"/>
    </g></g>

    <!-- leher -->
    <rect x="176" y="252" width="48" height="18" rx="9" fill="#9fc6f2" opacity=".85"/>

    <!-- kepala (sendi leher 200,258) -->
    <g class="d-head">
      <g class="d-petal-l"><path d="M72 152 C54 132 56 104 70 92 C84 108 88 134 78 154 Z" fill="url(#${g('petal')})" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.2"/></g>
      <g class="d-petal-r"><path d="M328 152 C346 132 344 104 330 92 C316 108 312 134 322 154 Z" fill="url(#${g('petal')})" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.2"/></g>

      <circle cx="86" cy="170" r="24" fill="url(#${g('shell')})" stroke="url(#${g('shellEdge')})" stroke-width="1.5"/>
      <circle cx="86" cy="170" r="17" fill="none" stroke="url(#${g('gold')})" stroke-width="5"/>
      <circle cx="86" cy="170" r="8" fill="#7fb6f2"/>
      <circle cx="314" cy="170" r="24" fill="url(#${g('shell')})" stroke="url(#${g('shellEdge')})" stroke-width="1.5"/>
      <circle cx="314" cy="170" r="17" fill="none" stroke="url(#${g('gold')})" stroke-width="5"/>
      <circle cx="314" cy="170" r="8" fill="#7fb6f2"/>

      <!-- tempurung kepala: squircle dengan dua lekukan mahkota -->
      <path d="M200 88 C214 74 238 68 260 72 C294 78 312 110 312 152 L312 180 C312 224 282 254 238 256 L162 256 C118 254 88 224 88 180 L88 152 C88 110 106 78 140 72 C162 68 186 74 200 88 Z"
            fill="url(#${g('shell')})" stroke="url(#${g('shellEdge')})" stroke-width="2"/>
      <path d="M118 120 C128 98 146 86 170 84" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".95"/>

      <g class="d-visor">
        <rect x="110" y="116" width="180" height="114" rx="52" fill="url(#${g('visor')})"/>
        <rect class="d-visor-rim" x="113" y="119" width="174" height="108" rx="49" fill="none" stroke="#7ec8ff" stroke-width="1.6" opacity=".55"/>
        <path d="M134 136 C156 126 186 124 214 128" stroke="#ffffff" stroke-opacity=".22" stroke-width="7" fill="none" stroke-linecap="round"/>
      </g>

      <g class="d-eyes" filter="url(#${g('glow')})">
        <g class="d-eye-open">
          <rect class="d-eye d-eye-l" x="150" y="150" width="27" height="40" rx="13.5" fill="url(#${g('eye')})"/>
          <rect class="d-eye d-eye-r" x="223" y="150" width="27" height="40" rx="13.5" fill="url(#${g('eye')})"/>
        </g>
        <g class="d-eye-happy" fill="none" stroke="url(#${g('eye')})" stroke-width="10" stroke-linecap="round">
          <path d="M150 176 Q163.5 156 177 176"/><path d="M223 176 Q236.5 156 250 176"/>
        </g>
        <g class="d-eye-sleep" fill="none" stroke="url(#${g('eye')})" stroke-width="7" stroke-linecap="round">
          <path d="M150 172 Q163.5 180 177 172"/><path d="M223 172 Q236.5 180 250 172"/>
        </g>
      </g>

      <g class="d-mouth" filter="url(#${g('glow')})">
        <path class="d-mouth-smile" d="M188 206 Q200 215 212 206" fill="none" stroke="#a9d8ff" stroke-width="4.5" stroke-linecap="round"/>
        <ellipse class="d-mouth-talk" cx="200" cy="208" rx="10" ry="6" fill="#a9d8ff"/>
      </g>

      <g class="d-cheeks">
        <ellipse cx="136" cy="200" rx="14" ry="8" fill="#ff9fbe" opacity=".45"/>
        <ellipse cx="264" cy="200" rx="14" ry="8" fill="#ff9fbe" opacity=".45"/>
      </g>
    </g>
  </g>
</g>

<g class="d-fx">
  <g class="d-waves" fill="none" stroke="#e6c698" stroke-linecap="round">
    <path class="d-wave d-wave-1" d="M346 156 q10 14 0 28" stroke-width="4"/>
    <path class="d-wave d-wave-2" d="M360 144 q18 26 0 52" stroke-width="3.5"/>
    <path class="d-wave d-wave-3" d="M374 132 q26 38 0 76" stroke-width="3"/>
  </g>
  <g class="d-stars" fill="#fff3dc" filter="url(#${g('glow')})">
    <path class="d-star d-star-1" transform="translate(52 96)" d="M0 -14 C2 -3 3 -2 14 0 C3 2 2 3 0 14 C-2 3 -3 2 -14 0 C-3 -2 -2 -3 0 -14Z"/>
    <path class="d-star d-star-2" transform="translate(352 74)" d="M0 -11 C2 -2 2 -2 11 0 C2 2 2 2 0 11 C-2 2 -2 2 -11 0 C-2 -2 -2 -2 0 -11Z"/>
    <path class="d-star d-star-3" transform="translate(360 300)" d="M0 -9 C1.5 -2 2 -1.5 9 0 C2 1.5 1.5 2 0 9 C-1.5 2 -2 1.5 -9 0 C-2 -1.5 -1.5 -2 0 -9Z"/>
    <path class="d-star d-star-4" transform="translate(44 330)" d="M0 -10 C2 -2 2 -2 10 0 C2 2 2 2 0 10 C-2 2 -2 2 -10 0 C-2 -2 -2 -2 0 -10Z"/>
  </g>
  <g class="d-dots" fill="#a9d8ff">
    <circle class="d-dot d-dot-1" cx="300" cy="64" r="6"/><circle class="d-dot d-dot-2" cx="322" cy="48" r="8"/><circle class="d-dot d-dot-3" cx="350" cy="28" r="10"/>
  </g>
  <g class="d-zzz" fill="#a9d8ff" font-family="Inter, system-ui, sans-serif" font-weight="600">
    <text class="d-z d-z-1" x="292" y="74" font-size="22">z</text>
    <text class="d-z d-z-2" x="314" y="50" font-size="28">z</text>
    <text class="d-z d-z-3" x="340" y="22" font-size="34">Z</text>
  </g>
</g>`;
}
