import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  addDays,
  canPerform,
  formatBytes,
  formatDate,
  formatRupiah,
  slugify,
  todayWib,
} from "@dentiva/shared";
import { passwordProblems } from "@/lib/password";

describe("formatter", () => {
  it("memformat Rupiah tanpa desimal", () => {
    expect(formatRupiah(1500000)).toBe("Rp 1.500.000");
    expect(formatRupiah(null)).toBe("—");
  });

  it("memformat tanggal kalender tanpa geser hari", () => {
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
  });

  it("menambah hari pada tanggal ISO", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
  });

  it("todayWib memakai zona Asia/Jakarta", () => {
    // 2026-09-27 18:00 UTC = 2026-09-28 01:00 WIB
    expect(todayWib(new Date("2026-09-27T18:00:00Z"))).toBe("2026-09-28");
  });

  it("membuat slug dari nama klinik", () => {
    expect(slugify("Klinik Gigi Sehat Jaya — Cabang Bandung")).toBe("klinik-gigi-sehat-jaya-cabang-bandung");
  });

  it("memformat ukuran berkas", () => {
    expect(formatBytes(1536)).toBe("1,5 KB");
  });
});

describe("kontrak di sisi browser", () => {
  it("validasi pendaftaran klinik memakai skema yang sama dengan server", () => {
    const res = ACTIONS["clinics.create"].params.safeParse({
      clinic: { name: "Kl", slug: "Bukan Slug" },
      owner: { fullName: "drg. Tes", email: "bukan-email" },
      planId: "x",
    });
    expect(res.success).toBe(false);
    const paths = res.success ? [] : res.error.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["clinic.name", "clinic.slug", "owner.email", "planId"]));
  });

  it("menyembunyikan aksi yang tidak diizinkan role", () => {
    expect(canPerform("finance", "billing.invoices.create")).toBe(true);
    expect(canPerform("finance", "clinics.suspend")).toBe(false);
    expect(canPerform("support", "billing.plans.update")).toBe(false);
  });
});

describe("kebijakan password operator", () => {
  it("menolak password lemah", () => {
    expect(passwordProblems("pendek")).toEqual(expect.arrayContaining(["minimal 12 karakter", "huruf besar", "angka"]));
    expect(passwordProblems("DentivaConsole2026")).toEqual([]);
  });
});
