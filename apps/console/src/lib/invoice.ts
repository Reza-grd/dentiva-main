import type { Invoice } from "@dentiva/shared";
import { callConsole } from "./api";

/**
 * Unduh invoice langganan sebagai PDF dari Console — tata letak sama dengan yang diunduh klinik
 * (@dentiva/shared/invoice-pdf). Data penagihan diambil dari detail klinik (clinics.get).
 * Identitas penjual & rekening dari Environment Variables proyek Console di Vercel
 * (nama variabel sama dengan aplikasi klinik); yang kosong tidak dicetak.
 */
const env = import.meta.env;
const teks = (v: unknown) => String(v ?? "").trim();

const PENJUAL = {
  nama: teks(env.VITE_INVOICE_NAMA) || "PT Dentiva Teknologi Nusantara",
  alamat: teks(env.VITE_INVOICE_ALAMAT).split("|").map((x) => x.trim()).filter(Boolean),
  npwp: teks(env.VITE_INVOICE_NPWP),
  email: teks(env.VITE_BILLING_EMAIL) || "support@dentiva.co.id",
};
const PEMBAYARAN = {
  bank: teks(env.VITE_BILLING_BANK),
  rekening: teks(env.VITE_BILLING_REKENING),
  atasNama: teks(env.VITE_BILLING_ATAS_NAMA),
  viaWa: Boolean(teks(env.VITE_BILLING_WA)),
};

export async function unduhInvoice(inv: Invoice): Promise<void> {
  // jsPDF dimuat hanya saat dibutuhkan agar tidak membebani muatan awal Console.
  const [{ buatInvoiceLangganan, muatLogoInvoice }, detail] = await Promise.all([
    import("@dentiva/shared/invoice-pdf"),
    callConsole("clinics.get", { clinicId: inv.clinic_id }),
  ]);
  const c = detail.clinic;
  const doc = buatInvoiceLangganan({
    invoice: {
      number: inv.number,
      status: inv.status,
      issued_at: inv.created_at,
      due_date: inv.due_date,
      paid_at: inv.paid_at,
      period_start: inv.period_start,
      period_end: inv.period_end,
      amount_idr: inv.amount_idr,
      tax_idr: inv.tax_idr,
      total_idr: inv.amount_idr + inv.tax_idr,
      description: inv.notes || "Langganan Dentiva",
    },
    billTo: { name: c.name ?? inv.clinic_name, address: c.address, city: c.city, province: c.province, email: c.email, phone: c.phone },
    penjual: PENJUAL,
    pembayaran: PEMBAYARAN,
    logo: await muatLogoInvoice("/dentiva-logo.png"),
  });
  doc.save(`Invoice-${inv.number}.pdf`);
}
