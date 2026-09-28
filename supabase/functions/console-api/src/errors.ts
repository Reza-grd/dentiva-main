import type { ErrorCode } from "../../_shared/contract/index.ts";

export const HTTP_STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  mfa_required: 403,
  not_operator: 403,
  forbidden: 403,
  invalid_request: 400,
  invalid_params: 400,
  unknown_action: 400,
  unsupported_version: 400,
  not_found: 404,
  conflict: 409,
  precondition_failed: 422,
  audit_failed: 500,
  internal: 500,
};

export class ApiException extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiException";
  }
}

export const notFound = (what: string) => new ApiException("not_found", `${what} tidak ditemukan`);
export const conflict = (message: string) => new ApiException("conflict", message);
export const precondition = (message: string) => new ApiException("precondition_failed", message);

/**
 * Terjemahkan error PostgreSQL menjadi ApiException.
 * Fungsi database Dentiva memakai RAISE ... USING ERRCODE dengan pesan berbahasa
 * Indonesia yang aman ditampilkan; error lain disamarkan menjadi `internal`.
 */
export function fromDatabaseError(err: unknown): ApiException | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: string; message?: string; constraint_name?: string };
  if (typeof e.code !== "string" || e.code.length !== 5) return null;

  const msg = e.message ?? "Kesalahan database";
  switch (e.code) {
    case "23505":
      return new ApiException("conflict", msg.startsWith("duplicate key") ? "Data yang sama sudah ada" : msg);
    case "23514":
    case "23503":
    case "23502":
    case "P0001":
      return new ApiException("precondition_failed", msg);
    case "P0002":
    case "02000":
      return new ApiException("not_found", msg);
    case "42501":
      return new ApiException("forbidden", "Operasi tidak diizinkan oleh database");
    default:
      return null;
  }
}
