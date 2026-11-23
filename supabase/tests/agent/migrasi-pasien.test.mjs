/**
 * Uji migrasi data pasien dibantu tim Dentiva (fungsi platform.migrasi_*) terhadap skema
 * produksi ASLI (PGlite).   npm run db:migrasi-pasien
 */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { buildDb } from "./schema.mjs";

const A = "a1000000-0000-4000-8000-000000000001";
const B = "a1000000-0000-4000-8000-000000000002";
const OP = "a1000000-0000-4000-8000-0000000000f1";
let db;
const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const rows = async (sql, p) => (await db.query(sql, p)).rows;
const rejects = (p, re) => assert.rejects(p, (e) => re.test(e.message));

const mulai = async (total, clinic = A) =>
  (await one("select * from platform.migrasi_mulai($1, $2, 'pasien-lama.xlsx', 'Permintaan tertulis drg. Uji via WA', $3)", [clinic, OP, total]));
const kirim = async (id, baris) => (await one("select platform.migrasi_kirim($1, $2::jsonb) r", [id, JSON.stringify(baris)])).r;
const cek = (clinic, baris) => rows("select * from platform.migrasi_cek_duplikat($1, $2::jsonb) order by baris", [clinic, JSON.stringify(baris)]);
const buka = (clinic, kolom = "nama_lengkap") =>
  rows(`select private.decrypt_for_clinic(${kolom}, $1) as v, ${kolom} as mentah, no_rm, no_rm_lama, umur from public.patients where clinic_id = $1 and deleted_at is null order by no_rm`, [clinic]);

const BUDI = { baris: 2, nama_lengkap: "Budi Santoso", tanggal_lahir: "1990-05-17", jenis_kelamin: "Laki-laki", no_wa: "081234567890", alamat: "Jl. Merdeka 1", nik: "3201234567890001", no_rm_lama: "A-001" };
const SITI = { baris: 3, nama_lengkap: "Siti Aminah", tanggal_lahir: "1985-01-02", jenis_kelamin: "Perempuan", no_rm_lama: "A-002" };
const ANI = { baris: 4, nama_lengkap: "Ani", golongan_darah: "O" };

before(async () => {
  db = await buildDb();
  await db.exec(`
    insert into public.clinics (id, name, slug, status) values ('${A}', 'Klinik A', 'klinik-a-mig', 'active'), ('${B}', 'Klinik B', 'klinik-b-mig', 'active');
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data) values
      ('${OP}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'op@dentiva.test', '{}');
    insert into platform.operators (user_id, full_name, role, is_active) values ('${OP}', 'Operator', 'support', true);
  `);
});

test("impor: terenkripsi atas nama klinik, RM baru dibuat, RM lama disimpan, notifikasi saat selesai", async () => {
  const m = await mulai(3);
  assert.equal(m.status, "berjalan");
  const r = await kirim(m.id, [BUDI, SITI, ANI]);
  assert.equal(r.masuk, 3);
  assert.deepEqual(r.lewati, []);

  const nama = await buka(A);
  assert.deepEqual(nama.map((p) => p.v), ["Budi Santoso", "Siti Aminah", "Ani"]);
  assert.ok(nama.every((p) => /^PGP:/.test(p.mentah)), "nama tersimpan terenkripsi");
  assert.deepEqual(nama.map((p) => p.no_rm), ["RM-000001", "RM-000002", "RM-000003"]);
  assert.deepEqual(nama.map((p) => p.no_rm_lama), ["A-001", "A-002", null]);
  assert.ok(nama[0].umur >= 36);
  assert.equal((await buka(A, "nik"))[0].v, "3201234567890001");
  assert.equal((await buka(A, "no_wa"))[2].v, null, "kolom kosong tetap null");
  await rejects(db.query("select private.decrypt_for_clinic(nama_lengkap, $1) from public.patients where clinic_id = $2", [B, A]), /mismatch/);

  const s = await one("select * from platform.migrasi_selesai($1)", [m.id]);
  assert.equal(s.status, "selesai");
  assert.equal(s.jumlah_masuk, 3);
  const n = await one("select judul, isi, tautan, jenis, penerima_role from public.notifikasi where clinic_id = $1 and kunci = $2", [A, `migrasi:${m.id}`]);
  assert.equal(n.judul, "Data pasien lama sudah dipindahkan");
  assert.match(n.isi, /3 pasien dari berkas "pasien-lama\.xlsx"/);
  assert.equal(n.tautan, "/patients");
  assert.equal(n.penerima_role, null);
});

test("cek duplikat: RM lama, NIK, nama+tanggal lahir (pasti) dan nama saja (peringatan)", async () => {
  const d = await cek(A, [
    { baris: 10, nama_lengkap: "Orang Lain", no_rm_lama: "A-001" },
    { baris: 11, nama_lengkap: "Budi S.", nik: "3201234567890001" },
    { baris: 12, nama_lengkap: "  siti   AMINAH ", tanggal_lahir: "1985-01-02" },
    { baris: 13, nama_lengkap: "Ani", tanggal_lahir: "2000-01-01" },
    { baris: 14, nama_lengkap: "Siti Aminah", tanggal_lahir: "1999-09-09" },
    { baris: 15, nama_lengkap: "Baru Sekali" },
  ]);
  assert.deepEqual(d.map((x) => [x.baris, x.pasti, x.no_rm]), [
    [10, true, "RM-000001"], [11, true, "RM-000001"], [12, true, "RM-000002"], [13, false, "RM-000003"],
  ]);
  assert.match(d[0].alasan, /RM lama/);
  assert.match(d[1].alasan, /NIK/);
  assert.match(d[3].alasan, /periksa manual/);
  assert.deepEqual(await cek(B, [BUDI]), [], "klinik lain tidak terpengaruh");
});

test("kirim melewati duplikat pasti & duplikat dalam potongan; peringatan tetap dimasukkan", async () => {
  const m = await mulai(4);
  const r = await kirim(m.id, [
    { ...BUDI, baris: 2 },
    { baris: 3, nama_lengkap: "Ani", tanggal_lahir: "2001-01-01" },
    { baris: 4, nama_lengkap: "Dewi", no_rm_lama: "A-010" },
    { baris: 5, nama_lengkap: "Dewi Kembar", no_rm_lama: "A-010" },
  ]);
  assert.equal(r.masuk, 2);
  assert.deepEqual(r.lewati.map((x) => [x.baris, x.alasan]), [[2, "No. RM lama sudah ada"], [5, "Duplikat di dalam berkas"]]);
  // potongan berikutnya tetap mengenali baris dari potongan sebelumnya
  const r2 = await kirim(m.id, [{ baris: 6, nama_lengkap: "Dewi lagi", no_rm_lama: "A-010" }]);
  assert.equal(r2.masuk, 0);
  const s = await one("select * from platform.migrasi_selesai($1)", [m.id]);
  assert.equal(s.jumlah_masuk, 2);
  assert.equal(s.jumlah_lewati, 3);
  await rejects(kirim(m.id, [ANI]), /sudah berstatus selesai/);
});

test("hanya satu migrasi berjalan per klinik; kuota paket dicek sebelum mulai", async () => {
  const m = await mulai(1, B);
  await rejects(mulai(1, B), /Masih ada migrasi yang berjalan/);
  await db.query("update platform.migrasi_pasien set status = 'selesai' where id = $1", [m.id]);
  await rejects(mulai(5000, B), /Kuota pasien paket tidak cukup: terpakai 0 dari 1000/);
});

test("batalkan: pasien belum dipakai dihapus, yang sudah dipakai dipertahankan", async () => {
  const m = await mulai(2, B);
  await kirim(m.id, [{ baris: 2, nama_lengkap: "Pasien Satu" }, { baris: 3, nama_lengkap: "Pasien Dua" }]);
  await one("select platform.migrasi_selesai($1)", [m.id]);
  // klinik sudah mengubah salah satu pasien
  await db.query("update public.patients set pekerjaan = 'Guru', created_at = now() - interval '1 hour' where migrasi_id = $1 and no_rm = 'RM-000001'", [m.id]);
  const b = await one("select * from platform.migrasi_batalkan($1, $2, 'Berkas salah klinik')", [m.id, OP]);
  assert.equal(b.status, "dibatalkan");
  assert.equal(b.jumlah_dibatalkan, 1);
  assert.equal(b.jumlah_dipertahankan, 1);
  assert.deepEqual((await buka(B)).map((p) => p.v), ["Pasien Satu"]);
  const n = await one("select isi from public.notifikasi where kunci = $1", [`migrasi-batal:${m.id}`]);
  assert.match(n.isi, /1 pasien hasil migrasi dihapus, 1 pasien dipertahankan/);
  await rejects(one("select platform.migrasi_batalkan($1, $2, 'lagi')", [m.id, OP]), /sudah dibatalkan/);
});

test("fungsi migrasi tidak bisa dipanggil klien (anon/authenticated)", async () => {
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(db.exec(`set role ${role}; select platform.migrasi_cek_duplikat('${A}', '[]'::jsonb)`));
    await db.exec("reset role");
    await assert.rejects(db.exec(`set role ${role}; select * from platform.migrasi_pasien`));
    await db.exec("reset role");
  }
});

test("koreksi pemetaan kolom tersimpan (tanpa isi data), ikut terhapus bersama migrasinya, tertutup bagi klien", async () => {
  const m = await mulai(1, B);
  const pemetaan = [
    { kolom: 0, judul: "Nm Psn", fitur: [0.5, 0, 1.25], tebakan: "nama_lengkap", final: "nama_lengkap" },
    { kolom: 1, judul: null, fitur: [0, 0.8, 0], tebakan: "abaikan", final: "no_wa" },
  ];
  // SQL yang sama dengan handler console-api migrasi.mulai
  await db.query(
    `insert into platform.migrasi_koreksi_kolom (migrasi_id, kolom, judul, fitur, tebakan, final, versi_model)
     select $1, r.kolom, nullif(r.judul, ''), array(select jsonb_array_elements_text(r.fitur)::real), r.tebakan, r.final, $3
     from jsonb_to_recordset($2::jsonb) as r(kolom int, judul text, fitur jsonb, tebakan text, final text)`,
    [m.id, JSON.stringify(pemetaan), "kolom-uji"],
  );
  const k = await rows("select kolom, judul, fitur, dikoreksi from platform.migrasi_koreksi_kolom where migrasi_id = $1 order by kolom", [m.id]);
  assert.deepEqual(k.map((r) => [r.kolom, r.judul, r.fitur, r.dikoreksi]), [
    [0, "Nm Psn", [0.5, 0, 1.25], false],
    [1, null, [0, 0.8, 0], true],
  ]);
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(db.exec(`set role ${role}; select * from platform.migrasi_koreksi_kolom`));
    await db.exec("reset role");
  }
  await db.query("delete from platform.migrasi_pasien where id = $1", [m.id]);
  assert.equal((await one("select count(*)::int n from platform.migrasi_koreksi_kolom")).n, 0);
});
