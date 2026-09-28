import { useNavigate } from "react-router-dom";
import { cn } from "@dentiva/ui";
import { DEFAULT_PAGE_SIZE, formatBytes, formatDate, formatNumber, type UsageOverviewItem } from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { SearchInput, Toolbar } from "@/components/misc";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useUrlState } from "@/lib/hooks";
import { useConsoleQuery } from "@/lib/query";

const KEYS = ["q", "page"] as const;

function Quota({ used, max }: { used: number; max: number | null }) {
  if (!max) return <span className="tabular-nums">{formatNumber(used)}</span>;
  const pct = Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="min-w-[140px]">
      <div className="flex justify-between text-xs tabular-nums">
        <span>{formatNumber(used)}</span>
        <span className="text-text-muted">/ {formatNumber(max)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% dari batas`}>
        <div
          className={cn("h-full rounded-full", pct >= 90 ? "bg-[var(--color-danger)]" : pct >= 75 ? "bg-[var(--color-warning)]" : "bg-accent-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsagePage() {
  const navigate = useNavigate();
  const { values, set, page } = useUrlState(KEYS);
  const query = useConsoleQuery("usage.overview", { search: values.q, page, pageSize: DEFAULT_PAGE_SIZE });

  const columns: Column<UsageOverviewItem>[] = [
    {
      key: "clinic",
      header: "Klinik",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.clinic_name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
            <StatusBadge kind="clinic" value={r.clinic_status} />
            {r.plan_name}
          </div>
        </div>
      ),
    },
    { key: "patients", header: "Pasien vs batas", cell: (r) => <Quota used={r.latest?.patients_total ?? 0} max={r.max_patients} /> },
    { key: "users", header: "User aktif 30 hr", cell: (r) => <Quota used={r.latest?.active_users ?? 0} max={r.max_users} /> },
    { key: "visits", header: "Kunjungan (hari)", align: "right", cell: (r) => formatNumber(r.latest?.visits_count ?? 0) },
    { key: "storage", header: "Penyimpanan", align: "right", cell: (r) => formatBytes(r.latest?.storage_bytes ?? 0) },
    { key: "wa", header: "WA terkirim", align: "right", cell: (r) => formatNumber(r.latest?.wa_sent ?? 0), className: "hidden lg:table-cell" },
    {
      key: "ss",
      header: "Error SATUSEHAT",
      align: "right",
      cell: (r) => (
        <span className={cn((r.latest?.satusehat_errors ?? 0) > 0 && "font-semibold text-[var(--color-danger)]")}>
          {formatNumber(r.latest?.satusehat_errors ?? 0)}
        </span>
      ),
    },
  ];

  const snapshotDate = query.data?.items.find((i) => i.latest)?.latest?.date;

  return (
    <>
      <PageHeader
        title="Pemakaian"
        description={`Angka agregat per klinik, diurutkan dari yang paling dekat batas paket.${snapshotDate ? ` Snapshot ${formatDate(snapshotDate)}.` : ""} Tidak ada data pasien yang ditampilkan.`}
      />
      <Toolbar>
        <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Cari klinik…" />
      </Toolbar>
      <DataTable
        caption="Pemakaian klinik"
        columns={columns}
        rows={query.data?.items}
        rowKey={(r) => r.clinic_id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowClick={(r) => navigate(`/clinics/${r.clinic_id}`)}
        empty={{ title: "Belum ada data pemakaian", description: "Data dikumpulkan tiap malam pukul 00:15 WIB." }}
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
