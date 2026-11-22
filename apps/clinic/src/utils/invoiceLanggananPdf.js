import { buatInvoiceLangganan as buatPdf, muatLogoInvoice } from '@dentiva/shared/invoice-pdf';
import { BILLING, PENJUAL } from './billingConfig';

/**
 * Invoice langganan Dentiva untuk aplikasi klinik: memakai pembuat PDF bersama
 * (@dentiva/shared/invoice-pdf, sama dengan Console) dengan identitas penjual & rekening dari env klinik.
 */
const opsiKlinik = () => ({
  penjual: PENJUAL,
  pembayaran: { bank: BILLING.bank, rekening: BILLING.rekening, atasNama: BILLING.atasNama, viaWa: Boolean(BILLING.wa) },
});

export function buatInvoiceLangganan({ invoice, billTo = {}, logo = null }) {
  return buatPdf({ invoice, billTo, logo, ...opsiKlinik() });
}

/** Buat lalu unduh: Invoice-INV-2026-000123.pdf */
export async function unduhInvoiceLangganan({ invoice, billTo }) {
  const doc = buatInvoiceLangganan({ invoice, billTo, logo: await muatLogoInvoice() });
  doc.save(`Invoice-${invoice.number}.pdf`);
}
