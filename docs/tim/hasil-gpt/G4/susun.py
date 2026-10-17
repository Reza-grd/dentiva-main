from pathlib import Path
import json
P=Path(__file__).resolve().parent
LABEL='DRAF — perlu ditinjau advokat/DPO/auditor'
def put(n,title,s,owner='Ketua Tim dan fungsi privasi yang ditunjuk'):
 p=P/n;p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(f'# {title}\n\n**{LABEL}**\n\nVersi 1.0 · Tanggal 2026-10-17 · Pemilik: {owner}.\nPeriode tinjau: tahunan, setelah insiden/perubahan material; tinjau awal sebelum disahkan.\nStatus: usulan internal; tidak ada klaim sertifikasi atau audit independen.\n\n'+s.strip()+'\n',encoding='utf-8')
put('sumber-dan-bukti.md','Register Sumber dan Batas Pembuktian','''
## Cara membaca status
Ada = bukti spesifik dalam kode/dokumen; bukan verifikasi produksi saat ini.
Sebagian = kontrol atau proses belum lengkap. Belum = belum ada bukti yang cukup,
bukan kepastian bahwa kontrol tidak pernah dilakukan. Acuan kode: commit 36ba347.
Papan Ketua 17 Okt lebih baru daripada 00; laporan runtime tetap perlu dikonfirmasi.

## Bukti internal
| ID | Bukti | Hal yang dapat disimpulkan | Batas |
|---|---|---|---|
| E01 | supabase/migrations/20260928000400_tenant_guard.sql:91–128 | policy tenant restrictive | perlu regresi dua klinik |
| E02 | supabase/migrations/20261011160000_tahap2_hak_akses.sql:290–320 | admin dilarang data pasien; kasir resepsionis | frontend belum selalu seragam |
| E03 | infra/vps/docker-compose.dentiva.yml:21–29; docs/tim/04-papan-tugas.md L1 | konfigurasi TOTP, min8+huruf/angka, HIBP; Ketua melaporkan aktif | AAL2 klinik masih sebagian; HIBP gagal-terbuka |
| E04 | supabase/migrations/20261017090000_audit_log_tambah_saja_berantai.sql:18–117 | SHA-256 per klinik, trigger tambah-saja, audit_verify_chain | superuser dapat menonaktifkan/rekomputasi; jangkar eksternal belum ada |
| E05 | infra/vps/bin/backup-harian.sh:1–75; docs/backup-dr.md §1–5 | snapshot konsisten, age, auth.mfa_factors, manifest, retensi lokal14 hari | offsite belum aktif; bukan bukti restore terbaru |
| E06 | infra/vps/bin/salin-backup-offsite.sh; docs/backup-dr.md §3 | skrip tersedia | belum tujuan/jadwal; verifikasi ukuran bukan bukti isi seluruh objek |
| E07 | infra/vps/bin/pantau.sh:1–75; papan L4 | pemeriksaan kesehatan/disk/backup/sertifikat | kanal WA menunggu konfigurasi; bukan pemantauan eksternal independen |
| E08 | infra/vps/README.md §Kondisi server; Caddyfile; docker-compose.dentiva.yml:1–18 | SSH keys, ufw/fail2ban menurut laporan; bind localhost | belum scan ulang runtime |
| E09 | apps/clinic/vercel.json:8–41 | CSP/HSTS/Permissions-Policy sumber | header runtime perlu diperiksa; ada style unsafe-inline, tidak sama dengan script unsafe-inline |
| E10 | docs/denti-agen.md §Prinsip; supabase/functions/ai-assistant/agent.ts:264–297 | model hanya usul; apply admin, expiry dan pemeriksaan ulang | pertahanan injeksi bukan jaminan sempurna |
| E11 | docs/tim/serah-terima/T3-email-templates.md | template email ditinjau | SMTP belum operasional |
| E12 | apps/console/src/lib/auth.tsx:67–85 | UI assurance AAL2 Console | jangan digeneralisasi ke semua jalur clinic |

## Sumber resmi diperiksa 17 Oktober 2026
- [UU PDP 27/2022, naskah resmi](https://peraturan.bpk.go.id/Home/Download/224884/UU%20Nomor%2027%20Tahun%202022.pdf).
- [Permenkes 24/2022, naskah resmi](https://peraturan.bpk.go.id/Home/Download/301563/Permenkes%20Nomor%2024%20Tahun%202022.pdf).
- [SATUSEHAT interoperabilitas](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/integrations/).
- [ISO/IEC 27001:2022 katalog](https://www.iso.org/standard/27001).
- [ISO 27799:2025 katalog](https://www.iso.org/standard/84647.html).
- [OWASP ASVS](https://owasp.org/projects/asvs?tab=main), versi stabil yang ditampilkan 5.0.0.
- [OWASP API Top 10 2023](https://api-security.owasp.org/editions/2023/en/0x04-release-notes/).

Naskah lengkap ISO berlisensi tidak tersedia untuk pemeriksaan ini. Pemetaan ID
adalah register kerja awal, bukan Statement of Applicability final. Katalog
mengonfirmasi ISO 27799:2025; jangan memakai 2016 sebagai edisi terbaru tanpa tinjauan.
Implementasi hukum lanjutan, kanal regulator yang berlaku, kewajiban PSE dan
ketentuan sektoral terbaru harus ditinjau advokat sebelum publikasi/kontrak.
''')
threats=[('Web/desktop','S,T,I','Pencurian sesi/XSS membaca data peran','E09 CSP, E02 izin','Token/draft/perangkat bersama',4,5,'TOTP+AAL2, auto-lock, sanitasi, uji role'),('Gateway/Auth','S,D,E','Credential stuffing atau assurance turun','E03,E08','Rate-limit Envoy/audit login belum lengkap',4,5,'Batas laju dan pengujian bypass, alert login'),('PostgREST/RPC','T,I,E','ID lintas tenant atau SECURITY DEFINER meluas','E01,E02','Regresi argumen tenant',3,5,'Dua tenant, cek search_path/EXECUTE, negative tests'),('Postgres/Storage','T,R,I','Objek Storage publik/ubah log oleh hak tinggi','E01,E04','Jangkar eksternal log belum ada',3,5,'Uji policy objek, ekspor kepala rantai'),('Edge functions','S,T,D,E','Webhook palsu, replay, secret terlalu luas','E10 dan router infra','Inventaris validasi setiap webhook',3,5,'Signature/replay/idempotensi per integrasi'),('WhatsApp sidecar','S,I,D','Profil sesi bocor atau nomor salah','E08 dan README WhatsApp','Sesi berisi riwayat, layanan tidak resmi',3,5,'Isolasi host, redaksi, evaluasi kanal resmi'),('AI/vendor','T,I,E','Instruksi berbahaya di data alat dan prompt','E10 usul→persetujuan','Keluaran model nondeterministik',4,4,'G6 injection, minimisasi payload, server allowlist'),('CI/CD/dependency','T,E','Paket berbahaya atau secret di artefak','CI sumber dan lockfile','SBOM/scan menyeluruh belum terpasang',3,5,'Pin dependency, secret scan, SBOM, review rilis'),('Backup/kunci','T,I,D','Disk VPS hilang bersama backup atau key hilang','E05 age dan manifest','Satu lokasi, restore belum diukur baru',4,5,'Offsite independen dan gladi pulih'),('Operator/vendor','S,R,I,E','Akun operator/penyedia disalahgunakan','E12 dan E08','Akses darurat dan DPA belum disahkan',3,5,'Persetujuan akses sementara, audit, review vendor')]
rows='\n'.join(f'| {a} | {s} | {v} | {m} | {gap} | {l}×{d}={l*d} | {rec} |' for a,s,v,m,gap,l,d,rec in threats)
put('model-ancaman.md','Model Ancaman STRIDE','''
## Ruang lingkup dan aset
Data identitas/klinis, transaksi, sesi, secrets, backup, audit dan usulan agen.
S/T/R/I/D/E = pemalsuan, manipulasi, penyangkalan, kebocoran, gangguan, eskalasi.
Skor kemungkinan/dampak 1–5 adalah penilaian awal tim, bukan statistik: 1 jarang/
terbatas, 3 masuk akal/signifikan, 5 sangat mungkin/kritis. ≥15 prioritas tinggi,
8–14 sedang, ≤7 rendah. Risiko residu baru dinilai setelah bukti mitigasi tersedia.

```mermaid
flowchart LR
  U[Staf web/Tauri] --> V[Frontend Vercel]
  U --> G[Caddy / Envoy]
  V --> G
  G --> A[Auth]
  G --> R[REST / RPC / Storage]
  R --> D[(Postgres + RLS)]
  G --> F[Edge Functions]
  F --> D
  F --> X[AI / pembayaran / SATUSEHAT]
  F --> W[WA sidecar]
  D --> B[Backup lokal terenkripsi]
  B -. RENCANA .-> O[Offsite independen]
```

Batas kepercayaan: perangkat staf, internet/gateway, jaringan layanan internal,
hak database, penyedia eksternal dan akun pengelola. Frontend bukan batas keamanan.
Vercel melayani aset; isi RME tetap berpotensi melewati layanan jaringan/browser
dan log, sehingga “semua data selalu di Indonesia” tidak dapat dijanjikan.

| Komponen | STRIDE | Ancaman | Mitigasi berbukti | Celah | Skor awal | Rekomendasi |
|---|---|---|---|---|---:|---|
'''+rows+'''

## Pemilik dan uji risiko
Ketua memegang backend/infra; Antigravity UI/CI usulan; klinik menentukan hak staf;
fungsi privasi menilai transfer/DPIA. Setiap mitigasi punya tiket, bukti uji dan
penerimaan residu tertulis. Skenario lintas clinic_id, replay apply, expired usulan,
token TV, Storage dan akun non-admin diuji di staging sintetis, bukan produksi.
''')
put('kepatuhan-uu-pdp.md','Pemetaan UU PDP','''
## Landasan yang perlu ditinjau
[UU 27/2022](https://peraturan.bpk.go.id/Home/Download/224884/UU%20Nomor%2027%20Tahun%202022.pdf):
data kesehatan termasuk data spesifik (Pasal 4); dasar pemrosesan tidak hanya
persetujuan (20); hak subjek terdapat pada 5–13; penilaian dampak risiko tinggi
pada 34; pemberitahuan kegagalan tertulis paling lambat 3×24 jam kepada subjek
dan lembaga pada 46; fungsi PDP bersyarat pada 53; transfer luar negeri bertingkat
pada 56. Ini ringkasan, bukan pengganti naskah atau analisis advokat.

## Register kesiapan operasional (usulan tim)
| Area | Status | Bukti / tindakan |
|---|---|---|
| Inventaris tujuan, dasar, peran | Belum lengkap | DPA/privasi draf; klinik umumnya pengendali RME, Dentiva prosesor sesuai instruksi; billing/akun dapat berbeda |
| Persetujuan dan transparansi | Sebagian | consent klinis bukan persetujuan universal semua pemrosesan; petakan per tujuan |
| Akses/koreksi/salinan | Sebagian | fitur data klinik ada E02; perlu alur permintaan terverifikasi dan log tindak lanjut |
| Penghapusan/pembatasan | Sebagian | jangan menghapus RME yang masih wajib disimpan; respons beralasan dan legal hold |
| DPIA | Belum | dokumentasikan aliran RME, AI, WA, vendor, akses operator dan risiko terhadap pasien |
| Fungsi privasi/DPO | Belum bukti penunjukan | advokat menilai kondisi dan skala; tetapkan narahubung sementara |
| Insiden | Sebagian | rencana tersedia, kontak/latihan belum disahkan; lihat respons-insiden.md |
| Transfer vendor | Sebagian | server Indonesia tidak meniadakan AI/CDN/telemetri lintas negara; evaluasi kontrak dan lokasi |
| Akuntabilitas | Sebagian | E04 audit + prosedur baru; bukti pelaksanaan belum tersedia |

## Prosedur permintaan — RENCANA
Terima melalui kontak privasi yang disahkan; verifikasi identitas secara proporsional,
daftarkan nomor kasus dan ruang data, tentukan pengendali, kirim ke klinik, cek
retensi/legal hold, lakukan oleh pihak berizin dan catat bukti/penolakan beralasan.
Jangan menyerahkan salinan melalui chat publik. Target internal triase 1 hari kerja
adalah usulan, bukan tenggat hukum; advokat menetapkan tenggat tiap jenis hak.
''')
put('kepatuhan-rme-satusehat.md','RME dan SATUSEHAT','''
## Rujukan
[Permenkes 24/2022](https://peraturan.bpk.go.id/Home/Download/301563/Permenkes%20Nomor%2024%20Tahun%202022.pdf):
Pasal 29 memuat kerahasiaan, integritas, ketersediaan; Pasal 30 mengatur akses;
Pasal 39 menetapkan penyimpanan RME paling singkat 25 tahun sejak kunjungan
terakhir pasien. Penghapusan akun/langganan tidak otomatis menghapus RME.
Advokat menilai penerapan bersama regulasi kesehatan terbaru dan keadaan klinik.

## Pemetaan implementasi
| Kebutuhan | Status | Bukti / gap / tindakan |
|---|---|---|
| Kerahasiaan dan pembagian peran | Sebagian | E01/E02; perlu review akses berkala dan koreksi affordance frontend |
| Integritas dan koreksi | Sebagian | guard kunjungan/lunas, E04 audit; bukti prosedur koreksi dan persetujuan klinik |
| Ketersediaan | Sebagian | E05 backup lokal; kehilangan VPS tetap risiko besar |
| Retensi jangka panjang | Belum lengkap | kebijakan draf, kapasitas/ekspor/akses setelah kontrak belum disepakati |
| Pembukaan informasi | Belum proses formal | klinik memverifikasi pemohon, dasar dan kewenangan; audit dan data minimal |
| Interoperabilitas | Sebagian: sandbox | sumber proyek menyatakan sandbox; jangan klaim integrasi produksi tuntas |

[Dokumentasi SATUSEHAT](https://satusehat.kemkes.go.id/platform/docs/id/api-catalogue/integrations/)
membedakan endpoint sandbox/produksi dan memakai FHIR R4. RENCANA penerimaan:
validasi organisasi/lokasi/praktisi, resource yang diwajibkan playbook klinik,
terminologi, consent yang relevan, outbox, retry/idempotensi, respons galat serta
rekonsiliasi penerimaan. Resource Patient hanya melalui peran/pemrosesan sah.
Dokumentasi API tersedia tidak membuktikan status akreditasi atau persetujuan vendor.

## Keputusan untuk pemilik
Tentukan kustodian ekspor dan jaminan kesinambungan RME saat klinik berhenti
berlangganan; jangan mencampur retensi database aktif dengan retensi backup 14 hari.
Uji pemulihan mengembalikan Storage, Auth/MFA, log dan metadata RME bersama data.
''')
# ID kontrol merupakan kerangka kerja; label pendek berikut parafrasa tim, bukan teks ISO.
themes={5:['Kebijakan disahkan','Penanggung jawab','Pemisahan tugas','Akuntabilitas manajemen','Hubungan otoritas','Komunitas keamanan','Intelijen ancaman','Keamanan proyek','Daftar aset','Pemakaian aset','Pengembalian aset','Klasifikasi data','Label data','Pengiriman informasi','Aturan akses','Siklus identitas','Informasi autentikasi','Tinjauan hak','Risiko pemasok','Kontrak pemasok','Rantai pasok TIK','Pemantauan pemasok','Layanan cloud','Persiapan insiden','Triase peristiwa','Penanganan insiden','Pelajaran insiden','Barang bukti','Keamanan saat gangguan','Kesiapan TIK pulih','Kewajiban hukum','Hak kekayaan intelektual','Perlindungan arsip','Privasi','Tinjauan independen','Kepatuhan kebijakan','Prosedur operasional'],6:['Penyaringan personel','Syarat hubungan kerja','Pelatihan keamanan','Proses disiplin','Perubahan/akhir hubungan','Kerahasiaan personel','Kerja jarak jauh','Laporan peristiwa'],7:['Batas area fisik','Masuk area','Ruang aman','Pemantauan fisik','Ancaman lingkungan','Kerja di area aman','Meja/layar bersih','Penempatan perangkat','Aset di luar lokasi','Media penyimpanan','Utilitas pendukung','Perlindungan kabel','Perawatan perangkat','Pembuangan perangkat'],8:['Perangkat pengguna','Hak istimewa','Pembatasan informasi','Akses kode sumber','Autentikasi aman','Kapasitas','Malware','Kerentanan teknis','Konfigurasi','Penghapusan informasi','Penyamaran data','Pencegahan kebocoran','Cadangan informasi','Redundansi','Pencatatan log','Pemantauan aktivitas','Sinkronisasi waktu','Utilitas berhak tinggi','Instalasi perangkat lunak','Keamanan jaringan','Layanan jaringan','Segmentasi','Penyaringan web','Kriptografi','Siklus pengembangan','Kebutuhan keamanan aplikasi','Arsitektur aman','Pengodean aman','Uji keamanan','Pengembangan pihak ketiga','Pemisahan lingkungan','Manajemen perubahan','Informasi uji','Keamanan saat audit']}
evidence={'5.15':('Sebagian','E01/E02','Uji hak berkala'),'5.16':('Sebagian','E03/E12','Joiner/mover/leaver terdokumentasi'),'5.18':('Sebagian','E02','Persetujuan pemilik klinik'),'5.24':('Sebagian','respons-insiden.md draf','Latihan dan kontak'),'5.30':('Sebagian','E05/E06','Offsite dan restore terukur'),'5.34':('Sebagian','kepatuhan-uu-pdp.md draf','DPIA dan proses hak'),'5.37':('Sebagian','E05/E08','Sahkan dan latihan runbook'),'8.3':('Ada pada kode','E01/E02','Regresi lintas tenant'),'8.5':('Sebagian','E03/E12','AAL2 klinik dan pemulihan'),'8.9':('Sebagian','E08/E09','Audit drift runtime'),'8.13':('Sebagian','E05/E06','Offsite + restore'),'8.14':('Belum','VPS tunggal','Rencana redundansi'),'8.15':('Sebagian','E04','Jangkar eksternal dan review'),'8.16':('Sebagian','E07','Alert luar host'),'8.20':('Sebagian','E08/E09','Uji rate-limit gateway'),'8.22':('Sebagian','E08','Review jaringan Docker'),'8.24':('Sebagian','E05 dan enkripsi menurut 00','Inventaris/rotasi kunci'),'8.29':('Sebagian','tes repo/CI','Pentest independen'),'8.31':('Sebagian','worktree dan lingkungan uji','Bukti pemisahan akses runtime'),'8.32':('Sebagian','03 aturan tim','Bukti approval rilis')}
iso=[]
for theme,names in themes.items():
 for i,name in enumerate(names,1):
  cid=f'{theme}.{i}';status,bukti,todo=evidence.get(cid,('Belum bukti memadai','Register G4 / belum bukti pelaksanaan','Tetapkan pemilik, bukti dan uji kontrol'))
  iso.append({'id':cid,'tema':{5:'Organisasi',6:'Personel',7:'Fisik',8:'Teknologi'}[theme],'labelTim':name,'status':status,'bukti':bukti,'tindakan':todo})
assert len(iso)==93
(P/'iso27001-register.json').write_text(json.dumps(iso,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
put('iso27001-pemetaan.md','Pemetaan Awal ISO 27001 dan Keamanan Kesehatan','''
## Batas penggunaan
[ISO/IEC 27001:2022](https://www.iso.org/standard/27001) adalah standar sistem
manajemen; sertifikasi tidak dapat disimpulkan dari adanya RLS/enkripsi.
Register 93 ID di bawah adalah cakupan kerja awal, dengan label parafrasa tim.
Naskah lengkap berlisensi belum diperiksa: auditor wajib mencocokkan tiap ID,
persyaratan, applicability, alasan pengecualian dan bukti sebelum menjadi SoA.
Tidak menyalin teks normatif standar. Belum bukti memadai tidak berarti kontrol
dipastikan tidak ada; jangan melaporkan semua item fisik gagal tanpa bukti vendor.

| ID | Tema | Label kerja tim | Status | Bukti | Tindakan |
|---|---|---|---|---|---|
'''+ '\n'.join(f"| {x['id']} | {x['tema']} | {x['labelTim']} | {x['status']} | {x['bukti']} | {x['tindakan']} |" for x in iso)+'''

## Lapisan kesehatan
[ISO 27799:2025](https://www.iso.org/standard/84647.html) merupakan edisi katalog
yang diperiksa. Pemetaan rinci klausul menunggu salinan berlisensi; tidak mengarang
nomor klausul. Register domain tim: akses klinis (E02, sebagian), integritas RME
(E04, sebagian), kesinambungan pelayanan (E05, sebagian), pertukaran eksternal
(SATUSEHAT sandbox, sebagian), perangkat bersama (auto-lock rencana), privasi
pasien dan kustodian arsip (kebijakan draf). Klinik dan penyedia harus menyepakati
bukti, tanggung jawab dan prosedur pelayanan ketika sistem tidak tersedia.

## Langkah ISMS di luar Annex A
Ketua menetapkan lingkup organisasi, aset/pihak berkepentingan, metodologi risiko,
pemilik risiko dan toleransi, SoA, pelatihan, sasaran terukur, audit internal,
tinjauan manajemen dan tindakan perbaikan. Semua masih perlu bukti pelaksanaan;
dokumen paket ini bukan pengganti proses manajemen tersebut.
''')
policies=[
('kontrol-akses','Kontrol Akses dan Peran','Data klinis, administrasi, keuangan, operator dan akses darurat.', ['Berikan izin berdasarkan tugas dan clinic_id; admin tidak memperoleh data pasien karena status pemilik.','Dokter melakukan perubahan klinis; resepsionis memproses kasir; service_role tidak ada di frontend.','RENCANA: joiner/mover/leaver dengan permintaan, persetujuan, waktu berlaku dan pencabutan; tinjauan hak tiap kuartal.','Akses darurat Ketua bersifat sementara, alasan tercatat, scope minimal dan review setelah kejadian.'], 'E01/E02/E12; izin UI RME perlu diselaraskan.','Pemilik klinik menyetujui hak staf; Ketua memasang kontrol backend.','Sampel dua tenant/tiap peran, bukti persetujuan dan pencabutan sesi.'),
('kriptografi-rahasia','Kriptografi dan Rahasia','Kunci enkripsi, token layanan, backup dan sertifikat.', ['Rahasia hanya di pengelola/server yang disetujui; dilarang di git, prompt, log, screenshot atau artefak tes.','Pisahkan kredensial per layanan/lingkungan, akses paling rendah; pencatatan penggunaan tanpa nilai secret.','Backup age memakai kunci publik; simpan salinan pembuka di dua lokasi aman dengan pemilik/pengganti.','RENCANA rotasi kunci envelope: inventaris versi, uji dekripsi data lama, rewrap terkontrol, prosedur kompromi dan rollback; jangan sekadar mengganti env.'], 'E05; enkripsi medis menurut 00 perlu bukti algoritme/cakupan dan rotasi.','Ketua kustodian; pemilik menyetujui recovery key.','Daftar key ID tanpa nilai, latihan pulih/dekripsi, tanggal rotasi dan pemusnahan.'),
('kata-sandi-mfa','Kata Sandi dan MFA','Akun staf, operator dan pemulihan akses.', ['Konfigurasi saat ini min8, huruf+angka, HIBP gagal-terbuka dan TOTP aktif (E03); bukan klaim memenuhi seluruh standar autentikasi.','RENCANA pemaksaan AAL2 untuk admin/dokter di database setelah UI siap; Console memiliki alur terpisah.','Jangan melarang paste/password manager; rate-limit dan audit login masih perlu pelaksanaan.','Penghapusan faktor, pemulihan akun dan reset email memerlukan verifikasi identitas; SMTP asli belum tersedia.'], 'E03/E11/E12.','Ketua backend; klinik memverifikasi staf; operator tidak meminta sandi/TOTP.','Enroll/challenge/unenroll, token AAL1 ditolak saat wajib AAL2, pemulihan akun uji.'),
('manajemen-perubahan','Manajemen Perubahan','Kode, database, infrastruktur, token desain dan rilis.', ['Satu worktree/cabang per anggota; hanya Ketua menyetujui merge/deploy.','Catat tujuan, risiko, diff, tes, bukti visual bila relevan, rollback dan pemilik perubahan.','Migrasi/infra/rahasia tidak diubah anggota; draf usulan direview Ketua.','Perubahan darurat dicatat saat kejadian dan ditinjau retrospektif; tidak menonaktifkan RLS/CSP untuk mempercepat rilis.'], '03 aturan tim; CI sumber, bukan bukti semua rilis mematuhinya.','Ketua penanggung jawab rilis.','PR/commit, persetujuan, log build, hasil rollback drill dan catatan rilis.'),
('pengembangan-aman','Pengembangan Aman','Frontend, RPC, edge, integrasi, desktop.', ['Validasi input dan izin di server; SECURITY DEFINER memakai scope tenant dan search_path yang dikunci.','Teks AI/nota/nama bahan tidak dipercaya sebagai instruksi atau HTML; sanitasi sesuai konteks.','Fixture sintetis; dilarang mengirim data pasien nyata ke model/pengujian desain.','RENCANA secret scan, SBOM, dependency review dan analisis statis di CI; dependency baru perlu alasan/lisensi.'], 'E01/E09/E10; pemindaian penuh masih rencana.','Ketua backend; Antigravity aplikasi/usulan CI.','Negative tests, injeksi prompt G6, SAST/SCA hasil rilis dan daftar lisensi.'),
('logging-pemantauan','Logging dan Pemantauan','Audit bisnis, autentikasi, layanan dan alert.', ['Log minimal: aktor terverifikasi, waktu, tenant, tindakan, status dan correlation ID; bukan token atau isi RME utuh.','E04 mengikat isi log berantai; jangan menyebutnya kebal superuser. Jangkar eksternal dan akses log perlu review.','RENCANA alert di luar host dan pengujian kanal; pantau.sh di host belum cukup untuk mendeteksi host mati.','Batasi akses log dan retensi menurut klasifikasi; penyelidikan memakai salinan dengan rantai penguasaan bukti.'], 'E04/E07, kanal WA belum terkonfirmasi.','Ketua operasi; fungsi privasi meninjau minimisasi.','Bukti simulasi alert, pemeriksaan rantai, penanganan insiden dan redaksi log.'),
('kerentanan','Manajemen Kerentanan','Paket, OS, gateway, browser wrapper dan integrasi.', ['Inventaris versi/owner; triase dampak dan eksploitabilitas, bukan skor otomatis saja.','USULAN target awal: kritis triase hari yang sama dan containment ≤24 jam; tinggi rencana ≤7 hari, sedang ≤30; bukan SLA kontraktual.','Patch diuji staging, review dan rollback; reboot kernel tertunda T3 dijadwalkan Ketua.','Pentest independen dan retest belum dilakukan; terima laporan aman melalui kontak keamanan yang ditetapkan.'], 'E08 dan papan L4/L6/L10.','Ketua menerima risiko dan jadwal; vendor pentest independen.','Tiket temuan, bukti patch/retest, pengecualian dengan tanggal kedaluwarsa.'),
('retensi-penghapusan','Retensi dan Penghapusan','RME, audit, data akun/billing, AI, log dan backup.', ['RME mengikuti register sektoral di kepatuhan-rme-satusehat.md; terminasi langganan bukan pemusnahan otomatis.','USULAN retensi AI/log operasional ditetapkan per tujuan dan minimisasi; tidak ada angka legal universal yang diasumsikan.','Penghapusan tunduk verifikasi pengendali, legal hold, batas peran dan audit; minimalkan jejak identitas pada audit sesuai desain.','Retensi backup lokal14 hari bukan retensi arsip medis; setelah restore terapkan kembali daftar penghapusan yang sah sebelum layanan dibuka.'], 'E04/E05; jadwal retensi formal belum disahkan.','Klinik pengendali + fungsi privasi; Ketua melaksanakan instruksi sah.','Register kategori/tujuan/retensi/dasar, uji ekspor, purge terkontrol dan restore suppression.'),
('vendor-subprosesor','Vendor dan Subprosesor','Semua pemasok infrastruktur, komunikasi, AI, billing dan telemetri.', ['Inventaris kategori data, lokasi/subvendor, tujuan, DPA, transfer, retensi, akses dukungan dan exit plan.','Jangan menyamakan Supabase self-host dengan Supabase Cloud sebagai prosesor aktif.','Aktivasi vendor baru memerlukan persetujuan pengendali dan minimisasi; rahasia/dataset nyata tidak dikirim untuk demo.','Evaluasi kondisi layanan WhatsApp tidak resmi dan alternatif resmi; jangan menjanjikan uptime atau ketahanan kanal vendor.'], 'E08/E10/E11 dan tabel vendor di bawah.','Pemilik menyetujui vendor, fungsi privasi menilai kontrak.','DPA/subprocessor approval, review tahunan, uji ekspor/penghapusan dan bukti konfigurasi.')]
vendor='''
## Register pemasok awal
| Pihak | Peran/data yang mungkin | Status bukti | Yang perlu dipastikan |
|---|---|---|---|
| Biznet | VPS/database/Storage terenkripsi bidang | dilaporkan aktif E08 | entitas/lokasi fisik, akses dukungan, kontrak dan DR |
| Supabase self-host | perangkat lunak di VPS | ada | tidak otomatis transfer ke Supabase Cloud; telemetry/support harus dicek |
| Vercel | frontend/CDN, log permintaan | sumber arsitektur | lokasi log, IP/metadata, DPA, retensi |
| Google/Gemini | teks AI agregat dan prompt pengguna | penyedia dilaporkan saat snapshot | minimisasi prompt bebas; kontrak/retensi/lokasi belum diverifikasi |
| Anthropic | rencana AI atau aktif setelah T1 | belum konfirmasi aktivasi | DPA/transfer/retensi/model; nama model dalam kode bukan bukti ketersediaan |
| WA sidecar | nomor dan isi pesan, sesi riwayat | dilaporkan aktif | data sensitif, risiko kanal tidak resmi dan nomor klinik |
| Whapi | penyedia lama | tidak dipakai menurut E08 | pastikan pencabutan kredensial dan penghapusan historis |
| Midtrans | pembayaran langganan, metadata pelanggan | kode integrasi | jangan samakan pembayaran pasien; kontrak/webhook/retensi |
| Sentry | error/metadata perangkat | kode integrasi | redaksi identitas, lokasi dan sampling; tidak menganggap data selalu anonim |
| SATUSEHAT | pertukaran kesehatan sesuai kewenangan | sandbox | bukan otomatis subprosesor biasa; advokat tetapkan peran hukum |
'''
for slug,title,scope,rules,status,roles,proof in policies:
 put('kebijakan/'+slug+'.md',title,f'''## Tujuan dan ruang lingkup
{scope} Mengurangi risiko tanpa menghambat pelayanan klinik yang sah.

## Aturan operasional
'''+ '\n'.join(f'{i}. {r}' for i,r in enumerate(rules,1))+f'''

## Keadaan nyata dan rencana
{status} Register lengkap E01–E12 ada di ../sumber-dan-bukti.md.
Aturan di atas menjadi kebijakan aktif hanya setelah disahkan dan dijalankan.

## Peran dan persetujuan
{roles} Pengganti harus ditunjuk tertulis agar operasi tidak bergantung satu orang.

## Pengecualian
Permintaan mencantumkan alasan, risiko, kontrol pengganti, pemilik dan batas waktu;
Ketua/fungsi privasi menyetujui sesuai kewenangan. Tidak ada pengecualian diam-diam
yang menghapus kewajiban hukum atau memberi akses klinis di luar peran.

## Bukti dan peninjauan
{proof} Simpan referensi tiket tanpa secret/data pasien pada laporan tim.
Tinjau tahunan dan setiap insiden/perubahan material; tanggal pengesahan [ISI].
'''+(vendor if slug=='vendor-subprosesor' else ''))
put('respons-insiden.md','Respons Insiden','''
## Komando dan tingkat keparahan
Incident commander: Ketua; pengganti [ISI]. Pemilik bisnis memberi keputusan layanan;
fungsi privasi/advokat menilai pemberitahuan; klinik pengendali menentukan komunikasi
pasien. Juru bicara tunggal [ISI], kanal aman dan telepon alternatif [ISI].
SEV1: dugaan lintas tenant, data klinis terbuka, kunci bocor, kehilangan VPS/backup;
SEV2: layanan utama terganggu atau akses akun mencurigakan terbatas; SEV3: gangguan
lokal tanpa indikasi paparan. SEV1 diperlakukan segera walau lingkup belum pasti.

## Alur tindakan
1. Deteksi: catat waktu sadar, sumber, layanan, tenant terdampak sementara dan fakta
   yang belum pasti; jangan menyimpulkan “tidak bocor” karena log kosong.
2. Pembatasan: Ketua mencabut sesi/kunci atau mengisolasi layanan secara terukur,
   menjaga pelayanan alternatif klinik dan menghindari penghapusan bukti.
3. Bukti: salinan log/artefak bertanda waktu dan hash, pembatasan akses, catatan
   siapa mengambil/menyerahkan; tanpa memindahkan data pasien ke chat tim.
4. Pemberantasan: perbaiki akar penyebab, rotasi key terpapar dan tinjau akses lain.
5. Pemulihan: pulihkan terisolasi, uji integritas/RLS/Storage/Auth, rekonsiliasi
   tindakan selama downtime, buka bertahap dengan persetujuan commander.
6. Pasca-insiden: kronologi, cakupan, sebab, pembelajaran, pemilik tindakan dan retest.

## Checklist awal 72 jam — rencana internal
- 0–1 jam: triase, commander, preservasi, keputusan containment.
- 1–4 jam: cakupan awal, tenant, kategori data, risiko pasien, kontak klinik.
- 4–24 jam: fakta yang tersedia, tindakan mitigasi, fungsi privasi menilai kewajiban;
  jangan menunggu RCA lengkap untuk menyiapkan pemberitahuan.
- 24–48 jam: perbarui cakupan, siapkan komunikasi dan bukti pengiriman.
- Sebelum tenggat yang berlaku: fungsi privasi/advokat memastikan penyampaian dan
  penerima yang sah; alur dan batas 3×24 jam dirujuk ke kepatuhan-uu-pdp.md.
Jam di atas target operasional usulan; bukan penafsiran baru titik awal hukum.
Dentiva sebagai prosesor mengusulkan laporan awal ke klinik segera setelah sadar,
target internal ≤4 jam, agar pengendali punya waktu menilai kewajiban.

## Templat komunikasi terpisah
Kepada klinik: “Kami mengidentifikasi [kejadian] pada [waktu]. Layanan/data yang
sedang diperiksa: [fakta]. Tindakan awal: [aksi]. Yang belum diketahui: [batas].
Pembaruan berikutnya [waktu], kontak aman [kontak]. Mohon jalankan [langkah].”

Kepada pasien oleh pengendali: “[Klinik] memberi tahu kejadian yang melibatkan
[kategori data], diketahui [waktu/cara yang sudah terverifikasi]. Kami melakukan
[penanganan/pemulihan]. Langkah perlindungan Anda [langkah]. Hubungi [kontak].”

Kepada otoritas: identitas pengendali/prosesor, kronologi, kategori/jumlah terdampak
jika diketahui, dampak, mitigasi/pemulihan, kontak, kekurangan fakta dan rencana
pembaruan. Advokat memverifikasi lembaga/kanal yang berwenang; jangan otomatis
menyamakan setiap kewajiban pemberitahuan dengan satu alamat Komdigi.
''')
put('dr-backup.md','Backup dan Pemulihan Bencana','''
## Keadaan dan target
E05 dan docs/backup-dr.md: backup01.30 WIB, satu snapshot PostgreSQL, age,
manifest, Auth/MFA dan Storage, retensi lokal14 hari. Offsite skrip tersedia E06
namun belum tujuan/jadwal. Gladi migrasi 11 Okt dicatat, durasi tidak tersedia.

| Skenario | RPO/RTO yang boleh dinyatakan |
|---|---|
| Database rusak, snapshot lokal utuh | RPO target ≤24 jam bila backup sukses; RTO perkiraan3–6 jam, belum ukuran teruji baru |
| VPS/disk lokal hilang | RPO/RTO belum terjamin: backup dapat hilang bersama server; jangan menjanjikan24 jam |
| Setelah offsite berhasil + latihan | target awal RPO≤24 jam, RTO≤6 jam; harus diukur dan disahkan |
| Setelah WAL/PITR dan cadangan | RENCANA RPO≤15 menit, RTO≤2 jam; bukan SLA aktif |

## Kerangka pemulihan — hanya Ketua yang mengeksekusi
1. Deklarasi bencana; bekukan mutasi terdampak, catat waktu/backup terakhir sukses.
2. Pemilik/pengganti mengambil backup dan kunci age melalui kanal aman terpisah.
3. Verifikasi manifest dan keaslian sumber; uji dekripsi di lingkungan terisolasi.
4. Provision VPS bersih; pulihkan versi Postgres/extension/config yang cocok.
5. Ikuti pulihkan-ke-vps.sh dan unggah-storage.sh, tanpa menjalankannya di produksi
   lama; pulihkan data/Auth/MFA/metadata/Storage sebagai satu konsistensi logis.
6. Cocokkan hitungan, hash Storage, izin/RLS/RPC, login/TOTP, log dan kunjungan kunci.
7. Terapkan kembali pencabutan akun/penghapusan sah yang belum masuk snapshot;
   rotasi kredensial terdampak, jangan membuka akses sebelum verifikasi.
8. Uji tenant sintetis, rekonsiliasi transaksi setelah snapshot, persetujuan klinik.
9. Alihkan trafik/DNS oleh Ketua, awasi dan dokumentasikan durasi setiap langkah.

## Latihan dan bukti
Usulkan bulanan setelah offsite aktif, lalu interval berbasis risiko. Form latihan:
tanggal, backup/hash, cakupan DB/Auth/Storage, waktu mulai/layanan pulih, kehilangan
data aktual, kegagalan, perbaikan dan penandatangan. Uji skenario key hilang dan
pemilik tidak tersedia. Backup terenkripsi tanpa kunci yang dapat dipulihkan tidak
memenuhi kebutuhan kesinambungan. Jangan mengklaim checksum ukuran saja membuktikan
backup dapat dipulihkan. Rencana log eksternal tidak menggantikan backup.
''')
put('rencana-pentest.md','Rencana Uji Penetrasi','''
## Ruang lingkup dan aturan keterlibatan
RENCANA, belum dijalankan. Ketua menandatangani izin tertulis: host staging,
IP tester, tanggal/jam WIB, kontak darurat, batas laju, fixture dua tenant dan
peran admin/dokter/resepsionis/operator. Produksi, penyedia pihak ketiga, data
pasien nyata, social engineering, DoS dan pencurian secret di luar izin dilarang.
Berhenti jika menemukan data nyata, lintas tenant tak terduga atau instabilitas;
simpan bukti minimal dan beri tahu Ketua lewat kanal aman.

## Acuan
[OWASP ASVS](https://owasp.org/projects/asvs?tab=main) yang diperiksa menampilkan
5.0.0. USULAN cakupan L2 aplikasi, tinjau bagian berisiko tinggi lebih dalam.
Prompt lama menyebut ASVS4; bila kontrak memakai4, vendor menyertakan pemetaan
versi eksplisit, bukan mencampur nomor kontrol.
[API Top10 2023](https://api-security.owasp.org/editions/2023/en/0x04-release-notes/)
dipakai sebagai kategori risiko, bukan daftar uji lengkap.

## Matriks uji khusus Dentiva
| Area | Uji positif/negatif | Bukti penerimaan |
|---|---|---|
| Auth/MFA | token AAL1/AAL2, unenroll, recovery, replay, brute force | wajib AAL2 benar-benar ditolak server bila diberlakukan |
| Tenant/RPC | ID tenant A dipakai B pada baca/tulis/RPC SECURITY DEFINER | nol lintas tenant dan output tidak membocorkan keberadaan |
| Peran | admin→RME, dokter→kasir, resepsionis→klinis, operator→tenant | penolakan per kontrak server |
| Storage | objek klinis, URL ditandatangani, path traversal, upload tipe tak sah | policy dan masa akses konsisten |
| TV/booking | token dicabut/tidak aktif, enumerasi dan payload publik | tanpa identitas lengkap/diagnosis |
| Agen | injection pengguna/hasil alat, approve orang lain, expired, replay/duplikat | usulan saja, apply berizin, transaksi atomik |
| Webhook | signature, replay, nominal/order salah, timestamp | tidak mengubah status tanpa bukti sah |
| Browser/desktop | XSS, CSP, URI, IPC/updater, local data | tanpa eksekusi input, least privilege |
| Operasi | backup restore, audit chain, log redaction | bukti uji terisolasi; tidak mengklaim audit tamper-proof |

Daftar API: BOLA, broken authentication, object property authorization, resource
consumption, function authorization, sensitive business flows, SSRF, misconfiguration,
inventory dan unsafe API consumption. Tester menambah skenario berbasis arsitektur.

## Laporan dan retest
Tiap temuan: ID, scope/versi, prasyarat, langkah reproduksi aman, expected/actual,
dampak, bukti disamarkan, tingkat risiko, akar penyebab dan saran. Ketua memberi
pemilik/target perbaikan, vendor melakukan retest dengan bukti. Nol temuan bukan
jaminan tanpa kerentanan; laporan berlaku pada lingkup dan tanggal yang diuji.
''')
put('whitepaper-keamanan.md','Keamanan Dentiva — Materi untuk Calon Klien','''
## Ringkasan yang boleh dibagikan setelah ditinjau
Dentiva memisahkan akses operasional klinik, pelayanan dokter dan administrasi.
Pada kode yang ditinjau, isolasi klinik ditegakkan di database, dan admin bisnis
tidak diberi isi rekam medis pasien (E01/E02). Denti Agen menyiapkan usulan;
perubahan memerlukan persetujuan admin dan pemeriksaan server (E10).

## Perlindungan dan batasnya
- Sumber konfigurasi menyediakan TOTP dan pemeriksaan sandi bocor; pemaksaan AAL2
  klinik belum selesai menurut laporan Ketua (E03). Ini tidak berarti semua staf
  sudah memakai MFA.
- Audit berantai membantu memeriksa integritas catatan (E04). Tanpa jangkar luar,
  jangan menyebut log kebal perubahan administrator database yang sangat berhak.
- Backup lokal harian terenkripsi tersedia menurut runbook (E05); penyimpanan
  offsite belum aktif (E06). Kehilangan server tetap risiko kesinambungan utama.
- Server inti dilaporkan di Indonesia (E08); AI, frontend, error monitoring dan
  komunikasi dapat melibatkan penyedia luar. Lokasi seluruh pemrosesan perlu
  pemetaan kontrak, bukan slogan “semua data selalu di Indonesia”.

## Tanggung jawab bersama
Klinik menentukan staf, tujuan pelayanan, dasar pemrosesan, dan pengungkapan
RME yang sah. Dentiva menjalankan kontrol teknis dan instruksi dalam DPA yang
disepakati. Staf melindungi perangkat, tidak membagikan akun dan memeriksa usulan
sebelum menyetujui. Penggunaan AI tidak menggantikan keputusan klinis dokter.

## Pekerjaan yang masih berjalan
Offsite/latihan terukur, SMTP, AAL2 klinik, rate-limit gateway, penandatanganan
desktop, pemindaian rantai pasok, pemantauan eksternal dan pentest independen.
Tidak ada klaim sertifikasi ISO/SOC2 atau kepatuhan menyeluruh. Calon klien dapat
meminta register bukti dengan scope dan tanggal melalui kontak yang disahkan.

## Lampiran teknis
E01 restrictive clinic_id; E02 peran; E03 GoTrue; E04 SHA-256 per tenant;
E05 snapshot+age+manifest; E09 header sumber; E10 propose/apply/expiry30 menit.
Rujukan lengkap sumber-dan-bukti.md. Angka target DR bukan SLA terukur saat ini.
''')
questions=[('Apakah sudah ISO27001/SOC2?','Tidak ada bukti sertifikasi. Pemetaan awal tersedia; bukan sertifikat.','iso27001-pemetaan.md'),('Apakah seluruh MFA diwajibkan?','Sebagian: TOTP tersedia; AAL2 klinik masih rencana.','E03/E12'),('Apakah pasien antar-klinik terisolasi?','Ada kontrol restrictive pada kode; perlu regresi dan bukti deployment.','E01'),('Apakah admin melihat isi klinis?','Kebijakan DB melarang; frontend perlu diselaraskan.','E02'),('Apakah data terenkripsi?','Backup age terbukti di skrip; enkripsi bidang medis dilaporkan, cakupan/rotasi perlu tinjauan.','E05/00'),('Backup offsite tersedia?','Belum aktif menurut runbook.','E06'),('RTO/RPO dijamin?','Belum SLA terukur; target dan skenario dijelaskan terpisah.','dr-backup.md'),('Audit tidak dapat diubah?','Tambah-saja berantai; administrator sangat berhak tetap risiko.','E04'),('Pentest independen?','Belum bukti; rencana tersedia.','rencana-pentest.md'),('Apakah AI dapat langsung mengubah?','Tidak pada desain yang ditinjau: hanya usul, apply server memerlukan persetujuan.','E10'),('Data pasien dikirim ke AI?','Alat dirancang agregat; prompt bebas perlu minimisasi dan kontrol tambahan. Tidak menjanjikan nol kebocoran.','E10'),('Lokasi semua data Indonesia?','Server inti dilaporkan Indonesia; vendor eksternal perlu pemetaan.','E08/vendor'),('Sandi bocor ditolak?','HIBP diaktifkan konfigurasi dan dilaporkan aktif; gagal-terbuka berarti ada batas ketika layanan gagal.','E03'),('Penghapusan setelah kontrak?','Mengikuti instruksi sah, retensi sektoral dan legal hold; belum mekanisme otomatis menyeluruh.','kebijakan/retensi-penghapusan.md'),('Bagaimana incident notice?','Rencana dan kontak perlu disahkan; pemberitahuan pengendali dinilai advokat.','respons-insiden.md'),('Sesi perangkat dan idle lock?','Belum lengkap; G3 berisi usulan.','G3'),('SMTP reset berfungsi?','Belum menurut laporan Ketua.','E11'),('SATUSEHAT produksi?','Belum dibuktikan; sandbox disebut pada sumber.','kepatuhan-rme-satusehat.md'),('Vendor dipantau?','Register draf; review kontrak/lokasi belum selesai.','kebijakan/vendor-subprosesor.md'),('Bisakah memberi bukti terbaru?','Ketua menyusun paket redaksi dengan versi/tanggal; tidak membagikan secrets atau data nyata.','sumber-dan-bukti.md')]
put('kuesioner-vendor.md','Kuesioner Keamanan Vendor — Format Ringkas','''Ini jawaban orisinal bergaya kuesioner vendor ringkas; bukan reproduksi SIG berlisensi.
“Ada” hanya dalam scope bukti, bukan jaminan produksi tanpa audit.

| Pertanyaan | Jawaban jujur | Bukti |
|---|---|---|
'''+ '\n'.join(f'| {q} | {a} | {e} |' for q,a,e in questions))
put('hukum/syarat-layanan.md','Syarat Layanan Dentiva','''
## Para pihak dan ruang layanan
[ISI: nama badan hukum/alamat/NIB/kontak Dentiva] menyediakan layanan kepada
[ISI: badan hukum klinik/wakil sah]. Tanggal efektif [ISI]. Daftar fitur, paket,
pengguna/cabang, kuota, biaya dan periode merujuk order form yang ditandatangani.
Dokumen penawaran tidak mengubah batas izin klinis atau kewajiban tenaga kesehatan.

## Penggunaan dan akun
Klinik memastikan pengguna berwenang, akurasi data yang dimasukkan dan keamanan
perangkat. Dentiva mengelola layanan sesuai kontrak; pemilik klinik bukan otomatis
berhak melihat semua data pasien. Dilarang mengunggah data tanpa kewenangan,
menyerang layanan, berbagi kredensial, atau melewati persetujuan agen.
Denti membantu operasi; jawaban perlu diverifikasi, tidak menggantikan diagnosis
atau keputusan medis. Perubahan agen baru berlaku setelah persetujuan dan server.

## Biaya dan perubahan
Harga, pajak, perpanjangan, jatuh tempo, refund dan pembatalan [ISI/TINJAU].
Kenaikan harga memerlukan pemberitahuan dan hak pilihan yang disepakati [ISI].
Jangan mencantumkan Starter/Group baru sebagai paket aktif sebelum billing siap.
Penyedia tidak menjanjikan SLA atau dukungan24/7 di luar lampiran yang disahkan.

## Data, hak dan kerahasiaan
Peran pemrosesan diatur DPA, pemberitahuan dalam kebijakan privasi. Klinik tetap
mengendalikan RME sesuai kewenangannya; Dentiva tidak mengambil hak kepemilikan
atas data pasien. Lisensi pemrosesan terbatas pada penyediaan layanan/instruksi sah.
Pengungkapan diwajibkan hukum ditangani melalui proses verifikasi dan pemberitahuan
yang diizinkan. Penggunaan untuk pelatihan model bukan izin otomatis dalam kontrak.

## Ketersediaan, perubahan dan penangguhan
Pemeliharaan direncanakan dan diberitahukan melalui kanal [ISI]. Keadaan darurat
dapat memerlukan pembatasan untuk melindungi data, dengan penjelasan dan pemulihan.
Keterlambatan pembayaran tidak dijadikan dasar memusnahkan RME. Exit plan harus
memberi ekspor terverifikasi dan kesinambungan arsip yang disepakati.

## Pengakhiran dan tanggung jawab
Tetapkan masa kontrak, pemberitahuan, ekspor, akses baca, jadwal penghapusan dan
legal hold [ISI]. Batas tanggung jawab, pengecualian, ganti rugi dan keadaan kahar
[TINJAU ADVOKAT]; tidak ada pelepasan hak wajib pasien atau kewajiban pengendali.
Hukum dan penyelesaian sengketa [ISI/TINJAU]. Order form, DPA dan SLA harus
memiliki urutan keberlakuan yang jelas; konflik diselesaikan tertulis, bukan asumsi.
''')
put('hukum/kebijakan-privasi.md','Kebijakan Privasi Dentiva','''
## Identitas dan peran
Pengelola layanan [ISI badan hukum/alamat/kontak privasi]. Untuk RME, klinik
umumnya pengendali dan Dentiva prosesor sesuai instruksi; untuk akun/billing dan
keamanan layanan dapat ada tujuan mandiri yang harus ditentukan advokat.
Pemberitahuan pasien klinik dan pemberitahuan akun SaaS tidak disamakan.

## Data dan tujuan yang perlu dipetakan
Data akun/kontak staf untuk akses/dukungan; data administratif dan kesehatan untuk
pelayanan klinik; transaksi untuk administrasi; metadata perangkat/log untuk
keamanan; prompt AI untuk bantuan operasional. Daftar field final, tujuan, dasar,
sumber, penerima, lokasi dan masa simpan ada pada register pemrosesan [ISI].
Tidak semua pemrosesan bergantung persetujuan; dasar tiap tujuan ditinjau sebelum
dipublikasikan. Consent tindakan medis tidak mencakup pemasaran atau AI otomatis.

## Penerima, penyimpanan dan AI
Server inti dilaporkan di Indonesia; vendor frontend, AI, komunikasi, pembayaran
dan telemetri dapat memiliki pemrosesan lain. Daftar vendor/negara/kontrak final
[ISI], mengacu register subprosesor yang disetujui. Jangan mengunggah identitas
atau isi RME ke chat AI. Alat agregat tidak menjamin prompt bebas selalu bebas
data pribadi; sediakan instruksi dan kontrol minimisasi.
Belum ada izin umum penggunaan data pasien untuk pelatihan model.

## Retensi, hak dan kontak
Jadwal retensi per kategori mengikuti tujuan, kewajiban klinik dan legal hold;
lihat pemetaan RME dan kebijakan retensi. Pengakhiran akun tidak sama dengan
penghapusan arsip klinis. Permintaan terkait data pasien melalui klinik pengendali,
permintaan akun melalui [ISI kontak]; identitas diverifikasi secara proporsional.
Proses permintaan dan tenggat ditetapkan advokat sesuai jenis hak, tanpa meminta
foto identitas lebih banyak dari yang diperlukan. Kanal pengaduan [ISI].

## Keamanan, insiden dan pembaruan
Kontrol yang dapat dijelaskan: pembatasan peran/tenant, audit, backup lokal
terenkripsi menurut scope bukti. Tidak menjanjikan keamanan mutlak/sertifikasi.
Insiden ditangani bersama klinik dan fungsi privasi sesuai kewajiban yang berlaku.
Versi dan tanggal pemberitahuan disimpan; perubahan material disampaikan sebelum
berlaku bila diwajibkan. Bagian cookies, analytics, retensi log dan data anak
[ISI/TINJAU] setelah inventaris implementasi; jangan menyalin pemberitahuan generik.
''')
put('hukum/dpa.md','Perjanjian Pemrosesan Data','''
## Para pihak dan instruksi
Pengendali: [ISI klinik]; prosesor: [ISI badan hukum Dentiva]. Tujuan, durasi,
jenis pemrosesan, kategori data/subjek, wilayah dan kontak tercantum Lampiran A.
Pemrosesan hanya berdasarkan instruksi terdokumentasi yang sah; instruksi baru
dinilai terhadap risiko dan kontrak, bukan dipenuhi otomatis melalui akses admin.

## Kewajiban dan kontrol
Personel terikat kerahasiaan dan akses minimum. Lampiran B memuat kontrol AKTUAL
dengan tanggal: E01–E12, batas MFA klinik, backup lokal dan kekurangan offsite.
Rencana peningkatan dipisahkan agar tidak berubah menjadi janji kontrol aktif.
Prosesor membantu pengendali memenuhi permintaan, evaluasi dampak, insiden,
pemeriksaan dan pemulihan dengan prosedur/biaya yang wajar disepakati [ISI].

## Subprosesor dan transfer
Lampiran C: daftar vendor disetujui, tujuan, data, lokasi, subvendor, retensi,
mekanisme transfer dan persyaratan keamanan. Pelibatan subprosesor memerlukan
persetujuan tertulis pengendali sesuai hasil tinjauan hukum; bentuk persetujuan,
notifikasi perubahan dan keberatan diatur [TINJAU]. Pembatasan vendor sama dengan
instruksi pengendali, termasuk larangan pelatihan model tanpa dasar/perjanjian baru.

## Insiden dan dukungan pengendali
Prosesor melapor tanpa penundaan yang tidak semestinya melalui kontak aman;
target operasional awal ≤4 jam setelah sadar adalah USULAN kontrak untuk ditinjau.
Laporan awal boleh belum lengkap dengan fakta, dampak sementara, tindakan dan
waktu pembaruan. Pengendali menentukan pemberitahuan ke pasien/otoritas bersama
advokat. Tidak menunggu investigasi selesai untuk menyiapkan kewajiban mendesak.

## Audit, akhir layanan dan pemulihan
Pengendali dapat meminta bukti teredaksi/asesmen yang proporsional dengan ruang
lingkup dan kerahasiaan. Uji teknis memerlukan rules of engagement, bukan akses
langsung lintas tenant. Setelah akhir layanan, ekspor dikonfirmasi dapat dibaca;
penghapusan instruksi sah memperhatikan retensi RME/legal hold dan siklus backup.
Daftar penghapusan yang sah diterapkan lagi sebelum restore kembali melayani.
Jadwal pengembalian, akses baca sementara, biaya dan sertifikat pemusnahan [ISI].
Kewajiban dan tanggung jawab tidak dihapus dengan batas kontrak yang bertentangan
dengan hukum; penasihat hukum menyelaraskan Syarat Layanan dan SLA.
''')
put('hukum/sla.md','Lampiran Tingkat Layanan','''
## Status dan lingkup
USULAN, bukan SLA aktif. Kontrak [ISI], paket [ISI], layanan inti [ISI], wilayah
ukur dan kalender WIB [ISI]. Tidak ada klaim ketersediaan terukur saat ini.

## Pengukuran yang harus disepakati
Ketersediaan bulanan = (menit layanan dalam lingkup − menit gangguan tak tersedia)
/ menit layanan dalam lingkup ×100%. Endpoint/operasi representatif, sumber monitor
independen, interval, minimum durasi dan kriteria gagal ditetapkan Lampiran Teknis.
Pengecualian pemeliharaan harus diberi notice/batas; jangan mengecualikan semua
gangguan vendor secara sepihak hingga metrik tidak bermakna. Sengketa ukuran
ditangani dengan bukti waktu dan log yang dapat diaudit tanpa data pasien.

## Dukungan dan pemulihan
Jam kerja USULAN Senin–Jumat09.00–17.00 WIB di luar hari libur nasional; kanal
dan kapasitas personel [ISI]. Respons awal berbeda dari waktu penyelesaian.
Target internal SEV1 respons1 jam selama jam layanan; SEV2 4 jam kerja; SEV3 1 hari
kerja, seluruhnya perlu kapasitas dan persetujuan. Dukungan24/7 hanya addendum
dengan petugas siaga nyata. Tidak menjanjikan respons1 jam bila tidak ada on-call.
RPO/RTO mengacu skenario dr-backup.md: backup lokal yang ikut hilang bersama VPS
tidak memiliki jaminan pulih; angka target belum menjadi komitmen kontrak.

## Kredit, eskalasi dan peninjauan
Target ketersediaan, tingkat kredit, batas kredit, prosedur klaim dan waktu ajukan
[ISI/TINJAU setelah offsite dan pengukuran]. Jangan mengisi angka99,9% hanya untuk
membedakan paket. Eskalasi ke Ketua/pengganti dan pemilik klinik, pembaruan insiden
dengan waktu berikutnya yang jelas. Kredit layanan tidak menggantikan kewajiban
privasi/pelindungan data. Semua perubahan SLA disahkan kedua pihak dan diumumkan
sebelum berlaku sesuai kontrak. Uji DR dan monitor adalah prasyarat penawaran SLA.
''')
put('peta-jalan-90-hari.md','Peta Jalan Keamanan 90 Hari — Usulan','''
Periode relatif sejak persetujuan pemilik, bukan janji tanggal rilis. S/M/L adalah
perkiraan usaha relatif. Ketua menetapkan urutan akhir dan pemilik pengganti.

| Tahap | Pekerjaan | Usaha | Ketergantungan | Bukti selesai |
|---|---|---|---|---|
| Hari1–15 | Offsite terenkripsi lintas penyedia | M | akun/storage pemilik | objek diverifikasi, jadwal, restore dari offsite |
| Hari1–15 | SMTP asli + SPF/DKIM/DMARC | M | penyedia/domain pemilik | verifikasi/reset nyata, tanpa click tracking |
| Hari1–15 | AAL2 clinic UI+DB, recovery | L | MFA server sudah tersedia | AAL1 ditolak sesuai peran, enrollment/recovery teruji |
| Hari1–15 | Reboot kernel terjadwal | S | persetujuan jendela operasi | layanan sehat dan catatan rollback |
| Hari1–30 | Rate-limit login/gateway | M | Envoy, uji lockout aman | brute force dibatasi tanpa memblokir klinik sah |
| Hari16–30 | Monitor luar host + alert | M | kanal/pengganti | simulasi host mati menimbulkan alert diterima |
| Hari16–30 | Secret scan/SCA/SBOM/CodeQL | M | usulan A4/A5, Ketua memasang | pipeline rilis dan penanganan temuan |
| Hari16–45 | DR terukur + kunci cadangan | M | offsite | RPO/RTO aktual dicatat, Auth/Storage/RLS pulih |
| Hari16–45 | Jangkar audit luar host | M | tujuan independen | kepala hash diverifikasi tanpa akses write DB |
| Hari31–60 | DPIA, DPA/vendor, retensi | L | advokat/fungsi PDP | dokumen disahkan, proses hak dilatih |
| Hari31–60 | Idle lock/sesi perangkat | L | server assurance/endpoint | perpindahan perangkat dan izin teruji |
| Hari31–60 | Desktop signing/updater | M | sertifikat pemilik | installer/update ditandatangani dan rollback diuji |
| Hari46–75 | WAF bila dibuktikan perlu | M | metrik serangan/kompatibilitas | aturan teruji, false positive dipantau |
| Hari61–90 | Pentest independen + retest | L | staging, scope dan izin | laporan/redaksi, temuan ditutup/risiko diterima |
| Hari61–90 | Review kesiapan SLA/ISMS | M | monitor, DR, audit internal | pemilik menandatangani komitmen realistis |

MFA tidak dicatat sebagai “belum ada”; pekerjaan tersisa ialah pemaksaan,
pemulihan, sesi dan bukti. WAF bukan pengganti RLS, autentikasi atau validasi.
Tidak mengumumkan ISO/SOC2 sebelum lingkup dan sertifikasi nyata ada.
''')
print('G4: dokumen draf, register 93 kontrol dan sembilan kebijakan ditulis.')
