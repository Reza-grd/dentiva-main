/**
 * Router console-api — satu pintu untuk semua aksi Console.
 *
 * Urutan pemeriksaan (sama untuk setiap aksi, sekarang dan nanti):
 *   1. Token Supabase valid                          → unauthenticated
 *   2. Tingkat autentikasi aal2 (sudah verifikasi TOTP) → mfa_required
 *   3. Bukan akun klinik (tanpa clinic_id)            → not_operator
 *   4. Envelope { v, action, params } valid            → invalid_request / unsupported_version / unknown_action
 *   5. Operator terdaftar & aktif di platform.operators → not_operator
 *   6. Role operator diizinkan untuk aksi              → forbidden
 *   7. Params lolos skema zod aksi                     → invalid_params
 *   8. Jalankan handler. Aksi tulis dijalankan dalam SATU transaksi bersama
 *      penulisan platform.audit_logs; tanpa audit → rollback (audit_failed).
 */
import {
  ACTIONS,
  API_VERSION,
  isActionName,
  requestEnvelope,
  type ActionName,
  type ApiResponse,
} from "../../_shared/contract/index.ts";
import { ApiException, HTTP_STATUS, fromDatabaseError } from "./errors.ts";
import { bearerToken, clientIp, corsHeaders, json } from "./http.ts";
import type { AuditDraft, Deps, HandlerCtx, OperatorRecord, RequestMeta } from "./types.ts";

export async function handleRequest<S>(req: Request, deps: Deps<S>): Promise<Response> {
  const cors = corsHeaders(req, deps.config.allowedOrigins);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const request: RequestMeta = {
    id: sanitizeRequestId(req.headers.get("x-request-id")) ?? deps.newId(),
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    origin: req.headers.get("origin"),
  };

  let action: string | undefined;
  let operatorId: string | undefined;

  try {
    if (req.method !== "POST") {
      throw new ApiException("invalid_request", "Gunakan metode POST");
    }

    // 1–3. Identitas
    const token = bearerToken(req);
    if (!token) throw new ApiException("unauthenticated", "Silakan login terlebih dahulu");

    const identity = await deps.verifyToken(token);
    if (!identity) throw new ApiException("unauthenticated", "Sesi tidak valid atau sudah berakhir");

    if (identity.aal !== "aal2") {
      throw new ApiException("mfa_required", "Verifikasi dua langkah (TOTP) wajib untuk Dentiva Console");
    }

    if (identity.appMetadata?.clinic_id) {
      throw new ApiException("not_operator", "Akun klinik tidak dapat mengakses Dentiva Console");
    }

    // 4. Envelope
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiException("invalid_request", "Body harus JSON");
    }

    const envelope = requestEnvelope.safeParse(body);
    if (!envelope.success) {
      const v = (body as { v?: unknown } | null)?.v;
      if (v !== undefined && v !== API_VERSION) {
        throw new ApiException("unsupported_version", `Versi API ${String(v)} tidak didukung (gunakan v: ${API_VERSION})`);
      }
      throw new ApiException("invalid_request", "Format permintaan harus { v, action, params }");
    }

    action = envelope.data.action;
    if (!isActionName(action)) {
      throw new ApiException("unknown_action", `Aksi "${action}" tidak dikenal`);
    }
    const name: ActionName = action;
    const spec = ACTIONS[name];

    // 5. Operator
    const operator = await deps.db.getOperator(identity.userId);
    if (!operator || !operator.is_active) {
      throw new ApiException("not_operator", "Akun ini tidak terdaftar sebagai operator aktif Dentiva Console");
    }
    if (await deps.db.hasClinicProfile(identity.userId)) {
      throw new ApiException("not_operator", "Akun operator tidak boleh sekaligus menjadi user klinik");
    }
    operatorId = operator.user_id;

    // 6. Izin
    if (!(spec.roles as readonly string[]).includes(operator.role)) {
      throw new ApiException("forbidden", `Role ${operator.role} tidak boleh menjalankan ${name}`);
    }

    // 7. Validasi
    const parsed = spec.params.safeParse(envelope.data.params ?? {});
    if (!parsed.success) {
      throw new ApiException("invalid_params", "Data yang dikirim tidak valid", zodFields(parsed.error));
    }

    // 8. Eksekusi
    const handler = deps.handlers[name] as unknown as (ctx: HandlerCtx<S>, p: unknown) => Promise<unknown>;
    const data = spec.mutates
      ? await runMutation(deps, handler, name, operator, request, parsed.data)
      : await deps.db.read((sql) => handler(buildCtx(deps, sql, operator, request), parsed.data));

    deps.log.info("console-api ok", { action: name, operator: operator.user_id, requestId: request.id });
    return json({ ok: true, data, requestId: request.id } satisfies ApiResponse<unknown>, 200, {
      ...cors,
      "X-Request-ID": request.id,
    });
  } catch (err) {
    const apiErr = toApiException(err);
    const status = HTTP_STATUS[apiErr.code];
    const logData = { action, operator: operatorId, requestId: request.id, code: apiErr.code };
    if (status >= 500) {
      deps.log.error("console-api error", { ...logData, error: describe(err) });
    } else {
      deps.log.warn("console-api rejected", { ...logData, message: apiErr.message });
    }
    return json(
      {
        ok: false,
        error: {
          code: apiErr.code,
          message: apiErr.message,
          ...(apiErr.fields ? { fields: apiErr.fields } : {}),
          requestId: request.id,
        },
      } satisfies ApiResponse<never>,
      status,
      { ...cors, "X-Request-ID": request.id },
    );
  }
}

async function runMutation<S>(
  deps: Deps<S>,
  handler: (ctx: HandlerCtx<S>, p: unknown) => Promise<unknown>,
  name: ActionName,
  operator: OperatorRecord,
  request: RequestMeta,
  params: unknown,
): Promise<unknown> {
  const afterCommit: Array<() => Promise<void>> = [];
  const onRollback: Array<() => Promise<void>> = [];

  let result: unknown;
  try {
    result = await deps.db.transaction(async (tx) => {
      const drafts: AuditDraft[] = [];
      const ctx = buildCtx(deps, tx.sql, operator, request, drafts, afterCommit, onRollback);
      const out = await handler(ctx, params);

      if (drafts.length === 0) {
        throw new ApiException("audit_failed", `Aksi ${name} tidak menghasilkan catatan audit; perubahan dibatalkan`);
      }
      for (const d of drafts) {
        await tx.writeAudit({
          ...d,
          action: d.action ?? name,
          operatorId: operator.user_id,
          ip: request.ip,
          userAgent: request.userAgent,
          requestId: request.id,
        });
      }
      return out;
    });
  } catch (err) {
    for (const fn of onRollback) {
      try {
        await fn();
      } catch (cleanupErr) {
        deps.log.error("console-api rollback hook failed", { action: name, error: describe(cleanupErr) });
      }
    }
    throw err;
  }

  for (const fn of afterCommit) {
    try {
      await fn();
    } catch (hookErr) {
      deps.log.error("console-api afterCommit hook failed", { action: name, error: describe(hookErr) });
    }
  }
  return result;
}

function buildCtx<S>(
  deps: Deps<S>,
  sql: S,
  operator: OperatorRecord,
  request: RequestMeta,
  drafts?: AuditDraft[],
  afterCommit?: Array<() => Promise<void>>,
  onRollback?: Array<() => Promise<void>>,
): HandlerCtx<S> {
  return {
    operator,
    sql,
    auth: deps.auth,
    config: deps.config,
    request,
    audit(entry) {
      if (!drafts) throw new ApiException("internal", "audit() dipanggil pada aksi baca-saja");
      drafts.push(entry);
    },
    afterCommit(fn) {
      if (!afterCommit) throw new ApiException("internal", "afterCommit() hanya untuk aksi tulis");
      afterCommit.push(fn);
    },
    onRollback(fn) {
      if (!onRollback) throw new ApiException("internal", "onRollback() hanya untuk aksi tulis");
      onRollback.push(fn);
    },
  };
}

function toApiException(err: unknown): ApiException {
  if (err instanceof ApiException) return err;
  return fromDatabaseError(err) ?? new ApiException("internal", "Terjadi kesalahan pada server. Coba lagi atau hubungi tim teknis.");
}

function zodFields(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

function sanitizeRequestId(value: string | null): string | null {
  return value && /^[A-Za-z0-9._-]{8,64}$/.test(value) ? value : null;
}

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
