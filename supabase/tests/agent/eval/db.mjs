/**
 * Database uji untuk evaluasi Eira Agen: skema produksi ASLI (PGlite) + data klinik realistis,
 * dan adaptor `rpc()/from()` yang meniru klien supabase-js dengan JWT admin (RLS & pemeriksaan peran tetap berlaku).
 */
import { buildDb } from "../schema.mjs";

export const CLINIC = "aaaaaaaa-0000-4000-8000-0000000000a1";
export const ADMIN = "a0000000-0000-4000-8000-0000000000a1";
export const RECEP = "a0000000-0000-4000-8000-0000000000e1";

const SEED = `
insert into public.clinics (id, name, slug, status) values ('${CLINIC}', 'Klinik Senyum Sehat', 'senyum-sehat', 'active');
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data) values
  ('${ADMIN}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@senyum.test', '{}'),
  ('${RECEP}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'resep@senyum.test', '{}');
insert into public.users (id, email, full_name, role, clinic_id, status) values
  ('${ADMIN}', 'admin@senyum.test', 'Rina Admin', 'admin', '${CLINIC}', 'active'),
  ('${RECEP}', 'resep@senyum.test', 'Dewi Resepsionis', 'resepsionis', '${CLINIC}', 'active');

-- Bahan: dibuat tanpa stok, lalu diisi lewat pembelian (trigger menghitung stok & harga rata-rata seperti produksi)
insert into public.master_bahan (clinic_id, kode_bahan, nama_bahan, kategori, satuan_dasar, satuan_beli, faktor_konversi, stok_minimum, supplier) values
  ('${CLINIC}', 'BHN-0001', 'Anestesi Lidocaine', 'Anestesi', 'ampul', 'box', 10, 15, 'CV Medika Jaya'),
  ('${CLINIC}', 'BHN-0002', 'Sarung Tangan Nitril M', 'APD', 'pcs', 'box', 100, 100, 'CV Medika Jaya'),
  ('${CLINIC}', 'BHN-0003', 'Masker Bedah Earloop', 'APD', 'pcs', 'box', 50, 40, 'Toko Sehat'),
  ('${CLINIC}', 'BHN-0004', 'Masker Bedah Headloop', 'APD', 'pcs', 'box', 50, 40, 'Toko Sehat'),
  ('${CLINIC}', 'BHN-0005', 'Kapas Gulung', 'Habis Pakai', 'roll', null, 1, 5, 'Toko Sehat'),
  ('${CLINIC}', 'BHN-0006', 'Etsa Gel', 'Bahan Tambal', 'tube', null, 1, 3, 'Dental Mart'),
  ('${CLINIC}', 'BHN-0007', 'Gutta Percha', 'Endodonti', 'pcs', 'box', 100, 30, 'Dental Mart'),
  ('${CLINIC}', 'BHN-0008', 'Benang Jahit', 'Bedah', 'pcs', null, 1, 5, 'CV Medika Jaya'),
  ('${CLINIC}', 'BHN-0009', 'Komposit A2', 'Bahan Tambal', 'syringe', null, 1, 3, 'Dental Mart'),
  ('${CLINIC}', 'BHN-0010', 'Kapas Gulung Steril', 'Habis Pakai', 'roll', null, 1, 5, 'Toko Sehat');
insert into public.material_purchases (clinic_id, material_id, tanggal, jumlah_beli, jumlah_dasar, harga_satuan_beli, supplier, no_faktur)
select '${CLINIC}', b.id, public.ai_agent_today() - p.hari, p.jb, p.jb * b.faktor_konversi, p.harga, p.sup, p.faktur
  from (values
    ('BHN-0001', 40, 3, 50000, 'CV Medika Jaya', 'MJ-101'), ('BHN-0001', 12, 3, 60000, 'CV Medika Jaya', 'MJ-140'),
    ('BHN-0002', 35, 5, 80000, 'CV Medika Jaya', 'MJ-102'),
    ('BHN-0003', 30, 4, 45000, 'Toko Sehat', 'TS-11'), ('BHN-0004', 30, 4, 48000, 'Toko Sehat', 'TS-12'),
    ('BHN-0005', 25, 20, 9000, 'Toko Sehat', 'TS-13'), ('BHN-0010', 20, 10, 12000, 'Toko Sehat', 'TS-14'),
    ('BHN-0006', 60, 12, 21000, 'Dental Mart', 'DM-55'),
    ('BHN-0007', 80, 2, 70000, 'Dental Mart', 'DM-56'), ('BHN-0007', 20, 1, 55000, 'Toko Murah', 'TM-7'),
    ('BHN-0009', 35, 8, 95000, 'Dental Mart', 'DM-57')) p(kode, hari, jb, harga, sup, faktur)
  join public.master_bahan b on b.clinic_id = '${CLINIC}' and b.kode_bahan = p.kode;
-- pakai harian (kartu stok) → laju pemakaian
insert into public.stok_movements (clinic_id, material_id, tipe, jumlah, stok_sebelum, stok_sesudah, created_at)
select '${CLINIC}', b.id, 'keluar', -u.per_hari, 0, 0, now() - (g || ' days')::interval
  from (values ('BHN-0001', 3), ('BHN-0002', 12), ('BHN-0003', 4), ('BHN-0005', 1), ('BHN-0006', 1), ('BHN-0008', 1)) u(kode, per_hari)
  join public.master_bahan b on b.clinic_id = '${CLINIC}' and b.kode_bahan = u.kode, generate_series(1, 25) g;
-- stok akhir yang realistis
update public.master_bahan set stok_saat_ini = case kode_bahan
  when 'BHN-0001' then 28 when 'BHN-0002' then 90 when 'BHN-0003' then 60 when 'BHN-0004' then 70 when 'BHN-0005' then 3
  when 'BHN-0006' then 6 when 'BHN-0007' then 130 when 'BHN-0008' then 0 when 'BHN-0009' then 4 when 'BHN-0010' then 14 end where clinic_id = '${CLINIC}';
-- batch kadaluarsa (Etsa Gel): sudah lewat; Lidocaine: segera
insert into public.material_batches (clinic_id, material_id, no_batch, tanggal_masuk, tanggal_kadaluarsa, qty_awal, qty_sisa, harga_satuan)
select '${CLINIC}', id, 'ETS-0425', public.ai_agent_today() - 200, public.ai_agent_today() - 15, 5, 5, 21000 from public.master_bahan where clinic_id = '${CLINIC}' and kode_bahan = 'BHN-0006';
insert into public.material_batches (clinic_id, material_id, no_batch, tanggal_masuk, tanggal_kadaluarsa, qty_awal, qty_sisa, harga_satuan)
select '${CLINIC}', id, 'LID-0126', public.ai_agent_today() - 40, public.ai_agent_today() + 20, 120, 80, 5000 from public.master_bahan where clinic_id = '${CLINIC}' and kode_bahan = 'BHN-0001';

-- Tindakan, resep, overhead
insert into public.treatments (clinic_id, kode_treatment, nama_treatment, kategori, harga_dasar, tier) values
  ('${CLINIC}', 'T-001', 'Scaling', 'Periodonsia', 300000, 'ringan'),
  ('${CLINIC}', 'T-002', 'Tambal Komposit', 'Konservasi', 450000, 'sedang'),
  ('${CLINIC}', 'T-003', 'Cabut Gigi', 'Bedah', 250000, 'sedang'),
  ('${CLINIC}', 'T-004', 'Bleaching', 'Estetik', 1500000, 'berat');
insert into public.tier_weights (clinic_id, tier, label, bobot) values ('${CLINIC}', 'ringan', 'Ringan', 1), ('${CLINIC}', 'sedang', 'Sedang', 2), ('${CLINIC}', 'berat', 'Berat', 3);
insert into public.treatment_materials (clinic_id, treatment_id, material_id, qty_rata2, wajib, wastage_percent)
select '${CLINIC}', t.id, b.id, r.qty, true, r.waste from (values ('T-002', 'BHN-0009', 0.3, 10), ('T-002', 'BHN-0006', 0.5, 0), ('T-003', 'BHN-0001', 2, 0), ('T-003', 'BHN-0002', 2, 0)) r(tk, bk, qty, waste)
  join public.treatments t on t.clinic_id = '${CLINIC}' and t.kode_treatment = r.tk join public.master_bahan b on b.clinic_id = '${CLINIC}' and b.kode_bahan = r.bk;
insert into public.overhead_costs (clinic_id, nama_biaya, kategori, jumlah_bulanan, aktif) values
  ('${CLINIC}', 'Sewa Ruko', 'Sewa', 8000000, true), ('${CLINIC}', 'Listrik & Internet', 'Utilitas', 1800000, true), ('${CLINIC}', 'Gaji Asisten', 'Gaji', 5000000, true);
insert into public.overhead_monthly_target (clinic_id, periode, total_overhead_bulanan, total_bobot_estimasi)
values ('${CLINIC}', date_trunc('month', public.ai_agent_today())::date, 14800000, 200);

-- Pengeluaran: rutin 3 bulan (Sewa/Utilitas/Marketing), bulan ini: Marketing melonjak, ATK ganda, PLN kemarin; Sewa belum tercatat
insert into public.expenses (clinic_id, tanggal_expense, kategori, deskripsi, jumlah, pemasok, sumber)
select '${CLINIC}', (date_trunc('month', public.ai_agent_today()) - make_interval(months => m) + interval '4 days')::date, k.kat, k.des || ' bulan -' || m, k.jml, k.pem, 'manual'
  from generate_series(1, 3) m, (values ('Sewa', 'Sewa ruko', 8000000, 'Pak Hendra'), ('Utilitas', 'Listrik PLN', 1250000, 'PLN'), ('Marketing', 'Iklan Instagram', 300000, 'Meta')) k(kat, des, jml, pem);
insert into public.expenses (clinic_id, tanggal_expense, kategori, deskripsi, jumlah, pemasok, nomor_nota, sumber) values
  ('${CLINIC}', date_trunc('month', public.ai_agent_today())::date, 'Marketing', 'Iklan Instagram & flyer', 1800000, 'Meta', null, 'manual'),
  ('${CLINIC}', public.ai_agent_today() - 3, 'Administrasi', 'ATK fotokopi', 175000, 'Toko Fotokopi', null, 'manual'),
  ('${CLINIC}', public.ai_agent_today() - 2, 'Administrasi', 'ATK fotokopi (lagi)', 175000, 'Toko Fotokopi', null, 'manual'),
  ('${CLINIC}', public.ai_agent_today() - 1, 'Utilitas', 'Listrik PLN Oktober', 1250000, 'PLN', 'PLN-1014', 'manual'),
  ('${CLINIC}', public.ai_agent_today() - 6, 'Lainnya', 'Parkir & kurir', 45000, null, null, 'manual');
`;

export async function buildEvalDb() {
  const db = await buildDb();
  await db.exec(SEED);
  return db;
}

const PROTECTED_COUNT_TABLES = ["master_bahan", "expenses", "treatments", "stok_movements", "material_purchases", "material_batches", "overhead_costs", "overhead_monthly_target", "treatment_materials"];
/** Hitung baris tabel bisnis — dipakai memastikan agen TIDAK mengubah data langsung (hanya membuat usulan). */
export async function businessFingerprint(db) {
  const parts = [];
  for (const t of PROTECTED_COUNT_TABLES) parts.push(`${t}:${(await db.query(`select count(*)::int c from public.${t}`)).rows[0].c}`);
  const v = await db.query("select coalesce(sum(stok_saat_ini), 0)::text a, coalesce(sum(harga_rata2), 0)::text b from public.master_bahan");
  const p = await db.query("select coalesce(sum(harga_dasar), 0)::text a from public.treatments");
  const e = await db.query("select coalesce(sum(jumlah), 0)::text a from public.expenses");
  return `${parts.join("|")}|stok:${v.rows[0].a}|hrg:${v.rows[0].b}|tarif:${p.rows[0].a}|biaya:${e.rows[0].a}`;
}

const ident = (s) => /^[a-z_][a-z0-9_]*$/.test(s);

/** Klien tiruan: `rpc()` dan `from()` sebagai pengguna (role authenticated + klaim JWT). */
export function userClient(db, uid = ADMIN, clinic = CLINIC) {
  const asUser = async (fn) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claims', $1, false), set_config('request.jwt.claim.sub', $2, false)",
      [JSON.stringify({ sub: uid, role: "authenticated", app_metadata: { clinic_id: clinic } }), uid]);
    await db.exec("set role authenticated");
    try { return await fn(); } finally { await db.exec("reset role"); }
  };
  const toErr = (e) => ({ code: e.code, message: e.message });
  return {
    async rpc(fn, params = {}) {
      if (!ident(fn)) return { data: null, error: { code: "42883", message: "fungsi tidak valid" } };
      const keys = Object.keys(params).filter((k) => params[k] !== undefined);
      const args = keys.map((k, i) => `${k} => $${i + 1}`).join(", ");
      const values = keys.map((k) => (params[k] !== null && typeof params[k] === "object" ? JSON.stringify(params[k]) : params[k]));
      try {
        const r = await asUser(() => db.query(`select public.${fn}(${args}) as r`, values));
        return { data: r.rows[0]?.r ?? null, error: null };
      } catch (e) { return { data: null, error: toErr(e) }; }
    },
    from(table) {
      const q = { cols: "*", where: [], params: [], order: "", lim: "", single: false };
      const b = {
        select(cols = "*") { q.cols = cols; return b; },
        eq(c, v) { q.params.push(v); q.where.push(`${c} = $${q.params.length}`); return b; },
        gt(c, v) { q.params.push(v); q.where.push(`${c} > $${q.params.length}`); return b; },
        order(c, { ascending = true } = {}) { q.order = ` order by ${c} ${ascending ? "asc" : "desc"}`; return b; },
        limit(n) { q.lim = ` limit ${Number(n)}`; return b; },
        maybeSingle() { q.single = true; return b; },
        then(res, rej) {
          if (!ident(table)) return Promise.resolve({ data: null, error: { message: "tabel tidak valid" } }).then(res, rej);
          const sql = `select ${q.cols} from public.${table}${q.where.length ? ` where ${q.where.join(" and ")}` : ""}${q.order}${q.single ? " limit 1" : q.lim}`;
          return asUser(() => db.query(sql, q.params))
            .then((r) => ({ data: q.single ? (r.rows[0] ?? null) : r.rows, error: null }), (e) => ({ data: null, error: toErr(e) }))
            .then(res, rej);
        },
      };
      return b;
    },
  };
}
