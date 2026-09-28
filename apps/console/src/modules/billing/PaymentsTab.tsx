import { Link } from "react-router-dom";
import {
  DEFAULT_PAGE_SIZE,
  PAYMENT_PROVIDERS,
  formatDateTime,
  formatRupiah,
  type Payment,
  type PaymentProvider,
} from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterSelect, Mono, Toolbar } from "@/components/misc";
import { StatusBadge } from "@/components/StatusBadge";
import { useUrlState } from "@/lib/hooks";
import { useConsoleQuery } from "@/lib/query";

const KEYS = ["provider", "clinicId", "page"] as const;
const PROVIDER_LABELS: Record<PaymentProvider, string> = { midtrans: "Midtrans", manual: "Transfer manual" };

export function PaymentsTab() {
  const { values, set, page } = useUrlState(KEYS);
  const provider = PAYMENT_PROVIDERS.includes(values.provider as PaymentProvider) ? (values.provider as PaymentProvider) : undefined;
  const query = useConsoleQuery("billing.payments.list", { provider, clinicId: values.clinicId, page, pageSize: DEFAULT_PAGE_SIZE });

  const columns: Column<Payment>[] = [
    { key: "date", header: "Waktu", cell: (p) => <span className="text-sm">{formatDateTime(p.paid_at ?? p.created_at)}</span> },
    {
      key: "clinic",
      header: "Klinik",
      cell: (p) => (
        <Link to={`/clinics/${p.clinic_id}`} className="hover:underline">
          {p.clinic_name}
        </Link>
      ),
    },
    { key: "invoice", header: "Invoice", cell: (p) => (p.invoice_number ? <Mono>{p.invoice_number}</Mono> : "—") },
    {
      key: "provider",
      header: "Metode",
      cell: (p) => (
        <div className="text-sm">
          <p>{PROVIDER_LABELS[p.provider]}</p>
          {p.provider_ref && <Mono className="text-text-muted">{p.provider_ref}</Mono>}
        </div>
      ),
    },
    { key: "amount", header: "Nominal", align: "right", cell: (p) => formatRupiah(p.amount_idr) },
    { key: "status", header: "Status", cell: (p) => <StatusBadge kind="payment" value={p.status} /> },
  ];

  return (
    <>
      <Toolbar>
        <FilterSelect
          label="Metode"
          value={provider}
          onChange={(v) => set({ provider: v })}
          options={PAYMENT_PROVIDERS.map((p) => ({ value: p, label: PROVIDER_LABELS[p] }))}
        />
      </Toolbar>
      <DataTable
        caption="Daftar pembayaran"
        columns={columns}
        rows={query.data?.items}
        rowKey={(p) => p.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={{ title: "Belum ada pembayaran" }}
        pagination={
          query.data && {
            page: query.data.page,
            pageSize: query.data.pageSize,
            total: query.data.total,
            onPageChange: (p) => set({ page: p }, false),
          }
        }
      />
    </>
  );
}
