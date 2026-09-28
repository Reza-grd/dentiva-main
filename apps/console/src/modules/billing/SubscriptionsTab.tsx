import { useNavigate } from "react-router-dom";
import {
  DEFAULT_PAGE_SIZE,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  formatDate,
  formatRelative,
  formatRupiah,
  type SubscriptionListItem,
  type SubscriptionStatus,
} from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterSelect, SearchInput, Toolbar } from "@/components/misc";
import { StatusBadge } from "@/components/StatusBadge";
import { useUrlState } from "@/lib/hooks";
import { useConsoleQuery } from "@/lib/query";

const KEYS = ["q", "status", "page"] as const;

export function SubscriptionsTab() {
  const navigate = useNavigate();
  const { values, set, page } = useUrlState(KEYS);
  const status = SUBSCRIPTION_STATUSES.includes(values.status as SubscriptionStatus) ? (values.status as SubscriptionStatus) : undefined;
  const query = useConsoleQuery("billing.subscriptions.list", { search: values.q, status, page, pageSize: DEFAULT_PAGE_SIZE });

  const columns: Column<SubscriptionListItem>[] = [
    {
      key: "clinic",
      header: "Klinik",
      cell: (s) => (
        <div>
          <p className="font-medium">{s.clinic_name}</p>
          <StatusBadge kind="clinic" value={s.clinic_status} />
        </div>
      ),
    },
    { key: "plan", header: "Paket", cell: (s) => s.plan?.name ?? "—" },
    { key: "status", header: "Status", cell: (s) => <StatusBadge kind="subscription" value={s.status} /> },
    { key: "mrr", header: "Nilai / bulan", align: "right", cell: (s) => formatRupiah(s.price_monthly) },
    {
      key: "period",
      header: "Berakhir",
      cell: (s) => (
        <div className="text-sm">
          <p>{formatDate(s.current_period_end)}</p>
          <p className="text-xs text-text-muted">{formatRelative(s.current_period_end)}</p>
        </div>
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Cari klinik…" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => set({ status: v })}
          options={SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: SUBSCRIPTION_STATUS_LABELS[s] }))}
        />
      </Toolbar>
      <DataTable
        caption="Daftar langganan"
        columns={columns}
        rows={query.data?.items}
        rowKey={(s) => s.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowClick={(s) => navigate(`/clinics/${s.clinic_id}`)}
        empty={{ title: "Belum ada langganan" }}
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
