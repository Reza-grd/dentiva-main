# Arsip migration lama (JANGAN dijalankan lagi)

Folder ini berisi riwayat SQL sebelum Dentiva pindah ke alur **Supabase CLI**:

| Isi | Keterangan |
|---|---|
| `legacy-migrations/5_…` s.d. `52_…` | Migration bernomor manual yang dulu dijalankan lewat SQL Editor. Ada nomor ganda (`18_…` dua file) dan file gabungan `combined_migrations_24_42.sql`. |
| `legacy-migrations/part5a1_doctor_schedules.sql` | Dulu berada di folder `migrations/` di root repo. |
| `dentiva_schema_backup.sql` | Skema gabungan lama (tidak dijamin sama dengan produksi). |

File-file ini disimpan hanya sebagai referensi sejarah. Folder `supabase/archive/` sengaja **berada di luar** `supabase/migrations/`, jadi Supabase CLI tidak akan membaca atau menjalankannya.

## Baseline (wajib sekali, sebelum migration Console)

Sumber kebenaran skema adalah **database produksi**, bukan file di folder ini. Sebelum menjalankan migration `20260928000100_…` dst., buat baseline dari produksi:

```bash
supabase link --project-ref <ref-produksi>
supabase db dump --schema public,private,storage -f supabase/migrations/20260927000000_baseline.sql
supabase migration repair --status applied 20260927000000
```

Langkah `repair` menandai baseline sebagai "sudah jalan" di produksi, sehingga `supabase db push` hanya menjalankan migration baru. Di staging atau lokal, baseline dijalankan seperti biasa untuk membangun skema dari nol.
