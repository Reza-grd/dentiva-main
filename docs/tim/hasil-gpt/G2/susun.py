from pathlib import Path
import json,math
P=Path(__file__).resolve().parent;P.mkdir(exist_ok=True)
def put(n,s):
 p=P/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.strip()+'\n',encoding='utf-8')
def lum(c):
 v=[int(c[i:i+2],16)/255 for i in (1,3,5)];return sum((x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4)*w for x,w in zip(v,[.2126,.7152,.0722]))
def contrast(a,b):x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
def color(v,css=None,desc=''):
 t={'$type':'color','$value':{'colorSpace':'srgb','components':[round(int(v[i:i+2],16)/255,8) for i in (1,3,5)],'alpha':1,'hex':v},'$description':desc}
 if css:t['$extensions']={'id.dentiva':{'cssVariable':css}}
 return t
light={'bg':'#F8FAFC','card':'#FFFFFF','text':'#163047','muted':'#475569','border':'#64748B','accent':'#0F766E','accent-secondary':'#115E59','info':'#1D4ED8','success':'#166534','warning':'#92400E','danger':'#B91C1C','focus':'#0F766E','on-accent':'#FFFFFF','selected':'#CCFBF1','hover':'#F1F5F9'}
dark={'bg':'#0B1220','card':'#141E2E','text':'#F8FAFC','muted':'#CBD5E1','border':'#94A3B8','accent':'#5EEAD4','accent-secondary':'#99F6E4','info':'#93C5FD','success':'#86EFAC','warning':'#FDE68A','danger':'#FCA5A5','focus':'#5EEAD4','on-accent':'#0B1220','selected':'#164E4A','hover':'#1E293B'}
neutrals=['#FFFFFF','#F8FAFC','#F1F5F9','#E2E8F0','#CBD5E1','#94A3B8','#64748B','#475569','#334155','#1E293B','#163047','#0B1220']
chartL=['#0F766E','#1D4ED8','#7E22CE','#BE123C','#92400E','#166534','#4338CA','#A21CAF']
chartD=['#5EEAD4','#93C5FD','#D8B4FE','#FDA4AF','#FDE68A','#86EFAC','#A5B4FC','#F0ABFC']
tokens={'$description':'Draf token Dentiva 1.0; format DTCG, dua tema eksplisit; belum dipasang ke aplikasi.','color':{'light':{k:color(v,'--color-'+k) for k,v in light.items()},'dark':{k:color(v,'--color-'+k) for k,v in dark.items()},'neutral':{f'n{i:02}':color(v) for i,v in enumerate(neutrals)},'chart':{'light':{f'c{i+1}':color(v) for i,v in enumerate(chartL)},'dark':{f'c{i+1}':color(v) for i,v in enumerate(chartD)}}},'legacy':{'accent':color('#6D28D9',desc='Aksen lama theme.css, jangan dihapus sebelum migrasi dan tinjauan merek.'),'accent-secondary':color('#4F46E5')},'space':{},'radius':{},'size':{},'motion':{'fast':{'$type':'duration','$value':{'value':160,'unit':'ms'}},'normal':{'$type':'duration','$value':{'value':240,'unit':'ms'}},'gesture':{'$type':'duration','$value':{'value':480,'unit':'ms'}},'ease':{'$type':'cubicBezier','$value':[.2,.8,.2,1]},'reduced':{'$type':'duration','$value':{'value':0,'unit':'ms'}}},'font':{'body':{'$type':'fontFamily','$value':['Inter','system-ui','sans-serif']},'display':{'$type':'fontFamily','$value':['Source Serif 4','Georgia','serif']},'size':{}},'shadow':{'card':{'$type':'shadow','$value':{'color':'{color.light.text}','offsetX':{'value':0,'unit':'px'},'offsetY':{'value':2,'unit':'px'},'blur':{'value':10,'unit':'px'},'spread':{'value':0,'unit':'px'}}}},'$extensions':{'id.dentiva':{'themeSelector':{ 'light':':root','dark':'.dark'},'cssAliases':{'--color-background':'--color-bg','--color-text-muted':'--color-muted','--color-dark-base':'--color-bg'},'source':'apps/clinic/src/styles/theme.css dan packages/ui/tailwind-preset.cjs'}}}
for n in [0,1,2,3,4,6,8,12,16]:tokens['space'][f's{n}']={'$type':'dimension','$value':{'value':4*n,'unit':'px'}}
for n,v in [('sm',8),('md',12),('lg',16),('xl',20),('2xl',24),('full',9999)]:tokens['radius'][n]={'$type':'dimension','$value':{'value':v,'unit':'px'},'$extensions':{'id.dentiva':{'cssVariable':'--radius-'+n}}}
for n,v in [('control',44),('control-compact',36),('row',52),('row-compact',40),('sidebar',240),('dialog',560),('icon',20),('stroke',2),('focus-ring',2)]:tokens['size'][n]={'$type':'dimension','$value':{'value':v,'unit':'px'}}
for n,v in [('display',40),('h1',32),('h2',24),('h3',20),('body',16),('small',14),('caption',12)]:tokens['font']['size'][n]={'$type':'dimension','$value':{'value':v,'unit':'px'}}
tokens['color']['chart']['sequential']={f's{i}':color(v) for i,v in enumerate(['#CCFBF1','#99F6E4','#5EEAD4','#2DD4BF','#0F766E','#115E59'])}
put('tokens.json',json.dumps(tokens,ensure_ascii=False,indent=2))
pairs=[]
for theme,c in [('light',light),('dark',dark)]:
 for fg in ['text','muted','accent','info','success','warning','danger','focus','border']:
  for bg in ['bg','card']:
   threshold=3 if fg in ['focus','border'] else 4.5;r=contrast(c[fg],c[bg]);pairs.append({'theme':theme,'foreground':fg,'background':bg,'ratio':round(r,4),'minimum':threshold,'pass':r>=threshold})
 for fg,bg in [('on-accent','accent'),('text','hover'),('text','selected')]:
  r=contrast(c[fg],c[bg]);pairs.append({'theme':theme,'foreground':fg,'background':bg,'ratio':round(r,4),'minimum':4.5,'pass':r>=4.5})
 for i,col in enumerate(chartL if theme=='light' else chartD):
  r=contrast(col,c['card']);pairs.append({'theme':theme,'foreground':'chart-'+str(i+1),'background':'card','ratio':round(r,4),'minimum':3,'pass':r>=3})
assert all(x['pass'] for x in pairs),[x for x in pairs if not x['pass']]
put('kontras.json',json.dumps(pairs,indent=2))
table='\n'.join(f"| {x['theme']} | {x['foreground']} / {x['background']} | {x['ratio']:.2f}:1 | {x['minimum']} | lulus |" for x in pairs)
put('design-system.md','''
# Sistem Desain Dentiva — Tenang dan Presisi
Versi 1.0 · 2026-10-17 · GPT · Status: spesifikasi usulan, belum implementasi.

## 1. Prinsip (lakukan / hindari)
1. Satu tugas dominan: satu tombol utama per konteks / hindari tiga CTA setara.
2. Data lebih dulu: angka dan rentang waktu eksplisit / hindari dekorasi menutupi hasil.
3. Ruang bernapas: kelompokkan dengan space.s4/s6 / hindari padding acak.
4. Keamanan terasa jelas: jelaskan alasan verifikasi / hindari lencana sertifikasi palsu.
5. Konsisten lintas peran: token sama, izin berbeda / jangan hanya menyembunyikan tombol.
6. Denti membantu: tampilkan saat relevan / hindari gerak berulang di tiap kartu.
7. Pemulihan jelas: pertahankan input dan beri coba lagi / hindari toast tanpa tindakan.
8. Aksesibilitas default: label, kontras, fokus / jangan memakai warna sebagai satu-satunya makna.

## 2. Evolusi dari implementasi
Sumber dibaca: theme.css, tailwind.config.js, packages/ui/tailwind-preset.cjs,
Button.tsx, Input.tsx, Dialog.tsx, dan Console DataTable.tsx. Pertahankan pemetaan
CSS yang ada. --color-accent violet lama disimpan di namespace legacy; teal dari
G1 adalah USULAN migrasi merek yang perlu diterapkan sekaligus dan ditinjau Ketua.
Jangan mengganti warna satu layar saja. Gelap diselaraskan ke #0B1220 sesuai G1.
Border lama #E2E8F0 boleh untuk pemisah dekoratif; batas kontrol bermakna memakai
color.*.border agar ≥3:1. Accent putih pada violet gelap lama jangan diteruskan
ke teal terang tema gelap: pasangan on-accent tema gelap adalah navy.
Alias --color-background→--color-bg dan --color-text-muted→--color-muted
mencegah dua sumber kebenaran. Preset Tailwind yang ada tetap digunakan.

## 3. Kontras dan warna
tokens.json menyimpan nilai DTCG eksplisit untuk terang/gelap dan 12 netral.
kontras.json dihitung oleh susun.py; tabel di bawah adalah seluruh pasangan yang
diizinkan untuk teks/kontrol. Pasangan lain memerlukan perhitungan baru.
Teks utama menargetkan AAA; teks lain minimal AA. Translucency pada teks dilarang.
Warna chart diuji terhadap permukaan, bukan berarti delapan seri saling berbeda
≥3:1. Pakai label langsung, marker/pola, dan tabel alternatif; grafik tumpang tindih
membutuhkan pengujian pasangan yang bersinggungan.

| Tema | Pasangan token | Rasio | Minimum | Hasil |
|---|---|---:|---:|---|
'''+table+'''

## 4. Tipografi
UI: Inter, SIL Open Font License 1.1; judul editorial pemasaran: Source Serif 4,
SIL Open Font License 1.1. Sumber lisensi: https://github.com/rsms/inter/blob/master/LICENSE.txt
dan https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md.
Rekomendasi aset: WOFF2 subset Latin yang mencakup bahasa Indonesia, self-host
setelah lisensi ditinjau; simpan berkas lisensi dan font-display:swap. Tidak menambah
font atau dependency aplikasi dalam paket ini. Inter yang sudah dipakai dipertahankan.
Display 40/48; h1 32/40; h2 24/32; h3 20/28; body 16/24; small 14/20; caption 12/16.
Bobot 400/500/600/700, heading tanpa uppercase berlebihan. Body ponsel tetap 16 px.
Keuangan: font-variant-numeric:tabular-nums, rata kanan; Intl.NumberFormat id-ID
untuk Rupiah, jangan memaksa dua desimal. Tanggal contoh 17 Okt 2026; waktu WIB
ditampilkan bila lintas zona. Jangan menyamakan tanggal UTC dengan hari klinik.

## 5. Jarak, radius, elevasi dan kepadatan
Gunakan space.s1=4 px hingga s16=64 px; padding kartu s6 desktop/s4 ponsel;
gap formulir s4, jarak seksi s8. Radius sm/md/lg/xl/2xl:8/12/16/20/24 px;
pil digunakan untuk status saja. Border 1 CSS px (dekorasi), focus-ring 2 px + offset
2 px. Elevasi kartu mengikuti shadow.card; dialog shadow lebih kuat hanya satu
lapisan. Hapus glow sebagai tanda utama interaksi. Permukaan dialog solid;
glass/backdrop blur opsional dekorasi di luar data klinis, tidak pada tabel padat.
Nyaman: control 44, row 52; ringkas: control-compact 36, row-compact 40 desktop.
Ponsel selalu hit area 44×44; ringkas mengurangi isi, bukan target sentuh.

## 6. Gerak dan ikon
motion.fast 160 ms hover/fokus, normal 240 ms dialog/peralihan, gesture 480 ms Denti;
ease [0.2,0.8,0.2,1]. Animasi memakai transform/opacity; jangan transition:all.
Reduced motion: durasi nol, skeleton statis, spinner diganti teks “Memuat…”,
pose Denti tetap bermakna. Gerak tidak menjadi satu-satunya indikator keberhasilan.
Lucide yang sudah ada dipertahankan (ISC); ikon 20 px, stroke 2, dekoratif aria-hidden.
Ikon aksi tanpa teks wajib accessible name; label yang sama pada tooltip dan aria-label.
Ilustrasi Denti untuk bantuan/kosong, ikon untuk tindakan; hindari emoji sebagai status klinis.

## 7. Data-viz
Delapan warna kategorikal ada pada tokens.color.chart.light/dark. Sekuensial teal
untuk besaran satu variabel; label nilai dan legenda wajib. Merah/hijau hanya
semantik dengan ikon dan tanda minus/plus. Grafik keuangan menyebut pendapatan
lunas, periode, satuan Rp, dan sumber agregasi; nol berbeda dari tidak ada data.
Sumbu batang mulai nol; jangan memotong sumbu untuk membesar-besarkan perubahan.
Tooltip juga tersedia lewat fokus keyboard, tabel data alternatif dapat dibaca.
Jangan membandingkan dua periode tidak lengkap tanpa keterangan.

## 8. Penerapan
25 spesifikasi komponen ada di komponen/. Default semua teks memakai text/card;
muted/card untuk pendukung; primary memakai on-accent/accent; semantic/card untuk
galat/peringatan. Hover memakai text/hover; selected memakai text/selected.
Spesifikasi adalah rencana. Axe, focus trap, responsif, dan anggaran bundel tetap
harus diperiksa Antigravity setelah implementasi; dokumen ini tidak mengklaim lolos.
''')
components=[
('tombol','Tombol','Button.tsx','label, ikon opsional, indikator proses','primary / secondary / danger / outline / ghost / link','Enter atau Space mengaktifkan tombol; type=button kecuali submit.','Jangan menggeser lebar ketika label berubah menjadi “Menyimpan…”.','Simpan perubahan'),
('input','Input','Input.tsx','label, input, petunjuk, galat','teks / angka / pencarian / sandi','Tab berpindah; Enter submit bila konteks tunggal; jangan blok paste.','id wajib stabil agar aria-describedby tidak menjadi undefined-error.','Nomor telepon'),
('select','Select','Select.tsx','label, pemicu, opsi, hasil pencarian','native / searchable','Panah memilih, Enter konfirmasi, Escape tutup; pertahankan pilihan saat pencarian kosong.','Gunakan combobox/listbox hanya bila pola interaksinya benar.','Pilih pemasok'),
('pilihan','Pilihan','usulan berbasis input native','label, checkbox/radio/switch, bantuan','checkbox / radio / switch','Space toggle; radio memakai panah antaropsi; grup fieldset+legend.','Switch menyimpan preferensi langsung hanya bila ada pemulihan galat.','Aktifkan pengingat'),
('tabel','Tabel Data','Table.tsx dan Console DataTable.tsx','caption, header sort, baris, aksi, pagination','nyaman / ringkas / selectable','Sort adalah button dalam th; aksi baris tautan nyata; jangan seluruh baris menjadi satu-satunya akses.','Pagination server 25/50/100; sticky header; hasil pencarian tidak memuat seluruh dataset.','Daftar pengeluaran'),
('kartu','Kartu','Card.tsx','judul, isi, meta, footer','default / ringkasan / actionable','Kartu statis tidak masuk tab order; tautan pada judul jika membuka detail.','Hanya satu CTA utama; jangan membungkus tombol dalam tautan kartu.','Ringkasan klinik'),
('dialog','Dialog','Dialog.tsx','judul, deskripsi, isi, aksi, tombol tutup','formulir / konfirmasi / destruktif','Trap fokus; Escape tutup jika aman; kembalikan fokus pemicu.','Gunakan Radix yang sudah ada; alertdialog untuk keputusan mendesak, bukan semua dialog.','Konfirmasi perubahan'),
('drawer','Drawer','usulan memakai primitive Dialog','judul, isi scroll, footer sticky','detail / formulir','Trap fokus hanya modal; Escape kembali; restore fokus baris asal.','Ponsel selebar viewport, footer tidak menutup field saat keyboard terbuka.','Detail transaksi'),
('toast','Toast','Toast.tsx','status, pesan, aksi opsional, tutup','success / info / error','Aksi dapat difokus; jangan memindahkan fokus ke toast otomatis.','role=status untuk sukses; alert hanya galat mendesak; galat penting juga inline.','Perubahan tersimpan.'),
('tab','Tab','Tabs.tsx','tablist, tab, panel','horizontal / scroll ponsel','Panah/Home/End; roving tabindex; aktivasi manual bila memuat jaringan.','Pertahankan filter panel; tab bukan navigasi halaman jika URL harus berubah.','Ringkasan'),
('badge','Badge','usulan StatusBadge Console','teks status, ikon opsional','netral / sukses / peringatan / bahaya','Noninteraktif tidak menerima fokus; interaktif harus tombol terpisah.','Tidak hanya warna; tampilkan “Tertunda”, “Lunas”, “Kedaluwarsa”.','Tertunda'),
('tooltip','Tooltip','Tooltip.tsx','pemicu, penjelasan singkat','default / shortcut','Muncul hover dan fokus; Escape tutup; konten tetap saat pointer bergerak ke tooltip.','Tidak menyimpan informasi wajib, formulir, atau tautan di tooltip.','Cari halaman (Ctrl+K)'),
('skeleton','Skeleton','Skeleton.tsx','placeholder mengikuti layout final','teks / tabel / kartu','Tidak ada tab stop; container aria-busy; satu status memuat.','Reduced motion tanpa shimmer; setelah timeout beri pemulihan, bukan skeleton abadi.','Memuat data…'),
('empty-state','Empty State','Console States.tsx','judul, penjelasan, aksi relevan','awal / pencarian / tanpa hasil','CTA mengikuti urutan DOM; fokus pencarian dipertahankan bila tanpa hasil.','Bedakan tidak ada data dari gagal memuat dan tanpa izin.','Belum ada pengeluaran.'),
('error-state','Error State','Console States.tsx','ringkasan, sebab aman, retry, bantuan','inline / panel / halaman','Fokus ringkasan galat setelah submit gagal; tautan ke field bermasalah.','Jangan tampilkan stack trace, token, atau data mentah layanan.','Data belum dapat dimuat.'),
('breadcrumb','Breadcrumb','usulan navigasi semantic','nav, daftar induk, halaman kini','desktop / ringkas ponsel','Tautan native; aria-current=page untuk halaman terakhir.','Sembunyikan tingkat tengah visual bila sempit dengan menu berlabel.','Pengaturan'),
('pagination','Pagination','Console DataTable.tsx Pager','rentang hasil, halaman, prev/next','angka / prev-next','Label eksplisit; halaman kini aria-current; fokus tetap pada tombol navigasi.','Reset ke halaman 1 setelah filter; jangan halaman kosong saat data berkurang.','Halaman berikutnya'),
('date-picker','Date Picker','usulan input date native terlebih dahulu','label, tanggal, bantuan zona waktu','tanggal / rentang','Input manual tersedia; kalender panah/Home/End/PageUp bila custom.','Format input dan parser konsisten, tanggal akhir tidak sebelum awal.','Periode laporan'),
('command-palette','Command Palette','RENCANA','dialog, search, kategori, hasil, shortcut','halaman / tindakan berizin','Ctrl+K atau Cmd+K, panah hasil, Enter buka, Escape tutup.','Filter peran di sumber data dan server; tidak mencari isi rekam medis global.','Cari halaman atau tindakan…'),
('kartu-usulan-agen','Kartu Usulan Agen','AgentActions.jsx','judul, sebelum/sesudah, peringatan, status, aksi','pending / applied / rejected / expired / undone','Setujui/Tolak tombol terpisah; konfirmasi tindakan berisiko melalui Dialog.','State server menentukan kemampuan; stok masuk tidak diberi Batalkan otomatis; persetujuan massal atomik.','Periksa usulan sebelum menyetujui.'),
('kartu-kpi','Kartu KPI','AdminDashboard.jsx','label, nilai, periode, perbandingan','uang / jumlah / rasio','Kartu statis tidak fokus; rincian lewat tautan bernama.','Jangan mengisi data gagal dengan nol; agregat admin tanpa identitas pasien.','Pendapatan lunas'),
('bagan-keuangan','Bagan Keuangan','FinancialDashboard.jsx','judul, periode, plot, legenda, tabel alternatif','batang / garis / distribusi','Tiap titik dapat diakses atau sediakan tabel ekuivalen; tooltip via fokus.','Pendapatan dan arus kas dibedakan; label sumber data dan periode.','Pendapatan per hari'),
('avatar-denti','Avatar Denti','DentiMascot.jsx','SVG, teks status terpisah','mini / standar / hero','Ilustrasi dekoratif aria-hidden jika teks setara ada; pemicu bantuan berupa button.','Gunakan LOD G1; radius tidak memotong wave; title pendek jika informatif.','Denti, asisten Dentiva'),
('banner-sesi','Banner Offline dan Sesi','RENCANA','status koneksi/sesi, tindakan aman','offline / reconnecting / expired / locked','Setelah sesi habis fokus heading login; draft sensitif tidak dibacakan di banner.','Offline menonaktifkan mutasi; jangan menyimpan RME ke localStorage sebagai fallback.','Koneksi terputus. Periksa jaringan.'),
('pusat-notifikasi','Pusat Notifikasi','RENCANA','pemicu jumlah, panel, item, filter, status baca','informasi / peringatan / tindakan','Panel nonmodal memakai urutan fokus normal; Escape tutup; item punya tautan bernama.','Notifikasi per role dan clinic_id; tidak menaruh identitas/diagnosis pada preview layar terkunci.','Notifikasi klinik')]
for slug,name,source,anatomy,variants,keyboard,specific,label in components:
 put('komponen/'+slug+'.md',f'''
# {name}
Versi 1.0 · Status: SPESIFIKASI USULAN · Sumber: {source}

## Anatomi dan varian
{anatomy}. Varian: {variants}. Nama komponen ini dipakai persis oleh G3.

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
{keyboard} Label terlihat dan accessible name harus sama. Status proses memakai
aria-live=polite pada satu wilayah, jangan seluruh halaman. Ornamen aria-hidden.

## Aturan teks
Contoh label: “{label}”. Gunakan kata kerja langsung untuk aksi, huruf kalimat,
tanpa klaim sertifikasi atau keberhasilan sebelum respons server terverifikasi.
Jelaskan galat dengan langkah lanjut; jangan menyalahkan staf.

## Ketentuan khusus
{specific}

## Verifikasi implementasi
Uji seluruh state dengan keyboard, teks panjang, zoom 200%, ponsel 375 px,
tema terang/gelap, reduced motion dan axe. Gunakan pasangan kontras yang diizinkan
di ../kontras.json; opacity pada teks/kontrol bermakna perlu perhitungan ulang.
Uji kosong, jaringan lambat, respons gagal, dan perubahan izin saat layar terbuka.
''')
put('contoh-halaman.md','''
# Contoh Dashboard Admin
Status: wireframe usulan; gunakan agregat tanpa identitas pasien.

```text
Desktop 1440
+----------------+--------------------------------------------------+
| Dentiva        | Dashboard             [Periode] [Cari Ctrl+K] [N] |
| Navigasi 240   | Pendapatan lunas | Pengeluaran | Margin            |
|                | Bagan pendapatan                    | Catatan Denti|
|                | Ringkasan bahan / tindakan prioritas               |
+----------------+--------------------------------------------------+

Ponsel 375
+---------------------------------+
| Dashboard             [Cari] [N] |
| [Periode laporan]               |
| Pendapatan lunas                |
| Pengeluaran      Margin         |
| Bagan + tautan tabel            |
| Catatan Denti + usulan          |
| Navigasi bawah per peran        |
+---------------------------------+
```

Padding space.s6/s4, gap s4, kartu radius.lg. Komponen: Kartu KPI, Bagan Keuangan,
Avatar Denti, Kartu Usulan Agen, Date Picker, Command Palette, Pusat Notifikasi.
Judul “Kondisi klinik hari ini”; pendapatan “Pembayaran berstatus lunas”.
Galat kartu berdiri sendiri; jangan menjadikan seluruh halaman kosong bila satu
bagian gagal. Pending data memakai Skeleton, tanpa data memakai Empty State.
Setujui hanya muncul pada usulan pending yang dibuat admin itu; tidak ada aksi
pembayaran/pasien di dashboard admin. Seluruh fitur baru diberi label RENCANA
dalam tiket implementasi, bukan dipresentasikan seolah sudah tersedia.
''')
print(f'G2: 25 komponen, {len(pairs)} pasangan kontras lulus, tokens.json valid.')
