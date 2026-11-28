/**
 * Uji recall berbasis SOP (migrasi 20261128090000) terhadap skema produksi ASLI (PGlite).
 *   npm run db:recall
 */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { buildDb } from "./schema.mjs";

const A = "c1000000-0000-4000-8000-000000000001";
const B = "c1000000-0000-4000-8000-000000000002";
const ADMIN = "c1000000-0000-4000-8000-0000000000a1";
const DOK = "c1000000-0000-4000-8000-0000000000d1";
const RESEP = "c1000000-0000-4000-8000-0000000000e1";
const ADMIN_B = "c1000000-0000-4000-8000-0000000000b1";
const P1 = "c1000000-0000-4000-8000-000000000101";
const P2 = "c1000000-0000-4000-8000-000000000102";
const PB = "c1000000-0000-4000-8000-000000000201";

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
const rejects = (p, re) => assert.rejects(p, (e) => re.test(e.message));
const hari = async (n) => (await one(`select (public.recall_hari_ini() + ${n})::text d`)).d;
let urutKunjungan = 0;
const kunjungan = async (pasien, tgl, status = "completed", clinic = A) =>
  (await one("insert into public.visits (patient_id, visit_number, tanggal_kunjungan, status, dokter_id, clinic_id) values ($1, $2, $3, $4, $5, $6) returning id",
    [pasien, ++urutKunjungan, tgl, status, clinic === A ? DOK : null, clinic])).id;
const putuskan = (uid, visit, keputusan, interval = null, wajib = false, tujuan = null) =>
  asUser(uid, () => one("select * from public.recall_simpan_keputusan($1, $2, $3, $4, $5)", [visit, keputusan, interval, wajib, tujuan]));
const daftar = (uid, tab) => asUser(uid, () => q("select * from public.recall_daftar($1)", [tab]));
const jadwal = (visit) => one("select * from public.recall_jadwal where visit_id = $1", [visit]);

before(async () => {
  db = await buildDb();
  await db.exec(`
    insert into public.clinics (id, name, slug, status) values ('${A}', 'Klinik A', 'klinik-a-rc', 'active'), ('${B}', 'Klinik B', 'klinik-b-rc', 'active');
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data)
      select u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u || '@test.local', '{}'
      from unnest(array['${ADMIN}', '${DOK}', '${RESEP}', '${ADMIN_B}']::uuid[]) u;
    insert into public.users (id, email, full_name, role, clinic_id, status) values
      ('${ADMIN}', 'a@test.local', 'Admin A', 'admin', '${A}', 'active'),
      ('${DOK}', 'd@test.local', 'drg. Uji', 'dokter', '${A}', 'active'),
      ('${RESEP}', 'r@test.local', 'Resepsionis A', 'resepsionis', '${A}', 'active'),
      ('${ADMIN_B}', 'b@test.local', 'Admin B', 'admin', '${B}', 'active');
    insert into public.treatments (clinic_id, kode_treatment, nama_treatment, kategori, harga_dasar) values
      ('${A}', 'END-001', 'Perawatan Saluran Akar (PSA) Anterior', 'Endodonsia', 900000),
      ('${A}', 'PRV-001', 'Scaling', 'Preventif', 300000),
      ('${A}', 'EKS-001', 'Cabut Gigi Permanen', 'Eksodonsia', 250000),
      ('${A}', 'BDH-001', 'Odontektomi', 'Bedah Mulut', 1500000),
      ('${A}', 'XXX-001', 'Tindakan Lain-lain', null, 100000),
      ('${B}', 'PRV-001', 'Scaling', 'Preventif', 300000);
    insert into public.patients (id, no_rm, nama_lengkap, clinic_id) values
      ('${P1}', 'RM-000001', 'Pasien Satu', '${A}'), ('${P2}', 'RM-000002', 'Pasien Dua', '${A}'), ('${PB}', 'RM-000001', 'Pasien B', '${B}');
  `);
});

test("SOP default: perawatan dikenali, cabut = tidak perlu, yang tak dikenal dibiarkan; tidak menimpa ubahan klinik", async () => {
  await db.exec(`select public.recall_sop_isi_default('${A}'); select public.recall_sop_isi_default('${B}')`);
  const sop = await q(`select t.kode_treatment k, s.perlu, s.interval_hari, s.wajib from public.recall_sop s join public.treatments t on t.id = s.treatment_id where s.clinic_id = '${A}' order by 1`);
  assert.deepEqual(sop.map((s) => [s.k, s.perlu, s.interval_hari, s.wajib]), [
    ["BDH-001", true, 7, true], ["EKS-001", false, null, false], ["END-001", true, 7, true], ["PRV-001", true, 180, false],
  ]);
  await asUser(ADMIN, () => q("update public.recall_sop set interval_hari = 120 where treatment_id = (select id from public.treatments where kode_treatment = 'PRV-001' and clinic_id = $1)", [A]));
  assert.equal(await asUser(ADMIN, async () => (await one("select public.recall_sop_isi_default_saya() n")).n), 0);
  assert.equal((await one(`select interval_hari from public.recall_sop s join public.treatments t on t.id = s.treatment_id where t.kode_treatment = 'PRV-001' and s.clinic_id = '${A}'`)).interval_hari, 120);
});

test("SOP: hanya manajer yang mengubah; staf lain hanya membaca; klinik lain tidak terlihat", async () => {
  const lihat = await asUser(DOK, () => q("select count(*)::int n from public.recall_sop"));
  assert.equal(lihat[0].n, 4);
  const ubah = await asUser(DOK, () => q("update public.recall_sop set interval_hari = 1 returning id"));
  assert.equal(ubah.length, 0, "dokter tidak bisa mengubah SOP");
  await rejects(asUser(RESEP, () => one("select public.recall_sop_isi_default_saya()")), /manajer/);
  assert.equal((await asUser(ADMIN_B, () => q("select count(*)::int n from public.recall_sop")))[0].n, 1);
  const tB = (await one(`select id from public.treatments where clinic_id = '${B}'`)).id;
  await rejects(asUser(ADMIN, () => q("insert into public.recall_sop (treatment_id, perlu, interval_hari) values ($1, true, 30)", [tB])), /row-level security|violates/);
  // perlu=false membersihkan interval & wajib
  const r = await asUser(ADMIN, () => one("update public.recall_sop set perlu = false where treatment_id = (select id from public.treatments where kode_treatment = 'END-001' and clinic_id = $1) returning interval_hari, wajib", [A]));
  assert.deepEqual([r.interval_hari, r.wajib], [null, false]);
  await asUser(ADMIN, () => q("update public.recall_sop set perlu = true, interval_hari = 7, wajib = true where treatment_id = (select id from public.treatments where kode_treatment = 'END-001' and clinic_id = $1)", [A]));
});

test("keputusan dokter: perlu → target = tanggal kunjungan + interval; resepsionis ditolak; validasi", async () => {
  const v = await kunjungan(P1, await hari(-3));
  await rejects(putuskan(RESEP, v, "perlu", 7), /dokter atau manajer/);
  await rejects(putuskan(DOK, v, "perlu", null), /1–730/);
  await rejects(putuskan(DOK, v, "perlu", 900), /1–730/);
  await rejects(putuskan(DOK, v, "mungkin"), /tidak dikenal/);
  await rejects(putuskan(ADMIN_B, v, "perlu", 7), /tidak ditemukan/);

  const r = await putuskan(DOK, v, "perlu", 7, true, "Lanjutan PSA");
  assert.equal(r.keputusan, "perlu");
  const j = await jadwal(v);
  assert.equal(j.status, "menunggu");
  assert.equal(j.wajib, true);
  assert.equal((await one("select ($1::date - $2::date) d", [j.tanggal_target, await hari(-3)])).d, 7);
  assert.equal(j.dokter_id, DOK);

  // ubah ke tidak perlu → bersih; tidak boleh tulis langsung ke tabel
  await putuskan(DOK, v, "tidak_perlu");
  const t = await jadwal(v);
  assert.deepEqual([t.keputusan, t.status, t.tanggal_target, t.wajib], ["tidak_perlu", null, null, false]);
  await rejects(asUser(DOK, () => q("update public.recall_jadwal set status = 'selesai'")), /permission denied/);
  await putuskan(DOK, v, "perlu", 7, true, "Lanjutan PSA");
});

test("daftar & ringkasan: jatuh tempo (wajib dulu), belum ditentukan, isolasi klinik", async () => {
  const v2 = await kunjungan(P2, await hari(-1));
  await putuskan(DOK, v2, "belum");
  const jt = await daftar(RESEP, "jatuh_tempo");
  assert.equal(jt.length, 1);
  assert.equal(jt[0].no_rm, "RM-000001");
  assert.equal(jt[0].wajib, true);
  assert.equal(jt[0].hari_lagi, 4);
  assert.equal(jt[0].dokter_nama, "drg. Uji");
  const belum = await daftar(DOK, "belum");
  assert.deepEqual(belum.map((b) => b.no_rm), ["RM-000002"]);
  const rk = await asUser(RESEP, () => one("select * from public.recall_ringkasan()"));
  assert.deepEqual([rk.jatuh_tempo, rk.wajib_jatuh_tempo, rk.belum], [1, 1, 1]);
  assert.equal((await daftar(ADMIN_B, "jatuh_tempo")).length, 0);
  await rejects(daftar(RESEP, "semua"), /tidak dikenal/);
  await assert.rejects(db.exec("set role anon; select * from public.recall_daftar('jatuh_tempo')"));
  await db.exec("reset role");
});

test("tindak lanjut: status diubah staf; tidak jadi wajib beralasan", async () => {
  const id = (await daftar(RESEP, "jatuh_tempo"))[0].id;
  await rejects(asUser(RESEP, () => one("select * from public.recall_ubah_status($1, 'tidak_jadi')", [id])), /alasan/);
  const r = await asUser(RESEP, () => one("select * from public.recall_ubah_status($1, 'diingatkan', 'Sudah di-WA')", [id]));
  assert.deepEqual([r.status, r.catatan, r.status_diubah_oleh], ["diingatkan", "Sudah di-WA", RESEP]);
  await rejects(asUser(ADMIN_B, () => one("select * from public.recall_ubah_status($1, 'selesai')", [id])), /tidak ditemukan/);
  await rejects(asUser(RESEP, () => one("select * from public.recall_ubah_status($1, 'terlewat')", [id])), /tidak dikenal/);
});

test("kunjungan terjadwal → dibooking; dibatalkan → kembali menunggu; pasien datang → selesai", async () => {
  const asal = (await one("select visit_id from public.recall_jadwal where patient_id = $1 and keputusan = 'perlu'", [P1])).visit_id;
  const jadwalBaru = await kunjungan(P1, await hari(5), "scheduled");
  assert.equal((await jadwal(asal)).status, "dibooking");
  await db.query("update public.visits set status = 'cancelled' where id = $1", [jadwalBaru]);
  assert.equal((await jadwal(asal)).status, "menunggu");

  // kunjungan selesai lebih dari 14 hari sebelum target tidak menutup recall
  const pJauh = "c1000000-0000-4000-8000-000000000106";
  await db.query("insert into public.patients (id, no_rm, nama_lengkap, clinic_id) values ($1, 'RM-000006', 'Pasien Enam', $2)", [pJauh, A]);
  const vJauh = await kunjungan(pJauh, await hari(-10));
  await putuskan(DOK, vJauh, "perlu", 180);
  await kunjungan(pJauh, await hari(0));
  assert.equal((await jadwal(vJauh)).status, "menunggu");

  const datang = await kunjungan(P1, await hari(0), "scheduled");
  assert.equal((await jadwal(asal)).status, "dibooking");
  await db.query("update public.visits set status = 'completed' where id = $1", [datang]);
  const j = await jadwal(asal);
  assert.deepEqual([j.status, j.ditutup_oleh_visit_id], ["selesai", datang]);
});

test("keputusan baru saat sudah ada jadwal mendatang langsung dibooking", async () => {
  const v = await kunjungan(P2, await hari(-30));
  await kunjungan(P2, await hari(3), "scheduled");
  const r = await putuskan(DOK, v, "perlu", 30);
  assert.equal(r.status, "dibooking");
});

test("harian: lewat 7 hari → terlewat + lonceng resepsionis & dokter untuk WAJIB (sekali saja)", async () => {
  const pTua = "c1000000-0000-4000-8000-000000000103";
  await db.query("insert into public.patients (id, no_rm, nama_lengkap, clinic_id) values ($1, 'RM-000003', 'Pasien Tiga', $2)", [pTua, A]);
  const v = await kunjungan(pTua, await hari(-20));
  await putuskan(DOK, v, "perlu", 7, true);
  assert.equal((await one("select public.recall_harian() n")).n, 2);
  assert.equal((await jadwal(v)).status, "terlewat");
  assert.equal((await one("select public.recall_harian() n")).n, 0, "tidak dobel");
  const n = await q("select penerima_role, penerima_id, tautan from public.notifikasi where kunci like 'recall:%' order by tautan");
  assert.deepEqual(n.map((x) => [x.penerima_role, x.penerima_id, x.tautan]), [[null, DOK, "/dokter/recall"], ["resepsionis", null, "/resepsionis/recall"]]);
  assert.deepEqual((await daftar(RESEP, "terlewat")).map((r) => r.no_rm), ["RM-000003"]);
});

test("daftar lama > N bulan tidak memuat pasien dengan recall aktif", async () => {
  const pLama = "c1000000-0000-4000-8000-000000000104";
  const pLama2 = "c1000000-0000-4000-8000-000000000105";
  await db.query("insert into public.patients (id, no_rm, nama_lengkap, clinic_id) values ($1, 'RM-000004', 'L1', $3), ($2, 'RM-000005', 'L2', $3)", [pLama, pLama2, A]);
  const v = await kunjungan(pLama, await hari(-400));
  await kunjungan(pLama2, await hari(-400));
  await putuskan(DOK, v, "perlu", 400);
  const c = await asUser(RESEP, () => q("select no_rm from public.recall_candidates(6)"));
  assert.ok(c.some((x) => x.no_rm === "RM-000005"));
  assert.ok(!c.some((x) => x.no_rm === "RM-000004"));
});
