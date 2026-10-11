-- Audit lanjutan 11 Okt 2026 — L01: pengunci tindakan/obat pada kunjungan lunas harus memeriksa
-- kunjungan LAMA dan BARU, dan parent (visit_id) tidak boleh dipindah setelah baris dibuat.
-- Sebelumnya UPDATE hanya memeriksa NEW.visit_id sehingga baris obat kunjungan lunas bisa dipindah ke kunjungan lain.
create or replace function public.guard_billed_visit_items()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'UPDATE' and new.visit_id is distinct from old.visit_id then
    raise exception 'Baris tindakan/obat tidak dapat dipindahkan ke kunjungan lain' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.payments p
     where p.status_pembayaran = 'paid'
       and p.visit_id in (case when tg_op <> 'INSERT' then old.visit_id end, case when tg_op <> 'DELETE' then new.visit_id end)
  ) then
    raise exception 'Tindakan/obat tidak dapat diubah setelah pembayaran lunas' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- audit_child_lock sudah memeriksa OLD & NEW; larangan pindah parent untuk obat ditegaskan di sini juga
-- agar berlaku untuk kunjungan selesai/terkunci walau belum lunas.
create or replace function public.guard_visit_child_parent()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and tg_op = 'UPDATE' and new.visit_id is distinct from old.visit_id then
    raise exception 'Baris tidak dapat dipindahkan ke kunjungan lain' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists a_guard_child_parent on public.visit_obat;
create trigger a_guard_child_parent before update on public.visit_obat for each row execute function public.guard_visit_child_parent();
drop trigger if exists a_guard_child_parent on public.visit_treatments;
create trigger a_guard_child_parent before update on public.visit_treatments for each row execute function public.guard_visit_child_parent();

-- L06: klaim atomik pengingat H-1 hari / H-1 jam (sebelumnya baca-log-lalu-kirim sehingga dua pemanggil bisa sama-sama mengirim).
-- Duplikat lama (jika ada) diberi status berbeda lebih dulu agar indeks unik bisa dibuat.
update public.notification_logs set status = 'sent_duplikat'
 where id in (select id from (select id, row_number() over (partition by visit_id, message_type order by "timestamp", id) rn
                                from public.notification_logs
                               where visit_id is not null and message_type in ('reminder_day', 'reminder_hour') and status in ('sending', 'sent')) d
              where d.rn > 1);
create unique index if not exists notification_logs_satu_aktif_pengingat
  on public.notification_logs (visit_id, message_type)
  where visit_id is not null
    and message_type in ('reminder_day', 'reminder_hour')
    and status in ('sending', 'sent');

-- REGRESI tahap 2 (ditemukan smoke test): pendaftaran klinik mandiri (register_clinic → provision_clinic) memasukkan pemilik dengan
-- peran "Clinic Owner" saat dipanggil pengguna terautentikasi yang BELUM punya baris users, dan ditolak guard. Guard hanya
-- dimaksudkan untuk staf yang sudah ada (mis. admin klinik yang mencoba membuat akun dokter lewat klien).
create or replace function public.users_guard_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if; -- service role (admin-create-user, console, migrasi)
  if public.get_user_role() is null then return new; end if; -- pendaftaran mandiri: pemanggil belum menjadi staf klinik mana pun
  if new.role = 'dokter' or (new.role_id is not null and exists (
       select 1 from public.roles r where r.id = new.role_id and r.name in ('Dentist', 'Super Admin', 'Clinic Owner'))) then
    raise exception 'Akun dokter dibuat/diverifikasi oleh tim Dentiva — hubungi dukungan Dentiva' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
