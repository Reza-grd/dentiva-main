/**
 * Uji kode klinik untuk identitas pesan WA (migrasi 20261129090000) pada skema produksi ASLI (PGlite).
 *   npm run db:kode-klinik
 */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { buildDb } from "./schema.mjs";

const A = "d1000000-0000-4000-8000-000000000001";
const B = "d1000000-0000-4000-8000-000000000002";
const ADMIN = "d1000000-0000-4000-8000-0000000000a1";
const DOK = "d1000000-0000-4000-8000-0000000000d1";
const ADMIN_B = "d1000000-0000-4000-8000-0000000000b1";

let db;
const asUser = async (uid, fn) => {
  await db.exec("reset role");
  const clinic = (await db.query("select clinic_id from public.users where id = $1", [uid])).rows[0]?.clinic_id;
  await db.query("select set_config('request.jwt.claims', $1, false), set_config('request.jwt.claim.sub', $2, false)",
    [JSON.stringify({ sub: uid, role: "authenticated", app_metadata: { clinic_id: clinic } }), uid]);
  await db.exec("set role authenticated");
  try { return await fn(); } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false)");
  }
};
const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const rejects = (p, re) => assert.rejects(p, (e) => re.test(e.message));
const dasar = async (nama) => (await one("select public.kode_klinik_dasar($1) k", [nama])).k;

before(async () => {
  db = await buildDb();
  await db.exec(`
    insert into public.clinics (id, name, slug, status) values
      ('${A}', 'Klinik Gigi Senyum', 'senyum-kk', 'active'), ('${B}', 'Senyum Dental Care', 'senyum2-kk', 'active');
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data)
      select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u || '@test.local', '{}'
      from unnest(array['${ADMIN}', '${DOK}', '${ADMIN_B}']::uuid[]) u;
    insert into public.users (id, email, full_name, role, clinic_id, status) values
      ('${ADMIN}', 'a@k.local', 'Admin A', 'admin', '${A}', 'active'),
      ('${DOK}', 'd@k.local', 'Dokter A', 'dokter', '${A}', 'active'),
      ('${ADMIN_B}', 'b@k.local', 'Admin B', 'admin', '${B}', 'active');
  `);
});

test("kode dasar dari nama: kata umum diabaikan, 3–4 huruf kapital", async () => {
  assert.equal(await dasar("Klinik Gigi Senyum"), "SNYM");
  assert.equal(await dasar("Smile Dental"), "SML");
  assert.equal(await dasar("Bina Sehat Gigi Keluarga Utama"), "BSKU");
  assert.equal(await dasar("drg. Ayu Ananda"), "AYA");
  assert.equal(await dasar("Klinik Dental"), "KLND");
  assert.equal(await dasar("Ö"), "OXX");
  assert.equal(await dasar(""), "KLN");
});

test("klinik baru otomatis mendapat kode unik", async () => {
  const a = (await one(`select kode_wa from public.clinics where id = '${A}'`)).kode_wa;
  const b = (await one(`select kode_wa from public.clinics where id = '${B}'`)).kode_wa;
  assert.equal(a, "SNYM");
  assert.match(b, /^[A-Z]{3,5}$/);
  assert.notEqual(a, b, "nama mirip tetap mendapat kode berbeda");
});

test("manajer mengubah kode; format & keunikan dijaga; peran lain ditolak", async () => {
  await rejects(asUser(DOK, () => one("select public.kode_klinik_ubah('ABC')")), /manajer klinik/);
  await rejects(asUser(ADMIN, () => one("select public.kode_klinik_ubah('AB')")), /3–5 huruf/);
  await rejects(asUser(ADMIN, () => one("select public.kode_klinik_ubah('AB12')")), /3–5 huruf/);
  const kodeB = (await one(`select kode_wa from public.clinics where id = '${B}'`)).kode_wa;
  await rejects(asUser(ADMIN, () => one("select public.kode_klinik_ubah($1)", [kodeB])), /sudah dipakai/);
  assert.equal((await asUser(ADMIN, () => one("select public.kode_klinik_ubah(' smle ') k"))).k, "SMLE");
  assert.equal((await asUser(DOK, () => one("select public.kode_klinik_saya() k"))).k, "SMLE");
  assert.equal((await asUser(ADMIN_B, () => one("select public.kode_klinik_saya() k"))).k, kodeB);
  await assert.rejects(db.exec("set role anon; select public.kode_klinik_ubah('XYZ')"));
  await db.exec("reset role");
});
