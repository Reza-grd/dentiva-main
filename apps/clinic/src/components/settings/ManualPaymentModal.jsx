import React, { useEffect, useRef, useState } from 'react';
import { Building2, Check, Copy, Download, FileText, Loader2, MessageCircle, Mail, ShieldCheck, X } from 'lucide-react';
import { BILLING, rekeningSiap, tautanKonfirmasi } from '../../utils/billingConfig';
import { mintaInvoice } from '../../services/invoiceLanggananService';
import { unduhInvoiceLangganan } from '../../utils/invoiceLanggananPdf';

const rupiah = (n) => `Rp ${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

function Salin({ nilai, label }) {
  const [ok, setOk] = useState(false);
  const salin = async () => {
    try { await navigator.clipboard.writeText(nilai); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* clipboard ditolak */ }
  };
  return (
    <button type="button" onClick={salin} aria-label={`Salin ${label}`}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors">
      {ok ? <Check size={13} /> : <Copy size={13} />} {ok ? 'Tersalin' : 'Salin'}
    </button>
  );
}

/**
 * Langkah bayar langganan lewat transfer manual: transfer → konfirmasi WhatsApp → diaktifkan tim Dentiva.
 * Saat dibuka, invoice resmi dibuat di server (nominal dari katalog paket) dan bisa diunduh sebagai PDF.
 * Props: plan {id, name}, siklus 'monthly'|'yearly', nominal, klinik, admin, onClose.
 */
export default function ManualPaymentModal({ plan, siklus, nominal, klinik, admin, onClose }) {
  const tombolRef = useRef(null);
  const [tagihan, setTagihan] = useState({ status: 'memuat' }); // memuat | siap | tidak
  const [mengunduh, setMengunduh] = useState(false);
  const inv = tagihan.invoice;
  const nominalTagihan = inv ? Number(inv.total_idr) : nominal;
  const konfirmasi = tautanKonfirmasi({ klinik, paket: plan?.name, siklus, nominal: nominalTagihan, admin, invoice: inv?.number });
  const siap = rekeningSiap();

  useEffect(() => {
    let aktif = true;
    if (!plan?.id) { setTagihan({ status: 'tidak' }); return undefined; }
    mintaInvoice(plan.id, siklus).then((r) => {
      if (!aktif) return;
      setTagihan(r.invoice ? { status: 'siap', invoice: r.invoice, billTo: r.billTo } : { status: 'tidak', error: r.error });
    });
    return () => { aktif = false; };
  }, [plan?.id, siklus]);

  const unduh = async () => {
    if (!inv) return;
    setMengunduh(true);
    try { await unduhInvoiceLangganan({ invoice: inv, billTo: tagihan.billTo }); } finally { setMengunduh(false); }
  };

  useEffect(() => {
    tombolRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4" role="presentation" onClick={onClose}>
      <section
        role="dialog" aria-modal="true" aria-labelledby="bayar-judul" onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button type="button" onClick={onClose} aria-label="Tutup"
          className="absolute right-4 top-4 rounded-xl p-1.5 text-text-muted hover:bg-background hover:text-text-primary transition-colors">
          <X size={18} />
        </button>

        <p className="text-xs font-semibold text-accent-primary">Pembayaran langganan</p>
        <h2 id="bayar-judul" className="mt-1 text-xl font-semibold text-text-primary">Paket {plan?.name}</h2>
        <div className="mt-3 flex items-baseline justify-between rounded-2xl bg-background px-4 py-3 border border-border">
          <span className="text-sm text-text-muted">{siklus === 'yearly' ? 'Tagihan tahunan' : 'Tagihan bulanan'}</span>
          <span className="text-2xl font-semibold tracking-tight text-text-primary">{rupiah(nominalTagihan)}</span>
        </div>

        {/* Invoice resmi */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <FileText size={17} className="flex-none text-text-muted" />
            {tagihan.status === 'memuat' ? (
              <span className="text-sm text-text-muted">Menyiapkan invoice…</span>
            ) : inv ? (
              <div className="min-w-0">
                <p className="font-mono text-sm font-semibold text-text-primary">{inv.number}</p>
                <p className="text-xs text-text-muted">Jatuh tempo {new Date(`${inv.due_date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            ) : (
              <span className="text-sm text-text-muted">Invoice resmi dikirim tim Dentiva setelah konfirmasi.</span>
            )}
          </div>
          {inv && (
            <button type="button" onClick={unduh} disabled={mengunduh}
              className="inline-flex flex-none items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-background disabled:opacity-60 transition-colors">
              {mengunduh ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Unduh PDF
            </button>
          )}
        </div>

        <ol className="mt-5 space-y-4">
          <li className="flex gap-3">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent-primary/10 text-sm font-semibold text-accent-primary">1</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">Transfer ke rekening Dentiva</p>
              {siap ? (
                <div className="mt-2 rounded-2xl border border-border p-3 text-sm">
                  <div className="flex items-center gap-2 text-text-muted"><Building2 size={15} /> {BILLING.bank}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-semibold tracking-wide text-text-primary">{BILLING.rekening}</span>
                    <Salin nilai={BILLING.rekening.replace(/\s/g, '')} label="nomor rekening" />
                  </div>
                  <div className="text-text-muted">a.n. <span className="font-medium text-text-primary">{BILLING.atasNama}</span></div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <span className="text-text-muted">Nominal</span>
                    <span className="flex items-center gap-1 font-semibold text-text-primary">{rupiah(nominalTagihan)} <Salin nilai={String(Math.round(nominalTagihan))} label="nominal" /></span>
                  </div>
                  {inv && (
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="text-text-muted">Berita transfer</span>
                      <span className="flex items-center gap-1 font-mono text-xs font-semibold text-text-primary">{inv.number} <Salin nilai={inv.number} label="nomor invoice" /></span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-text-muted">Detail rekening akan dikirim tim Dentiva setelah Anda menghubungi kami di langkah 2.</p>
              )}
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent-primary/10 text-sm font-semibold text-accent-primary">2</span>
            <div>
              <p className="text-sm font-semibold text-text-primary">Kirim konfirmasi & bukti transfer</p>
              <p className="mt-0.5 text-sm text-text-muted">Pesan berisi {inv ? 'nomor invoice, ' : ''}nama klinik, paket, dan nominal sudah kami siapkan.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent-primary/10 text-sm font-semibold text-accent-primary">3</span>
            <div>
              <p className="text-sm font-semibold text-text-primary">Paket diaktifkan tim Dentiva</p>
              <p className="mt-0.5 text-sm text-text-muted">Setelah dana terverifikasi, paket aktif dan invoice berstatus lunas di Pengaturan → Langganan.</p>
            </div>
          </li>
        </ol>

        <a
          ref={tombolRef} href={konfirmasi.href} target="_blank" rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-primary px-4 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-95 transition-opacity"
        >
          {konfirmasi.jenis === 'wa' ? <MessageCircle size={17} /> : <Mail size={17} />}
          {konfirmasi.jenis === 'wa' ? 'Konfirmasi via WhatsApp' : 'Konfirmasi via email'}
        </a>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck size={13} /> Pastikan nama penerima sesuai sebelum mentransfer.
        </p>
      </section>
    </div>
  );
}
