/**
 * Uji kunci login bertingkat (hook GoTrue) terhadap skema produksi ASLI (PGlite).   npm run db:kunci-login
 */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { buildDb } from "./schema.mjs";

const U = "c0000000-0000-4000-8000-0000000000a1";
const V = "c0000000-0000-4000-8000-0000000000a2";
let db;
const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const pw = async (user, valid, ip = "203.0.113.7") =>
  (await one("select public.hook_password_verification_attempt($1::jsonb) as r",
    [JSON.stringify({ user_id: user, valid, metadata: { ip_address: ip, name: "password-verification" } })])).r;
const mfa = async (user, valid) =>
  (await one("select public.hook_mfa_verification_attempt($1::jsonb) as r",
    [JSON.stringify({ user_id: user, valid, factor_id: "f0000000-0000-4000-8000-000000000001", factor_type: "totp", metadata: { ip_address: "203.0.113.9" } })])).r;
const status = (user, jenis = "password") =>
  one("select gagal, kunci_sampai > now() as terkunci, round(extract(epoch from kunci_sampai - now()) / 60) as menit from keamanan.percobaan_login where user_id = $1 and jenis = $2", [user, jenis]);
const habiskanKunci = (user, jenis = "password") =>
  db.query("update keamanan.percobaan_login set kunci_sampai = now() - interval '1 second' where user_id = $1 and jenis = $2", [user, jenis]);

before(async () => {
  db = await buildDb();
  await db.query("insert into auth.users (id, email, encrypted_password) values ($1, 'a@contoh.test', 'h1'), ($2, 'b@contoh.test', 'h2')", [U, V]);
});

test("4 kali salah belum terkunci; ke-5 mengunci 1 menit", async () => {
  for (let i = 0; i < 4; i++) assert.equal((await pw(U, false)).decision, "continue");
  assert.equal((await status(U)).terkunci, null); // belum ada kunci
  assert.equal((await pw(U, false)).decision, "continue"); // kegagalan ke-5 sendiri tetap dijawab "password salah"
  const s = await status(U);
  assert.equal(s.gagal, 5);
  assert.equal(s.terkunci, true);
  assert.equal(Number(s.menit), 1);
});

test("selama terkunci password BENAR pun ditolak dengan pesan yang sama", async () => {
  const salah = await pw(U, false);
  const benar = await pw(U, true);
  assert.equal(salah.decision, "reject");
  assert.equal(benar.decision, "reject");
  assert.equal(salah.message, benar.message);
  assert.match(benar.message, /Terlalu banyak percobaan masuk\. Coba lagi dalam 1 menit\./);
  assert.equal((await status(U)).gagal, 5, "percobaan saat terkunci tidak menambah hitungan");
});

test("jeda makin lama: 10 → 5 menit, 15 → 30 menit, 20 → 24 jam", async () => {
  const sampai = async (n) => { while ((await status(U)).gagal < n) { await habiskanKunci(U); await pw(U, false); } };
  await sampai(10); assert.equal(Number((await status(U)).menit), 5);
  await sampai(15); assert.equal(Number((await status(U)).menit), 30);
  await sampai(20); assert.equal(Number((await status(U)).menit), 24 * 60);
  assert.match((await pw(U, true)).message, /Coba lagi dalam 24 jam\./);
});

test("ganti password membuka kunci dan dicatat", async () => {
  await db.query("update auth.users set encrypted_password = 'h1-baru' where id = $1", [U]);
  assert.equal(await status(U), undefined);
  assert.equal((await pw(U, true)).decision, "continue");
  const k = await one("select count(*)::int n from keamanan.kejadian where user_id = $1 and jenis = 'kunci_dibuka'", [U]);
  assert.equal(k.n, 1);
});

test("berhasil masuk mereset hitungan; kegagalan > 24 jam lalu tidak dihitung", async () => {
  for (let i = 0; i < 3; i++) await pw(V, false);
  assert.equal((await pw(V, true)).decision, "continue");
  assert.equal(await status(V), undefined);
  for (let i = 0; i < 4; i++) await pw(V, false);
  await db.query("update keamanan.percobaan_login set gagal_terakhir = now() - interval '25 hours' where user_id = $1", [V]);
  await pw(V, false);
  assert.equal((await status(V)).gagal, 1);
});

test("kode MFA terpisah dari password dan juga terkunci bertingkat", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await mfa(V, false)).decision, "continue");
  assert.equal((await status(V, "mfa")).terkunci, true);
  const r = await mfa(V, true);
  assert.equal(r.decision, "reject");
  assert.match(r.message, /Terlalu banyak percobaan/);
  assert.equal((await pw(V, true)).decision, "continue", "kunci MFA tidak mengunci password");
});

test("catatan kejadian berisi IP dan ringkasan untuk pemantau", async () => {
  const k = await one("select ip from keamanan.kejadian where jenis = 'login_gagal' order by id limit 1");
  assert.equal(k.ip, "203.0.113.7");
  const r = (await one("select keamanan.ringkasan(10) as r")).r;
  assert.ok(r.login_gagal >= 20);
  assert.equal(r.ip_login_gagal, 1);
  assert.ok(r.mfa_gagal >= 5);
  assert.equal(r.akun_terkunci, 2);
  assert.equal(r.akun_terkunci_lama, 1);
});

test("user_id kosong / tidak dikenal tidak merusak login", async () => {
  assert.equal((await one("select public.hook_password_verification_attempt('{}'::jsonb) as r")).r.decision, "continue");
});

test("API publik tidak bisa memanggil hook maupun membaca tabel", async () => {
  await db.exec("set role authenticated");
  try {
    await assert.rejects(() => pw(U, true), /permission denied/);
    await assert.rejects(() => db.query("select * from keamanan.kejadian"), /permission denied/);
  } finally {
    await db.exec("reset role");
  }
});
