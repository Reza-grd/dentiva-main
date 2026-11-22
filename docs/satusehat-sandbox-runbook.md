# Runbook — Verifikasi SATUSEHAT di Sandbox sebelum Produksi

Pengiriman data ke SATUSEHAT **produksi dikunci di kode** (`assertEnvironmentAllowed()` di
`supabase/functions/_shared/satusehatConfig.ts`): setiap POST/PUT ditolak bila
`SATUSEHAT_ENVIRONMENT=production` sementara `SATUSEHAT_PRODUCTION_APPROVED` belum `true`.
Kunci baru dibuka setelah satu kunjungan lengkap lulus di sandbox dan dicocokkan dengan
koleksi Postman resmi.

## 0. Yang sudah diperbaiki sebelum uji

| Masalah | Perbaikan |
|---|---|
| Host sandbox usang `api-satusehat-stg.kemkes.go.id` | Diganti host resmi `api-satusehat-stg.dto.kemkes.go.id` ([Endpoint Information](https://satusehat.kemkes.go.id/platform/docs/id/postman-workshop/endpoint-information/)) |
| Nama pasien terenkripsi (`PGP:…`) terkirim sebagai `Encounter.subject.display` | Didekripsi di server sebelum dikirim |
| Kode KFA contoh `93000001…` | Kode hanya dari API KFA v2, diverifikasi server (`satusehat-kfa`); resep tanpa kode terverifikasi tidak dikirim |
| Token cache sandbox bisa dipakai ke produksi | Cache token dicocokkan dengan environment |
| `Encounter.diagnosis.use` (Fix F) tidak pasti | Dikirim hanya bila secret `SATUSEHAT_DIAGNOSIS_USE` diisi kode yang **lulus** uji di bawah |

## 1. Kredensial sandbox (pemilik)

1. Daftar/masuk di <https://satusehat.kemkes.go.id/platform> → buat aplikasi **Sandbox**; catat
   Organization ID, Client ID, Client Secret.
2. Isi rahasia di server VPS (diketik tersembunyi; jangan kirim nilainya ke siapa pun):

```bash
ssh -t -i ~/.ssh/dentiva_vps dentiva@202.74.74.163 /opt/dentiva/bin/isi-rahasia-functions.sh
```

   Isi `SATUSEHAT_CLIENT_ID` dan `SATUSEHAT_CLIENT_SECRET`, lalu di pertanyaan "secret tambahan"
   ketik `SATUSEHAT_ORGANIZATION_ID` dan isi nilainya. `SATUSEHAT_ENVIRONMENT` tetap `sandbox`.

3. Uji koneksi: Pengaturan → SATUSEHAT → cek kesehatan (atau panggil `satusehat-healthcheck`).

## 2. Kunjungan uji (di klinik UJI, bukan klinik pelanggan)

Buat klinik uji dari Console (mis. "Klinik Uji SATUSEHAT"), lalu dengan akun admin klinik uji:

1. **Pengaturan → SATUSEHAT**: sinkronkan Organisasi dan Lokasi (set satu lokasi default).
2. **Profil dokter**: isi NIK dokter memakai **data dummy Practitioner sandbox** dari dokumentasi
   SATUSEHAT, lalu sinkronkan.
3. **Pasien**: daftarkan pasien dengan **NIK dummy Patient sandbox**, lalu sinkronkan.
4. **Master Bahan**: pilih satu obat lewat **Cari di KFA** → simpan (status "terverifikasi").
5. **Modul Gigi**: isi odontogram pasien (mis. karies permukaan, tambalan, gigi hilang) dan skor OHIS
   (debris & kalkulus 6 gigi indeks) di formulir rekam medis.
6. Buat kunjungan: ≥1 diagnosis ICD-10, ≥1 tindakan ICD-9-CM, ≥1 resep obat tadi. Selesaikan kunjungan.

Odontogram & OHIS dikirim sebagai Observation sesuai playbook Rawat Jalan Gigi (Tabel 4–5, Lampiran 1–9);
pemetaan kode ada di `supabase/functions/_shared/resources/dentalObservation.ts`. Kode `arrow`
(migrasi/rotasi) tidak punya padanan keadaan gigi sehingga tidak dikirim.

## 3. Jalankan uji

Di database VPS (`ssh … "docker exec -it supabase-db psql -U postgres"`; kunci diambil dari Vault, tidak diketik):

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_project_url') || '/functions/v1/satusehat-sandbox-verify',
  headers := jsonb_build_object('Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dentiva_service_role_key')),
  body := jsonb_build_object('visitId', '<uuid-kunjungan-uji>'),
  timeout_milliseconds := 120000);

-- beberapa detik kemudian:
select passed, report from public.satusehat_verification_runs order by created_at desc limit 1;
```

Laporan berisi: status tiap langkah (Encounter → Condition → Procedure → MedicationRequest →
Composition), ID resource SATUSEHAT, isi `satusehat_outbox` (payload + error), dan
`diagnosisUseProbe` (hasil PUT Encounter untuk varian tanpa `use`, `DD`, `CC`, `AD`).

## 4. Cocokkan & buka produksi

1. Bandingkan `payload` tiap resource di laporan dengan request pada
   [koleksi Postman SATUSEHAT](https://www.postman.com/satusehat/satusehat-public) (Rawat Jalan).
2. Pilih kode `diagnosis.use` dari varian yang HTTP 200 dan sesuai Postman Rawat Jalan:
   `supabase secrets set SATUSEHAT_DIAGNOSIS_USE=DD --project-ref …` (contoh).
3. Jalankan ulang uji sampai `passed = true` dengan konfigurasi final.
4. Ganti ke kredensial produksi dan buka kunci:
   `SATUSEHAT_ENVIRONMENT=production`, `SATUSEHAT_CLIENT_ID/SECRET` produksi,
   `SATUSEHAT_PRODUCTION_APPROVED=true`.
5. Catat tanggal, ID laporan, dan kode `diagnosis.use` di `docs/satusehat-remediation-log.md`.

## 5. Keterbatasan yang harus diputuskan sebelum banyak klinik

Kredensial SATUSEHAT saat ini **satu untuk seluruh platform** (secret Edge Function), sedangkan
di SATUSEHAT setiap fasyankes memiliki Organization dan kredensialnya sendiri. Sebelum lebih
dari satu klinik mengirim data produksi, kredensial harus dipindah per klinik (tabel
`satusehat_organizations` sudah punya kolom `client_id`; secret per klinik disimpan di Vault) —
atau Dentiva terdaftar sebagai penyelenggara sistem elektronik yang diizinkan mengirim atas
nama banyak fasyankes.
