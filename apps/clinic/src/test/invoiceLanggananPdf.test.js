import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buatInvoiceLangganan } from '../utils/invoiceLanggananPdf';
import { pesanKonfirmasi, PENJUAL } from '../utils/billingConfig';

const invoice = {
  number: 'INV-2026-000042', status: 'open', issued_at: '2026-11-14T03:00:00Z', due_date: '2026-11-17',
  period_start: '2026-11-14', period_end: '2026-12-13', amount_idr: 299000, tax_idr: 0, total_idr: 299000,
  description: 'Langganan Dentiva paket Pro (bulanan)',
};
const billTo = { name: 'Klinik Gigi Senyum Sehat', address: 'Jl. Contoh No. 1', city: 'Banda Aceh', province: 'Aceh', email: 'halo@klinik.test', phone: '0812' };
// Teks di PDF jsPDF tersimpan sebagai string literal di stream konten (tanpa kompresi).
const teksPdf = (doc) => doc.output();

describe('Invoice langganan (PDF)', () => {
  it('memuat nomor, penjual, klinik, rincian, dan jumlah tagihan', () => {
    const doc = buatInvoiceLangganan({ invoice, billTo });
    const t = teksPdf(doc);
    for (const isi of ['Invoice', 'INV-2026-000042', PENJUAL.nama, 'Ditagihkan kepada', 'Klinik Gigi Senyum Sehat', 'Banda Aceh, Aceh',
      'Langganan Dentiva paket Pro', 'Rp 299.000', 'Jumlah tagihan', 'Belum dibayar']) {
      expect(t, isi).toContain(isi);
    }
    if (process.env.CONTOH_INVOICE) {
      writeFileSync(process.env.CONTOH_INVOICE, Buffer.from(doc.output('arraybuffer')));
      writeFileSync(process.env.CONTOH_INVOICE.replace('.pdf', '-lunas.pdf'),
        Buffer.from(buatInvoiceLangganan({ invoice: { ...invoice, status: 'paid', paid_at: '2026-11-15T02:00:00Z' }, billTo }).output('arraybuffer')));
    }
  });

  it('invoice lunas menampilkan status lunas dan sisa tagihan nol', () => {
    const t = teksPdf(buatInvoiceLangganan({ invoice: { ...invoice, status: 'paid', paid_at: '2026-11-15T02:00:00Z' }, billTo }));
    expect(t).toContain('Lunas, 15 November 2026');
    expect(t).toContain('Rp 0');
  });

  it('pesan konfirmasi WhatsApp menyertakan nomor invoice', () => {
    expect(pesanKonfirmasi({ klinik: 'K', paket: 'Pro', siklus: 'monthly', nominal: 299000, admin: 'A', invoice: 'INV-2026-000042' }))
      .toContain('Invoice: INV-2026-000042');
  });
});
