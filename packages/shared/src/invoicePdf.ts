import { jsPDF } from "jspdf";

/**
 * Invoice langganan Dentiva (PDF A4), dipakai bersama aplikasi klinik & Console.
 * Tata letak tagihan resmi: judul + logo, data invoice, penjual / ditagihkan kepada / cara bayar,
 * jumlah tagihan, tabel rincian, ringkasan total, dan kaki halaman.
 * Impor lewat "@dentiva/shared/invoice-pdf" (bukan dari indeks paket) agar jsPDF tidak ikut
 * terbawa ke modul yang tidak membutuhkannya.
 */

export interface InvoicePdfData {
  number: string;
  status: string; // open | paid | overdue | void
  issued_at?: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  amount_idr: number | string;
  tax_idr?: number | string | null;
  total_idr?: number | string | null;
  description?: string | null;
}

export interface InvoiceBillTo {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface InvoicePenjual {
  nama: string;
  alamat?: string[];
  npwp?: string;
  email?: string;
}

export interface InvoicePembayaran {
  bank?: string;
  rekening?: string;
  atasNama?: string;
  /** true bila konfirmasi lewat WhatsApp tersedia (memengaruhi kalimat catatan). */
  viaWa?: boolean;
}

export interface BuatInvoiceOpsi {
  invoice: InvoicePdfData;
  billTo?: InvoiceBillTo;
  penjual: InvoicePenjual;
  pembayaran?: InvoicePembayaran;
  /** data URL PNG */
  logo?: string | null;
}

type RGB = [number, number, number];
const HITAM: RGB = [17, 24, 39];
const ABU: RGB = [107, 114, 128];
const GARIS: RGB = [229, 231, 235];

const rupiah = (n: unknown) => `Rp ${Math.round(Number(n) || 0).toLocaleString("id-ID")}`;
const tanggal = (v: string | null | undefined) => {
  if (!v) return "-";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const baris = (...xs: unknown[]) => xs.flat().map((x) => String(x ?? "").trim()).filter(Boolean);

export function buatInvoiceLangganan({ invoice, billTo = {}, penjual, pembayaran = {}, logo = null }: BuatInvoiceOpsi): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;
  const kanan = W - M;
  const lunas = invoice.status === "paid";
  const pajak = Number(invoice.tax_idr) || 0;
  const total = Number(invoice.total_idr ?? (Number(invoice.amount_idr) || 0) + pajak);
  const rekeningSiap = Boolean(pembayaran.bank && pembayaran.rekening && pembayaran.atasNama);
  const warna = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const garis = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const huruf = (gaya: "normal" | "bold", ukuran: number) => { doc.setFont("helvetica", gaya); doc.setFontSize(ukuran); };
  doc.setProperties({ title: `Invoice ${invoice.number}`, subject: "Invoice langganan Dentiva", author: penjual.nama, creator: "Dentiva" });

  // Judul & logo
  warna(HITAM); huruf("bold", 22);
  doc.text("Invoice", M, 26);
  if (logo) {
    try { doc.addImage(logo, "PNG", kanan - 14, 15, 14, 14); } catch { /* logo opsional */ }
  }

  // Data invoice
  const statusTeks = lunas ? `Lunas, ${tanggal(invoice.paid_at)}` : invoice.status === "overdue" ? "Lewat jatuh tempo" : invoice.status === "void" ? "Dibatalkan" : "Belum dibayar";
  const meta: [string, string][] = [
    ["Nomor invoice", invoice.number],
    ["Tanggal terbit", tanggal(invoice.issued_at)],
    ["Jatuh tempo", tanggal(invoice.due_date)],
    ...(penjual.npwp ? [["NPWP", penjual.npwp] as [string, string]] : []),
    ["Status", statusTeks],
  ];
  let y = 38;
  for (const [k, v] of meta) {
    huruf("bold", 9); warna(HITAM); doc.text(k, M, y);
    huruf("normal", 9); doc.text(String(v), M + 30, y);
    y += 5;
  }

  // Tiga kolom: penjual, ditagihkan kepada, cara bayar
  y += 7;
  const kolom = [M, M + 62, M + 120];
  const blok = (x: number, judul: string, isi: string[]) => {
    huruf("bold", 9); warna(HITAM); doc.text(judul, x, y);
    huruf("normal", 9);
    isi.forEach((t, i) => doc.text(String(doc.splitTextToSize(t, 56)[0] ?? ""), x, y + 5.5 + i * 4.6));
    return isi.length;
  };
  const kota = [billTo.city, billTo.province].filter(Boolean).join(", ");
  const n = Math.max(
    blok(kolom[0], penjual.nama, baris(penjual.alamat ?? [], penjual.email)),
    blok(kolom[1], "Ditagihkan kepada", baris(billTo.name, billTo.address, kota, billTo.email, billTo.phone)),
    blok(kolom[2], lunas ? "Dibayar melalui" : "Cara pembayaran", rekeningSiap
      ? baris(`Transfer ${pembayaran.bank}`, pembayaran.rekening, `a.n. ${pembayaran.atasNama}`)
      : baris("Transfer bank", "Rekening dikirim tim Dentiva", penjual.email)),
  );
  y += 8 + n * 4.6 + 8;

  // Jumlah tagihan
  huruf("bold", 15); warna(HITAM);
  doc.text(lunas ? `${rupiah(total)} lunas pada ${tanggal(invoice.paid_at)}` : `${rupiah(total)} jatuh tempo ${tanggal(invoice.due_date)}`, M, y);
  y += 7;
  huruf("normal", 9); warna(ABU);
  const catatan = lunas
    ? "Terima kasih. Pembayaran telah kami terima dan paket langganan klinik Anda aktif sesuai periode di bawah."
    : `Cantumkan nomor ${invoice.number} pada berita transfer, lalu kirim bukti transfer ke tim Dentiva${pembayaran.viaWa ? " melalui WhatsApp" : ""}.`;
  doc.text(doc.splitTextToSize(catatan, kanan - M), M, y);
  y += 12;

  // Tabel rincian
  const kol = { qty: kanan - 78, harga: kanan - 52, pajak: kanan - 26, jumlah: kanan };
  huruf("normal", 8.5); warna(HITAM);
  doc.text("Deskripsi", M, y);
  doc.text("Qty", kol.qty, y, { align: "right" });
  doc.text("Harga satuan", kol.harga, y, { align: "right" });
  doc.text("PPN", kol.pajak, y, { align: "right" });
  doc.text("Jumlah", kol.jumlah, y, { align: "right" });
  y += 2.5;
  garis(HITAM); doc.setLineWidth(0.5); doc.line(M, y, kanan, y);
  y += 6;
  huruf("normal", 9.5);
  doc.text(String(doc.splitTextToSize(invoice.description || "Langganan Dentiva", kol.qty - M - 12)[0] ?? ""), M, y);
  doc.text("1", kol.qty, y, { align: "right" });
  doc.text(rupiah(invoice.amount_idr), kol.harga, y, { align: "right" });
  doc.text(pajak > 0 ? rupiah(pajak) : "-", kol.pajak, y, { align: "right" });
  doc.text(rupiah(invoice.amount_idr), kol.jumlah, y, { align: "right" });
  if (invoice.period_start && invoice.period_end) {
    huruf("normal", 8.5); warna(ABU);
    doc.text(`Periode ${tanggal(invoice.period_start)} – ${tanggal(invoice.period_end)}`, M, y + 4.5);
  }
  y += 11;

  // Ringkasan total
  const xKiri = kanan - 78;
  const ringkasan: [string, string][] = [
    ["Subtotal", rupiah(invoice.amount_idr)],
    ...(pajak > 0 ? [["PPN", rupiah(pajak)] as [string, string]] : []),
    ["Total", rupiah(total)],
    ...(lunas ? [["Dibayar", `(${rupiah(total)})`] as [string, string]] : []),
  ];
  garis(GARIS); doc.setLineWidth(0.2);
  for (const [k, v] of ringkasan) {
    doc.line(xKiri, y - 4, kanan, y - 4);
    huruf("normal", 9.5); warna(HITAM);
    doc.text(k, xKiri, y); doc.text(v, kanan, y, { align: "right" });
    y += 6.5;
  }
  doc.line(xKiri, y - 4, kanan, y - 4);
  huruf("bold", 10);
  doc.text("Jumlah tagihan", xKiri, y);
  doc.text(rupiah(lunas ? 0 : total), kanan, y, { align: "right" });

  // Kaki halaman
  garis(GARIS); doc.line(M, H - 20, kanan, H - 20);
  huruf("normal", 8); warna(ABU);
  doc.text(`${invoice.number} · ${rupiah(total)} ${lunas ? "lunas" : `jatuh tempo ${tanggal(invoice.due_date)}`}`, M, H - 14);
  doc.text("Halaman 1 dari 1", kanan, H - 14, { align: "right" });
  doc.text("Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan.", M, H - 9.5);
  return doc;
}

/** Muat logo PNG sebagai data URL, diperkecil lewat kanvas agar PDF tetap ringan (null bila gagal). */
export async function muatLogoInvoice(src = "/dentiva-logo.png", sisi = 160): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((ok, gagal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = gagal;
      i.src = src;
    });
    const kanvas = document.createElement("canvas");
    kanvas.width = sisi; kanvas.height = sisi;
    const k = kanvas.getContext("2d");
    if (!k) return null;
    const skala = Math.min(sisi / img.width, sisi / img.height);
    k.drawImage(img, (sisi - img.width * skala) / 2, (sisi - img.height * skala) / 2, img.width * skala, img.height * skala);
    return kanvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
