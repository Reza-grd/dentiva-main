/**
 * Edge Function: console-api
 * Satu pintu untuk semua aksi Dentiva Console. Lihat docs/dentiva-console.md.
 *
 * Secret yang dibutuhkan (Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL   (otomatis tersedia)
 *   CONSOLE_URL                 mis. https://console.dentiva.co.id
 *   CLINIC_APP_URL              mis. https://app.dentiva.co.id
 *   CONSOLE_ALLOWED_ORIGINS     opsional, dipisah koma (default: CONSOLE_URL)
 */
import { createAdminClient, createAuthAdmin, createTokenVerifier } from "./src/auth.ts";
import { createDb, createSql } from "./src/db.ts";
import { handlers } from "./src/modules/index.ts";
import { handleRequest } from "./src/router.ts";
import type { Deps, Logger } from "./src/types.ts";
import type { AnySql } from "./src/db.ts";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Env ${name} belum diset untuk console-api`);
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const dbUrl = requireEnv("SUPABASE_DB_URL");
const consoleUrl = (Deno.env.get("CONSOLE_URL") ?? "http://localhost:5174").replace(/\/+$/, "");
const clinicAppUrl = (Deno.env.get("CLINIC_APP_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
const allowedOrigins = (Deno.env.get("CONSOLE_ALLOWED_ORIGINS") ?? consoleUrl)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const log: Logger = {
  info: (msg, data) => console.log(JSON.stringify({ level: "info", msg, ...data })),
  warn: (msg, data) => console.warn(JSON.stringify({ level: "warn", msg, ...data })),
  error: (msg, data) => console.error(JSON.stringify({ level: "error", msg, ...data })),
};

const admin = createAdminClient(supabaseUrl, serviceRoleKey);
const sql = createSql(dbUrl);

const deps: Deps<AnySql> = {
  verifyToken: createTokenVerifier(admin),
  db: createDb(sql),
  auth: createAuthAdmin(admin),
  handlers,
  config: { consoleUrl, clinicAppUrl, allowedOrigins },
  log,
  newId: () => crypto.randomUUID(),
};

Deno.serve((req) => handleRequest(req, deps));
