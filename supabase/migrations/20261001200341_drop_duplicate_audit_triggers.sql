-- Audit 2 Okt 2026: users & payments punya dua trigger audit (process_audit_log
-- + dynamic_audit_trigger lama) sehingga setiap perubahan tercatat ganda
-- (modul 'users' dan 'USERS'). Pertahankan process_audit_log yang dipakai semua tabel.
drop trigger if exists audit_users_trigger on public.users;
drop trigger if exists audit_payments_trigger on public.payments;
