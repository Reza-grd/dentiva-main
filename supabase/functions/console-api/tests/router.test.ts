/**
 * Tes router console-api. Berjalan di Node (vitest) karena router tidak
 * bergantung pada modul Deno; database & Auth diganti objek palsu.
 *
 *   npm run test:api
 */
import { describe, expect, it, vi } from "vitest";
import { ACTIONS, ACTION_NAMES, canPerform, type ActionName } from "../../_shared/contract/index.ts";
import { handleRequest } from "../src/router.ts";
import type { AuditRecord, Deps, HandlerRegistry, Identity, OperatorRecord } from "../src/types.ts";

const CLINIC_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const PLAN_ID = "bbbbbbbb-0000-4000-8000-000000000002";

type FakeSql = { tag: "fake-sql" };

interface Harness {
  deps: Deps<FakeSql>;
  audits: AuditRecord[];
  events: string[];
  handlerCalls: ActionName[];
}

function makeOperator(role: OperatorRecord["role"], overrides: Partial<OperatorRecord> = {}): OperatorRecord {
  return {
    user_id: "0e000000-0000-4000-8000-0000000000e0",
    full_name: "Operator Tes",
    role,
    is_active: true,
    email: "op@test.local",
    last_login_at: null,
    created_at: "2026-09-28T00:00:00Z",
    ...overrides,
  };
}

function harness(opts: {
  identity?: Identity | null;
  operator?: OperatorRecord | null;
  hasClinicProfile?: boolean;
  handlers?: Partial<HandlerRegistry<FakeSql>>;
} = {}): Harness {
  const audits: AuditRecord[] = [];
  const events: string[] = [];
  const handlerCalls: ActionName[] = [];

  const identity =
    opts.identity === undefined
      ? { userId: "0e000000-0000-4000-8000-0000000000e0", email: "op@test.local", aal: "aal2", appMetadata: {} }
      : opts.identity;

  const defaultHandler = (name: ActionName) => async () => {
    handlerCalls.push(name);
    return { handled: name };
  };

  const handlers = Object.fromEntries(
    ACTION_NAMES.map((n) => [n, opts.handlers?.[n] ?? defaultHandler(n)]),
  ) as unknown as HandlerRegistry<FakeSql>;

  const deps: Deps<FakeSql> = {
    verifyToken: vi.fn(async () => identity),
    db: {
      getOperator: vi.fn(async () => (opts.operator === undefined ? makeOperator("owner") : opts.operator)),
      hasClinicProfile: vi.fn(async () => opts.hasClinicProfile ?? false),
      read: vi.fn(async (fn) => {
        events.push("read");
        return fn({ tag: "fake-sql" });
      }),
      transaction: vi.fn(async (fn) => {
        events.push("begin");
        const pending: AuditRecord[] = [];
        try {
          const out = await fn({
            sql: { tag: "fake-sql" },
            writeAudit: async (r) => {
              pending.push(r);
            },
          });
          audits.push(...pending); // hanya "tersimpan" jika commit
          events.push("commit");
          return out;
        } catch (e) {
          events.push("rollback");
          throw e;
        }
      }),
    },
    auth: {
      createUser: vi.fn(async () => ({ id: "new-user" })),
      deleteUser: vi.fn(async () => {}),
      sendInvite: vi.fn(async () => {}),
      sendPasswordReset: vi.fn(async () => {}),
    },
    handlers,
    config: {
      consoleUrl: "https://console.test",
      clinicAppUrl: "https://app.test",
      allowedOrigins: ["https://console.test"],
    },
    log: { info: () => {}, warn: () => {}, error: () => {} },
    newId: () => "req-00000001",
  };

  return { deps, audits, events, handlerCalls };
}

function call(h: Harness, body: unknown, init: { token?: string | null; method?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: "https://console.test" };
  if (init.token !== null) headers.Authorization = `Bearer ${init.token ?? "token-aal2"}`;
  return handleRequest(
    new Request("https://fn.test/console-api", {
      method: init.method ?? "POST",
      headers,
      body: init.method === "GET" ? undefined : JSON.stringify(body),
    }),
    h.deps,
  );
}

async function read(res: Response) {
  return { status: res.status, body: (await res.json()) as any };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("autentikasi & MFA", () => {
  it("menolak permintaan tanpa token", async () => {
    const h = harness();
    const { status, body } = await read(await call(h, { v: 1, action: "dashboard.summary" }, { token: null }));
    expect(status).toBe(401);
    expect(body.error.code).toBe("unauthenticated");
  });

  it("menolak token yang tidak valid", async () => {
    const h = harness({ identity: null });
    const { status, body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(status).toBe(401);
    expect(body.error.code).toBe("unauthenticated");
  });

  it("menolak token tanpa aal2 (belum verifikasi TOTP)", async () => {
    const h = harness({ identity: { userId: "u", email: null, aal: "aal1", appMetadata: {} } });
    const { status, body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(status).toBe(403);
    expect(body.error.code).toBe("mfa_required");
    expect(h.handlerCalls).toHaveLength(0);
    expect(h.deps.db.getOperator).not.toHaveBeenCalled();
  });

  it("menolak akun klinik (punya app_metadata.clinic_id) walau aal2", async () => {
    const h = harness({
      identity: { userId: "u", email: null, aal: "aal2", appMetadata: { clinic_id: CLINIC_ID } },
    });
    const { status, body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(status).toBe(403);
    expect(body.error.code).toBe("not_operator");
  });

  it("menolak user yang bukan operator", async () => {
    const h = harness({ operator: null });
    const { body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(body.error.code).toBe("not_operator");
  });

  it("menolak operator nonaktif", async () => {
    const h = harness({ operator: makeOperator("owner", { is_active: false }) });
    const { body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(body.error.code).toBe("not_operator");
  });

  it("menolak operator yang juga punya profil klinik", async () => {
    const h = harness({ hasClinicProfile: true });
    const { body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(body.error.code).toBe("not_operator");
  });
});

describe("envelope permintaan", () => {
  it("menolak versi API yang tidak didukung", async () => {
    const h = harness();
    const { status, body } = await read(await call(h, { v: 2, action: "dashboard.summary" }));
    expect(status).toBe(400);
    expect(body.error.code).toBe("unsupported_version");
  });

  it("menolak aksi yang tidak dikenal", async () => {
    const h = harness();
    const { body } = await read(await call(h, { v: 1, action: "clinics.dropDatabase" }));
    expect(body.error.code).toBe("unknown_action");
  });

  it("menolak metode selain POST", async () => {
    const h = harness();
    const { status } = await read(await call(h, null, { method: "GET" }));
    expect(status).toBe(400);
  });

  it("menjawab preflight CORS hanya untuk origin yang diizinkan", async () => {
    const h = harness();
    const res = await handleRequest(
      new Request("https://fn.test/console-api", { method: "OPTIONS", headers: { Origin: "https://evil.test" } }),
      h.deps,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://console.test");
  });
});

describe("peta izin", () => {
  it("role support ditolak mengubah paket klinik", async () => {
    const h = harness({ operator: makeOperator("support") });
    const { status, body } = await read(
      await call(h, {
        v: 1,
        action: "clinics.changePlan",
        params: { clinicId: CLINIC_ID, planId: PLAN_ID, reason: "Upgrade permintaan klinik" },
      }),
    );
    expect(status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(h.handlerCalls).toHaveLength(0);
    expect(h.deps.db.transaction).not.toHaveBeenCalled();
  });

  it("role support ditolak mengubah harga paket", async () => {
    const h = harness({ operator: makeOperator("support") });
    const { body } = await read(
      await call(h, {
        v: 1,
        action: "billing.plans.update",
        params: { planId: PLAN_ID, patch: { price_monthly: 1 }, reason: "Coba ubah harga" },
      }),
    );
    expect(body.error.code).toBe("forbidden");
  });

  it("role finance ditolak menangguhkan klinik", async () => {
    const h = harness({ operator: makeOperator("finance") });
    const { body } = await read(
      await call(h, { v: 1, action: "clinics.suspend", params: { clinicId: CLINIC_ID, reason: "Tagihan belum dibayar" } }),
    );
    expect(body.error.code).toBe("forbidden");
  });

  it("peta izin sesuai tabel hak akses di panduan", () => {
    const expectRoles = (action: ActionName, roles: string[]) =>
      expect([...ACTIONS[action].roles].sort()).toEqual([...roles].sort());

    expectRoles("dashboard.summary", ["owner", "support", "finance"]);
    expectRoles("clinics.list", ["owner", "support", "finance"]);
    expectRoles("clinics.create", ["owner", "support"]);
    expectRoles("clinics.activate", ["owner", "support"]);
    expectRoles("clinics.suspend", ["owner", "support"]);
    expectRoles("clinics.close", ["owner", "support"]);
    expectRoles("users.setStatus", ["owner", "support"]);
    expectRoles("users.resendInvite", ["owner", "support"]);
    expectRoles("billing.invoices.create", ["owner", "finance"]);
    expectRoles("billing.payments.confirmManual", ["owner", "finance"]);
    expectRoles("clinics.changePlan", ["owner"]);
    expectRoles("billing.plans.update", ["owner"]);
    expectRoles("operators.invite", ["owner"]);
    expectRoles("operators.update", ["owner"]);
    expectRoles("audit.list", ["owner", "support", "finance"]);
    expect(canPerform("finance", "clinics.suspend")).toBe(false);
    expect(canPerform(null, "dashboard.summary")).toBe(false);
  });

  it("tidak ada aksi yang membuka rekam medis pasien", () => {
    for (const name of ACTION_NAMES) {
      expect(name).not.toMatch(/patient|visit|emr|medical|rekam/i);
    }
  });
});

describe("validasi params", () => {
  it("mengembalikan detail field yang salah", async () => {
    const h = harness();
    const { status, body } = await read(
      await call(h, { v: 1, action: "clinics.suspend", params: { clinicId: "bukan-uuid", reason: "x" } }),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe("invalid_params");
    expect(Object.keys(body.error.fields)).toEqual(expect.arrayContaining(["clinicId", "reason"]));
    expect(h.handlerCalls).toHaveLength(0);
  });

  it("menerima UUID klinik default warisan (bukan UUID RFC 4122)", async () => {
    const h = harness();
    const { status } = await read(
      await call(h, { v: 1, action: "clinics.get", params: { clinicId: "d0000000-0000-0000-0000-000000000000" } }),
    );
    expect(status).toBe(200);
  });

  it("mengisi nilai default pagination", async () => {
    let received: unknown;
    const h = harness({
      handlers: {
        "clinics.list": async (_ctx, p) => {
          received = p;
          return { items: [], page: 1, pageSize: 25, total: 0 };
        },
      },
    });
    await call(h, { v: 1, action: "clinics.list", params: {} });
    expect(received).toMatchObject({ page: 1, pageSize: 25 });
  });

  it("menolak pageSize di atas 50", async () => {
    const h = harness();
    const { body } = await read(await call(h, { v: 1, action: "clinics.list", params: { pageSize: 500 } }));
    expect(body.error.code).toBe("invalid_params");
  });
});

describe("audit & transaksi", () => {
  it("aksi baca berjalan tanpa transaksi dan tanpa audit", async () => {
    const h = harness();
    const { status, body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(status).toBe(200);
    expect(body).toMatchObject({ ok: true, data: { handled: "dashboard.summary" }, requestId: "req-00000001" });
    expect(h.events).toEqual(["read"]);
    expect(h.audits).toHaveLength(0);
  });

  it("setiap aksi tulis menghasilkan tepat satu baris audit di transaksi yang sama", async () => {
    const h = harness({
      handlers: {
        "clinics.suspend": async (ctx, p) => {
          ctx.audit({ targetType: "clinic", targetId: p.clinicId, clinicId: p.clinicId, reason: p.reason, before: { status: "active" }, after: { status: "suspended" } });
          return { id: p.clinicId, status: "suspended" };
        },
      },
    });

    const { status } = await read(
      await call(h, { v: 1, action: "clinics.suspend", params: { clinicId: CLINIC_ID, reason: "Tagihan 60 hari belum dibayar" } }),
    );

    expect(status).toBe(200);
    expect(h.events).toEqual(["begin", "commit"]);
    expect(h.audits).toHaveLength(1);
    expect(h.audits[0]).toMatchObject({
      action: "clinics.suspend",
      operatorId: "0e000000-0000-4000-8000-0000000000e0",
      targetType: "clinic",
      targetId: CLINIC_ID,
      clinicId: CLINIC_ID,
      reason: "Tagihan 60 hari belum dibayar",
      before: { status: "active" },
      after: { status: "suspended" },
      requestId: "req-00000001",
    });
  });

  it("setiap aksi `mutates: true` wajib menulis audit — tanpa audit transaksi di-rollback", async () => {
    const mutating = ACTION_NAMES.filter((n) => ACTIONS[n].mutates);
    expect(mutating.length).toBeGreaterThan(10);

    const h = harness({
      handlers: {
        "clinics.activate": async () => ({ forgotToAudit: true }),
      },
    });
    const rollbackHook = vi.fn(async () => {});
    const commitHook = vi.fn(async () => {});
    h.deps.handlers["clinics.activate"] = async (ctx) => {
      ctx.onRollback(rollbackHook);
      ctx.afterCommit(commitHook);
      return { forgotToAudit: true };
    };

    const { status, body } = await read(await call(h, { v: 1, action: "clinics.activate", params: { clinicId: CLINIC_ID } }));
    expect(status).toBe(500);
    expect(body.error.code).toBe("audit_failed");
    expect(h.events).toEqual(["begin", "rollback"]);
    expect(h.audits).toHaveLength(0);
    expect(rollbackHook).toHaveBeenCalledOnce();
    expect(commitHook).not.toHaveBeenCalled();
  });

  it("afterCommit dijalankan setelah commit; kegagalannya tidak menggagalkan jawaban", async () => {
    const order: string[] = [];
    const h = harness();
    h.deps.handlers["users.resendInvite"] = async (ctx, p) => {
      ctx.audit({ targetType: "clinic_user", targetId: p.userId });
      ctx.afterCommit(async () => {
        order.push(`hook-after-${h.events.at(-1)}`);
        throw new Error("SMTP down");
      });
      return { sent: true };
    };
    const { status } = await read(
      await call(h, { v: 1, action: "users.resendInvite", params: { userId: CLINIC_ID } }),
    );
    expect(status).toBe(200);
    expect(order).toEqual(["hook-after-commit"]);
  });

  it("error database 23505 dipetakan menjadi 409 conflict", async () => {
    const h = harness();
    h.deps.handlers["clinics.notes.add"] = async () => {
      throw Object.assign(new Error('Slug "x" sudah dipakai klinik lain'), { code: "23505" });
    };
    const { status, body } = await read(
      await call(h, { v: 1, action: "clinics.notes.add", params: { clinicId: CLINIC_ID, body: "Catatan" } }),
    );
    expect(status).toBe(409);
    expect(body.error.code).toBe("conflict");
    expect(h.events).toEqual(["begin", "rollback"]);
  });

  it("error tak terduga disamarkan (tidak membocorkan detail internal)", async () => {
    const h = harness();
    h.deps.handlers["dashboard.summary"] = async () => {
      throw new Error("connection string postgres://secret@host");
    };
    const { status, body } = await read(await call(h, { v: 1, action: "dashboard.summary" }));
    expect(status).toBe(500);
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain("secret");
  });
});
