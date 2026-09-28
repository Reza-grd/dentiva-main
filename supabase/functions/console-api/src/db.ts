/**
 * Akses database console-api lewat koneksi Postgres langsung (SUPABASE_DB_URL).
 *
 * Kenapa tidak lewat supabase-js/PostgREST? Skema `platform` sengaja TIDAK
 * di-expose ke API REST, sehingga hanya bisa dijangkau dari server. Koneksi
 * langsung juga memberi transaksi sungguhan: perubahan data dan baris audit
 * ditulis bersama atau tidak sama sekali.
 */
import postgres from "postgres";
import type { AuditRecord, Db, OperatorRecord } from "./types.ts";

export type Sql = postgres.Sql<Record<string, never>>;
/**
 * Tipe sql yang diterima handler. Di aksi tulis isinya TransactionSql
 * (turunan Sql), jadi handler cukup menulis query dengan tagged template.
 */
export type AnySql = Sql;

export function createSql(url: string): Sql {
  return postgres(url, {
    prepare: false, // kompatibel dengan pooler mode transaksi
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: {
      application_name: "console-api",
      statement_timeout: 15_000,
      TimeZone: "UTC",
    },
    types: {
      // int8 (count(*), bigint Rupiah) → number. Aman: nominal < 2^53.
      bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      // numeric (harga paket DECIMAL) → number
      numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      // date tetap 'YYYY-MM-DD' (tanpa geser zona waktu)
      dateOnly: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
  }) as unknown as Sql;
}

export function createDb(sql: Sql): Db<AnySql> {
  return {
    async getOperator(userId: string): Promise<OperatorRecord | null> {
      const rows = await sql<OperatorRecord[]>`
        select o.user_id, o.full_name, o.role, o.is_active, o.last_login_at, o.created_at, au.email
        from platform.operators o
        join auth.users au on au.id = o.user_id
        where o.user_id = ${userId}
      `;
      return rows[0] ?? null;
    },

    async hasClinicProfile(userId: string): Promise<boolean> {
      const rows = await sql`select 1 from public.users where id = ${userId} limit 1`;
      return rows.length > 0;
    },

    read(fn) {
      return fn(sql);
    },

    async transaction(fn) {
      return (await sql.begin(async (tx) => {
        return fn({
          sql: tx as unknown as Sql,
          async writeAudit(r: AuditRecord) {
            await tx`
              select platform.write_audit(
                ${r.operatorId}::uuid,
                ${r.action},
                ${r.targetType},
                ${r.targetId ?? null},
                ${r.clinicId ?? null}::uuid,
                ${r.reason ?? null},
                ${r.before === undefined ? null : tx.json(r.before as postgres.JSONValue)}::jsonb,
                ${r.after === undefined ? null : tx.json(r.after as postgres.JSONValue)}::jsonb,
                ${r.ip},
                ${r.userAgent},
                ${r.requestId}
              )
            `;
          },
        });
      })) as Awaited<ReturnType<typeof fn>>;
    },
  };
}

/** Offset/limit dari parameter pagination kontrak. */
export function pageWindow(p: { page: number; pageSize: number }): { limit: number; offset: number } {
  return { limit: p.pageSize, offset: (p.page - 1) * p.pageSize };
}

/** Pola ILIKE aman untuk pencarian (escape % dan _). */
export function likePattern(search: string | undefined): string | null {
  if (!search) return null;
  return `%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}
