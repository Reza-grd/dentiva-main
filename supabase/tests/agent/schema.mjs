/**
 * Membangun database uji dengan skema produksi ASLI (snapshot baseline CI + semua migrasi sesudahnya)
 * di PGlite — tanpa Docker. Objek bawaan Supabase diganti stub minimal (stubs.sql).
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { uuid_ossp } from "@electric-sql/pglite/contrib/uuid_ossp";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SUPA = join(HERE, "..", "..");
const BASELINE_VERSION = "20261009170624";

export async function buildDb({ upTo } = {}) {
  const db = new PGlite({ extensions: { pgcrypto, pg_trgm, uuid_ossp } });
  await db.exec(readFileSync(join(HERE, "stubs.sql"), "utf8"));
  await db.exec(readFileSync(join(SUPA, "tests", "baseline", `${BASELINE_VERSION}_schema.sql`), "utf8"));
  const files = readdirSync(join(SUPA, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const v = f.split("_")[0];
    if (v <= BASELINE_VERSION || (upTo && v > upTo)) continue;
    let sql = readFileSync(join(SUPA, "migrations", f), "utf8");
    sql = sql.replace(/create extension if not exists (pg_cron|pg_net|supabase_vault)[^;]*;/gi, "-- (stub)");
    try { await db.exec(sql); } catch (e) { throw new Error(`Migrasi ${f} gagal: ${e.message}`); }
  }
  return db;
}
