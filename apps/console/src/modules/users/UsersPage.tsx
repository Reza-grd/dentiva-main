import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, MailPlus, MoreHorizontal, Pause, Play, UserX } from "lucide-react";
import { Button } from "@dentiva/ui";
import {
  CLINIC_USER_ROLES,
  CLINIC_USER_ROLE_LABELS,
  DEFAULT_PAGE_SIZE,
  USER_STATUSES,
  USER_STATUS_LABELS,
  formatRelative,
  type ClinicUser,
  type ClinicUserRole,
  type UserStatus,
} from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterSelect, SearchInput, Toolbar } from "@/components/misc";
import { PageHeader } from "@/components/PageHeader";
import { ReasonDialog } from "@/components/ReasonDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { useUrlState } from "@/lib/hooks";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";

const KEYS = ["q", "status", "role", "clinicId", "page"] as const;

type Pending =
  | { kind: "status"; user: ClinicUser; status: "active" | "suspended" | "deactivated" }
  | { kind: "reset"; user: ClinicUser }
  | null;

export function UsersPage() {
  const { can } = useAuth();
  const { values, set, page } = useUrlState(KEYS);
  const status = USER_STATUSES.includes(values.status as UserStatus) ? (values.status as UserStatus) : undefined;
  const role = CLINIC_USER_ROLES.includes(values.role as ClinicUserRole) ? (values.role as ClinicUserRole) : undefined;

  const query = useConsoleQuery("users.list", {
    search: values.q,
    status,
    role,
    clinicId: values.clinicId,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const [pending, setPending] = useState<Pending>(null);
  const close = () => setPending(null);
  const setStatus = useConsoleMutation("users.setStatus", {
    invalidate: ["users.", "clinics.", "audit."],
    successMessage: (u) => `${u.full_name}: status menjadi ${USER_STATUS_LABELS[u.status]}`,
    onSuccess: close,
  });
  const reset = useConsoleMutation("users.sendPasswordReset", {
    invalidate: ["audit."],
    successMessage: "Email reset password dikirim",
    onSuccess: close,
  });
  const resend = useConsoleMutation("users.resendInvite", {
    invalidate: ["audit."],
    successMessage: "Undangan dikirim ulang",
  });

  const columns: Column<ClinicUser>[] = [
    {
      key: "name",
      header: "Nama",
      cell: (u) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{u.full_name}</p>
          <p className="truncate text-xs text-text-muted">{u.email}</p>
        </div>
      ),
    },
    {
      key: "clinic",
      header: "Klinik",
      cell: (u) =>
        u.clinic_name ? (
          <Link to={`/clinics/${u.clinic_id}`} className="text-sm hover:underline">
            {u.clinic_name}
          </Link>
        ) : (
          "—"
        ),
    },
    { key: "role", header: "Role", cell: (u) => <StatusBadge kind="clinicRole" value={u.role} /> },
    { key: "status", header: "Status", cell: (u) => <StatusBadge kind="user" value={u.status} /> },
    {
      key: "login",
      header: "Login terakhir",
      cell: (u) => <span className="text-sm text-text-muted">{u.last_login_at ? formatRelative(u.last_login_at) : "Belum pernah"}</span>,
      className: "hidden md:table-cell",
    },
    {
      key: "actions",
      header: <span className="sr-only">Aksi</span>,
      align: "right",
      cell: (u) => <UserActions user={u} onPick={setPending} onResend={() => resend.mutate({ userId: u.id })} can={can} />,
    },
  ];

  const statusTitle =
    pending?.kind === "status"
      ? { active: "Aktifkan", suspended: "Tangguhkan", deactivated: "Nonaktifkan" }[pending.status] + ` ${pending.user.full_name}?`
      : "";

  return (
    <>
      <PageHeader title="Pengguna" description="Semua user klinik lintas klinik. Console tidak menampilkan data pasien." />

      <Toolbar>
        <SearchInput value={values.q} onChange={(q) => set({ q })} placeholder="Cari nama, email, klinik…" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => set({ status: v })}
          options={USER_STATUSES.map((s) => ({ value: s, label: USER_STATUS_LABELS[s] }))}
        />
        <FilterSelect
          label="Role"
          value={role}
          onChange={(v) => set({ role: v })}
          options={CLINIC_USER_ROLES.map((r) => ({ value: r, label: CLINIC_USER_ROLE_LABELS[r] }))}
        />
        {values.clinicId && (
          <Button variant="ghost" size="sm" onClick={() => set({ clinicId: undefined })}>
            Hapus filter klinik
          </Button>
        )}
      </Toolbar>

      <DataTable
        caption="Daftar pengguna klinik"
        columns={columns}
        rows={query.data?.items}
        rowKey={(u) => u.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        empty={{ title: "Tidak ada pengguna yang cocok" }}
        pagination={
          query.data && {
            page: query.data.page,
            pageSize: query.data.pageSize,
            total: query.data.total,
            onPageChange: (p) => set({ page: p }, false),
          }
        }
      />

      <ReasonDialog
        open={pending?.kind === "status"}
        onOpenChange={(o) => !o && close()}
        title={statusTitle}
        description={
          pending?.kind === "status" && pending.status !== "active"
            ? "User langsung keluar dari semua perangkat dan tidak bisa mengakses data klinik."
            : "User bisa login dan mengakses data kliniknya kembali."
        }
        confirmLabel={pending?.kind === "status" && pending.status === "active" ? "Aktifkan" : "Konfirmasi"}
        variant={pending?.kind === "status" && pending.status === "active" ? "primary" : "danger"}
        isPending={setStatus.isPending}
        onConfirm={(reason) => {
          if (pending?.kind === "status") setStatus.mutate({ userId: pending.user.id, status: pending.status, reason });
        }}
      />

      <ReasonDialog
        open={pending?.kind === "reset"}
        onOpenChange={(o) => !o && close()}
        title={pending?.kind === "reset" ? `Kirim reset password ke ${pending.user.email}?` : ""}
        description="User menerima email berisi tautan untuk membuat password baru. Password lama tetap berlaku sampai diganti."
        confirmLabel="Kirim email"
        variant="primary"
        isPending={reset.isPending}
        onConfirm={(reason) => {
          if (pending?.kind === "reset") reset.mutate({ userId: pending.user.id, reason });
        }}
      />
    </>
  );
}

function UserActions({
  user,
  onPick,
  onResend,
  can,
}: {
  user: ClinicUser;
  onPick: (p: Pending) => void;
  onResend: () => void;
  can: ReturnType<typeof useAuth>["can"];
}) {
  const [open, setOpen] = useState(false);
  const items: Array<{ label: string; icon: typeof Play; onClick: () => void; danger?: boolean }> = [];

  if (can("users.setStatus")) {
    if (user.status !== "active" && user.status !== "invited") {
      items.push({ label: "Aktifkan", icon: Play, onClick: () => onPick({ kind: "status", user, status: "active" }) });
    }
    if (user.status === "active" || user.status === "invited") {
      items.push({ label: "Tangguhkan", icon: Pause, onClick: () => onPick({ kind: "status", user, status: "suspended" }), danger: true });
    }
    if (user.status !== "deactivated") {
      items.push({ label: "Nonaktifkan", icon: UserX, onClick: () => onPick({ kind: "status", user, status: "deactivated" }), danger: true });
    }
  }
  if (can("users.resendInvite") && user.status === "invited") {
    items.push({ label: "Kirim ulang undangan", icon: MailPlus, onClick: onResend });
  }
  if (can("users.sendPasswordReset") && (user.status === "active" || user.status === "invited")) {
    items.push({ label: "Kirim reset password", icon: KeyRound, onClick: () => onPick({ kind: "reset", user }) });
  }

  if (items.length === 0) return null;

  return (
    <div className="relative inline-block text-left" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Aksi untuk ${user.full_name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <ul role="menu" className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-border bg-card py-1 text-left shadow-lg">
            {items.map((it) => (
              <li key={it.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-background ${it.danger ? "text-[var(--color-danger)]" : "text-text-primary"}`}
                >
                  <it.icon className="h-4 w-4" aria-hidden />
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
