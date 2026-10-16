/**
 * Uji audit log tambah-saja & berantai hash terhadap skema produksi ASLI (PGlite).   npm run db:audit
 * Alur: bangun DB sampai SEBELUM migrasi rantai → buat baris audit lama → terapkan migrasi (backfill) → uji pemblokiran, verifikasi, penghapusan pasien.
 */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDb } from "./schema.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const A = "aaaaaaaa-0000-4000-8000-0000000000c1";
const B = "bbbbbbbb-0000-4000-8000-0000000000c2";
const ADMIN_A = "a0000000-0000-4000-8000-0000000000c1";
const RECEP_A = "a0000000-0000-4000-8000-0000000000c5";
const ADMIN_B = "b0000000-0000-4000-8000-0000000000c2";
const MIGRASI = "20261017090000_audit_log_tambah_saja_berantai.sql";

let db;
const q = async (sql, p) => (await db.query(sql, p)).rows;
const one = async (sql, p) => (await q(sql, p))[0];
const asUser = async (uid, fn) => {
  await db.exec("reset role");
  const clinic = (await db.query("select clinic_id from public.users where id = $1", [uid])).rows[0]?.clinic_id;
  await db.query("select set_config('request.jwt.claims', $1, false), set_config('request.jwt.claim.sub', $2, false)",
    [JSON.stringify({ sub: uid, role: "authenticated", app_metadata: { clinic_id: clinic } }), uid]);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
};
const verify = (uid) => asUser(uid, async () => (await one("select public.audit_verify_chain() r")).r);
const rejects = (p, re) => assert.rejects(p, (e) => re.test(e.message));
const addPatient = async (clinic, rm, nama) =>
  (await one("insert into public.patients (clinic_id, no_rm, nama_lengkap) values ($1, $2, $3) returning id", [clinic, rm, nama])).id;

before(async () => {
  db = await buildDb({ upTo: "20261016120000" });
  await db.exec(`
    insert into public.clinics (id, name, slug, status) values ('${A}', 'Klinik A', 'klinik-a-au', 'active'), ('${B}', 'Klinik B', 'klinik-b-au', 'active');
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data) values
      ('${ADMIN_A}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'au-a@test.local', '{}'),
      ('${RECEP_A}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'au-r@test.local', '{}'),
      ('${ADMIN_B}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'au-b@test.local', '{}');
    insert into public.users (id, email, full_name, role, clinic_id, status) values
      ('${ADMIN_A}', 'au-a@test.local', 'Admin A', 'admin', '${A}', 'active'),
      ('${RECEP_A}', 'au-r@test.local', 'Resepsionis A', 'resepsionis', '${A}', 'active'),
      ('${ADMIN_B}', 'au-b@test.local', 'Admin B', 'admin', '${B}', 'active');`);
  // baris audit "lama" (sebelum rantai ada): dua klinik, urutan waktu sengaja diacak terhadap id
  await db.exec(`
    insert into public.audit_logs (clinic_id, module, action, "timestamp", new_value) values
      ('${A}', 'patients', 'INSERT', now() - interval '3 days', '{"k":1}'),
      ('${A}', 'visits', 'UPDATE', now() - interval '2 days', '{"k":2}'),
      ('${A}', 'users', 'UPDATE', now() - interval '1 day', '{"k":3}'),
      ('${B}', 'patients', 'INSERT', now() - interval '1 day', '{"k":9}');`);
  await db.exec(readFileSync(join(HERE, "..", "..", "migrations", MIGRASI), "utf8"));
});

test("backfill: baris lama diberi urutan per klinik (urut masuk) & rantai valid", async () => {
  const rows = await q("select seq, prev_hash, row_hash, new_value->>'k' k from public.audit_logs where clinic_id = $1 order by seq", [A]);
  assert.ok(rows.length >= 3);
  assert.deepEqual(rows.map((r) => Number(r.seq)), rows.map((_, i) => i + 1)); // 1..n tanpa lubang
  const legacy = rows.filter((r) => r.k).map((r) => Number(r.k));
  assert.deepEqual([...legacy].sort(), [1, 2, 3]); // semua baris lama ikut rantai (urutan antar-baris dengan waktu identik ditentukan id)
  assert.equal(rows[0].prev_hash, null);
  for (let i = 1; i < rows.length; i++) assert.equal(rows[i].prev_hash, rows[i - 1].row_hash);
  const v = await verify(ADMIN_A);
  assert.equal(v.ok, true); assert.equal(Number(v.diperiksa), rows.length); assert.equal(Number(v.tanpa_rantai), 0);
  assert.equal(Number(v.kepala_rantai.seq), rows.length); assert.equal(v.kepala_rantai.hash, rows.at(-1).row_hash);
  assert.ok(Number((await one("select count(*) c from public.audit_logs where clinic_id = $1", [B])).c) >= 1);
});

test("baris baru dari trigger bisnis ikut rantai (seq berlanjut, tautan ke baris sebelumnya)", async () => {
  const before = await one("select max(seq) s, (array_agg(row_hash order by seq desc))[1] h from public.audit_logs where clinic_id = $1", [A]);
  const pid = await addPatient(A, "RM-AU-1", "Pasien Audit Satu");
  const baru = await one("select * from public.audit_logs where clinic_id = $1 and module = 'patients' and patient_id = $2", [A, pid]);
  assert.ok(baru, "trigger audit pasien membuat baris");
  assert.equal(Number(baru.seq), Number(before.s) + 1);
  assert.equal(baru.prev_hash, before.h);
  const v = await verify(ADMIN_A);
  assert.equal(v.ok, true); assert.equal(Number(v.diperiksa), Number(before.s) + 1);
  // klinik B tidak terpengaruh
  const vb = await verify(ADMIN_B);
  assert.equal(vb.ok, true);
});

test("UPDATE / DELETE / TRUNCATE ditolak untuk semua peran (termasuk superuser & service_role)", async () => {
  await rejects(db.exec("update public.audit_logs set action = 'HAPUS-JEJAK' where clinic_id = '" + A + "'"), /tambah-saja/);
  await rejects(db.exec("delete from public.audit_logs where clinic_id = '" + A + "'"), /tambah-saja/);
  await rejects(db.exec("truncate public.audit_logs"), /tambah-saja/);
  await db.exec("reset role; set role service_role");
  await assert.rejects(db.exec("update public.audit_logs set action = 'x'"), /permission denied|tambah-saja/);
  await assert.rejects(db.exec("delete from public.audit_logs"), /permission denied|tambah-saja/);
  await db.exec("reset role");
  await asUser(ADMIN_A, async () => {
    await assert.rejects(db.exec("update public.audit_logs set action = 'x'"), /permission denied|tambah-saja|row-level/);
    await assert.rejects(db.exec("delete from public.audit_logs"), /permission denied|tambah-saja|row-level/);
  });
  // data utuh
  assert.equal((await verify(ADMIN_A)).ok, true);
});

test("purge pasien (hak penghapusan UU PDP): referensi pasien dikosongkan, baris audit tetap ada, rantai tetap valid", async () => {
  const pid = await addPatient(A, "RM-AU-2", "Pasien Dihapus");
  const jml = Number((await one("select count(*) c from public.audit_logs where patient_id = $1", [pid])).c);
  assert.ok(jml >= 1);
  const total = Number((await one("select count(*) c from public.audit_logs where clinic_id = $1", [A])).c);
  // jalur purge = penghapusan FISIK (trigger soft-delete dinonaktifkan oleh prosedur purge resmi)
  await db.exec("alter table public.patients disable trigger trigger_soft_delete_patient");
  await db.exec(`delete from public.patients where id = '${pid}'`);
  await db.exec("alter table public.patients enable trigger trigger_soft_delete_patient");
  assert.equal(await one("select 1 x from public.patients where id = $1", [pid]), undefined);
  assert.ok(Number((await one("select count(*) c from public.audit_logs where clinic_id = $1", [A])).c) >= total, "tidak ada baris audit yang hilang");
  assert.equal(Number((await one("select count(*) c from public.audit_logs where patient_id = $1", [pid])).c), 0, "referensi pasien dikosongkan");
  assert.ok(Number((await one("select count(*) c from public.audit_logs where clinic_id = $1 and module = 'patients' and patient_id is null", [A])).c) >= jml);
  const v = await verify(ADMIN_A);
  assert.equal(v.ok, true, JSON.stringify(v));
});

test("pemalsuan terdeteksi: trigger dimatikan lalu isi baris diubah → verifikasi menunjuk baris pertama yang rusak", async () => {
  const target = await one("select id, seq, action from public.audit_logs where clinic_id = $1 and seq = 2", [A]);
  await db.exec("alter table public.audit_logs disable trigger zz_audit_tolak_ubah");
  await db.exec(`update public.audit_logs set action = 'DIPALSUKAN' where id = '${target.id}'`);
  await db.exec("alter table public.audit_logs enable trigger zz_audit_tolak_ubah");
  const v = await verify(ADMIN_A);
  assert.equal(v.ok, false);
  assert.equal(Number(v.pertama_rusak.seq), 2);
  assert.match(v.pertama_rusak.alasan, /isi baris berubah/);
  // klinik lain tidak terdampak
  assert.equal((await verify(ADMIN_B)).ok, true);
  // pulihkan nilai asli → rantai valid lagi (membuktikan deteksi murni berbasis isi)
  await db.exec("alter table public.audit_logs disable trigger zz_audit_tolak_ubah");
  await db.exec(`update public.audit_logs set action = '${target.action}' where id = '${target.id}'`);
  await db.exec("alter table public.audit_logs enable trigger zz_audit_tolak_ubah");
  assert.equal((await verify(ADMIN_A)).ok, true);
});

test("penghapusan baris (trigger dimatikan) terdeteksi sebagai urutan terputus", async () => {
  const mid = await one("select id, seq from public.audit_logs where clinic_id = $1 and seq = 3", [A]);
  const salinan = await one("select * from public.audit_logs where id = $1", [mid.id]);
  await db.exec("alter table public.audit_logs disable trigger zz_audit_tolak_ubah");
  await db.exec(`delete from public.audit_logs where id = '${mid.id}'`);
  await db.exec("alter table public.audit_logs enable trigger zz_audit_tolak_ubah");
  const v = await verify(ADMIN_A);
  assert.equal(v.ok, false);
  assert.match(v.pertama_rusak.alasan, /urutan terputus/);
  assert.equal(Number(v.pertama_rusak.seq), 3);
  // kembalikan baris agar uji berikutnya bersih
  await db.exec("alter table public.audit_logs disable trigger all");
  await db.query(`insert into public.audit_logs (id, "timestamp", clinic_id, user_id, user_role, module, action, previous_value, new_value, risk_level, seq, prev_hash, row_hash)
                  values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [salinan.id, salinan.timestamp, salinan.clinic_id, salinan.user_id, salinan.user_role, salinan.module, salinan.action,
     salinan.previous_value, salinan.new_value, salinan.risk_level, salinan.seq, salinan.prev_hash, salinan.row_hash]);
  await db.exec("alter table public.audit_logs enable trigger all");
  assert.equal((await verify(ADMIN_A)).ok, true);
});

test("hak akses: hanya admin klinik yang dapat memverifikasi; resepsionis & anonim ditolak", async () => {
  await rejects(verify(RECEP_A), /Hanya admin klinik/);
  await db.exec("reset role; set role anon");
  await assert.rejects(db.exec("select public.audit_verify_chain()"));
  await db.exec("reset role");
});

test("sisipan palsu: baris dengan seq/hash karangan terdeteksi", async () => {
  await db.exec("alter table public.audit_logs disable trigger all");
  const nextSeq = Number((await one("select max(seq) s from public.audit_logs where clinic_id = $1", [B])).s) + 1;
  await db.exec(`insert into public.audit_logs (clinic_id, module, action, seq, prev_hash, row_hash, "timestamp")
                 values ('${B}', 'users', 'DELETE', ${nextSeq}, 'karangan', 'karangan', now())`);
  await db.exec("alter table public.audit_logs enable trigger all");
  const v = await verify(ADMIN_B);
  assert.equal(v.ok, false); assert.equal(Number(v.pertama_rusak.seq), nextSeq); assert.match(v.pertama_rusak.alasan, /tautan|hash/);
});
