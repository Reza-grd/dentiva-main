/**
 * Tipe inti console-api. File ini tidak mengimpor modul runtime Deno/npm
 * agar router bisa diuji di Node (vitest) maupun Deno.
 */
import type { ActionName, OperatorRole, ParsedActionParams } from "../../_shared/contract/index.ts";

/** Identitas hasil verifikasi token Supabase. */
export interface Identity {
  userId: string;
  email: string | null;
  /** Authenticator Assurance Level dari klaim JWT: 'aal1' (password) / 'aal2' (password + TOTP). */
  aal: string | null;
  appMetadata: Record<string, unknown>;
}

export interface OperatorRecord {
  user_id: string;
  full_name: string;
  role: OperatorRole;
  is_active: boolean;
  email: string | null;
  last_login_at: string | null;
  created_at: string;
}

/** Draf entri audit yang dikumpulkan handler; router melengkapi operator/IP/request id. */
export interface AuditDraft {
  action?: string; // default = nama aksi
  targetType: string;
  targetId?: string | null;
  clinicId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}

export interface AuditRecord extends AuditDraft {
  action: string;
  operatorId: string;
  ip: string | null;
  userAgent: string | null;
  requestId: string;
}

export interface RequestMeta {
  id: string;
  ip: string | null;
  userAgent: string | null;
  origin: string | null;
}

/** Operasi Auth Admin yang dibutuhkan handler (dibungkus agar mudah di-mock). */
export interface AuthAdmin {
  createUser(input: {
    email: string;
    fullName: string;
    appMetadata?: Record<string, unknown>;
  }): Promise<{ id: string }>;
  deleteUser(userId: string): Promise<void>;
  /** Kirim email undangan (juga untuk user yang sudah dibuat tapi belum konfirmasi). */
  sendInvite(email: string, redirectTo: string): Promise<void>;
  sendPasswordReset(email: string, redirectTo: string): Promise<void>;
}

export interface AppConfig {
  /** URL aplikasi klinik untuk tautan undangan/reset (mis. https://app.dentiva.co.id). */
  clinicAppUrl: string;
  /** URL Console untuk tautan undangan operator (mis. https://console.dentiva.co.id). */
  consoleUrl: string;
  allowedOrigins: string[];
}

/**
 * `Sql` sengaja dibuat generik: di Deno berisi instance postgres.js,
 * di tes berisi objek palsu. Handler mengetikkannya sebagai postgres.Sql.
 */
export type SqlLike = unknown;

export interface HandlerCtx<S = SqlLike> {
  operator: OperatorRecord;
  sql: S;
  auth: AuthAdmin;
  config: AppConfig;
  request: RequestMeta;
  /** Catat perubahan. Wajib dipanggil minimal sekali oleh setiap aksi `mutates: true`. */
  audit(entry: AuditDraft): void;
  /** Jalankan setelah transaksi COMMIT (mis. kirim email). Kegagalan hanya dicatat di log. */
  afterCommit(fn: () => Promise<void>): void;
  /** Jalankan jika transaksi ROLLBACK (mis. hapus akun Auth yang sudah dibuat). */
  onRollback(fn: () => Promise<void>): void;
}

export type Handler<A extends ActionName = ActionName, S = SqlLike> = (
  ctx: HandlerCtx<S>,
  params: ParsedActionParams<A>,
) => Promise<unknown>;

export type HandlerRegistry<S = SqlLike> = { [A in ActionName]: Handler<A, S> };

export interface Db<S = SqlLike> {
  getOperator(userId: string): Promise<OperatorRecord | null>;
  /** true jika userId punya profil di public.users (akun klinik). */
  hasClinicProfile(userId: string): Promise<boolean>;
  /** Jalankan baca-saja di luar transaksi. */
  read<T>(fn: (sql: S) => Promise<T>): Promise<T>;
  /** Jalankan di dalam satu transaksi; writeAudit memakai transaksi yang sama. */
  transaction<T>(fn: (tx: { sql: S; writeAudit(record: AuditRecord): Promise<void> }) => Promise<T>): Promise<T>;
}

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

export interface Deps<S = SqlLike> {
  verifyToken(token: string): Promise<Identity | null>;
  db: Db<S>;
  auth: AuthAdmin;
  handlers: HandlerRegistry<S>;
  config: AppConfig;
  log: Logger;
  newId(): string;
}
