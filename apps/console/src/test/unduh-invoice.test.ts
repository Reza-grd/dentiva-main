import { describe, expect, it, vi } from "vitest";
import type { Invoice } from "@dentiva/shared";

const callConsole = vi.fn(async () => ({
  clinic: { name: "Klinik Gigi Senyum", address: "Jl. Uji 1", city: "Banda Aceh", province: "Aceh", email: "k@x.test", phone: "0812" },
}));
vi.mock("@/lib/api", () => ({ callConsole }));

const tersimpan: { nama: string; teks: string }[] = [];
vi.mock("@dentiva/shared/invoice-pdf", async (asli) => {
  const m = await asli<typeof import("@dentiva/shared/invoice-pdf")>();
  return {
    ...m,
    muatLogoInvoice: async () => null,
    buatInvoiceLangganan: (opsi: Parameters<typeof m.buatInvoiceLangganan>[0]) => {
      const doc = m.buatInvoiceLangganan(opsi);
      doc.save = ((nama: string) => { tersimpan.push({ nama, teks: doc.output() }); return doc; }) as typeof doc.save;
      return doc;
    },
  };
});

const { unduhInvoice } = await import("@/lib/invoice");

const inv: Invoice = {
  id: "i1", clinic_id: "c1", clinic_name: "Klinik Gigi Senyum", number: "INV-2026-000050",
  period_start: "2026-11-01", period_end: "2026-11-30", amount_idr: 299000, tax_idr: 0, status: "paid",
  due_date: "2026-11-04", paid_at: "2026-11-02T03:00:00Z", notes: "Langganan Dentiva paket Pro", created_at: "2026-11-01T02:00:00Z",
};

describe("Unduh invoice dari Console", () => {
  it("mengambil data penagihan klinik lalu menyimpan PDF bernama nomor invoice", async () => {
    await unduhInvoice(inv);
    expect(callConsole).toHaveBeenCalledWith("clinics.get", { clinicId: "c1" });
    expect(tersimpan[0].nama).toBe("Invoice-INV-2026-000050.pdf");
    for (const isi of ["INV-2026-000050", "Klinik Gigi Senyum", "Banda Aceh, Aceh", "Langganan Dentiva paket Pro", "Lunas"]) {
      expect(tersimpan[0].teks, isi).toContain(isi);
    }
  });
});
