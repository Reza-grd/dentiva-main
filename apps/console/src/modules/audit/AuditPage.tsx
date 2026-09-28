import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@dentiva/ui";
import { ACTION_NAMES, DEFAULT_PAGE_SIZE, formatDateTime, type AuditEntry } from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterSelect, Mono, Toolbar } from "@/components/misc";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useUrlState } from "@/lib/hooks";
import { useConsoleQuery } from "@/lib/query";

const KEYS = ["action", "operatorId", "clinicId", "from", "to", "page"] as const;

/** Nama aksi yang ditulis ke audit (aksi tulis + turunan seperti announcements.create). */
const AUDIT_ACTIONS = [...ACTION_NAMES, "announcements.create", "announcements.update"].sort();

function Diff({ before, after }: { before: unknown; after: unknown }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {[
        ["Sebelum", before],
        ["Sesudah", after],
      ].map(([label, v]) => (
        <div key={label as string}>
          <p className="mb-1 text-xs font-medium text-text-muted">{label as string}</p>
          <pre className="max-h-72 overflow-auto rounded-lg bg-background p-3 font-mono text-xs text-text-primary">
            {v === null || v === undefined ? "—" : JSON.stringify(v, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function AuditPage() {
  const { values, set, page } = useUrlState(KEYS);
  const { can } = useAuth();
  // Daftar operator hanya boleh dibaca owner; role lain cukup tanpa filter operator.
  const { data: operators } = useConsoleQuery("operators.list", {}, { enabled: can("operators.list") });
  const query = useConsoleQuery("audit.list", {
    action: values.action,
    operatorId: values.operatorId,
    clinicId: values.clinicId,
    from: values.from,
    to: values.to,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [open, setOpen] = useState<string | null>(null);

  const columns: Column<AuditEntry>[] = [
    {
      key: "toggle",
      header: <span className="sr-only">Detail</span>,
      className: "w-8",
      cell: (a) => (
        <button
          type="button"
          onClick={() => setOpen((o) => (o === a.id ? null : a.id))}
          aria-expanded={open === a.id}
          aria-label="Lihat detail perubahan"
          className="rounded p-1 text-text-muted hover:text-text-primary"
        >
          {open === a.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ),
    },
    { key: "time", header: "Waktu", cell: (a) => <span className="whitespace-nowrap text-sm">{formatDateTime(a.created_at)}</span> },
    { key: "operator", header: "Operator", cell: (a) => a.operator_name ?? <span className="text-text-muted">—</span> },
    { key: "action", header: "Aksi", cell: (a) => <Mono>{a.action}</Mono> },
    {
      key: "target",
      header: "Target",
      cell: (a) =>
        a.clinic_id ? (
          <Link to={`/clinics/${a.clinic_id}`} className="text-sm hover:underline">
            {a.clinic_name ?? a.target_type}
          </Link>
        ) : (
          <span className="text-sm text-text-muted">{a.target_type}</span>
        ),
    },
    {
      key: "reason",
      header: "Alasan",
      cell: (a) => <span className="line-clamp-2 max-w-xs text-sm text-text-muted">{a.reason ?? "—"}</span>,
      className: "hidden lg:table-cell",
    },
  ];

  const rows = query.data?.items;

  return (
    <>
      <PageHeader title="Audit log" description="Semua aksi tulis operator Console. Log tidak dapat diubah atau dihapus (append-only)." />
      <Toolbar>
        <FilterSelect label="Aksi" value={values.action} onChange={(v) => set({ action: v })} options={AUDIT_ACTIONS.map((a) => ({ value: a, label: a }))} />
        {operators && (
          <FilterSelect
            label="Operator"
            value={values.operatorId}
            onChange={(v) => set({ operatorId: v })}
            options={operators.map((o) => ({ value: o.user_id, label: o.full_name }))}
          />
        )}
        <label className="flex items-center gap-2 text-sm text-text-muted">
          Dari
          <Input type="date" value={values.from ?? ""} onChange={(e) => set({ from: e.target.value })} className="h-9 w-40" />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          s.d.
          <Input type="date" value={values.to ?? ""} onChange={(e) => set({ to: e.target.value })} className="h-9 w-40" />
        </label>
      </Toolbar>

      <DataTable
        caption="Audit log operator"
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={{ title: "Belum ada aktivitas yang cocok" }}
        pagination={
          query.data && {
            page: query.data.page,
            pageSize: query.data.pageSize,
            total: query.data.total,
            onPageChange: (p) => set({ page: p }, false),
          }
        }
      />

      {open && rows?.find((r) => r.id === open) && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          {(() => {
            const a = rows.find((r) => r.id === open)!;
            return (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>
                    <Mono>{a.action}</Mono> · {formatDateTime(a.created_at)}
                  </span>
                  <span>target: {a.target_type} {a.target_id && <Mono>{a.target_id}</Mono>}</span>
                  {a.ip && <span>IP: {a.ip}</span>}
                </div>
                {a.reason && <p className="mb-3 text-sm">Alasan: {a.reason}</p>}
                <Diff before={a.before} after={a.after} />
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}
