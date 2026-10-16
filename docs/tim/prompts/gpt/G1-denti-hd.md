# GPT · G1 — Art direction & aset Denti HD

**Lampirkan:** `00-ringkasan-proyek.md`, `03-aturan-kerja-tim.md`, `bundel/GPT-denti.md` (berisi `dentiSvg.js` ringkas, `denti.css` bagian rig, `maskot-denti.md`, token tema).
**Simpan keluaran ke:** `docs/tim/hasil-gpt/G1/`.

```
PAKET G1 — ART DIRECTION & ASET DENTI HD

KONTEKS
Denti adalah maskot AI Dentiva (gigi ramah-profesional). Saat ini tampak BLUR / kurang HD. Penyebab teknis yang sudah kami analisis: gambar SVG berkoordinat 400×480
dikecilkan ke 58–68 px sehingga garis 2–3 unit jadi ±0,3–0,5 px; ±30 filter SVG (blur/glow) dan 20 gradien merusak ketajaman; animasi scale() pada grup membesarkan bitmap.
Kami butuh desain & aset yang dirancang UNTUK ukuran kecil, bukan sekadar dikecilkan, dengan kesan premium & mahal.

TUGASMU
1) KRITIK DESAIN (art-direction.md §1): nilai maskot saat ini dari kode terlampir — proporsi, siluet, keterbacaan di 58 px, kontras, konsistensi, kesan "kemahalan". Jujur & spesifik.
2) ART DIRECTION (art-direction.md §2): karakter, palet terang & gelap (palet.json, nilai hex + rasio kontras terhadap latar #FFFFFF dan #0B1220), pencahayaan, material enamel
   glossy halus, aturan garis (≥ 1,5 piksel perangkat pada ukuran tampil), bayangan lembut tanpa <filter>, bahasa gerak (pegas, anticipation, durasi/easing), 12 ekspresi inti.
3) TIGA LOD (lod-aturan.md): mini (≤72 px), standar (96–160), hero (≥220). Tulis aturan tegas tiap LOD: jumlah elemen maks, garis minimum, gradien/filter yang BOLEH/DILARANG,
   ukuran mata/mulut, elemen yang dihilangkan di mini. mini = siluet kuat, garis tebal, TANPA <filter> dan tanpa gradien rumit.
4) ASET SVG: untuk 6 state inti — idle, happy, talk, think, wave, sorry — buat SVG pada 3 LOD = 18 berkas "svg/<state>.<lod>.svg".
   SYARAT TEKNIS KETAT:
   • viewBox="0 0 400 480" (sama dengan yang sekarang), tanpa width/height tetap, tanpa skrip, tanpa <style> eksternal, tanpa <image>.
   • PERTAHANKAN kait rig yang dipakai denti.css (daftar kelas/ID di bundel): d-root, d-head, d-arm-l, d-arm-r, d-mouth-*, d-eye-*, dst. Titik pivot memakai koordinat viewBox.
   • LOD mini: tidak boleh ada <filter>, <feGaussianBlur>, atau opacity bertingkat banyak; garis ≥ 7 unit (≈1,2 px pada 58 px) di elemen utama.
   • Gunakan id unik per berkas dengan awalan "dm-"/"dh-"/"ds-" untuk gradien agar tidak bentrok bila beberapa Denti tampil bersamaan.
   • Aksesibilitas: tambahkan <title> pendek.
5) LEMBAR EKSPRESI (ekspresi.md): deskripsi + sketsa SVG sederhana untuk 12 state inti lain (celebrate, love, confused, sleep, scan, point, cool, shy, surprise, idea, bow, thanks).
6) CATATAN RIG (catatan-rig.md): apa yang berubah dibanding rig lama, dan konsekuensinya untuk denti.css (perubahan yang kamu sarankan, jangan memaksakan).

KELUARAN (tiap berkas di blok kode terpisah, "### BERKAS: docs/tim/hasil-gpt/G1/<nama>"):
art-direction.md, lod-aturan.md, palet.json, svg/<18 berkas>, ekspresi.md, catatan-rig.md, serah-terima.md (templat 03 §4).

KRITERIA LULUS (periksa sendiri sebelum menyerahkan, tulis hasilnya di serah-terima):
- SVG valid XML; mini tanpa <filter>; kait rig lengkap; garis minimum terpenuhi pada 58 px @2×; palet lolos AA pada latar terang & gelap.
- Konsisten antar-state & antar-LOD (satu karakter, bukan tiga).
Mulai dengan kritik & art direction; tunggu "lanjut" dariku sebelum mengeluarkan 18 SVG (agar bisa kuperiksa arah desainnya dahulu).
```
