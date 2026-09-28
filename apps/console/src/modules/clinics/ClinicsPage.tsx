import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  CLINIC_STATUSES,
  CLINIC_STATUS_LABELS,
  DEFAULT_PAGE_SIZE,
  formatDate,
  formatNumber,
  formatRelative,
  type ClinicListItem,
  type ClinicStatus,
} from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { Can, FilterSelect, LinkButton, Mono, SearchInput, Toolbar } from "@/components/misc";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useUrlState } from "@/lib/hooks";
import { useConsoleQuery } from "@/lib/query";

const KEYS = ["q", "status", "page"] as const;

export function ClinicsPage() {
  const navigate = useNavigate();
  const { values, set, page } = useUrlState(KEYS);
  const status = CLINIC_STATUSES.includes(values.status as ClinicStatus) ? (values.status as ClinicStatus) : undefined;

  const query = useConsoleQuery("clinics.list", {
    search: values.q,
    status,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const columns: Column<ClinicListItem>[] = [
    {
      key: "name",
      header: "Klinik",
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">{c.name}</p>
          <Mono className="text-text-muted">{c.slug}</Mono>
        </div>
      ),
    },
    { key: "status", header: "Status", cell: (c) => <StatusBadge kind="clinic" value={c.status} /> },
    {
      key: "plan",
      header: "Paket",
      cell: (c) => (
        <div className="text-sm">
          <p>{c.plan_name ?? "—"}</p>
          {c.subscription_status && <p className="text-xs text-text-muted">{c.subscription_status}</p>}
        </div>
      ),
    },
    { key: "city", header: "Kota", cell: (c) => c.city ?? "—", className: "hidden md:table-cell" },
    { key: "users", header: "User", cell: (c) => formatNumber(c.users_count), align: "right" },
    { key: "patients", header: "Pasien", cell: (c) => formatNumber(c.patients_total), align: "right" },
    {
      key: "activity",
      header: "Aktivitas terakhir",
      cell: (c) => <span className="text-sm text-text-muted">{c.last_activity_at ? formatRelative(c.last_activity_at) : "Belum ada"}</span>,
      className: "hidden lg:table-cell",
    },
    {
      key: "created",
      header: "Terdaftar",
      cell: (c) => <span className="text-sm text-text-muted">{formatDate(c.created_at)}</span>,
      className: "hidden xl:table-cell",
    },
  ];

  return (
    <>
      <PageHeader
        title="Klinik"
        description="Semua klinik yang terdaftar di Dentiva."
        actions={
          <Can action="clinics.create">
            <LinkButton to="/clinics/new">
              <Plus className="h-4 w-4" aria-hidden /> Daftarkan klinik
            </LinkButton>
          </Can>
        }
      />

      <Toolbar>
        <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Cari nama, slug, kota, email…" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(s) => set({ status: s })}
          options={CLINIC_STATUSES.map((s) => ({ value: s, label: CLINIC_STATUS_LABELS[s] }))}
        />
      </Toolbar>

      <DataTable
        caption="Daftar klinik"
        columns={columns}
        rows={query.data?.items}
        rowKey={(c) => c.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        onRowClick={(c) => navigate(`/clinics/${c.id}`)}
        empty={{
          title: values.q || status ? "Tidak ada klinik yang cocok" : "Belum ada klinik",
          description: values.q || status ? "Ubah kata kunci atau filter." : "Daftarkan klinik pertama untuk memulai.",
        }}
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
