import {
  API_VERSION,
  type ActionName,
  type ActionParams,
  type ActionResults,
  type ErrorCode,
} from "@dentiva/shared";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "./supabase";

export class ConsoleApiError extends Error {
  constructor(
    public readonly code: ErrorCode | "network",
    message: string,
    public readonly fields?: Record<string, string>,
    public readonly requestId?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ConsoleApiError";
  }
}

function newRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Satu-satunya jalur data Console: POST /functions/v1/console-api.
 * Tipe parameter & jawaban diambil dari kontrak bersama (@dentiva/shared),
 * jadi salah nama aksi atau field ketahuan saat build.
 */
export async function callConsole<A extends ActionName>(
  action: A,
  // eslint-disable-next-line @typescript-eslint/ban-types -- "{}" = aksi tanpa parameter wajib
  ...args: {} extends ActionParams<A> ? [params?: ActionParams<A>] : [params: ActionParams<A>]
): Promise<ActionResults[A]> {
  const params = args[0] ?? {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new ConsoleApiError("unauthenticated", "Sesi berakhir. Silakan login kembali.");
  }

  const requestId = newRequestId();
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/console-api`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify({ v: API_VERSION, action, params }),
    });
  } catch {
    throw new ConsoleApiError("network", "Tidak dapat terhubung ke server. Periksa koneksi internet.", undefined, requestId);
  }

  const body = (await res.json().catch(() => null)) as
    | { ok: true; data: ActionResults[A] }
    | { ok: false; error: { code: ErrorCode; message: string; fields?: Record<string, string>; requestId?: string } }
    | { msg?: string; message?: string }
    | null;

  if (body && "ok" in body && body.ok) return body.data;

  if (body && "ok" in body && !body.ok) {
    const e = body.error;
    throw new ConsoleApiError(e.code, e.message, e.fields, e.requestId ?? requestId, res.status);
  }

  // Jawaban dari gateway Supabase (mis. JWT kedaluwarsa) tidak memakai envelope kita.
  const gatewayMsg = (body as { msg?: string; message?: string } | null)?.msg ?? (body as { message?: string } | null)?.message;
  const code: ErrorCode = res.status === 401 ? "unauthenticated" : "internal";
  throw new ConsoleApiError(code, gatewayMsg ?? `Server mengembalikan status ${res.status}`, undefined, requestId, res.status);
}

export function errorMessage(err: unknown): string {
  if (err instanceof ConsoleApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan yang tidak diketahui";
}
