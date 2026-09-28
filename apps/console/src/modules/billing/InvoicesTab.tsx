import { useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Ban, Plus } from "lucide-react";
import { Button, Input } from "@dentiva/ui";
import {
  ACTIONS,
  DEFAULT_PAGE_SIZE,
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  addDays,
  formatDate,
  formatRupiah,
  todayWib,
  type Invoice,
  type InvoiceStatus,
} from "@dentiva/shared";
import { ClinicPicker } from "@/components/ClinicPicker";
import { DataTable, type Column } from "@/components/DataTable";
import { Field } from "@/components/Field";
import { Can, FilterSelect, Mono, SearchInput, Toolbar } from "@/components/misc";
import { ReasonDialog } from "@/components/ReasonDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useUrlState } from "@/lib/hooks";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";

const KEYS = ["q", "status", "clinicId", "page"] as const;
const INVALIDATE = ["billing.", "dashboard.", "clinics.", "audit."];

/** Parse "1.500.000" / "1500000" → 1500000 */
function parseRupiah(s: string): number {
  const n = Number(s.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function InvoicesTab() {
  const { values, set, page } = useUrlState(KEYS);
  const status = INVOICE_STATUSES.includes(values.status as InvoiceStatus) ? (values.status as InvoiceStatus) : undefined;
  const query = useConsoleQuery("billing.invoices.list", {
    search: values.q,
    status,
    clinicId: values.clinicId,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const [creating, setCreating] = useState(false);
  const [voiding, setVoiding] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);

  const voidInv = useConsoleMutation("billing.invoices.void", {
    invalidate: INVALIDATE,
    successMessage: "Invoice dibatalkan",
    onSuccess: () => setVoiding(null),
  });

  const columns: Column<Invoice>[] = [
    { key: "number", header: "Nomor", cell: (i) => <Mono>{i.number}</Mono> },
    {
      key: "clinic",
      header: "Klinik",
      cell: (i) => (
        <Link to={`/clinics/${i.clinic_id}`} className="hover:underline">
          {i.clinic_name}
        </Link>
      ),
    },
    {
      key: "period",
      header: "Periode",
      cell: (i) => (
        <span className="text-sm text-text-muted">
          {formatDate(i.period_start)} – {formatDate(i.period_end)}
        </span>
      ),
      className: "hidden lg:table-cell",
    },
    { key: "total", header: "Total", align: "right", cell: (i) => formatRupiah(i.amount_idr + i.tax_idr) },
    { key: "due", header: "Jatuh tempo", cell: (i) => formatDate(i.due_date) },
    { key: "status", header: "Status", cell: (i) => <StatusBadge kind="invoice" value={i.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Aksi</span>,
      align: "right",
      cell: (i) =>
        i.status === "open" || i.status === "overdue" ? (
          <div className="flex justify-end gap-1">
            <Can action="billing.payments.confirmManual">
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => setPaying(i)}>
                <Banknote className="h-3.5 w-3.5" /> Konfirmasi bayar
              </Button>
            </Can>
            <Can action="billing.invoices.void">
              <Button size="sm" variant="ghost" className="gap-1 text-[var(--color-danger)]" onClick={() => setVoiding(i)} aria-label={`Batalkan ${i.number}`}>
                <Ban className="h-3.5 w-3.5" />
              </Button>
            </Can>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Cari nomor invoice atau klinik…" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => set({ status: v })}
          options={INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_STATUS_LABELS[s] }))}
        />
        {values.clinicId && (
          <Button variant="ghost" size="sm" onClick={() => set({ clinicId: undefined })}>
            Hapus filter klinik
          </Button>
        )}
        <div className="sm:ml-auto">
          <Can action="billing.invoices.create">
            <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Buat invoice
            </Button>
          </Can>
        </div>
      </Toolbar>

      <DataTable
        caption="Daftar invoice"
        columns={columns}
        rows={query.data?.items}
        rowKey={(i) => i.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={{ title: "Belum ada invoice" }}
        pagination={
          query.data && {
            page: query.data.page,
            pageSize: query.data.pageSize,
            total: query.data.total,
            onPageChange: (p) => set({ page: p }, false),
          }
        }
      />

      {creating && <CreateInvoiceDialog onClose={() => setCreating(false)} />}
      {paying && <ConfirmPaymentDialog invoice={paying} onClose={() => setPaying(null)} />}

      <ReasonDialog
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        title={voiding ? `Batalkan invoice ${voiding.number}?` : ""}
        description="Invoice tidak dihapus, statusnya menjadi Dibatalkan dan tetap tercatat untuk audit."
        confirmLabel="Batalkan invoice"
        isPending={voidInv.isPending}
        onConfirm={(reason) => voiding && voidInv.mutate({ invoiceId: voiding.id, reason })}
      />
    </>
  );
}

function CreateInvoiceDialog({ onClose }: { onClose: () => void }) {
  const today = todayWib();
  const [clinic, setClinic] = useState<{ id: string; name: string } | null>(null);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(addDays(today, 29));
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("0");
  const [dueDate, setDueDate] = useState(addDays(today, 7));
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const create = useConsoleMutation("billing.invoices.create", {
    invalidate: INVALIDATE,
    successMessage: (i) => `Invoice ${i.number} dibuat`,
    onSuccess: onClose,
    toastError: false,
  });

  const params = {
    clinicId: clinic?.id ?? "",
    periodStart,
    periodEnd,
    amountIdr: parseRupiah(amount),
    taxIdr: parseRupiah(tax),
    dueDate,
    notes: notes || undefined,
  };
  const check = ACTIONS["billing.invoices.create"].params.safeParse(params);
  const clientErrors = check.success ? {} : Object.fromEntries(check.error.issues.map((i) => [i.path.join("."), i.message]));
  const serverErrors = create.error?.code === "invalid_params" ? create.error.fields ?? {} : {};
  const err = (k: string) => (submitted ? clientErrors[k] : undefined) ?? serverErrors[k];

  return (
    <ReasonDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Buat invoice"
      description="Nomor invoice dibuat otomatis (INV-TAHUN-URUT). Nominal dalam Rupiah tanpa desimal."
      confirmLabel="Buat invoice"
      variant="primary"
      showReason={false}
      isPending={create.isPending}
      onConfirm={() => {
        setSubmitted(true);
        if (check.success) create.mutate(params);
      }}
    >
      <Field label="Klinik" htmlFor="inv-clinic" required error={err("clinicId") && "Pilih klinik"}>
        <ClinicPicker id="inv-clinic" value={clinic} onChange={setClinic} invalid={!!err("clinicId")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Awal periode" htmlFor="inv-ps" required error={err("periodStart")}>
          <Input id="inv-ps" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </Field>
        <Field label="Akhir periode" htmlFor="inv-pe" required error={err("periodEnd")}>
          <Input id="inv-pe" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </Field>
        <Field label="Nominal (Rp)" htmlFor="inv-amount" required error={err("amountIdr")}>
          <Input id="inv-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="599000" />
        </Field>
        <Field label="Pajak (Rp)" htmlFor="inv-tax" error={err("taxIdr")} hint="PPN 11% jika berlaku">
          <Input id="inv-tax" inputMode="numeric" value={tax} onChange={(e) => setTax(e.target.value)} />
        </Field>
        <Field label="Jatuh tempo" htmlFor="inv-due" required error={err("dueDate")}>
          <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <div className="flex items-end pb-2 text-sm text-text-muted">
          Total: <strong className="ml-1 text-text-primary">{formatRupiah(params.amountIdr + params.taxIdr)}</strong>
        </div>
      </div>
      <Field label="Catatan" htmlFor="inv-notes">
        <Input id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Langganan Pro Oktober 2026" />
      </Field>
    </ReasonDialog>
  );
}

function ConfirmPaymentDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const total = invoice.amount_idr + invoice.tax_idr;
  const [amount, setAmount] = useState(String(total));
  const [paidDate, setPaidDate] = useState(todayWib());
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const confirm = useConsoleMutation("billing.payments.confirmManual", {
    invalidate: INVALIDATE,
    successMessage: (r) => (r.invoice.status === "paid" ? `Invoice ${r.invoice.number} lunas` : "Pembayaran sebagian dicatat"),
    onSuccess: onClose,
  });

  const amountIdr = parseRupiah(amount);
  const ok = amountIdr > 0 && reference.trim().length >= 3;

  return (
    <ReasonDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Konfirmasi transfer · ${invoice.number}`}
      description={`${invoice.clinic_name} · total tagihan ${formatRupiah(total)}. Pastikan dana sudah masuk ke rekening Dentiva.`}
      confirmLabel="Konfirmasi pembayaran"
      variant="primary"
      showReason={false}
      confirmDisabled={!ok}
      isPending={confirm.isPending}
      onConfirm={() =>
        confirm.mutate({
          invoiceId: invoice.id,
          amountIdr,
          // 12:00 WIB pada tanggal transfer
          paidAt: `${paidDate}T12:00:00+07:00`,
          reference: reference.trim(),
          notes: notes || undefined,
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nominal diterima (Rp)" htmlFor="pay-amount" required hint={amountIdr < total ? "Kurang dari total: dicatat sebagai pembayaran sebagian" : undefined}>
          <Input id="pay-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Tanggal transfer" htmlFor="pay-date" required>
          <Input id="pay-date" type="date" value={paidDate} max={todayWib()} onChange={(e) => setPaidDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Nomor referensi / berita transfer" htmlFor="pay-ref" required>
        <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="BCA 280926-123456" autoFocus />
      </Field>
      <Field label="Catatan" htmlFor="pay-notes">
        <Input id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </Field>
    </ReasonDialog>
  );
}
