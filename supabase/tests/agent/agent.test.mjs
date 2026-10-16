/**
 * Uji fungsi database Denti Agen terhadap skema produksi ASLI (PGlite, tanpa Docker).
 *   npm run db:agent
 * Mencakup: usulan → persetujuan → pembatalan untuk semua jenis tindakan, validasi, peringatan duplikat,
 * keamanan antar-klinik & peran, kedaluwarsa usulan, persetujuan massal yang atomik, dan alat baca.
 */
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { buildDb } from "./schema.mjs";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const ADMIN_A = "a0000000-0000-4000-8000-00000000000a";
const RECEP_A = "a0000000-0000-4000-8000-00000000000e";
const ADMIN_B = "b0000000-0000-4000-8000-00000000000b";

let db;
const asUser = async (uid, fn) => {
  await db.exec("reset role");
  const clinic = (await db.query("select clinic_id from public.users where id = $1", [uid])).rows[0]?.clinic_id;
  await db.query("select set_config('request.jwt.claims', $1, false), set_config('request.jwt.claim.sub', $2, false)",
    [JSON.stringify({ sub: uid, role: "authenticated", app_metadata: { clinic_id: clinic } }), uid]);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
};
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];

const propose = (uid, kind, args) => asUser(uid, async () => (await one("select public.ai_agent_propose($1, $2::jsonb) r", [kind, JSON.stringify(args)])).r);
const apply = (uid, ids) => asUser(uid, async () => (await one("select public.ai_agent_apply($1::uuid[]) r", [ids])).r);
const undo = (uid, id) => asUser(uid, async () => (await one("select public.ai_agent_undo($1::uuid) r", [id])).r);
const read = (uid, sql, params) => asUser(uid, async () => (await one(sql, params)).r);
const ok = async (kind, args, uid = ADMIN_A) => {
  const r = await propose(uid, kind, args);
  assert.equal(r.ok, true, `${kind}: ${r.error}`);
  return r;
};
const run = async (kind, args, uid = ADMIN_A) => {
  const r = await ok(kind, args, uid);
  return { proposal: r, applied: await apply(uid, [r.action_id]) };
};
const rejects = (p, re) => assert.rejects(p, (e) => re.test(e.message));

before(async () => {
  db = await buildDb();
  await db.exec(`
    insert into public.clinics (id, name, slug, status) values ('${A}', 'Klinik A', 'klinik-a', 'active'), ('${B}', 'Klinik B', 'klinik-b', 'active');
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data) values
      ('${ADMIN_A}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-a@test.local', '{}'),
      ('${RECEP_A}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'resep-a@test.local', '{}'),
      ('${ADMIN_B}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-b@test.local', '{}');
    insert into public.users (id, email, full_name, role, clinic_id, status) values
      ('${ADMIN_A}', 'admin-a@test.local', 'Admin A', 'admin', '${A}', 'active'),
      ('${RECEP_A}', 'resep-a@test.local', 'Resepsionis A', 'resepsionis', '${A}', 'active'),
      ('${ADMIN_B}', 'admin-b@test.local', 'Admin B', 'admin', '${B}', 'active');
    insert into public.treatments (clinic_id, kode_treatment, nama_treatment, kategori, harga_dasar, tier) values
      ('${A}', 'T-1', 'Scaling', 'Periodonsia', 300000, 'ringan'),
      ('${A}', 'T-2', 'Tambal Komposit', 'Konservasi', 450000, 'sedang'),
      ('${B}', 'T-1', 'Scaling B', 'Periodonsia', 111000, 'ringan');
  `);
});

test("peran: resepsionis tidak boleh mengusulkan/membaca; klinik lain tidak melihat data", async () => {
  await rejects(propose(RECEP_A, "pengeluaran_catat", { kategori: "Lainnya", deskripsi: "x", jumlah: 1000 }), /hanya untuk admin/i);
  await rejects(read(RECEP_A, "select public.ai_cari_bahan('') r"), /hanya untuk admin/i);
  await assert.rejects(db.exec("set role anon; select public.ai_agent_propose('pengeluaran_catat', '{}'::jsonb)"));
  await db.exec("reset role");
});

test("jenis tidak dikenal & argumen tidak valid ditolak dengan pesan jelas", async () => {
  assert.equal((await propose(ADMIN_A, "hapus_semua", {})).ok, false);
  const r1 = await propose(ADMIN_A, "pengeluaran_catat", { kategori: "Lainnya", deskripsi: "Listrik", jumlah: "1.250.000" });
  assert.equal(r1.ok, false); assert.match(r1.error, /angka polos/);
  const r2 = await propose(ADMIN_A, "pengeluaran_catat", { kategori: "Lainnya", deskripsi: "Listrik", jumlah: -5 });
  assert.equal(r2.ok, false);
  const r3 = await propose(ADMIN_A, "pengeluaran_catat", { kategori: "Lainnya", jumlah: 5000 });
  assert.match(r3.error, /deskripsi/);
  const r4 = await propose(ADMIN_A, "pengeluaran_catat", { kategori: "Lainnya", deskripsi: "x", jumlah: 5000, tanggal: "2999-01-01" });
  assert.equal(r4.ok, false);
});

test("pengeluaran: catat → duplikat diperingatkan → ubah → hapus → undo", async () => {
  const { proposal, applied } = await run("pengeluaran_catat", { tanggal: "2026-10-01", kategori: "Utilitas", deskripsi: "Listrik Oktober", jumlah: 1250000, pemasok: "PLN", nomor_nota: "PLN-001" });
  assert.equal(applied.dijalankan, 1);
  const exp = await one("select * from public.expenses where clinic_id = $1 and nomor_nota = 'PLN-001'", [A]);
  assert.equal(exp.sumber, "ai_agen"); assert.equal(Number(exp.jumlah), 1250000); assert.equal(exp.recorded_by, ADMIN_A);
  // duplikat
  const dup = await ok("pengeluaran_catat", { tanggal: "2026-10-02", kategori: "Utilitas", deskripsi: "Listrik lagi", jumlah: 1250000 });
  assert.ok(dup.pratinjau.peringatan.some((w) => /dua kali/.test(w)));
  await asUser(ADMIN_A, () => q("select public.ai_agent_reject($1::uuid[])", [[dup.action_id]]));
  assert.equal((await one("select status from public.ai_actions where id = $1", [dup.action_id])).status, "rejected");
  // kategori tak dikenal → Lainnya + peringatan
  const odd = await ok("pengeluaran_catat", { kategori: "Aneh", deskripsi: "Lain", jumlah: 5000 });
  assert.ok(odd.pratinjau.peringatan.some((w) => /Lainnya/.test(w)));
  // ubah
  const id = exp.id;
  const up = await run("pengeluaran_ubah", { id, jumlah: 1300000, pemasok: "PLN Persero" });
  assert.equal(Number((await one("select jumlah from public.expenses where id = $1", [id])).jumlah), 1300000);
  await undo(ADMIN_A, up.proposal.action_id);
  assert.equal(Number((await one("select jumlah from public.expenses where id = $1", [id])).jumlah), 1250000);
  assert.equal((await one("select pemasok from public.expenses where id = $1", [id])).pemasok, "PLN");
  // hapus lalu kembalikan
  const del = await run("pengeluaran_hapus", { id });
  assert.equal(await one("select 1 x from public.expenses where id = $1", [id]), undefined);
  await undo(ADMIN_A, del.proposal.action_id);
  assert.equal(Number((await one("select jumlah from public.expenses where id = $1", [id])).jumlah), 1250000);
  // batalkan pencatatan
  await undo(ADMIN_A, proposal.action_id);
  assert.equal(await one("select 1 x from public.expenses where id = $1", [id]), undefined);
  // tidak bisa dibatalkan dua kali
  await rejects(undo(ADMIN_A, proposal.action_id), /tidak dapat dibatalkan/);
});

test("bahan: tambah dengan stok awal → ubah → undo (hapus bersih)", async () => {
  const { proposal, applied } = await run("bahan_tambah", { nama: "Sarung Tangan Nitril M", satuan_dasar: "pcs", kategori: "APD", stok_awal: 100, harga_per_satuan: 2000, stok_minimum: 20, supplier: "Medika" });
  const b = await one("select * from public.master_bahan where clinic_id = $1 and nama_bahan = 'Sarung Tangan Nitril M'", [A]);
  assert.equal(b.kode_bahan, "BHN-0001"); assert.equal(Number(b.stok_saat_ini), 100); assert.equal(Number(b.harga_rata2), 2000);
  assert.equal(Number((await one("select count(*) c from public.stok_movements where material_id = $1", [b.id])).c), 1);
  assert.equal(applied.tindakan[0].bisa_batal, true);
  // nama sama → ditolak
  const dup = await propose(ADMIN_A, "bahan_tambah", { nama: "  sarung tangan nitril m ", satuan_dasar: "pcs" });
  assert.equal(dup.ok, false); assert.match(dup.error, /sudah ada/);
  // ubah
  const ch = await run("bahan_ubah", { bahan: "Sarung Tangan Nitril M", stok_minimum: 50, supplier: "Dental Mart" });
  assert.equal(Number((await one("select stok_minimum from public.master_bahan where id = $1", [b.id])).stok_minimum), 50);
  await undo(ADMIN_A, ch.proposal.action_id);
  const back = await one("select stok_minimum, supplier from public.master_bahan where id = $1", [b.id]);
  assert.equal(Number(back.stok_minimum), 20); assert.equal(back.supplier, "Medika");
  assert.equal((await propose(ADMIN_A, "bahan_ubah", { bahan: "Sarung Tangan Nitril M", stok_minimum: 20 })).ok, false);
  // undo tambah → hilang total (belum ada pergerakan lain)
  await undo(ADMIN_A, proposal.action_id);
  assert.equal(await one("select 1 x from public.master_bahan where id = $1", [b.id]), undefined);
  assert.equal(Number((await one("select count(*) c from public.stok_movements where material_id = $1", [b.id])).c), 0);
});

test("stok masuk menghitung harga rata-rata tertimbang + batch kadaluarsa + peringatan harga/duplikat", async () => {
  await run("bahan_tambah", { nama: "Anestesi Lidocaine", satuan_dasar: "ampul", stok_awal: 10, harga_per_satuan: 5000, stok_minimum: 5, satuan_beli: "box", faktor_konversi: 10 });
  const b = await one("select * from public.master_bahan where clinic_id = $1 and nama_bahan = 'Anestesi Lidocaine'", [A]);
  // 2 box = 20 ampul @ 6000/box → harga per ampul 600? (harga_satuan_beli per box 60000 → 6000/ampul)
  const r = await run("stok_masuk", { bahan: "lidocaine", jumlah_beli: 2, harga_satuan_beli: 60000, tanggal: "2026-10-10", no_faktur: "F-77", tanggal_kadaluarsa: "2027-12-31" });
  const after = await one("select * from public.master_bahan where id = $1", [b.id]);
  assert.equal(Number(after.stok_saat_ini), 30);
  assert.equal(Math.round(Number(after.harga_rata2)), Math.round((10 * 5000 + 20 * 6000) / 30));
  const batch = await one("select * from public.material_batches where material_id = $1", [b.id]);
  assert.equal(Number(batch.qty_awal), 20); assert.equal(String(batch.tanggal_kadaluarsa).slice(0, 10) === "2027-12-31" || batch.tanggal_kadaluarsa instanceof Date, true);
  assert.equal(r.applied.tindakan[0].bisa_batal, false);
  await rejects(undo(ADMIN_A, r.proposal.action_id), /tidak dapat dibatalkan/);
  // faktur sama → peringatan duplikat; harga janggal → peringatan harga
  const w = await ok("stok_masuk", { bahan: b.id, jumlah_beli: 1, harga_satuan_beli: 400000, no_faktur: "F-77" });
  assert.ok(w.pratinjau.peringatan.some((x) => /Faktur/.test(x)));
  assert.ok(w.pratinjau.peringatan.some((x) => /berbeda jauh/.test(x)));
  // kadaluarsa sebelum tanggal masuk → ditolak
  assert.equal((await propose(ADMIN_A, "stok_masuk", { bahan: b.id, jumlah_beli: 1, harga_satuan_beli: 1, tanggal: "2026-10-10", tanggal_kadaluarsa: "2026-01-01" })).ok, false);
});

test("opname: sesuaikan stok, catat kartu stok, undo hanya bila belum ada pergerakan lain", async () => {
  const b = await one("select * from public.master_bahan where clinic_id = $1 and nama_bahan = 'Anestesi Lidocaine'", [A]);
  assert.equal((await propose(ADMIN_A, "stok_opname", { bahan: b.id, stok_fisik: 30 })).ok, false); // tanpa selisih
  const op = await run("stok_opname", { bahan: "Anestesi Lidocaine", stok_fisik: 24, catatan: "Hitung ulang rak" });
  assert.equal(Number((await one("select stok_saat_ini from public.master_bahan where id = $1", [b.id])).stok_saat_ini), 24);
  const mv = await one("select * from public.stok_movements where material_id = $1 and tipe = 'opname'", [b.id]);
  assert.equal(Number(mv.jumlah), -6); assert.equal(Number(mv.stok_sebelum), 30);
  assert.equal(Number((await one("select selisih from public.stok_opname where material_id = $1", [b.id])).selisih), -6);
  await undo(ADMIN_A, op.proposal.action_id);
  assert.equal(Number((await one("select stok_saat_ini from public.master_bahan where id = $1", [b.id])).stok_saat_ini), 30);
  assert.equal(Number((await one("select count(*) c from public.stok_movements where material_id = $1 and tipe = 'opname'", [b.id])).c), 0);
  // opname lalu ada pergerakan lain → undo ditolak
  const op2 = await run("stok_opname", { bahan: b.id, stok_fisik: 28 });
  await run("stok_masuk", { bahan: b.id, jumlah_beli: 1, harga_satuan_beli: 60000 });
  await rejects(undo(ADMIN_A, op2.proposal.action_id), /pergerakan stok sesudah/);
});

test("overhead & target bulanan: atur, ubah, undo", async () => {
  const n = await run("overhead_atur", { nama_biaya: "Sewa Ruko", jumlah_bulanan: 8000000, kategori: "Sewa" });
  assert.equal(n.applied.tindakan[0].hasil.baru, true);
  const o = await one("select * from public.overhead_costs where clinic_id = $1", [A]);
  assert.equal(Number(o.jumlah_bulanan), 8000000);
  const up = await run("overhead_atur", { nama_biaya: "sewa ruko", jumlah_bulanan: 9000000 });
  assert.equal(Number((await one("select jumlah_bulanan from public.overhead_costs where id = $1", [o.id])).jumlah_bulanan), 9000000);
  await undo(ADMIN_A, up.proposal.action_id);
  assert.equal(Number((await one("select jumlah_bulanan from public.overhead_costs where id = $1", [o.id])).jumlah_bulanan), 8000000);
  await run("overhead_atur", { nama_biaya: "Internet", jumlah_bulanan: 500000 });
  // target bulan ini: total default = jumlah overhead aktif
  assert.equal((await propose(ADMIN_A, "overhead_target", {})).ok, false); // bobot wajib bila target belum ada
  const tg = await run("overhead_target", { total_bobot_estimasi: 200 });
  const t = await one("select * from public.overhead_monthly_target where clinic_id = $1", [A]);
  assert.equal(Number(t.total_overhead_bulanan), 8500000); assert.equal(Number(t.total_bobot_estimasi), 200);
  assert.equal(Number(t.overhead_per_unit_bobot), 42500);
  await undo(ADMIN_A, tg.proposal.action_id);
  assert.equal(await one("select 1 x from public.overhead_monthly_target where clinic_id = $1", [A]), undefined);
  const list = await read(ADMIN_A, "select public.ai_daftar_overhead() r");
  assert.equal(Number(list.total_aktif_per_bulan), 8500000);
});

test("harga tindakan: ubah, tolak harga basi, massal, undo", async () => {
  const t = await one("select * from public.treatments where clinic_id = $1 and nama_treatment = 'Scaling'", [A]);
  const p = await run("tindakan_harga", { tindakan: "scaling", perubahan_persen: 10, pembulatan: 5000 });
  assert.equal(Number((await one("select harga_dasar from public.treatments where id = $1", [t.id])).harga_dasar), 330000);
  await undo(ADMIN_A, p.proposal.action_id);
  assert.equal(Number((await one("select harga_dasar from public.treatments where id = $1", [t.id])).harga_dasar), 300000);
  // basi: harga berubah antara usulan dan persetujuan
  const stale = await ok("tindakan_harga", { tindakan: t.id, harga_baru: 350000 });
  await db.exec(`update public.treatments set harga_dasar = 310000 where id = '${t.id}'`);
  await rejects(apply(ADMIN_A, [stale.action_id]), /sudah berubah/);
  await db.exec(`update public.treatments set harga_dasar = 300000 where id = '${t.id}'`);
  assert.equal((await propose(ADMIN_A, "tindakan_harga", { tindakan: t.id })).ok, false);
  assert.equal((await propose(ADMIN_A, "tindakan_harga", { tindakan: t.id, harga_baru: 1, perubahan_persen: 5 })).ok, false);
  // massal
  const m = await run("tindakan_harga_massal", { perubahan_persen: 5, pembulatan: 1000 });
  const prices = (await q("select nama_treatment, harga_dasar from public.treatments where clinic_id = $1 order by 1", [A])).map((r) => Number(r.harga_dasar));
  assert.deepEqual(prices, [315000, 473000]);
  assert.equal(Number((await one("select harga_dasar from public.treatments where clinic_id = $1 and nama_treatment = 'Scaling B'", [B])).harga_dasar ?? 111000), 111000);
  await undo(ADMIN_A, m.proposal.action_id);
  assert.deepEqual((await q("select harga_dasar from public.treatments where clinic_id = $1 order by nama_treatment", [A])).map((r) => Number(r.harga_dasar)), [300000, 450000]);
});

test("tindakan baru/ubah + resep bahan (HPP) + undo", async () => {
  const add = await run("tindakan_tambah", { nama: "Bleaching", harga_dasar: 1500000, tier: "berat", kategori: "Estetik", durasi_menit: 60 });
  const t = await one("select * from public.treatments where clinic_id = $1 and nama_treatment = 'Bleaching'", [A]);
  assert.match(t.kode_treatment, /^TND-0001$/); assert.equal(t.tier, "berat");
  assert.equal((await propose(ADMIN_A, "tindakan_tambah", { nama: "bleaching", harga_dasar: 1 })).ok, false);
  const ub = await run("tindakan_ubah", { tindakan: "Bleaching", durasi_menit: 90, is_active: false });
  assert.equal((await one("select is_active from public.treatments where id = $1", [t.id])).is_active, false);
  await undo(ADMIN_A, ub.proposal.action_id);
  assert.equal((await one("select is_active from public.treatments where id = $1", [t.id])).is_active, true);
  // resep
  const rs = await run("resep_atur", { tindakan: "Bleaching", bahan: "Anestesi Lidocaine", qty_rata2: 2, wastage_percent: 10 });
  const mat = await one("select * from public.treatment_materials where treatment_id = $1", [t.id]);
  assert.equal(Number(mat.qty_rata2), 2); assert.equal(Number(mat.wastage_percent), 10);
  const resep = await read(ADMIN_A, "select public.ai_resep_tindakan('Bleaching') r");
  assert.equal(resep.resep.length, 1); assert.ok(Number(resep.total_biaya_bahan) > 0);
  const up = await run("resep_atur", { tindakan: "Bleaching", bahan: "Anestesi Lidocaine", qty_rata2: 3 });
  await undo(ADMIN_A, up.proposal.action_id);
  assert.equal(Number((await one("select qty_rata2 from public.treatment_materials where treatment_id = $1", [t.id])).qty_rata2), 2);
  const hp = await ok("tindakan_harga", { tindakan: "Bleaching", harga_baru: 1000 });
  assert.ok(hp.pratinjau.peringatan.some((w) => /rugi bahan/.test(w)));
  const del = await run("resep_hapus", { tindakan: "Bleaching", bahan: "Anestesi Lidocaine" });
  assert.equal(await one("select 1 x from public.treatment_materials where treatment_id = $1", [t.id]), undefined);
  await undo(ADMIN_A, del.proposal.action_id);
  assert.equal(Number((await one("select qty_rata2 from public.treatment_materials where treatment_id = $1", [t.id])).qty_rata2), 2);
  await undo(ADMIN_A, rs.proposal.action_id);
  assert.equal(await one("select 1 x from public.treatment_materials where treatment_id = $1", [t.id]), undefined);
  // undo tindakan baru: belum dipakai → terhapus
  await undo(ADMIN_A, add.proposal.action_id);
  assert.equal(await one("select 1 x from public.treatments where id = $1", [t.id]), undefined);
});

test("nama ambigu → kandidat; salah ketik ringan tetap dikenali", async () => {
  await run("bahan_tambah", { nama: "Masker Bedah Earloop", satuan_dasar: "pcs", stok_awal: 50, harga_per_satuan: 1000 });
  await run("bahan_tambah", { nama: "Masker Bedah Headloop", satuan_dasar: "pcs", stok_awal: 50, harga_per_satuan: 1200 });
  const amb = await propose(ADMIN_A, "stok_masuk", { bahan: "masker bedah", jumlah_beli: 5, harga_satuan_beli: 1000 });
  assert.equal(amb.ok, false); assert.match(amb.error, /ambigu/); assert.ok(amb.kandidat.length >= 2);
  const typo = await propose(ADMIN_A, "stok_masuk", { bahan: "Masker Bedah Earlop", jumlah_beli: 5, harga_satuan_beli: 1000 });
  assert.equal(typo.ok, true, typo.error);
  assert.equal((await propose(ADMIN_A, "stok_masuk", { bahan: "semen gigi xyz", jumlah_beli: 1, harga_satuan_beli: 1 })).ok, false);
});

test("persetujuan massal atomik: satu gagal → tidak ada yang berubah", async () => {
  const p1 = await ok("pengeluaran_catat", { kategori: "Marketing", deskripsi: "Brosur", jumlah: 300000, tanggal: "2026-10-05" });
  const p2 = await ok("tindakan_harga", { tindakan: "Scaling", harga_baru: 320000 });
  await db.exec(`update public.treatments set harga_dasar = 301000 where clinic_id = '${A}' and nama_treatment = 'Scaling'`); // p2 jadi basi
  await rejects(apply(ADMIN_A, [p1.action_id, p2.action_id]), /sudah berubah/);
  assert.equal(await one("select 1 x from public.expenses where clinic_id = $1 and deskripsi = 'Brosur'", [A]), undefined);
  assert.equal((await one("select status from public.ai_actions where id = $1", [p1.action_id])).status, "pending");
  await db.exec(`update public.treatments set harga_dasar = 300000 where clinic_id = '${A}' and nama_treatment = 'Scaling'`);
  const good = await apply(ADMIN_A, [p1.action_id]);
  assert.equal(good.dijalankan, 1);
  await rejects(apply(ADMIN_A, [p1.action_id]), /sudah applied/);
});

test("kedaluwarsa & kepemilikan usulan", async () => {
  const p = await ok("pengeluaran_catat", { kategori: "Lainnya", deskripsi: "Parkir", jumlah: 10000 });
  await rejects(apply(ADMIN_B, [p.action_id]), /Sebagian usulan tidak ditemukan|bukan milik/);
  await db.exec(`update public.ai_actions set expires_at = now() - interval '1 minute' where id = '${p.action_id}'`);
  await rejects(apply(ADMIN_A, [p.action_id]), /kedaluwarsa/);
  assert.equal(await one("select 1 x from public.expenses where clinic_id = $1 and deskripsi = 'Parkir'", [A]), undefined);
});

test("isolasi klinik: admin B tidak menemukan/memakai data klinik A", async () => {
  const bahan = (await one("select id from public.master_bahan where clinic_id = $1 limit 1", [A])).id;
  const r = await propose(ADMIN_B, "stok_masuk", { bahan, jumlah_beli: 1, harga_satuan_beli: 1 });
  assert.equal(r.ok, false);
  const cari = await read(ADMIN_B, "select public.ai_cari_bahan('') r");
  assert.equal(cari.jumlah, 0);
  const seed = await run("pengeluaran_catat", { kategori: "Lainnya", deskripsi: "Biaya uji isolasi", jumlah: 7000 });
  const exp = seed.applied.tindakan[0].hasil.expense_id;
  assert.equal((await propose(ADMIN_B, "pengeluaran_hapus", { id: exp })).ok, false);
  const t = (await one("select id from public.treatments where clinic_id = $1 limit 1", [A])).id;
  assert.equal((await propose(ADMIN_B, "tindakan_harga", { tindakan: t, harga_baru: 1 })).ok, false);
  const riwayat = await read(ADMIN_B, "select public.ai_riwayat_agen(50) r");
  assert.equal(riwayat.tindakan.length, 0);
});

test("tabel ai_actions: baca oleh admin klinik sendiri saja; tulis langsung ditolak", async () => {
  const mine = await asUser(ADMIN_A, () => q("select count(*)::int c from public.ai_actions"));
  assert.ok(mine[0].c > 5);
  const theirs = await asUser(ADMIN_B, () => q("select count(*)::int c from public.ai_actions"));
  assert.equal(theirs[0].c, 0);
  const recep = await asUser(RECEP_A, () => q("select count(*)::int c from public.ai_actions"));
  assert.equal(recep[0].c, 0);
  await assert.rejects(asUser(ADMIN_A, () => db.exec("update public.ai_actions set status = 'applied'")));
  await assert.rejects(asUser(ADMIN_A, () => db.exec("delete from public.ai_actions")));
  await assert.rejects(asUser(ADMIN_A, () => db.exec(`insert into public.ai_actions (clinic_id, user_id, kind, args, preview) values ('${A}', '${ADMIN_A}', 'x', '{}', '{}')`)));
});

test("alat baca: cari bahan, kartu stok, saran pemesanan, cari pengeluaran, cari tindakan", async () => {
  const lid = await one("select id from public.master_bahan where clinic_id = $1 and nama_bahan = 'Anestesi Lidocaine'", [A]);
  // pemakaian 30 hari: 3 ampul/hari → habis dalam ±10 hari
  await db.exec(`update public.master_bahan set stok_saat_ini = 30, stok_minimum = 5 where id = '${lid.id}'`);
  await db.exec(`insert into public.stok_movements (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, created_at)
                 select '${A}', '${lid.id}', 'keluar', -3, 100, 97, now() - (g || ' days')::interval from generate_series(0, 29) g`);
  const cari = await read(ADMIN_A, "select public.ai_cari_bahan('lidocaine') r");
  assert.equal(cari.jumlah, 1); assert.equal(cari.bahan[0].status, "aman");
  const kartu = await read(ADMIN_A, "select public.ai_kartu_stok('lidocaine', 45) r");
  assert.ok(Number(kartu.total_keluar) >= 90);
  const saran = await read(ADMIN_A, "select public.ai_saran_pemesanan(30, 14) r");
  const s = saran.bahan.find((b) => b.nama === "Anestesi Lidocaine");
  assert.ok(s, "lidocaine perlu dipesan"); assert.equal(Number(s.pakai_per_hari), 3); assert.equal(Number(s.hari_tersisa), 10);
  assert.ok(Number(s.saran_beli) >= 12);
  await run("pengeluaran_catat", { kategori: "Utilitas", deskripsi: "Listrik November", jumlah: 1250000 });
  const pe = await read(ADMIN_A, "select public.ai_cari_pengeluaran(null, null, 'listrik') r");
  assert.equal(pe.jumlah, 1); assert.equal(Number(pe.total), 1250000);
  const td = await read(ADMIN_A, "select public.ai_cari_tindakan('scal') r");
  assert.equal(td.jumlah, 1);
  const hist = await read(ADMIN_A, "select public.ai_riwayat_agen(5) r");
  assert.equal(hist.tindakan.length, 5);
});

test("lanjutan: tambah banyak bahan (impor daftar) — satu kartu, atomik, bisa dibatalkan; galat menyebut nomor baris", async () => {
  const items = [
    { nama: "Kapas Gulung", satuan_dasar: "roll", stok_awal: 20, harga_per_satuan: 8000, stok_minimum: 5 },
    { nama: "Cotton Pellet", satuan_dasar: "pcs", stok_awal: 300, harga_per_satuan: 150 },
    { nama: "Saliva Ejector", satuan_dasar: "pcs" },
  ];
  const r = await run("bahan_tambah_banyak", { items });
  assert.match(r.proposal.pratinjau.judul, /3 bahan/);
  assert.equal(r.applied.tindakan[0].hasil.jumlah, 3);
  const rows = await q("select nama_bahan, stok_saat_ini from public.master_bahan where clinic_id = $1 and nama_bahan in ('Kapas Gulung','Cotton Pellet','Saliva Ejector') order by 1", [A]);
  assert.deepEqual(rows.map((x) => Number(x.stok_saat_ini)), [300, 20, 0]);
  await undo(ADMIN_A, r.proposal.action_id);
  assert.equal(Number((await one("select count(*) c from public.master_bahan where clinic_id = $1 and nama_bahan in ('Kapas Gulung','Cotton Pellet','Saliva Ejector')", [A])).c), 0);
  // galat: nama ganda di daftar & nilai buruk → pesan per baris, tidak ada usulan
  const bad = await propose(ADMIN_A, "bahan_tambah_banyak", { items: [{ nama: "Bur Intan", satuan_dasar: "pcs" }, { nama: "bur intan", satuan_dasar: "pcs" }, { nama: "Bur Fisur", satuan_dasar: "pcs", stok_awal: -1 }] });
  assert.equal(bad.ok, false); assert.match(bad.error, /Baris 2/); assert.match(bad.error, /Baris 3/); assert.match(bad.error, /2 dari 3/);
  assert.equal((await propose(ADMIN_A, "bahan_tambah_banyak", { items: [] })).ok, false);
  assert.equal((await propose(ADMIN_A, "bahan_tambah_banyak", { items: "x" })).ok, false);
});

test("lanjutan: stok masuk banyak dari satu nota — default faktur/pemasok, total, kandidat bila ambigu", async () => {
  await run("bahan_tambah_banyak", { items: [{ nama: "Bur Intan Bulat", satuan_dasar: "pcs", stok_awal: 10, harga_per_satuan: 3000 }, { nama: "Gutta Percha", satuan_dasar: "pcs", stok_awal: 10, harga_per_satuan: 1000 }] });
  const nota = { supplier: "CV Medika Jaya", no_faktur: "MJ-2026-088", tanggal: "2026-10-12",
    items: [{ bahan: "Bur Intan Bulat", jumlah_beli: 5, harga_satuan_beli: 3200 }, { bahan: "gutta percha", jumlah_beli: 20, harga_satuan_beli: 1100, tanggal_kadaluarsa: "2028-01-01" }] };
  const r = await run("stok_masuk_banyak", nota);
  assert.match(r.proposal.pratinjau.judul, /2 barang \(Rp 38\.000\)/);
  const rows = await q("select nama_bahan, stok_saat_ini from public.master_bahan where clinic_id = $1 and nama_bahan in ('Bur Intan Bulat','Gutta Percha') order by 1", [A]);
  assert.deepEqual(rows.map((x) => Number(x.stok_saat_ini)), [15, 30]);
  const buys = await q("select supplier, no_faktur from public.material_purchases where no_faktur = 'MJ-2026-088'");
  assert.equal(buys.length, 2); assert.ok(buys.every((x) => x.supplier === "CV Medika Jaya"));
  assert.equal(Number((await one("select count(*) c from public.material_batches where clinic_id = $1 and tanggal_kadaluarsa = '2028-01-01'", [A])).c), 1);
  assert.equal(r.applied.tindakan[0].bisa_batal, false);
  // ambigu & tidak ditemukan → galat per baris, dengan kandidat
  const bad = await propose(ADMIN_A, "stok_masuk_banyak", { items: [{ bahan: "masker bedah", jumlah_beli: 1, harga_satuan_beli: 100 }, { bahan: "tidak ada barang ini xyz", jumlah_beli: 1, harga_satuan_beli: 100 }] });
  assert.equal(bad.ok, false); assert.match(bad.error, /Baris 1/); assert.match(bad.error, /Kandidat: .*Masker/); assert.match(bad.error, /Baris 2/);
});

test("lanjutan: buang stok kadaluarsa — kartu stok, batch FEFO, undo; tolak bila melebihi stok", async () => {
  await run("bahan_tambah", { nama: "Etsa Gel", satuan_dasar: "tube", stok_awal: 10, harga_per_satuan: 20000 });
  const b = await one("select * from public.master_bahan where clinic_id = $1 and nama_bahan = 'Etsa Gel'", [A]);
  await run("stok_masuk", { bahan: b.id, jumlah_beli: 5, harga_satuan_beli: 20000, tanggal: "2026-01-05", no_faktur: "ETS-1", tanggal_kadaluarsa: "2026-02-01" });
  await db.exec(`update public.material_batches set tanggal_kadaluarsa = '2026-02-01' where material_id = '${b.id}'`);
  const tooMuch = await propose(ADMIN_A, "batch_buang", { bahan: b.id, jumlah: 99, alasan: "kadaluarsa" });
  assert.equal(tooMuch.ok, false); assert.match(tooMuch.error, /hanya/);
  assert.equal((await propose(ADMIN_A, "batch_buang", { bahan: b.id, jumlah: 1, alasan: "iseng" })).ok, false);
  const p = await ok("batch_buang", { bahan: "Etsa Gel", jumlah: 4, alasan: "kadaluarsa", catatan: "Batch ETS-1 lewat tanggal" });
  assert.ok(p.pratinjau.rincian.some((x) => /Kerugian persediaan ± Rp 80\.000/.test(x)));
  const ap = await apply(ADMIN_A, [p.action_id]);
  assert.equal(Number(ap.tindakan[0].hasil.kerugian), 80000);
  assert.equal(Number((await one("select stok_saat_ini from public.master_bahan where id = $1", [b.id])).stok_saat_ini), 11);
  assert.equal(Number((await one("select qty_sisa from public.material_batches where material_id = $1", [b.id])).qty_sisa), 1);
  const mv = await one("select * from public.stok_movements where material_id = $1 and tipe = 'penyesuaian'", [b.id]);
  assert.equal(Number(mv.jumlah), -4); assert.match(mv.catatan, /kadaluarsa/);
  await undo(ADMIN_A, p.action_id);
  assert.equal(Number((await one("select stok_saat_ini from public.master_bahan where id = $1", [b.id])).stok_saat_ini), 15);
  assert.equal(Number((await one("select qty_sisa from public.material_batches where material_id = $1", [b.id])).qty_sisa), 5);
  assert.equal(await one("select 1 x from public.stok_movements where material_id = $1 and tipe = 'penyesuaian'", [b.id]), undefined);
});

test("lanjutan: analitik gudang — ringkasan, kadaluarsa, riwayat harga & pemasok", async () => {
  const g = await read(ADMIN_A, "select public.ai_ringkasan_gudang() r");
  assert.ok(g.bahan_aktif >= 5); assert.ok(Number(g.nilai_stok_total) > 0);
  assert.ok(g.batch_kadaluarsa.sudah_lewat >= 1); assert.ok(Number(g.batch_kadaluarsa.nilai_sudah_lewat) > 0);
  assert.ok(g.nilai_terbesar.length > 0 && g.per_kategori.length > 0);
  const k = await read(ADMIN_A, "select public.ai_bahan_kadaluarsa(60) r");
  const etsa = k.batch.find((x) => x.bahan === "Etsa Gel");
  assert.ok(etsa); assert.equal(etsa.status, "sudah lewat"); assert.ok(etsa.hari_lagi < 0);
  // riwayat harga: dua pemasok untuk bahan yang sama
  const b = await one("select id from public.master_bahan where clinic_id = $1 and nama_bahan = 'Gutta Percha'", [A]);
  await run("stok_masuk", { bahan: b.id, jumlah_beli: 10, harga_satuan_beli: 900, supplier: "Toko Murah", no_faktur: "TM-1" });
  const h = await read(ADMIN_A, "select public.ai_riwayat_harga_bahan('gutta', 12) r");
  assert.ok(h.per_pemasok.length >= 2);
  assert.equal(h.per_pemasok[0].pemasok, "Toko Murah"); // diurut dari harga rata-rata termurah
  assert.ok(Number(h.per_pemasok[0].harga_rata2) < Number(h.per_pemasok[1].harga_rata2));
  assert.ok(h.pembelian.length >= 3);
});

test("lanjutan: analisis margin memakai biaya bahan + overhead; status rugi/tipis/sehat/resep kosong", async () => {
  await run("tindakan_tambah", { nama: "Tambal Glass Ionomer", harga_dasar: 250000, tier: "ringan" });
  await run("resep_atur", { tindakan: "Tambal Glass Ionomer", bahan: "Etsa Gel", qty_rata2: 1 }); // 20.000
  await run("overhead_atur", { nama_biaya: "Listrik & Air", jumlah_bulanan: 2000000 });
  await run("overhead_target", { total_overhead_bulanan: 10000000, total_bobot_estimasi: 100 }); // 100.000 per bobot
  await db.exec(`insert into public.tier_weights (clinic_id, tier, label, bobot) values ('${A}', 'ringan', 'Ringan', 1) on conflict do nothing`);
  const m = await read(ADMIN_A, "select public.ai_analisis_margin(50) r");
  const gi = m.tindakan.find((x) => x.nama === "Tambal Glass Ionomer");
  assert.equal(Number(gi.biaya_bahan), 20000);
  assert.equal(Number(gi.overhead_per_tindakan), 100000);
  assert.equal(Number(gi.hpp), 120000);
  assert.equal(Number(gi.margin_rp), 130000);
  assert.equal(Number(gi.margin_persen), 52);
  assert.equal(gi.status, "sehat");
  assert.equal(m.tindakan.find((x) => x.nama === "Scaling").status, "resep belum diisi");
  await run("tindakan_harga", { tindakan: "Tambal Glass Ionomer", harga_baru: 110000 });
  const m2 = await read(ADMIN_A, "select public.ai_analisis_margin(50) r");
  assert.equal(m2.tindakan.find((x) => x.nama === "Tambal Glass Ionomer").status, "rugi");
  assert.ok(Number(m2.overhead_per_bobot) === 100000);
});

test("lanjutan: anomali pengeluaran — lonjakan, biaya rutin belum tercatat, besar, kemungkinan ganda", async () => {
  // data historis 3 bulan penuh sebelum bulan berjalan: Sewa/Utilitas rutin, Marketing kecil
  await db.exec(`
    insert into public.expenses (clinic_id, tanggal_expense, kategori, deskripsi, jumlah, sumber)
    select '${A}', (date_trunc('month', public.ai_agent_today()) - make_interval(months => m) + interval '4 days')::date, k.kat, k.kat || ' bulan -' || m, k.jml, 'manual'
      from generate_series(1, 3) m, (values ('Sewa', 8000000), ('Utilitas', 1200000), ('Marketing', 200000)) k(kat, jml);
    insert into public.expenses (clinic_id, tanggal_expense, kategori, deskripsi, jumlah, sumber) values
      ('${A}', date_trunc('month', public.ai_agent_today())::date, 'Marketing', 'Iklan sosial media', 1000000, 'manual'),
      ('${A}', date_trunc('month', public.ai_agent_today())::date, 'Alat Medis', 'Autoclave baru', 6500000, 'manual'),
      ('${A}', public.ai_agent_today() - 2, 'Administrasi', 'ATK fotokopi', 150000, 'manual'),
      ('${A}', public.ai_agent_today() - 1, 'Administrasi', 'ATK fotokopi lagi', 150000, 'manual');`);
  // pengeluaran 'Utilitas' bulan ini sudah ada dari tes sebelumnya (Listrik November) → bukan "belum tercatat"; Sewa belum
  const an = await read(ADMIN_A, "select public.ai_anomali_pengeluaran() r");
  assert.ok(an.lonjakan_kategori.some((x) => x.kategori === "Marketing" && Number(x.rasio) >= 5), JSON.stringify(an.lonjakan_kategori));
  assert.ok(an.biaya_rutin_belum_tercatat.some((x) => x.kategori === "Sewa" && Number(x.rata_rata_per_bulan) === 8000000));
  assert.ok(an.pengeluaran_besar_bulan_ini.some((x) => x.deskripsi === "Autoclave baru"));
  assert.ok(an.kemungkinan_ganda_60_hari.some((x) => Number(x.jumlah) === 150000));
});

test("lanjutan: alat analitik hanya admin & terisolasi per klinik", async () => {
  for (const fn of ["ai_ringkasan_gudang()", "ai_bahan_kadaluarsa(30)", "ai_analisis_margin(10)", "ai_anomali_pengeluaran()"]) {
    await rejects(read(RECEP_A, `select public.${fn} r`), /hanya untuk admin/i);
  }
  const g = await read(ADMIN_B, "select public.ai_ringkasan_gudang() r");
  assert.equal(g.bahan_aktif, 0);
  const an = await read(ADMIN_B, "select public.ai_anomali_pengeluaran() r");
  assert.equal(an.lonjakan_kategori.length + an.pengeluaran_besar_bulan_ini.length + an.kemungkinan_ganda_60_hari.length, 0);
  const m = await read(ADMIN_B, "select public.ai_analisis_margin(10) r");
  assert.ok(m.tindakan.every((x) => x.nama === "Scaling B"));
});

test("briefing agen: prioritas terurut dari berbagai sinyal, tanpa skor mentah, ada petunjuk lanjut", async () => {
  // bahan yang biasa dipakai tapi sudah habis → prioritas tertinggi
  await db.exec(`insert into public.master_bahan (clinic_id, kode_bahan, nama_bahan, satuan_dasar, stok_saat_ini, stok_minimum, harga_rata2, is_active)
                 values ('${A}', 'BJ-1', 'Benang Jahit', 'pcs', 0, 5, 12000, true)`);
  const bj = (await one("select id from public.master_bahan where kode_bahan = 'BJ-1'")).id;
  await db.exec(`insert into public.stok_movements (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, created_at)
                 select '${A}', '${bj}', 'keluar', -1, 30, 29, now() - (g || ' days')::interval from generate_series(1, 20) g`);
  const b = await read(ADMIN_A, "select public.ai_briefing_agen() r");
  const tipe = b.prioritas.map((x) => x.tipe);
  assert.equal(tipe[0], "stok_habis", JSON.stringify(tipe));
  for (const must of ["tindakan_rugi", "kadaluarsa_lewat", "biaya_rutin_belum", "lonjakan_pengeluaran"]) assert.ok(tipe.includes(must), `${must} ∈ ${tipe}`);
  assert.deepEqual(b.prioritas.map((x) => x.peringkat), b.prioritas.map((_, i) => i + 1));
  assert.ok(b.prioritas.length <= 6);
  assert.ok(b.prioritas.every((x) => !("skor" in x) && x.judul && x.lanjut));
  assert.match(b.prioritas[0].judul, /Benang Jahit/);
  assert.ok(Number(b.gudang.habis) >= 1);
  // klinik B hanya punya satu tindakan tanpa resep → satu-satunya temuan; data klinik A tidak bocor
  const b2 = await read(ADMIN_B, "select public.ai_briefing_agen() r");
  assert.deepEqual(b2.prioritas.map((x) => x.tipe), ["resep_kosong"]);
  assert.equal(b2.gudang.bahan_aktif, 0);
  await db.exec(`delete from public.treatments where clinic_id = '${B}'`);
  const kosong = await read(ADMIN_B, "select public.ai_briefing_agen() r");
  assert.equal(kosong.jumlah_temuan, 0); assert.match(kosong.catatan, /Tidak ada temuan mendesak/);
  await rejects(read(RECEP_A, "select public.ai_briefing_agen() r"), /hanya untuk admin/i);
  await assert.rejects(db.exec("set role anon; select public.ai_briefing_agen()"));
  await db.exec("reset role");
});

test("peringatan bahan mirip: kartu memperingatkan bila ada bahan lain bernama mirip (model menebak nama)", async () => {
  await run("bahan_tambah_banyak", { items: [{ nama: "Gunting Bedah", satuan_dasar: "pcs", stok_awal: 3, harga_per_satuan: 90000 }, { nama: "Gunting Bedah Kecil", satuan_dasar: "pcs", stok_awal: 2, harga_per_satuan: 70000 },
    { nama: "Pinset Anatomis", satuan_dasar: "pcs", stok_awal: 4, harga_per_satuan: 50000 }] });
  const mirip = await ok("stok_opname", { bahan: "Gunting Bedah", stok_fisik: 5 });
  assert.ok(mirip.pratinjau.peringatan.some((w) => /bernama mirip: Gunting Bedah Kecil/.test(w)), JSON.stringify(mirip.pratinjau.peringatan));
  const kecil = await ok("stok_opname", { bahan: "Gunting Bedah Kecil", stok_fisik: 5 });
  assert.ok(kecil.pratinjau.peringatan.some((w) => /bernama mirip: Gunting Bedah\b/.test(w)));
  const unik = await ok("stok_opname", { bahan: "Pinset Anatomis", stok_fisik: 6 });
  assert.ok(!unik.pratinjau.peringatan.some((w) => /bernama mirip/.test(w)));
  // peringatan tersimpan di kartu (ai_actions.preview) dan ikut terbawa ke persetujuan
  const saved = await one("select preview from public.ai_actions where id = $1", [mirip.action_id]);
  assert.ok(saved.preview.peringatan.some((w) => /mirip/.test(w)));
});
