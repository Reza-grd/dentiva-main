import React, { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { daftarInvoice } from '../../services/invoiceLanggananService';
import { unduhInvoiceLangganan } from '../../utils/invoiceLanggananPdf';

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;
const tanggal = (v) => {
  if (!v) return '-';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
const STATUS = {
  paid: { label: 'Lunas', kelas: 'text-emerald-700 dark:text-emerald-400' },
  open: { label: 'Belum dibayar', kelas: 'text-amber-700 dark:text-amber-400' },
  overdue: { label: 'Lewat jatuh tempo', kelas: 'text-red-700 dark:text-red-400' },
};

/** Riwayat invoice langganan klinik (manajer klinik saja) dengan unduhan PDF per invoice. */
export default function RiwayatInvoice() {
  const [data, setData] = useState({ status: 'memuat', invoices: [] });
  const [unduhNo, setUnduhNo] = useState(null);

  useEffect(() => {
    let aktif = true;
    daftarInvoice().then((r) => aktif && setData({ status: r.error ? 'galat' : r.tersedia ? 'siap' : 'tidak', ...r }));
    return () => { aktif = false; };
  }, []);

  if (data.status === 'tidak') return null; // fitur belum aktif di server

  const unduh = async (inv) => {
    setUnduhNo(inv.number);
    try { await unduhInvoiceLangganan({ invoice: inv, billTo: data.billTo }); } finally { setUnduhNo(null); }
  };

  return (
    <section className="rounded-xl border border-border bg-card" aria-labelledby="riwayat-invoice">
      <div className="px-5 py-4 border-b border-border">
        <h3 id="riwayat-invoice" className="text-base font-semibold text-text-primary">Riwayat invoice</h3>
        <p className="text-sm text-text-muted mt-0.5">Invoice langganan Dentiva untuk klinik Anda. Unduh untuk arsip atau keperluan pembukuan.</p>
      </div>
      {data.status === 'memuat' ? (
        <p className="px-5 py-6 text-sm text-text-muted">Memuat invoice…</p>
      ) : data.status === 'galat' ? (
        <p className="px-5 py-6 text-sm text-text-muted">Invoice tidak dapat dimuat. {data.error}</p>
      ) : data.invoices.length === 0 ? (
        <p className="px-5 py-6 text-sm text-text-muted">Belum ada invoice. Invoice dibuat otomatis saat Anda memilih paket di halaman Paket.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th scope="col" className="px-5 py-2.5 text-left font-medium">Nomor</th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">Tanggal</th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium hidden md:table-cell">Keterangan</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Total</th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">Status</th>
                <th scope="col" className="px-5 py-2.5"><span className="sr-only">Unduh</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.invoices.map((inv) => {
                const st = STATUS[inv.status] || { label: inv.status, kelas: 'text-text-muted' };
                return (
                  <tr key={inv.id} className="text-text-primary">
                    <td className="px-5 py-2.5 font-mono text-xs whitespace-nowrap">{inv.number}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{tanggal(inv.issued_at)}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-text-muted">{inv.description}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{rupiah(inv.total_idr)}</td>
                    <td className={`px-3 py-2.5 whitespace-nowrap ${st.kelas}`}>{st.label}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button type="button" onClick={() => unduh(inv)} disabled={unduhNo === inv.number} aria-label={`Unduh invoice ${inv.number}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-background disabled:opacity-60">
                        {unduhNo === inv.number ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
