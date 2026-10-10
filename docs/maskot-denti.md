# Denti — maskot AI Dentiva (rig animasi v2)

Desain orisinal Dentiva: kepala *squircle* dengan dua lekukan mahkota (isyarat gigi), satu antena
bercahaya emas, pod telinga bercincin emas dengan kelopak cahaya biru, visor kaca gelap, mata cahaya
biru es, tubuh telur porselen dengan cincin dada berhuruf **D**, lengan melayang, cincin cahaya di bawah.

Palet: porselen `#F1F5FB`, visor `#0A1222`, biru es `#A9D8FF`/`#7EC8FF`, emas sampanye `#E6C698`, latar `#050814`.

## File

| File | Isi |
|---|---|
| `apps/clinic/src/components/mascot/dentiSvg.js` | SVG Denti dipecah per bagian (rig) + daftar `DENTI_STATES`. |
| `apps/clinic/src/components/mascot/denti.css` | Semua animasi: gerak dasar + keadaan + mode anak. |
| `apps/clinic/src/components/mascot/DentiMascot.jsx` | Komponen React `<DentiMascot state kid size />` + hook `useDentiDirector`. |
| `D:\dentiva\dentiva-launch\tools\build-denti-scene.mjs` | Membangun adegan pratinjau dari sumber yang sama → `scenes/11-denti-rig.html` (rekam: `node record.mjs 11-denti-rig`). |

## Bagian (sendi dalam koordinat viewBox 400×480)

`.d-root` (melayang, sendi 200,340) · `.d-head` (leher 200,258) · `.d-arm-l` (bahu 128,300) ·
`.d-arm-r` (bahu 272,300) · `.d-petal-l/r` · `.d-antenna` + `.d-antenna-light` · `.d-visor` + `.d-visor-rim` ·
`.d-eye-open | .d-eye-happy | .d-eye-sleep` · `.d-mouth-smile | .d-mouth-talk` · `.d-cheeks` · `.d-chest` ·
`.d-shadow` (cincin) · efek: `.d-waves`, `.d-stars`, `.d-dots`, `.d-zzz`.

## Keadaan (`data-state`)

| State | Kapan dipakai | Gerak |
|---|---|---|
| `idle` | Layar antrean menunggu | Melayang 4 dtk, kedip, kelopak & antena berdenyut |
| `wave` | Menyapa pasien / pembuka hari | Lambai tangan kanan, mata tersenyum, kepala miring |
| `call` | Pasien dipanggil | Menunjuk, gelombang suara dari antena, mengangguk |
| `think` | AI sedang memproses | Mata melirik ke atas, tangan di dagu, titik-titik |
| `talk` | AI membacakan info / tips | Mulut bergerak, tepi visor berdenyut, tangan menjelaskan |
| `celebrate` | Pasien selesai / momen spesial | Dua tangan ke atas, lompat, bintang |
| `sleep` | Klinik tutup / malam | Mata terpejam, "Zzz", gerak lambat, cahaya redup |

`data-kid="true"` = **mode anak** (digabung dengan state apa pun): memantul ceria, pipi merona, bintang.

## Pemakaian

```jsx
import DentiMascot, { useDentiDirector } from '../mascot/DentiMascot';

const { state, play } = useDentiDirector('idle');
// saat pasien dipanggil:
play('call', 7000);            // 7 detik lalu kembali ke 'idle'
<DentiMascot state={state} kid={kategoriUsia === 'anak'} size={260} />
```

## Rencana integrasi layar antrean (tahap berikut)

1. Denti siaga di layar antrean; saat pengumuman pasien dipanggil → `call`.
2. Kategori usia pasien yang dipanggil (anak/remaja/dewasa/lansia) dikirim `get_queue_display`
   **tanpa** tanggal lahir/nama → `kid` untuk anak, gaya bicara/tips menyesuaikan.
3. Saat antrean kosong: `talk` bergantian dengan tips kesehatan gigi; di luar jam praktik: `sleep`.
4. `prefers-reduced-motion` mematikan semua animasi.
