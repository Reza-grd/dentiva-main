import { jsPDF } from 'jspdf';
import { BILLING, PENJUAL, rekeningSiap } from './billingConfig';

/**
 * Invoice langganan Dentiva (PDF A4) — tata letak tagihan resmi:
 * judul + logo, data invoice, penjual / ditagihkan kepada / cara bayar, jumlah tagihan,
 * tabel rincian, ringkasan total, dan kaki halaman.
 *
 * buatInvoiceLangganan({ invoice, billTo, logo }) → jsPDF
 *   invoice: { number, status, issued_at, due_date, paid_at, period_start, period_end,
 *              amount_idr, tax_idr, total_idr, description }
 *   billTo : { name, address, city, province, email, phone }
 *   logo   : data URL PNG (opsional)
 */

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
const tanggal = (v) => {
  if (!v) return '-';
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
const baris = (...xs) => xs.flat().map((x) => String(x ?? '').trim()).filter(Boolean);

const HITAM = [17, 24, 39];
const ABU = [107, 114, 128];
const GARIS = [229, 231, 235];

export function buatInvoiceLangganan({ invoice, billTo = {}, logo = null }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18; // margin
  const kanan = W - M;
  const lunas = invoice.status === 'paid';
  const total = Number(invoice.total_idr ?? (Number(invoice.amount_idr) || 0) + (Number(invoice.tax_idr) || 0));
  const pajak = Number(invoice.tax_idr) || 0;
  const warna = (c) => doc.setTextColor(...c);
  const huruf = (gaya, ukuran) => { doc.setFont('helvetica', gaya); doc.setFontSize(ukuran); };
  doc.setProperties({ title: `Invoice ${invoice.number}`, subject: 'Invoice langganan Dentiva', author: PENJUAL.nama, creator: 'Dentiva' });

  // ── Judul & logo ──
  warna(HITAM); huruf('bold', 22);
  doc.text('Invoice', M, 26);
  if (logo) {
    try { doc.addImage(logo, 'PNG', kanan - 14, 15, 14, 14); } catch { /* logo opsional */ }
  }

  // ── Data invoice ──
  const meta = [
    ['Nomor invoice', invoice.number],
    ['Tanggal terbit', tanggal(invoice.issued_at)],
    ['Jatuh tempo', tanggal(invoice.due_date)],
    PENJUAL.npwp ? ['NPWP', PENJUAL.npwp] : null,
    ['Status', lunas ? `Lunas, ${tanggal(invoice.paid_at)}` : invoice.status === 'overdue' ? 'Lewat jatuh tempo' : 'Belum dibayar'],
  ].filter(Boolean);
  let y = 38;
  meta.forEach(([k, v]) => {
    huruf('bold', 9); warna(HITAM); doc.text(k, M, y);
    huruf('normal', 9); doc.text(String(v), M + 30, y);
    y += 5;
  });

  // ── Tiga kolom: penjual, ditagihkan kepada, cara bayar ──
  y += 7;
  const kolom = [M, M + 62, M + 120];
  const blok = (x, judul, isi) => {
    huruf('bold', 9); warna(HITAM); doc.text(judul, x, y);
    huruf('normal', 9);
    isi.forEach((t, i) => doc.text(doc.splitTextToSize(t, 56)[0], x, y + 5.5 + i * 4.6));
    return isi.length;
  };
  const kota = baris([billTo.city, billTo.province].filter(Boolean).join(', '));
  const n = Math.max(
    blok(kolom[0], PENJUAL.nama, baris(PENJUAL.alamat, PENJUAL.email)),
    blok(kolom[1], 'Ditagihkan kepada', baris(billTo.name, billTo.address, kota, billTo.email, billTo.phone)),
    blok(kolom[2], lunas ? 'Dibayar melalui' : 'Cara pembayaran', rekeningSiap()
      ? baris(`Transfer ${BILLING.bank}`, BILLING.rekening, `a.n. ${BILLING.atasNama}`)
      : baris('Transfer bank', 'Rekening dikirim tim Dentiva', BILLING.email)),
  );
  y += 8 + n * 4.6 + 8;

  // ── Jumlah tagihan ──
  huruf('bold', 15); warna(HITAM);
  doc.text(lunas ? `${rupiah(total)} lunas pada ${tanggal(invoice.paid_at)}` : `${rupiah(total)} jatuh tempo ${tanggal(invoice.due_date)}`, M, y);
  y += 7;
  huruf('normal', 9); warna(ABU);
  const catatan = lunas
    ? 'Terima kasih. Pembayaran telah kami terima dan paket langganan klinik Anda aktif sesuai periode di bawah.'
    : `Cantumkan nomor ${invoice.number} pada berita transfer, lalu kirim bukti transfer ke tim Dentiva${BILLING.wa ? ' melalui WhatsApp' : ''}.`;
  doc.text(doc.splitTextToSize(catatan, kanan - M), M, y);
  y += 12;

  // ── Tabel rincian ──
  const kol = { qty: kanan - 78, harga: kanan - 52, pajak: kanan - 26, jumlah: kanan };
  huruf('normal', 8.5); warna(HITAM);
  doc.text('Deskripsi', M, y);
  doc.text('Qty', kol.qty, y, { align: 'right' });
  doc.text('Harga satuan', kol.harga, y, { align: 'right' });
  doc.text('PPN', kol.pajak, y, { align: 'right' });
  doc.text('Jumlah', kol.jumlah, y, { align: 'right' });
  y += 2.5;
  doc.setDrawColor(...HITAM); doc.setLineWidth(0.5); doc.line(M, y, kanan, y);
  y += 6;
  huruf('normal', 9.5);
  doc.text(doc.splitTextToSize(invoice.description || 'Langganan Dentiva', kol.qty - M - 12)[0], M, y);
  doc.text('1', kol.qty, y, { align: 'right' });
  doc.text(rupiah(invoice.amount_idr), kol.harga, y, { align: 'right' });
  doc.text(pajak > 0 ? rupiah(pajak) : '-', kol.pajak, y, { align: 'right' });
  doc.text(rupiah(invoice.amount_idr), kol.jumlah, y, { align: 'right' });
  huruf('normal', 8.5); warna(ABU);
  doc.text(`Periode ${tanggal(invoice.period_start)} – ${tanggal(invoice.period_end)}`, M, y + 4.5);
  y += 11;

  // ── Ringkasan total ──
  const xKiri = kanan - 78;
  const ringkasan = [
    ['Subtotal', rupiah(invoice.amount_idr)],
    ...(pajak > 0 ? [['PPN', rupiah(pajak)]] : []),
    ['Total', rupiah(total)],
    ...(lunas ? [['Dibayar', `(${rupiah(total)})`]] : []),
  ];
  doc.setDrawColor(...GARIS); doc.setLineWidth(0.2);
  ringkasan.forEach(([k, v]) => {
    doc.line(xKiri, y - 4, kanan, y - 4);
    huruf('normal', 9.5); warna(HITAM);
    doc.text(k, xKiri, y); doc.text(v, kanan, y, { align: 'right' });
    y += 6.5;
  });
  doc.line(xKiri, y - 4, kanan, y - 4);
  huruf('bold', 10);
  doc.text('Jumlah tagihan', xKiri, y);
  doc.text(rupiah(lunas ? 0 : total), kanan, y, { align: 'right' });

  // ── Kaki halaman ──
  doc.setDrawColor(...GARIS); doc.line(M, H - 20, kanan, H - 20);
  huruf('normal', 8); warna(ABU);
  doc.text(`${invoice.number} · ${rupiah(total)} ${lunas ? 'lunas' : `jatuh tempo ${tanggal(invoice.due_date)}`}`, M, H - 14);
  doc.text('Halaman 1 dari 1', kanan, H - 14, { align: 'right' });
  doc.text('Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan.', M, H - 9.5);
  return doc;
}

/** Muat logo PNG sebagai data URL (diabaikan bila gagal). */
async function muatLogo(src = '/dentiva-logo.png', sisi = 160) {
  // Diperkecil ke 160 px lewat kanvas agar ukuran PDF tetap ringan (logo asli beresolusi besar).
  try {
    const img = await new Promise((ok, gagal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = gagal;
      i.src = src;
    });
    const kanvas = document.createElement('canvas');
    kanvas.width = sisi; kanvas.height = sisi;
    const k = kanvas.getContext('2d');
    const skala = Math.min(sisi / img.width, sisi / img.height);
    k.drawImage(img, (sisi - img.width * skala) / 2, (sisi - img.height * skala) / 2, img.width * skala, img.height * skala);
    return kanvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** Buat lalu unduh: Invoice-INV-2026-000123.pdf */
export async function unduhInvoiceLangganan({ invoice, billTo }) {
  const doc = buatInvoiceLangganan({ invoice, billTo, logo: await muatLogo() });
  doc.save(`Invoice-${invoice.number}.pdf`);
}
