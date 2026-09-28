import type { ActionName } from "../../../_shared/contract/index.ts";
import type { AnySql } from "../db.ts";
import type { Handler } from "../types.ts";

/** Tipe handler untuk satu aksi dengan sql postgres.js. */
export type H<A extends ActionName> = Handler<A, AnySql>;

/** Bentuk hasil paginasi dari baris yang membawa kolom `total_count` (count(*) over ()). */
export function paginate<T extends { total_count?: number }>(
  rows: T[],
  page: number,
  pageSize: number,
): { items: Omit<T, "total_count">[]; page: number; pageSize: number; total: number } {
  const total = rows[0]?.total_count ?? 0;
  const items = rows.map(({ total_count: _t, ...rest }) => rest);
  return { items, page, pageSize, total: Number(total) };
}

/** Normalisasi ISO timestamptz dari Date/string. */
export function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
