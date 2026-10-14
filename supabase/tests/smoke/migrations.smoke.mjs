/**
 * Smoke test migration Dentiva Console tanpa Docker (Postgres WASM via PGlite).
 *
 *   npm run db:smoke
 *
 * 1. Membangun baseline sintetis yang meniru skema lama + policy bocor migration 41
 *    (legacy-baseline.sql — BUKAN salinan produksi; cukup untuk objek yang disentuh Console).
 * 2. Menjalankan semua file supabase/migrations/*.sql berurutan.
 * 3. Memeriksa isolasi tenant, status klinik/user, skema platform, audit, provisioning, billing.
 *
 * Tes pgTAP (supabase/tests/database) tetap wajib dijalankan di staging dengan baseline asli.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..", "..");
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg, extra) => {
  if (cond) { pass++; console.log("  ✓", msg); }
  else { fail++; console.log("  ✗", msg, extra !== undefined ? JSON.stringify(extra) : ""); }
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const expectError = async (sql, re, msg) => {
  try { await db.exec(sql); ok(false, msg, "no error"); }
  catch (e) { ok(re.test(e.message) || re.test(e.code ?? ""), msg, e.message); }
};

const A = "d0000000-0000-0000-0000-000000000000"; // legacy default clinic
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const uA = "a0000000-0000-4000-8000-00000000000a";
const uB = "b0000000-0000-4000-8000-00000000000b";
const uS = "c0000000-0000-4000-8000-00000000000c";
const S = "cccccccc-0000-4000-8000-000000000003";

async function loginAs(userId) {
  await db.exec("reset role");
  const u = await one("select raw_app_meta_data from auth.users where id = $1", [userId]);
  const claims = JSON.stringify({ sub: userId, role: "authenticated", app_metadata: u?.raw_app_meta_data ?? {} });
  await q("select set_config('request.jwt.claims', $1, false), set_config('request.jwt.claim.sub', $2, false)", [claims, userId]);
  await db.exec("set role authenticated");
}
async function logout() {
  await db.exec("reset role");
  await q("select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false)");
}

console.log("1. Baseline sintetis (skema lama + policy bocor migration 41)");
await db.exec(readFileSync(join(HERE, "legacy-baseline.sql"), "utf8"));

// Data lama di klinik default + klinik B (dibuat manual sebelum Console)
await db.exec(`
  insert into public.clinics (id, name, slug) values ('${B}', 'Klinik B', 'klinik-b'), ('${S}', 'Klinik S', 'klinik-s');
  insert into auth.users (id, email, raw_app_meta_data) values
    ('${uA}', 'a@x.test', '{"clinic_id":"${A}"}'),
    ('${uB}', 'b@x.test', '{"clinic_id":"${B}"}'),
    ('${uS}', 's@x.test', '{"clinic_id":"${S}"}');
  insert into public.users (id, email, full_name, role, clinic_id) values
    ('${uA}', 'a@x.test', 'Admin A', 'admin', '${A}'),
    ('${uB}', 'b@x.test', 'Admin B', 'admin', '${B}'),
    ('${uS}', 's@x.test', 'Admin S', 'admin', '${S}');
  insert into public.patients (no_rm, nama_lengkap, clinic_id) values
    ('A-1', 'Pasien A1', '${A}'), ('A-2', 'Pasien A2', '${A}'), ('B-1', 'Pasien B1', '${B}'), ('S-1', 'Pasien S1', '${S}');
  insert into public.visits (id, patient_id, clinic_id) select gen_random_uuid(), id, clinic_id from public.patients;
  insert into public.treatments (kode_treatment, nama) values ('TRT-001', 'Tambal');
  insert into public.master_bahan (kode_bahan) values ('BHN-001');
  insert into public.visit_treatments (visit_id, treatment_id)
    select v.id, t.id from public.visits v, public.treatments t where v.clinic_id = '${A}' limit 1;
  insert into public.clinic_settings (key, value, clinic_id) values ('clinic_name', 'Klinik A', '${A}');
  insert into public.informed_consents (patient_id) select id from public.patients where no_rm = 'B-1';
`);

await loginAs(uA);
const leak = await one("select count(*)::int as n from public.patients");
ok(leak.n === 4, `SEBELUM migration: admin A melihat ${leak.n} pasien (bocor lintas klinik, sesuai temuan)`);
await logout();

// Bug produksi: process_audit_log() tidak mengisi audit_logs.clinic_id (NOT NULL)
await db.exec(`alter table public.patients enable trigger trg_audit_patients;
               alter table public.visits enable trigger trg_audit_visits;
               alter table public.users enable trigger trg_audit_users;
               alter table public.payments enable trigger trg_audit_payments;`);
await db.exec("set role anon");
const viewLeak = (await one("select count(*)::int as n from public.v_patient_summary")).n;
await db.exec("reset role");
ok(viewLeak === 4, `SEBELUM migration: anon (tanpa login) membaca ${viewLeak} pasien lewat v_patient_summary`);
await loginAs(uA);
await expectError(`insert into public.patients (no_rm, nama_lengkap, clinic_id) values ('A-BUG', 'x', '${A}')`,
  /null value in column "clinic_id"|not-null|23502/, "SEBELUM migration: tambah pasien GAGAL (bug audit produksi direproduksi)");
await logout();

console.log("\n2. Menjalankan 7 migration Console");
const dir = join(REPO, "supabase/migrations");
// Baseline produksi (jika sudah dibuat) dilewati: skema sintetis di atas menggantikannya.
// Migrasi yang butuh skema produksi lengkap diuji terpisah di skema ASLI (npm run db:agent), bukan di baseline sintetis ini.
const REAL_SCHEMA_ONLY = new Set(["20261014090000_ai_agen.sql"]);
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql") && !f.includes("_baseline")).sort()) {
  if (REAL_SCHEMA_ONLY.has(f)) { console.log("  ↷", f, "(diuji di db:agent pada skema produksi asli)"); continue; }
  let sql = readFileSync(join(dir, f), "utf8");
  sql = sql.replace(/create extension if not exists pg_cron with schema extensions;/gi, "-- (pg_cron stub)");
  try {
    await db.exec(sql);
    ok(true, f);
  } catch (e) {
    ok(false, f, e.message);
    process.exit(1);
  }
}

console.log("\n3. Isolasi tenant");
await loginAs(uA);
ok((await one("select public.get_user_clinic_id() as c")).c === A, "get_user_clinic_id() admin A = klinik A");
// Sejak tahap 2 (B06) admin klinik tidak membaca tabel pasien/kunjungan sama sekali (hanya antrean & laporan agregat via RPC);
// yang penting: tidak pernah melihat data klinik lain (≤ jumlah milik sendiri, di sini 0).
ok((await one("select count(*)::int as n from public.patients")).n === 0, "admin A tidak membaca data pasien (tahap 2) dan tidak melihat klinik lain");
ok((await one("select count(*)::int as n from public.visits")).n === 0, "admin A tidak membaca kunjungan (tahap 2) dan tidak melihat klinik lain");
ok((await one("select count(*)::int as n from public.clinics")).n === 1, "clinics: hanya klinik sendiri");
ok((await one("select count(*)::int as n from public.informed_consents")).n === 0, "informed_consents klinik B tidak terlihat (kolom baru)");
await expectError(`insert into public.clinic_settings (clinic_id, key, value) values ('${B}', 'x', 'y')`, /row-level security|42501/, "tidak bisa menulis ke klinik B");
await db.exec(`insert into public.clinic_settings (key, value) values ('auto', '1')`);
ok((await one(`select clinic_id from public.clinic_settings where key = 'auto'`)).clinic_id === A, "clinic_id terisi otomatis dari JWT");
await db.exec(`insert into public.clinic_settings (key, value) values ('clinic_name', 'Klinik A Baru')
               on conflict (clinic_id, key) do update set value = excluded.value`);
ok((await one(`select value from public.clinic_settings where key = 'clinic_name'`)).value === "Klinik A Baru", "upsert onConflict clinic_id,key berfungsi (seperti PostgREST)");
await logout();

await loginAs(uB);
ok((await one("select count(*)::int as n from public.patients")).n === 0, "admin B tidak membaca data pasien (tahap 2)");
await db.exec(`insert into public.treatments (kode_treatment, nama) values ('TRT-001', 'Tambal B')`);
ok((await one("select count(*)::int as n from public.treatments")).n === 1, "klinik B bisa memakai kode TRT-001 sendiri (UNIQUE per klinik)");
const visitA = await one(`select id from public.visits where clinic_id = '${A}' limit 1`);
ok(visitA === undefined, "admin B tidak melihat kunjungan klinik A");
await logout();
const vA = (await one(`select id from public.visits where clinic_id = '${A}' limit 1`)).id;
await loginAs(uB);
await expectError(`insert into public.visit_treatments (visit_id) values ('${vA}')`, /row-level security|42501/, "tidak bisa menautkan visit_treatments ke kunjungan klinik A");
await logout();

console.log("\n4. Klinik/user nonaktif & klaim JWT");
await db.exec(`update public.clinics set status = 'suspended', suspended_reason = 'Tes' where id = '${S}'`);
await loginAs(uS);
ok((await one("select public.get_user_clinic_id() as c")).c === null, "klinik suspended → get_user_clinic_id() NULL");
ok((await one("select count(*)::int as n from public.patients")).n === 0, "klinik suspended tidak melihat pasiennya");
const st = await one("select * from public.get_my_account_status()");
ok(st && st.has_access === false && st.suspended_reason === "Tes", "get_my_account_status() tetap terbaca + alasan", st);
await logout();

await db.exec(`update auth.users set raw_app_meta_data = '{"clinic_id":"${B}"}' where id = '${uA}'`);
await loginAs(uA);
ok((await one("select count(*)::int as n from public.patients")).n === 0, "klaim clinic_id palsu ditolak");
await logout();
await db.exec(`update auth.users set raw_app_meta_data = '{}' where id = '${uA}'`);
await loginAs(uA);
ok((await one("select count(*)::int as n from public.patients")).n === 0, "tanpa klaim: tidak ada fallback ke klinik default");
await logout();
await db.exec(`update auth.users set raw_app_meta_data = '{"clinic_id":"${A}"}' where id = '${uA}'`);

await db.exec(`update public.users set status = 'suspended' where id = '${uB}'`);
ok((await one(`select is_active from public.users where id = '${uB}'`)).is_active === false, "status→is_active disinkronkan trigger");
await loginAs(uB);
ok((await one("select count(*)::int as n from public.patients")).n === 0, "user suspended tidak melihat data");
await logout();
await db.exec(`update public.users set is_active = true where id = '${uB}'`);
ok((await one(`select status from public.users where id = '${uB}'`)).status === "active", "is_active (kode lama)→status disinkronkan trigger");

console.log("\n5. Skema platform tertutup & audit append-only");
await loginAs(uA);
await expectError("select * from platform.operators", /permission denied/, "authenticated tidak bisa membaca platform.operators");
await expectError("select public.billing_settle_midtrans_order('x','success',1,'{}')", /permission denied/, "authenticated tidak bisa memanggil wrapper billing");
await db.exec("select public.record_login()");
ok((await one("select last_login_at is not null as ok from public.users where id = auth.uid()")).ok, "record_login() mengisi last_login_at (audit trigger tidak gagal)");
await logout();
await db.exec(`insert into auth.users (id, email) values ('0e000000-0000-4000-8000-0000000000e0', 'op@dentiva.test');
               insert into platform.operators (user_id, full_name, role) values ('0e000000-0000-4000-8000-0000000000e0', 'Op', 'owner');
               insert into platform.audit_logs (operator_id, action, target_type) values ('0e000000-0000-4000-8000-0000000000e0', 'clinics.suspend', 'clinic');`);
await expectError("update platform.audit_logs set reason = 'x'", /append-only/, "UPDATE audit_logs diblokir");
await expectError("delete from platform.audit_logs", /append-only/, "DELETE audit_logs diblokir");
await expectError("update platform.operators set is_active = false", /owner terakhir/, "owner terakhir terlindungi");
await expectError("insert into platform.audit_logs (action, target_type) values ('Bad Action', 'x')", /check/, "format action divalidasi CHECK");
await expectError(`insert into platform.operators (user_id, full_name, role) values ('${uA}', 'X', 'support')`, /user klinik/, "user klinik tidak bisa jadi operator");

console.log("\n6. provision_clinic");
await db.exec(`insert into auth.users (id, email) values ('d0000000-0000-4000-8000-0000000000d1', 'owner@baru.test')`);
const plan = (await one("select id from public.subscription_plans where name = 'Pro'")).id;
const newId = (await one(`select platform.provision_clinic('d0000000-0000-4000-8000-0000000000d1', 'owner@baru.test', 'Owner Baru', null,
  'Klinik Baru', 'klinik-baru', null, null, null, 'Bandung', null, '${plan}', 14, '0e000000-0000-4000-8000-0000000000e0') as id`)).id;
ok(!!newId, "klinik baru dibuat");
const nc = await one(`select status, trial_ends_at > now() + interval '13 days' as trial_ok from public.clinics where id = '${newId}'`);
ok(nc.status === "trial" && nc.trial_ok, "status trial 14 hari");
ok((await one(`select raw_app_meta_data->>'clinic_id' as c from auth.users where id = 'd0000000-0000-4000-8000-0000000000d1'`)).c === newId, "klaim JWT pemilik terisi");
ok((await one(`select count(*)::int as n from public.tier_weights where clinic_id = '${newId}'`)).n === 3, "tier_weights disalin dari klinik warisan");
ok((await one(`select value from public.clinic_settings where clinic_id = '${newId}' and key = 'clinic_name'`)).value === "Klinik Baru", "clinic_settings awal dibuat");
await expectError(`select platform.provision_clinic('${uB}', 'x@x', 'X', null, 'Dup', 'klinik-baru', null, null, null, null, null, '${plan}', 14, null)`, /sudah dipakai/, "slug duplikat ditolak");
await loginAs("d0000000-0000-4000-8000-0000000000d1");
ok((await one("select public.get_user_clinic_id() as c")).c === newId, "pemilik (invited) langsung punya akses ke klinik trial");
ok((await one("select count(*)::int as n from public.patients")).n === 0, "klinik baru tidak melihat pasien klinik lain");
await logout();

console.log("\n7. Billing");
const inv = await one(`select * from platform.create_invoice('${B}', current_date, current_date + 29, 500000, 55000, current_date + 7, 'tes', null)`);
ok(/^INV-\d{4}-\d{6}$/.test(inv.number) && Number(inv.total_idr) === 555000, `invoice ${inv.number} total 555000`);
const p1 = await one(`select * from platform.confirm_manual_payment('${inv.id}', 300000, now(), 'TRF-1', null, null)`);
const p2 = await one(`select * from platform.confirm_manual_payment('${inv.id}', 255000, now(), 'TRF-2', null, null)`);
ok(p1.invoice_status === "open" && p2.invoice_status === "paid", "bayar sebagian → open, pelunasan → paid");
await expectError(`select * from platform.confirm_manual_payment('${inv.id}', 1, now(), 'TRF-3', null, null)`, /sudah berstatus/, "tidak bisa bayar invoice lunas");
const reg = await one(`select * from public.billing_register_midtrans_order('ORD-1', '${B}', '${plan}', 'monthly')`);
ok(Number(reg.amount_idr) === 599000, "order Midtrans: nominal dari katalog (599000)");
ok((await one(`select public.billing_settle_midtrans_order('ORD-1', 'success', 1, '{}') as r`)).r === "amount_mismatch", "nominal tidak cocok ditolak");
ok((await one(`select public.billing_settle_midtrans_order('ORD-1', 'success', 599000, '{}') as r`)).r === "confirmed", "settlement mengonfirmasi");
ok((await one(`select public.billing_settle_midtrans_order('ORD-1', 'success', 599000, '{}') as r`)).r === "already_confirmed", "notifikasi ulang idempoten");
ok((await one(`select public.billing_settle_midtrans_order('ORD-X', 'success', 599000, '{}') as r`)).r === "unknown_order", "order tak dikenal (mis. replay custom_field) diabaikan");
ok((await one(`select status from public.clinic_subscriptions where clinic_id = '${B}' order by current_period_end desc limit 1`)).status === "active", "langganan klinik B aktif setelah bayar");
const reg2 = await one(`select * from public.billing_register_midtrans_order('ORD-2', '${B}', '${plan}', 'yearly')`);
ok((await one(`select public.billing_settle_midtrans_order('ORD-2', 'failed', 0, '{}') as r`)).r === "failed", "checkout gagal dicatat");
ok((await one(`select status from public.clinic_subscriptions where clinic_id = '${B}' order by current_period_end desc limit 1`)).status === "active", "checkout gagal TIDAK mengubah langganan jadi past_due");
ok(!!reg2, "register tahunan OK");

console.log("\n8. Usage & dashboard");
await db.exec(`insert into public.notification_logs (clinic_id, status, "timestamp") values ('${A}', 'sent', now() - interval '1 day')`);
const n = (await one("select platform.collect_usage_daily() as n")).n;
ok(n >= 4, `collect_usage_daily() menulis ${n} baris`);
const dash = (await one("select platform.dashboard_summary(14) as d")).d;
ok(dash.clinicsByStatus && typeof dash.mrrIdr === "number", "dashboard_summary() valid", dash);
ok((await q("select * from platform.clinic_overview")).length === 4, "view clinic_overview (4 klinik)");
// clinic_health() memakai kolom produksi yang tidak ada di baseline sintetis → cek hak akses saja
const healthAcl = await one(`select has_function_privilege('authenticated', 'platform.clinic_health(int)', 'execute') as auth_exec,
  has_function_privilege('service_role', 'platform.clinic_health(int)', 'execute') as svc_exec`);
ok(!healthAcl.auth_exec && healthAcl.svc_exec, "clinic_health() hanya untuk service_role (console-api)", healthAcl);
ok((await q("select jobname from cron.job where jobname like 'platform-%'")).length === 2, "2 job cron platform terdaftar");

console.log("\n9. Kualitas policy");
const wrapped = await q(`select policyname, qual from pg_policies where schemaname='public' and tablename='patients'`);
const unwrapped = wrapped.filter((p) => /get_user_clinic_id\(\)|has_permission\(/.test(p.qual ?? "") && !/SELECT/i.test(p.qual ?? ""));
ok(unwrapped.length === 0, "semua pemanggilan fungsi di policy patients dibungkus (select …)", wrapped);
const pk = await q(`select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
                    where i.indrelid = 'public.tier_weights'::regclass and i.indisprimary order by a.attname`);
ok(pk.map((r) => r.attname).join(",") === "clinic_id,tier", "PK tier_weights = (clinic_id, tier)");
const noRls = await q(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  join pg_attribute a on a.attrelid=c.oid and a.attname='clinic_id' where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`);
ok(noRls.length === 0, "semua tabel ber-clinic_id punya RLS aktif", noRls);

console.log("\n10. Bug & kondisi produksi");
await loginAs(uA);
// Sejak tahap 2 admin tidak boleh menambah pasien (hanya resepsionis); penolakan RLS adalah perilaku yang benar.
await expectError(`insert into public.patients (nama_lengkap) values ('Pasien setelah perbaikan')`, /row-level security|42501/, "admin klinik tidak bisa menambah pasien (tahap 2)");
await logout();
await db.exec(`insert into public.patients (nama_lengkap, clinic_id) values ('Pasien setelah perbaikan', '${A}')`);
await loginAs(uA);
ok((await one(`select count(*)::int as n from public.audit_logs where module = 'patients' and action = 'INSERT' and clinic_id = '${A}'`)).n >= 1,
  "SESUDAH migration: tambah pasien berhasil + audit tercatat dengan clinic_id");
ok((await one(`select count(*)::int as n from public.users`)).n === 1,
  "policy produksi 'Authenticated can view users' (true) tertutup: hanya user klinik sendiri");
await logout();
await db.exec(`update public.users set full_name = 'Admin B (Console)' where id = '${uB}'`);
ok(true, "update user tanpa JWT (Console) tidak gagal karena audit");
ok((await one(`select count(*)::int as n from storage.buckets where id in ('radiologi','klinik','patient-photos') and public`)).n === 0,
  "bucket radiologi/klinik/patient-photos kini privat");
ok((await one(`select public from storage.buckets where id = 'avatars'`)).public === true, "bucket avatars tetap publik");
ok((await one(`select count(*)::int as n from information_schema.columns where table_name = 'patient_visits' and column_name = 'clinic_id'`)).n === 1,
  "patient_visits (tabel lama produksi) mendapat clinic_id");

await db.exec("set role anon");
await expectError("select * from public.v_patient_summary", /permission denied/, "anon tidak bisa lagi membaca v_patient_summary");
await db.exec("reset role");
await loginAs(uB);
const viewRows = (await q("select clinic_id from public.v_patient_summary")).map((r) => r.clinic_id);
ok(viewRows.every((c) => c === B), "v_patient_summary (security_invoker) tidak pernah memuat pasien klinik lain (admin: 0 baris sejak tahap 2)", viewRows);
await logout();

ok((await one(`select data_type from information_schema.columns where table_name = 'patients' and column_name = 'no_wa'`)).data_type === "text",
  "patients.no_wa muat ciphertext PGP: (text, bukan varchar(20))");
await db.exec(`update public.patients set no_wa = 'PGP:' || repeat('x', 200) where clinic_id = '${B}'`);
ok((await one(`select length(no_wa) as n from public.v_patient_summary where clinic_id = '${B}'`)).n === 204,
  "v_patient_summary dibangun ulang dan tetap menampilkan no_wa");
ok((await one(`select reloptions::text as o from pg_class where oid = 'public.v_patient_summary'::regclass`)).o.includes("security_invoker=true"),
  "v_patient_summary tetap security_invoker setelah dibangun ulang");

// Layar antrean TV
ok((await one(`select public.queue_initials('Budi  Santoso Putra') as i`)).i === "B. S.", "queue_initials: hanya 2 inisial");
ok((await one(`select public.queue_initials(null) as i`)).i === "-", "queue_initials: nama kosong → '-'");
await db.exec("set role anon");
ok((await one(`select public.get_queue_display('pendek') as r`)).r.ok === false, "anon: token tidak valid → ok=false tanpa data");
await expectError("select * from public.queue_display_links", /permission denied/, "anon tidak bisa membaca tabel tautan layar antrean");
await expectError("select public.create_queue_display_link('x')", /permission denied/, "anon tidak bisa membuat tautan layar antrean");
await db.exec("reset role");
await loginAs(uB);
await expectError("insert into public.queue_display_links (clinic_id, token_hash, token_hint) values ('" + B + "', 'x', 'x')",
  /permission denied/, "staf tidak bisa menulis tabel tautan langsung (hanya lewat RPC)");
await logout();
await db.exec("set role anon");
await expectError("select public.get_my_account_status()", /permission denied/, "anon tidak bisa memanggil RPC SECURITY DEFINER");
await db.exec("reset role");
const mutable = await q(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f'
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`);
ok(mutable.length === 0, "semua fungsi public punya search_path tetap", mutable.map((m) => m.proname));

console.log("\n11. Tindak lanjut keamanan (security_followups)");
const uD = "a0000000-0000-4000-8000-00000000000d";
await db.exec(`insert into auth.users (id, email, raw_app_meta_data) values ('${uD}', 'd@x.test', '{"clinic_id":"${A}"}');
               insert into public.users (id, email, full_name, role, clinic_id, status) values ('${uD}', 'd@x.test', 'Dokter A', 'dokter', '${A}', 'invited');`);
await loginAs(uD);
await db.exec("select public.record_login()");
await logout();
ok((await one(`select status from public.users where id = '${uD}'`)).status === "active", "record_login(): dokter invited → active (tidak diblokir guard)");
await loginAs(uD);
await expectError(`update public.users set role = 'admin' where id = '${uD}'`, /Hanya admin klinik/, "dokter TIDAK bisa menjadikan dirinya admin (celah users_update_own)");
await db.exec(`update public.users set full_name = 'drg. Dokter A' where id = '${uD}'`);
ok(true, "dokter tetap bisa mengubah profil sendiri (nama)");
await logout();
await loginAs(uA);
await db.exec(`update public.users set role = 'resepsionis' where id = '${uD}'`);
ok((await one(`select role from public.users where id = '${uD}'`)).role === "resepsionis", "admin klinik bisa mengubah role staf");
await expectError(`update public.users set status = 'suspended' where id = '${uD}'`, /khusus untuk tim Dentiva/, "admin klinik tidak bisa memakai status 'suspended'");
await logout();
await db.exec(`update public.users set status = 'suspended' where id = '${uD}'`); // oleh Console (tanpa JWT)
await loginAs(uA);
await expectError(`update public.users set is_active = true where id = '${uD}'`, /tim Dentiva/, "admin klinik tidak bisa membatalkan suspend dari Console (via is_active)");
await expectError(`update public.users set clinic_id = '${B}' where id = '${uD}'`, /clinic_id|row-level/, "clinic_id pengguna tidak bisa dipindah");
await logout();

// Storage per klinik
await db.exec(`insert into storage.objects (bucket_id, name) values
  ('radiologi', '${A}/p1/xray.png'), ('radiologi', '${B}/p9/xray.png'), ('klinik', 'legacy-patient/foto.jpg')`);
await loginAs(uA);
const objsA = (await q(`select name from storage.objects order by name`)).map((r) => r.name);
ok(objsA.length === 1 && objsA.includes("legacy-patient/foto.jpg"),
  "admin hanya melihat file administratif; radiologi hanya dokter", objsA);
await expectError(`insert into storage.objects (bucket_id, name) values ('radiologi', '${B}/p9/sisip.png')`, /row-level security|42501/, "tidak bisa mengunggah ke folder klinik B");
await expectError(`insert into storage.objects (bucket_id, name) values ('radiologi', '${A}/p1/baru.png')`, /row-level security|42501/, 'admin tidak bisa mengunggah radiologi');

await expectError(`insert into storage.objects (bucket_id, name) values ('avatars', '${uB}/foto.png')`, /row-level security|42501/, "avatar tidak bisa ditulis ke folder user lain");
await db.exec(`insert into storage.objects (bucket_id, name) values ('avatars', '${uA}/foto.png')`);
ok(true, "avatar bisa ditulis ke folder sendiri");
await logout();
await loginAs(uB);
const objsB = (await q(`select name from storage.objects where bucket_id in ('radiologi', 'klinik') order by name`)).map((r) => r.name);
ok(objsB.length === 0, "admin B tidak melihat radiologi maupun file warisan", objsB);
await logout();

// Nomor RM per klinik
// Penomoran RM dites lewat superuser (admin tidak boleh menambah pasien sejak tahap 2); yang diuji adalah pemicu nomornya.
await logout();
const rmA = await one(`insert into public.patients (nama_lengkap, clinic_id) values ('Pasien RM A', '${A}') returning no_rm, clinic_id`);
const newClinic = (await one(`select clinic_id from public.users where id = 'd0000000-0000-4000-8000-0000000000d1'`)).clinic_id;
const rmNew = (await one(`insert into public.patients (nama_lengkap, clinic_id) values ('Pasien pertama', '${newClinic}') returning no_rm`)).no_rm;
const rmNew2 = (await one(`insert into public.patients (nama_lengkap, clinic_id) values ('Pasien kedua', '${newClinic}') returning no_rm`)).no_rm;
ok(rmNew === "RM-000001" && rmNew2 === "RM-000002", `klinik baru mulai dari RM-000001 (${rmNew}, ${rmNew2})`);
ok(/^RM-\d{6}$/.test(rmA.no_rm) && rmA.clinic_id === A, `klinik warisan melanjutkan nomornya (${rmA.no_rm})`);

// L01: baris tindakan/obat kunjungan LUNAS tidak boleh diubah, dihapus, atau DIPINDAH ke kunjungan lain (superuser + klaim JWT: RLS dilewati, pemicu tetap jalan).
await logout();
const [vPaid] = (await q(`select id from public.visits where clinic_id = '${A}' limit 1`));
const [vOther] = (await q(`select id from public.visits where clinic_id = '${A}' and id <> '${vPaid.id}' limit 1`));
const obatRow = await one(`insert into public.visit_obat (clinic_id, visit_id, nama_obat, qty, harga_satuan) values ('${A}', '${vPaid.id}', 'Uji', 1, 1000) returning id`);
await db.exec(`insert into public.payments (clinic_id, visit_id, total_bayar, jumlah_bayar, metode_pembayaran, status_pembayaran, invoice_number) values ('${A}', '${vPaid.id}', 1000, 1000, 'cash', 'paid', 'INV-UJI')`);
await q("select set_config('request.jwt.claims', $1, false), set_config('request.jwt.claim.sub', $2, false)", [JSON.stringify({ sub: uA, role: "authenticated", app_metadata: { clinic_id: A } }), uA]);
await expectError(`update public.visit_obat set qty = 9 where id = '${obatRow.id}'`, /lunas|42501/, "L01: ubah qty obat kunjungan lunas ditolak");
await expectError(`update public.visit_obat set visit_id = '${vOther.id}' where id = '${obatRow.id}'`, /lunas|dipindahkan|42501/, "L01: PINDAH obat kunjungan lunas ke kunjungan lain ditolak");
await expectError(`delete from public.visit_obat where id = '${obatRow.id}'`, /lunas|42501/, "L01: hapus obat kunjungan lunas ditolak");
await q("select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false)");

// Cron SATUSEHAT
const cronCmd = (await one(`select command from cron.job where jobname = 'process-satusehat-outbox'`))?.command ?? "";
ok(/vault\.decrypted_secrets/.test(cronCmd) && !/YOUR_SERVICE_ROLE_KEY/.test(cronCmd), "cron SATUSEHAT memakai Vault, bukan placeholder");

// Pendaftaran klinik mandiri (menunggu persetujuan)
console.log("\n9. Pendaftaran mandiri");
const uR = "e0000000-0000-4000-8000-0000000000e1", uU = "e0000000-0000-4000-8000-0000000000e2";
await db.exec(`insert into auth.users (id, email, email_confirmed_at) values ('${uR}', 'daftar@klinik.test', now()), ('${uU}', 'belum@klinik.test', null)`);
const regSql = `select public.register_clinic('Klinik Senyum Ceria', '0812-3456-7890', 'Bandung', 'Jawa Barat', 'drg. Rina', '081234567890') as id`;
await db.exec("set role anon");
await expectError(regSql, /permission denied/, "anon tidak bisa memanggil register_clinic");
await db.exec("reset role");
await loginAs(uU);
await expectError(regSql, /Verifikasi email/, "email belum terverifikasi ditolak");
await logout();
await loginAs(uR);
await expectError(`select public.register_clinic('Klinik X', '12', null, null, 'drg. X', '12')`, /telepon tidak valid/, "nomor telepon divalidasi");
const regId = (await one(regSql)).id;
ok(!!regId, "klinik pendaftaran mandiri dibuat");
await expectError(regSql, /sudah terhubung/, "satu akun hanya bisa mendaftarkan satu klinik");
await logout();
const rc = await one(`select c.status, c.slug, c.trial_ends_at, u.role, u.status as ustatus from public.clinics c join public.users u on u.clinic_id = c.id where c.id = '${regId}'`);
ok(rc.status === "pending" && rc.trial_ends_at === null, "status klinik 'pending' tanpa masa trial", rc);
ok(rc.slug === "klinik-senyum-ceria" && rc.role === "admin", "slug dibuat dari nama; pemilik = admin", rc);
await loginAs(uR);
ok((await one("select public.get_user_clinic_id() as c")).c === null, "klinik pending belum punya akses data (RLS)");
ok((await one("select has_access from public.get_my_account_status()")).has_access === false, "status akun: menunggu (has_access=false)");
await logout();
await db.exec(`update auth.users set email_confirmed_at = now() where id = '${uB}'`);
await loginAs(uB);
await expectError(regSql, /sudah terhubung/, "staf klinik lain tidak bisa mendaftarkan klinik baru");
await logout();

// KFA: kolom verifikasi hanya bisa diisi service_role (Edge Function satusehat-kfa)
console.log("\n10. Verifikasi KFA");
await loginAs(uB);
const mb = await one(`insert into public.master_bahan (kode_bahan, kode_kfa, kfa_nama, kfa_verified_at) values ('OBT-KFA-1', '93000001', 'Palsu', now()) returning id, kfa_verified_at, kfa_nama`);
ok(mb.kfa_verified_at === null && mb.kfa_nama === null, "browser tidak bisa menandai kode KFA terverifikasi saat insert");
await logout();
await q(`select set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
await db.exec(`update public.master_bahan set kode_kfa = '93001234', kfa_nama = 'Amoxicillin 500 mg', kfa_verified_at = now() where id = '${mb.id}'`);
await q(`select set_config('request.jwt.claims', '', false)`);
ok((await one(`select kfa_verified_at is not null as v from public.master_bahan where id = '${mb.id}'`)).v, "service_role bisa menyimpan verifikasi KFA");
await loginAs(uB);
await db.exec(`update public.master_bahan set kfa_verified_at = now() - interval '1 day', kfa_nama = 'Ubah' where id = '${mb.id}'`);
ok((await one(`select kfa_nama from public.master_bahan where id = '${mb.id}'`)).kfa_nama === "Amoxicillin 500 mg", "browser tidak bisa mengubah nama/verifikasi KFA");
await db.exec(`update public.master_bahan set kode_kfa = '93009999' where id = '${mb.id}'`);
ok((await one(`select kfa_verified_at is null as v from public.master_bahan where id = '${mb.id}'`)).v, "kode KFA diubah dari browser → status verifikasi dihapus");
await logout();

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
