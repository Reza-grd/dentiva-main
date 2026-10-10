# Baseline untuk pengujian

`20261009170624_schema.sql` adalah snapshot **definisi skema**, diambil dari katalog PostgreSQL proyek terkait sebelum migrasi audit. Tidak berisi pasien, pengguna, isi tabel, kunci enkripsi, atau nilai Vault. Indeks, constraint, trigger aplikasi, ACL, dan policy disertakan. Trigger internal Storage disediakan Supabase lokal.

Kunci acak dan data katalog sintetis dibuat hanya saat pengujian. Baseline berada di luar `supabase/migrations` sehingga tidak pernah dikirim lewat `db push`.

CI menjalankan `scripts/test-database-ci.sh`: buat PostgreSQL lokal kosong, muat snapshot, jalankan migrasi setelah `20261009170624`, uji regresi dengan pgcrypto asli, lalu seluruh suite pgTAP. Job database wajib berjalan; tidak lagi bergantung pada keberadaan file baseline di direktori migrasi.
