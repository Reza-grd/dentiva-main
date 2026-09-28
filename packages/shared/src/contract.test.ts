import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  ACTION_NAMES,
  CLINIC_ACCESS_STATUSES,
  CLINIC_STATUSES,
  CLINIC_STATUS_LABELS,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  OPERATOR_ROLES,
  USER_ACCESS_STATUSES,
  USER_STATUSES,
  USER_STATUS_LABELS,
} from "./index";
import { formatDateTime, formatRupiah, slugify } from "./format";

/** Harus sama dengan CHECK constraint platform.audit_logs.action (migration platform_schema). */
const AUDIT_ACTION_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

describe("kontrak console-api", () => {
  it("semua nama aksi lolos CHECK constraint audit_logs.action", () => {
    for (const name of [...ACTION_NAMES, "announcements.create", "announcements.update"]) {
      expect(name, name).toMatch(AUDIT_ACTION_PATTERN);
    }
  });

  it("setiap aksi punya minimal satu role yang valid", () => {
    for (const name of ACTION_NAMES) {
      const roles = ACTIONS[name].roles;
      expect(roles.length, name).toBeGreaterThan(0);
      for (const r of roles) expect(OPERATOR_ROLES).toContain(r);
    }
  });

  it("aksi yang mengubah paket/harga/operator hanya untuk owner", () => {
    for (const name of ["clinics.changePlan", "billing.plans.update", "operators.invite", "operators.update"] as const) {
      expect(ACTIONS[name].roles).toEqual(["owner"]);
      expect(ACTIONS[name].mutates).toBe(true);
    }
  });

  it("aksi berisiko wajib alasan", () => {
    const requiresReason = ["clinics.suspend", "clinics.close", "users.setStatus", "billing.invoices.void"] as const;
    for (const name of requiresReason) {
      const res = ACTIONS[name].params.safeParse({});
      expect(res.success).toBe(false);
      const paths = res.success ? [] : res.error.issues.map((i) => i.path.join("."));
      expect(paths, name).toContain("reason");
    }
  });

  it("aksi baca tidak ditandai mutates", () => {
    for (const name of ACTION_NAMES) {
      if (/\.(list|get|me|summary|clinic|overview|checkSlug)$/.test(name)) {
        expect(ACTIONS[name].mutates, name).toBe(false);
      }
    }
  });
});

describe("konstanta status", () => {
  it("setiap status punya label", () => {
    for (const s of CLINIC_STATUSES) expect(CLINIC_STATUS_LABELS[s]).toBeTruthy();
    for (const s of USER_STATUSES) expect(USER_STATUS_LABELS[s]).toBeTruthy();
    for (const s of INVOICE_STATUSES) expect(INVOICE_STATUS_LABELS[s]).toBeTruthy();
  });

  it("status akses cocok dengan public.get_user_clinic_id()", () => {
    expect([...CLINIC_ACCESS_STATUSES]).toEqual(["trial", "active"]);
    expect([...USER_ACCESS_STATUSES]).toEqual(["invited", "active"]);
  });
});

describe("formatter", () => {
  it("Rupiah", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah("599000")).toBe("Rp 599.000");
  });

  it("waktu dalam WIB", () => {
    expect(formatDateTime("2026-09-28T07:05:00Z")).toContain("14.05");
    expect(formatDateTime("2026-09-28T07:05:00Z")).toContain("WIB");
  });

  it("slug aman untuk URL", () => {
    expect(slugify("  Klinik  Gigi Ceria!!  ")).toBe("klinik-gigi-ceria");
    expect(slugify("Dental Café")).toBe("dental-cafe");
  });
});
