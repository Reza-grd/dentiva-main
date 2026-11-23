/**
 * Migrasi data pasien lama dibantu tim Dentiva.
 *
 * Data pasien dikirim dari Console dalam potongan kecil lalu disimpan oleh fungsi
 * database platform.migrasi_* — enkripsi (private.encrypt_envelope) dilakukan di
 * dalam database atas nama klinik tujuan, sama seperti saat klinik mengisi sendiri.
 * Audit Console hanya mencatat jumlah, tidak pernah isi data pasien.
 */
import type { MigrasiDuplikat, MigrasiKirimHasil, MigrasiPasien } from "../../../_shared/contract/index.ts";
import { notFound } from "../errors.ts";
import type { AnySql } from "../db.ts";
import type { H } from "./_util.ts";

const KOLOM = `
  m.id, m.clinic_id, m.operator_id, o.full_name as operator_name, m.nama_berkas, m.dasar_persetujuan,
  m.status, m.total_baris, m.jumlah_masuk, m.jumlah_lewati, m.jumlah_dibatalkan, m.jumlah_dipertahankan,
  m.dibuat_pada, m.selesai_pada, m.dibatalkan_pada, m.alasan_batal
`;

async function muat(sql: AnySql, id: string): Promise<MigrasiPasien> {
  const [m] = await sql<MigrasiPasien[]>`
    select ${sql.unsafe(KOLOM)}
    from platform.migrasi_pasien m left join platform.operators o on o.user_id = m.operator_id
    where m.id = ${id}`;
  if (!m) throw notFound("Migrasi");
  return m;
}

async function pastikanKlinik(sql: AnySql, clinicId: string): Promise<void> {
  const [c] = await sql<{ id: string }[]>`select id from public.clinics where id = ${clinicId}`;
  if (!c) throw notFound("Klinik");
}

/** Enkripsi & cek duplikat untuk ratusan baris butuh lebih dari batas 15 detik bawaan. */
async function longgarkanBatasWaktu(sql: AnySql): Promise<void> {
  await sql`set local statement_timeout = '60s'`;
}

export const list: H<"migrasi.list"> = async (ctx, p) => {
  return await ctx.sql<MigrasiPasien[]>`
    select ${ctx.sql.unsafe(KOLOM)}
    from platform.migrasi_pasien m left join platform.operators o on o.user_id = m.operator_id
    where m.clinic_id = ${p.clinicId}
    order by m.dibuat_pada desc
    limit 50`;
};

export const pratinjau: H<"migrasi.pratinjau"> = async (ctx, p) => {
  await pastikanKlinik(ctx.sql, p.clinicId);
  const duplikat = await ctx.sql<MigrasiDuplikat[]>`
    select baris, alasan, no_rm, pasti
    from platform.migrasi_cek_duplikat(${p.clinicId}, ${ctx.sql.json(p.rows as never)}::jsonb)
    order by baris`;
  const [kuota] = await ctx.sql<{ maks: number; terpakai: number }[]>`
    select maks, terpakai from platform.kuota_pasien(${p.clinicId})`;
  return { duplikat, kuota };
};

export const mulai: H<"migrasi.mulai"> = async (ctx, p) => {
  await pastikanKlinik(ctx.sql, p.clinicId);
  const [{ id }] = await ctx.sql<{ id: string }[]>`
    select (platform.migrasi_mulai(${p.clinicId}, ${ctx.operator.user_id}, ${p.namaBerkas},
                                   ${p.dasarPersetujuan}, ${p.totalBaris})).id as id`;
  const pemetaan = p.pemetaan ?? [];
  if (pemetaan.length) {
    // Bahan latih ulang mesin pengenal kolom — tanpa isi data pasien.
    await ctx.sql`
      insert into platform.migrasi_koreksi_kolom (migrasi_id, kolom, judul, fitur, tebakan, final, versi_model)
      select ${id}, r.kolom, nullif(r.judul, ''),
             array(select jsonb_array_elements_text(r.fitur)::real), r.tebakan, r.final, ${p.versiModel ?? null}
      from jsonb_to_recordset(${ctx.sql.json(pemetaan as never)}::jsonb)
        as r(kolom int, judul text, fitur jsonb, tebakan text, final text)`;
  }
  ctx.audit({
    targetType: "migrasi_pasien",
    targetId: id,
    clinicId: p.clinicId,
    after: {
      nama_berkas: p.namaBerkas,
      total_baris: p.totalBaris,
      dasar_persetujuan: p.dasarPersetujuan,
      kolom_dipetakan: pemetaan.length,
      kolom_dikoreksi: pemetaan.filter((k) => k.tebakan !== k.final).length,
    },
  });
  return await muat(ctx.sql, id);
};

export const kirim: H<"migrasi.kirim"> = async (ctx, p) => {
  const m = await muat(ctx.sql, p.migrasiId);
  await longgarkanBatasWaktu(ctx.sql);
  const [{ r }] = await ctx.sql<{ r: MigrasiKirimHasil }[]>`
    select platform.migrasi_kirim(${p.migrasiId}, ${ctx.sql.json(p.rows as never)}::jsonb) as r`;
  ctx.audit({
    targetType: "migrasi_pasien",
    targetId: p.migrasiId,
    clinicId: m.clinic_id,
    after: { baris_dikirim: p.rows.length, masuk: r.masuk, lewati: r.lewati.length },
  });
  return r;
};

export const selesai: H<"migrasi.selesai"> = async (ctx, p) => {
  const before = await muat(ctx.sql, p.migrasiId);
  await ctx.sql`select platform.migrasi_selesai(${p.migrasiId})`;
  const after = await muat(ctx.sql, p.migrasiId);
  ctx.audit({
    targetType: "migrasi_pasien",
    targetId: p.migrasiId,
    clinicId: before.clinic_id,
    before: { status: before.status },
    after: { status: after.status, jumlah_masuk: after.jumlah_masuk, jumlah_lewati: after.jumlah_lewati },
  });
  return after;
};

export const batalkan: H<"migrasi.batalkan"> = async (ctx, p) => {
  const before = await muat(ctx.sql, p.migrasiId);
  await longgarkanBatasWaktu(ctx.sql);
  await ctx.sql`select platform.migrasi_batalkan(${p.migrasiId}, ${ctx.operator.user_id}, ${p.reason})`;
  const after = await muat(ctx.sql, p.migrasiId);
  ctx.audit({
    targetType: "migrasi_pasien",
    targetId: p.migrasiId,
    clinicId: before.clinic_id,
    reason: p.reason,
    before: { status: before.status, jumlah_masuk: before.jumlah_masuk },
    after: { status: after.status, dihapus: after.jumlah_dibatalkan, dipertahankan: after.jumlah_dipertahankan },
  });
  return after;
};
