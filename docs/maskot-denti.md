# Denti — maskot AI Dentiva (konsep visual V3 + kerangka animasi)

Bentuk V3: kepala lebar membulat dengan **visor hitam besar** dan aksen sudut biru; **headphone** di kedua
sisi (muka biru, cincin emas) dengan **antena sisi** berupa sirip cahaya lembut — **tanpa antena atas**;
tubuh telur porselen dengan panel biru bawah dan **lampu dada** biru bercincin emas; **lengan terpisah**
berbentuk kapsul membulat (ujung biru, gelang emas) yang melayang di samping tubuh; **cincin orbit** berpartikel dan
**cincin cahaya** tempat melayang.

Palet: porselen `#F7FAFF`, biru navy `#0A1E3A`, biru es `#7DD3FF`, emas lembut `#F1C98B`, layar gelap `#0B121E`.

## File

| File | Isi |
|---|---|
| `apps/clinic/src/components/mascot/dentiSvg.js` | SVG Denti dipecah per bagian (rig) + `DENTI_STATES`. |
| `apps/clinic/src/components/mascot/denti.css` | Animasi tingkat 1–3 + mode anak. |
| `apps/clinic/src/components/mascot/DentiMascot.jsx` | `<DentiMascot state kid size />`, `useDentiDirector` (play/sequence), `DENTI_DURATIONS`. |
| `D:\dentiva\dentiva-launch\tools\build-denti-scene.mjs` | Adegan pratinjau dari sumber yang sama → `scenes/11-denti-rig.html`; rekam `node record.mjs 11-denti-rig`. |

## Bagian (sendi dalam viewBox 400×480)

`.d-orbit` (SMIL, di belakang) · `.d-shadow` (cincin, sendi 200,464) · `.d-root` (melayang, 200,360) ·
`.d-arm-l` (bahu 90,322) · `.d-arm-r` (bahu 310,322) · `.d-body` + `.d-chest` / `.d-chest-core` ·
`.d-head` (leher 200,262) · `.d-fin-l/r` · `.d-ear-l/r` · `.d-visor` + `.d-visor-rim` + `.d-brackets` ·
mata `.d-eye-open | .d-eye-happy | .d-eye-sleep | .d-eye-wow` · mulut `.d-mouth-smile | .d-mouth-talk | .d-mouth-o` ·
`.d-cheeks` · efek `.d-bubble`, `.d-waves`, `.d-stars`, `.d-hearts`, `.d-zzz`, `.d-sparks`.

## Animasi bertingkat

| Tingkat | `data-state` | Kapan | Gerak |
|---|---|---|---|
| 1 · dasar | `idle` | selalu / menunggu | melayang 4 dtk, kedip, lampu dada & aksen visor berdenyut, sirip bergoyang, partikel orbit |
| 2 · ekspresi | `happy` | suasana ramah | mata tersenyum, bergoyang |
| | `wave` | menyapa pasien | lambai tangan kanan, kepala miring |
| | `talk` | membacakan info/tips | gelembung chat, mulut bergerak, tangan menjelaskan |
| | `think` | AI memproses | mata melirik, tangan di dagu, gelembung titik |
| | `sleep` | klinik tutup / malam | mata terpejam, "Zzz", lampu redup, gerak lambat |
| 3 · rangkaian | `call` (6 dtk) | pasien dipanggil | maju & membesar, menunjuk, gelombang suara dari headphone, lampu dada berkedip |
| | `celebrate` (2,4 dtk) | momen spesial | melompat, dua tangan ke atas, bintang meledak |
| | `wake` (6 dtk) | pembukaan pagi | tidur → terkejut → meregang → melambai |
| pengubah | `data-kid="true"` | antrean anak | memantul, pipi merona, hati & bintang, tangan bergoyang |

## Pemakaian

```jsx
import DentiMascot, { useDentiDirector } from '../mascot/DentiMascot';

const { state, play, sequence } = useDentiDirector('idle');
play('call');                         // 1 putaran 6 dtk lalu kembali 'idle'
sequence([['wake'], ['wave', 3000]]); // pagi: bangun → menyapa → idle
<DentiMascot state={state} kid={kategoriUsia === 'anak'} size={260} />
```

## Rencana integrasi layar antrean (tahap berikut)

1. Denti `idle` di layar antrean; pengumuman pasien dipanggil → `call`.
2. Kategori usia pasien dipanggil (anak/remaja/dewasa/lansia) dari `get_queue_display` — **tanpa** nama
   atau tanggal lahir → `kid` untuk anak; gaya sapaan/tips menyesuaikan.
3. Antrean kosong → `talk` bergantian dengan tips kesehatan gigi; di luar jam praktik → `sleep`;
   pembukaan pagi → `wake`.
4. `prefers-reduced-motion` mematikan semua animasi CSS.
