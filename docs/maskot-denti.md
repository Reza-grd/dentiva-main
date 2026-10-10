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
| `D:\dentiva\dentiva-launch\tools\build-denti-scene.mjs` | Adegan pratinjau dari sumber yang sama → `scenes/11-denti-rig.html`; rekam `node record.mjs 11-denti-rig`; aksi tambahan → `scenes/11b-denti-aksi.html`. |

## Bagian (sendi dalam viewBox 400×480)

`.d-orbit` (SMIL, di belakang) · `.d-shadow` (cincin, sendi 200,464) · `.d-root` (melayang, 200,360) ·
`.d-arm-l` (bahu 90,322) · `.d-arm-r` (bahu 310,322) · `.d-body` + `.d-chest` / `.d-chest-core` ·
`.d-head` (leher 200,262) · `.d-fin-l/r` · `.d-ear-l/r` · `.d-visor` + `.d-visor-rim` + `.d-brackets` ·
mata `.d-eye-open | .d-eye-happy | .d-eye-sleep | .d-eye-wow` · mulut `.d-mouth-smile | .d-mouth-talk | .d-mouth-o` ·
`.d-cheeks` · efek `.d-bubble`, `.d-waves`, `.d-stars`, `.d-hearts`, `.d-zzz`, `.d-sparks`, `.d-notes`, `.d-exclaim`,
`.d-haha`, `.d-sweat`, `.d-arrows` · properti `.d-brush` + `.d-foam`, `.d-tooth`, `.d-chest-heart`, `.d-scan` ·
ekspresi `.d-eye-heart`, `.d-lids`, `.d-mouth-sad`.

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

### Aksi tambahan

| `data-state` | Kapan | Gerak |
|---|---|---|
| `brush` | tips kebersihan gigi | sikat gigi di depan mulut, busa meletup |
| `tooth` | tips / "gigi sehat!" | gigi berkilau melayang di atas kepala, tangan ta-da |
| `scan` | AI menganalisis data | garis pindai menyapu visor, mata menyipit, tangan di headphone |
| `point` | arahkan pasien ("silakan ke ruang periksa") | tangan kiri menunjuk, mata melirik, panah emas |
| `sorry` | antrean tertunda / gangguan | mata sedih, mulut cemberut, keringat, sirip turun |
| `dance` | hiburan saat antrean santai | bergoyang kiri-kanan, tangan bergantian, not musik |
| `laugh` | candaan / momen lucu | tertawa terguncang, pegang perut, "ha ha" |
| `love` | ucapan sayang / anak | mata hati, hati berdebar di dada, memeluk |
| `shy` | dipuji | tangan menutup mulut, pipi merona, sirip turun |
| `surprise` (2 dtk) | kejutan / pengumuman | melonjak, mata membulat, tanda seru, tangan terbuka |
| `spin` (2 dtk) | perayaan kecil | jongkok → salto 360° → mendarat, bintang |
| `thanks` (3,2 dtk) | pasien selesai / terima kasih | melambai lalu membungkuk dengan tangan di dada, hati |

Catatan rig: lengan digambar **setelah** kepala agar tangan bisa tampil di depan wajah; posisi
bintang/hati/not ada di `<g>` pembungkus supaya tidak tertimpa transform animasi.

## Pemakaian

```jsx
import DentiMascot, { useDentiDirector } from '../mascot/DentiMascot';

const { state, play, sequence } = useDentiDirector('idle');
play('call');                         // 1 putaran 6 dtk lalu kembali 'idle'
sequence([['wake'], ['wave', 3000]]); // pagi: bangun → menyapa → idle
<DentiMascot state={state} kid={kategoriUsia === 'anak'} size={260} />
```

## Integrasi layar antrean (aktif)

`apps/clinic/src/components/queue/QueueDisplay.jsx` + aturan murni `apps/clinic/src/utils/dentiQueue.js`.

| Situasi | Denti | Teks bar bawah |
|---|---|---|
| Di luar jam praktik & antrean kosong | `sleep` | "Klinik sedang di luar jam praktik…" |
| Klinik baru buka | `wake` → `wave` | — |
| Belum ada yang diperiksa | tips bergilir tiap 9 dtk: `brush`, `tooth`, `talk`, `dance` | tips kesehatan gigi |
| Pasien berikutnya terlambat ≥ 30 mnt dari jam janji | `sorry` | "Mohon maaf atas waktu tunggunya…" |
| Pasien dipanggil | kartu pengumuman: `point` (mode anak bila `kid`) | — |
| Pasien selesai | `thanks` | — |
| Ada yang diperiksa | Denti kecil di kiri bar bawah, `idle` (+ mode anak) | pesan klinik |

- Jam praktik = jadwal dokter aktif hari ini (`doctor_schedules`), buka 30 mnt lebih awal & tutup 30 mnt
  sesudahnya; tanpa jadwal dianggap tutup 22.00–06.00.
- `get_queue_display` (migrasi `20261010110158_queue_display_mascot`) menambah `hours` dan `kid` (boolean,
  usia < 12 th). **Tanggal lahir tidak pernah dikirim** ke layar.
- `prefers-reduced-motion` mematikan semua animasi CSS.
