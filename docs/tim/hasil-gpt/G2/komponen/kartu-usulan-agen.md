# Kartu Usulan Agen
Versi 1.0 · Status: SPESIFIKASI USULAN · Sumber: AgentActions.jsx

## Anatomi dan varian
judul, sebelum/sesudah, peringatan, status, aksi. Varian: pending / applied / rejected / expired / undone. Nama komponen ini dipakai persis oleh G3.

## Ukuran dan token
font.size.body/small; space.s2/s3/s4/s6; radius.md untuk kontrol dan radius.lg
untuk panel. Hit area size.control (44) di ponsel, size.control-compact (36)
hanya desktop ringkas. Label tidak dipotong bila memuat makna tindakan.

## Seluruh state
| State | Tampilan dan perilaku |
|---|---|
| default | text/card; teks pendukung muted/card; batas border/card |
| hover | text/hover untuk bagian interaktif; bagian statis tetap, tanpa affordance palsu |
| fokus | focus terhadap card, ring size.focus-ring + offset 2 px; tidak terpotong overflow |
| aktif | text/selected; aria-pressed/selected/current hanya bila sesuai semantik komponen |
| nonaktif | Tidak bisa memicu aksi; native disabled untuk kontrol; penjelasan alasan di dekatnya; konten statis tidak diredupkan |
| memuat | aria-busy pada wilayah terkait; label proses; cegah submit ganda; pertahankan ukuran dan data sebelumnya |
| galat | danger/card + pesan konkret dan tindakan pemulihan; pertahankan input/pilihan; tanpa klaim data tersimpan |

Untuk komponen noninteraktif, hover/fokus/aktif/nonaktif berarti keadaan tersebut
tidak membuat kontrol baru; hanya anak interaktif menerapkannya. Jangan menambah
tabindex pada teks hanya untuk memenuhi daftar state.

## Keyboard dan ARIA
Setujui/Tolak tombol terpisah; konfirmasi tindakan berisiko melalui Dialog. Label terlihat dan accessible name harus sama. Status proses memakai
aria-live=polite pada satu wilayah, jangan seluruh halaman. Ornamen aria-hidden.

## Aturan teks
Contoh label: “Periksa usulan sebelum menyetujui.”. Gunakan kata kerja langsung untuk aksi, huruf kalimat,
tanpa klaim sertifikasi atau keberhasilan sebelum respons server terverifikasi.
Jelaskan galat dengan langkah lanjut; jangan menyalahkan staf.

## Ketentuan khusus
State server menentukan kemampuan; stok masuk tidak diberi Batalkan otomatis; persetujuan massal atomik.

## Verifikasi implementasi
Uji seluruh state dengan keyboard, teks panjang, zoom 200%, ponsel 375 px,
tema terang/gelap, reduced motion dan axe. Gunakan pasangan kontras yang diizinkan
di ../kontras.json; opacity pada teks/kontrol bermakna perlu perhitungan ulang.
Uji kosong, jaringan lambat, respons gagal, dan perubahan izin saat layar terbuka.
