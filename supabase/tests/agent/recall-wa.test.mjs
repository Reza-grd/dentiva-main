/**
 * Uji recall WhatsApp otomatis (migrasi 20261130090000) terhadap skema produksi ASLI (PGlite).
 *   npm run db:recall-wa
 */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { buildDb } from "./schema.mjs";

const A = "c2000000-0000-4000-8000-000000000001";
const B = "c2000000-0000-4000-8000-000000000002";
const DOK = "c2000000-0000-4000-8000-0000000000d1";
const DOK_B = "c2000000-0000-4000-8000-0000000000d2";
const RESEP = "c2000000-0000-4000-8000-0000000000e1";
const PLAN = "c2000000-0000-4000-8000-0000000000f1";
const P1 = "c2000000-0000-4000-8000-000000000101"; // setuju WA
const P2 = "c2000000-0000-4000-8000-000000000102"; // tidak setuju WA
const P3 = "c2000000-0000-4000-8000-000000000103"; // setuju WA, recall WAJIB
const PB = "c2000000-0000-4000-8000-000000000201"; // klinik B (tidak ikut serta)

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
const q = async (sql, p) => (await db.query(sql, p)).rows;
const one = async (sql, p) => (await q(sql, p))[0];
const hari = async (n) => (await one(`select (public.recall_hari_ini() + ${n})::text d`)).d;
let urut = 0;
const kunjungan = async (pasien, tgl, clinic = A, status = "completed") =>
  (await one("insert into public.visits (patient_id, visit_number, tanggal_kunjungan, status, dokter_id, clinic_id) values ($1, $2, $3, $4, $5, $6) returning id",
    [pasien, ++urut, tgl, status, clinic === A ? DOK : DOK_B, clinic])).id;
const recallBaru = async (pasien, { clinic = A, wajib = false, interval = 7, mundur = 2 } = {}) => {
  const v = await kunjungan(pasien, await hari(-mundur), clinic);
  const r = await asUser(clinic === A ? DOK : DOK_B, () =>
    one("select * from public.recall_simpan_keputusan($1, 'perlu', $2, $3, 'Lanjutan perawatan saluran akar')", [v, interval, wajib]));
  // Keputusan dibuat pada hari kunjungan (bukan "baru saja").
  await db.query("update public.recall_jadwal set created_at = now() - make_interval(days => $2) where id = $1", [r.id, mundur]);
  return { visit: v, id: r.id };
};
const antrean = () => q("select * from public.recall_wa_antrean(50)");
const rj = (id) => one("select * from public.recall_jadwal where id = $1", [id]);

before(async () => {
  db = await buildDb();
  await db.exec(`
    insert into public.clinics (id, name, slug, status) values ('${A}', 'Klinik Gigi Senyum', 'klinik-a-rwa', 'active'), ('${B}', 'Klinik B', 'klinik-b-rwa', 'active');
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data)
      select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u || '@test.local', '{}'
      from unnest(array['${DOK}', '${DOK_B}', '${RESEP}']::uuid[]) u;
    insert into public.users (id, email, full_name, role, clinic_id, status) values
      ('${DOK}', 'd@test.local', 'drg. Uji', 'dokter', '${A}', 'active'),
      ('${DOK_B}', 'db@test.local', 'drg. B', 'dokter', '${B}', 'active'),
      ('${RESEP}', 'r@test.local', 'Resepsionis A', 'resepsionis', '${A}', 'active');
    insert into public.subscription_plans (id, name, price_monthly, price_yearly, features)
      values ('${PLAN}', 'Uji WA', 0, 0, '{"whatsapp_reminders": true}');
    delete from public.clinic_subscriptions where clinic_id in ('${A}', '${B}');
    insert into public.clinic_subscriptions (clinic_id, plan_id, status, current_period_end) values
      ('${A}', '${PLAN}', 'active', now() + interval '30 days'), ('${B}', '${PLAN}', 'active', now() + interval '30 days');
    insert into public.clinic_settings (clinic_id, key, value) values
      ('${A}', 'wa_recall_otomatis', 'true'), ('${A}', 'clinic_phone', '021-555'),
      ('${B}', 'wa_recall_otomatis', 'false');
    insert into public.patients (id, no_rm, nama_lengkap, clinic_id, wa_consent, no_wa) values
      ('${P1}', 'RM-000001', 'Pasien Satu', '${A}', true, '08123'),
      ('${P2}', 'RM-000002', 'Pasien Dua', '${A}', false, '08124'),
      ('${P3}', 'RM-000003', 'Pasien Tiga', '${A}', true, '08125'),
      ('${PB}', 'RM-000001', 'Pasien B', '${B}', true, '08126');
  `);
});

let r1;
test("antrean awal: hanya klinik yang ikut serta, pasien setuju WA, target ≤ 7 hari, bukan hari kunjungan asal", async () => {
  r1 = await recallBaru(P1);
  await recallBaru(P2);
  await recallBaru(PB, { clinic: B });
  const jauh = await recallBaru(P3, { interval: 30 }); // target masih jauh
  const baru = await recallBaru(P3, { interval: 7, mundur: 0 }); // diputuskan hari ini
  const a = await antrean();
  assert.deepEqual(a.map((x) => [x.patient_id, x.jenis]), [[P1, "awal"]]);
  assert.equal(a[0].nama_klinik, "Klinik Gigi Senyum");
  assert.equal(a[0].telepon_klinik, "021-555");
  assert.equal(a[0].tujuan, "Lanjutan perawatan saluran akar");
  assert.ok(a[0].kode_wa, "kode klinik terisi");
  // Rapikan agar tidak mengganggu uji berikutnya.
  await db.query("update public.recall_jadwal set status = 'tidak_jadi', catatan = 'uji' where id = any($1)", [[jauh.id, baru.id]]);
});

test("tandai terkirim → diingatkan; pesan ulang sekali setelah 2 hari tanpa jawaban", async () => {
  await db.query("select public.recall_wa_tandai($1, 'awal')", [r1.id]);
  assert.equal((await rj(r1.id)).status, "diingatkan");
  assert.equal((await antrean()).length, 0);
  await db.query("update public.recall_jadwal set wa_awal_at = now() - interval '3 days' where id = $1", [r1.id]);
  assert.deepEqual((await antrean()).map((x) => x.jenis), ["ulang"]);
  await db.query("select public.recall_wa_tandai($1, 'ulang')", [r1.id]);
  assert.equal((await antrean()).length, 0);
});

test("pasien sudah punya jadwal mendatang → tidak dikirimi", async () => {
  const r = await recallBaru(P3);
  assert.ok((await antrean()).some((x) => x.id === r.id));
  const v = await kunjungan(P3, await hari(3), A, "scheduled");
  assert.ok(!(await antrean()).some((x) => x.id === r.id));
  await db.query("update public.visits set deleted_at = now() where id = $1", [v]);
  await db.query("update public.recall_jadwal set status = 'tidak_jadi', catatan = 'uji' where id = $1", [r.id]);
});

test("cari recall dari balasan: pesan dikutip lebih dulu, lalu sidik nomor (pesan recall terakhir)", async () => {
  await db.query(`insert into public.notification_logs (visit_id, patient_id, clinic_id, message_type, status, provider, provider_message_id, recipient_hash)
                  values ($1, $2, $3, 'recall_awal', 'sent', 'sidecar', 'PESAN-1', 'hash-p1')`, [r1.visit, P1, A]);
  const kutip = await one("select * from public.recall_wa_cari('PESAN-1', 'hash-lain')");
  assert.equal(kutip.id, r1.id);
  assert.equal(kutip.no_rm, "RM-000001");
  assert.equal((await one("select * from public.recall_wa_cari(null, 'hash-p1')")).id, r1.id);
  assert.equal((await q("select * from public.recall_wa_cari('tidak-ada', 'hash-asing')")).length, 0);
});

test("cari lewat sidik nomor: tidak dipakai bila pesan terakhir ke nomor itu bukan percakapan recall", async () => {
  await db.query(`insert into public.notification_logs (visit_id, patient_id, clinic_id, message_type, status, provider, recipient_hash, "timestamp")
                  values (null, $1, $2, 'recall_balasan', 'sent', 'sidecar', 'hash-p1', now() + interval '1 second')`, [P1, A]);
  assert.equal((await one("select * from public.recall_wa_cari(null, 'hash-p1')")).id, r1.id, "balasan recall tetap percakapan recall");
  const pengingat = await one(`insert into public.notification_logs (patient_id, clinic_id, message_type, status, provider, recipient_hash, "timestamp")
                  values ($1, $2, 'reminder', 'sent', 'sidecar', 'hash-p1', now() + interval '2 seconds') returning id`, [P1, A]);
  assert.equal((await q("select * from public.recall_wa_cari(null, 'hash-p1')")).length, 0, "'ya' untuk pengingat janji bukan jawaban recall");
  assert.equal((await one("select * from public.recall_wa_cari('PESAN-1', 'hash-p1')")).id, r1.id, "pesan dikutip tetap dikenali");
  await db.query("delete from public.notification_logs where id = $1", [pengingat.id]);
});

test("jawaban: Bisa → dikonfirmasi + lonceng resepsionis; diulang → 'sudah'; Ganti → minta_ganti", async () => {
  assert.equal((await one("select public.recall_wa_jawab($1, 'bisa') h", [r1.id])).h, "dikonfirmasi");
  const s = await rj(r1.id);
  assert.equal(s.status, "dikonfirmasi");
  assert.equal(s.wa_jawaban, "bisa");
  assert.equal((await one("select public.recall_wa_jawab($1, 'bisa') h", [r1.id])).h, "sudah");
  const n = await one("select count(*)::int n from public.notifikasi where kunci = $1", [`recall:wa:bisa:${r1.id}`]);
  assert.equal(n.n, 1);
  assert.equal((await one("select public.recall_wa_jawab($1, 'ganti') h", [r1.id])).h, "minta_ganti");
  assert.equal((await rj(r1.id)).status, "minta_ganti");
});

test("Tidak perlu: recall biasa ditutup; recall WAJIB diteruskan ke resepsionis & dokter", async () => {
  const biasa = await recallBaru(P1);
  assert.equal((await one("select public.recall_wa_jawab($1, 'tidak') h", [biasa.id])).h, "tidak_jadi");
  assert.equal((await rj(biasa.id)).status, "tidak_jadi");
  assert.equal((await one("select public.recall_wa_jawab($1, 'bisa') h", [biasa.id])).h, "ditutup");

  const wajib = await recallBaru(P3, { wajib: true });
  assert.equal((await one("select public.recall_wa_jawab($1, 'tidak') h", [wajib.id])).h, "diteruskan");
  const s = await rj(wajib.id);
  assert.equal(s.status, "minta_ganti");
  assert.match(s.catatan, /WAJIB/);
  const dok = await one("select count(*)::int n from public.notifikasi where penerima_id = $1 and kunci = $2", [DOK, `recall:wa:tidak-dokter:${wajib.id}`]);
  assert.equal(dok.n, 1);
});

test("petunjuk 'balas 1/2/3' hanya sekali; fungsi tidak bisa dipanggil pengguna aplikasi", async () => {
  const r = await recallBaru(P1);
  assert.equal((await one("select public.recall_wa_petunjuk($1) b", [r.id])).b, true);
  assert.equal((await one("select public.recall_wa_petunjuk($1) b", [r.id])).b, false);
  for (const sql of ["select public.recall_wa_antrean(5)", `select public.recall_wa_jawab('${r.id}', 'bisa')`, "select * from public.recall_wa_cari('x', 'y')"]) {
    await assert.rejects(asUser(RESEP, () => q(sql)), /permission denied/);
  }
});
