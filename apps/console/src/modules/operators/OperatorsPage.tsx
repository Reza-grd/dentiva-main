import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button, Input, Select } from "@dentiva/ui";
import { ACTIONS, OPERATOR_ROLES, OPERATOR_ROLE_LABELS, formatRelative, type Operator, type OperatorRole } from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { ReasonDialog } from "@/components/ReasonDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";

const ROLE_HELP: Record<OperatorRole, string> = {
  owner: "Akses penuh, termasuk harga paket dan kelola operator.",
  support: "Daftarkan & kelola klinik dan user klinik. Tidak bisa mengubah harga.",
  finance: "Invoice & konfirmasi pembayaran. Tidak bisa mengubah status klinik.",
};

export function OperatorsPage() {
  const { operator: me } = useAuth();
  const query = useConsoleQuery("operators.list", {});
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Operator | null>(null);

  const columns: Column<Operator>[] = [
    {
      key: "name",
      header: "Nama",
      cell: (o) => (
        <div>
          <p className="font-medium">
            {o.full_name} {o.user_id === me?.user_id && <span className="text-xs text-text-muted">(Anda)</span>}
          </p>
          <p className="text-xs text-text-muted">{o.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (o) => <StatusBadge kind="operatorRole" value={o.role} /> },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusBadge kind="user" value={o.is_active ? "active" : "deactivated"} />,
    },
    {
      key: "last",
      header: "Akses terakhir",
      cell: (o) => <span className="text-sm text-text-muted">{o.last_login_at ? formatRelative(o.last_login_at) : "Belum pernah"}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Aksi</span>,
      align: "right",
      cell: (o) => (
        <Button size="sm" variant="ghost" onClick={() => setEditing(o)}>
          Ubah
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Operator Console"
        description="Akun tim Dentiva. Setiap operator wajib MFA dan tidak boleh memakai email akun klinik."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setInviting(true)}>
            <UserPlus className="h-4 w-4" /> Undang operator
          </Button>
        }
      />
      <DataTable
        caption="Daftar operator"
        columns={columns}
        rows={query.data}
        rowKey={(o) => o.user_id}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
      {editing && <EditDialog operator={editing} isSelf={editing.user_id === me?.user_id} onClose={() => setEditing(null)} />}
    </>
  );
}

function RoleSelect({ value, onChange, id }: { value: OperatorRole; onChange: (r: OperatorRole) => void; id: string }) {
  return (
    <>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as OperatorRole)}>
        {OPERATOR_ROLES.map((r) => (
          <option key={r} value={r}>
            {OPERATOR_ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <p className="text-xs text-text-muted">{ROLE_HELP[value]}</p>
    </>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<OperatorRole>("support");
  const invite = useConsoleMutation("operators.invite", {
    invalidate: ["operators.", "audit."],
    successMessage: (o) => `Undangan dikirim ke ${o.email}`,
    onSuccess: onClose,
  });
  const ok = ACTIONS["operators.invite"].params.safeParse({ email, fullName, role }).success;

  return (
    <ReasonDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Undang operator"
      description="Operator menerima email untuk membuat password, lalu wajib mengaktifkan verifikasi dua langkah."
      confirmLabel="Kirim undangan"
      variant="primary"
      showReason={false}
      confirmDisabled={!ok}
      isPending={invite.isPending}
      onConfirm={() => invite.mutate({ email: email.trim(), fullName: fullName.trim(), role })}
    >
      <Field label="Nama lengkap" htmlFor="op-name" required>
        <Input id="op-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
      </Field>
      <Field label="Email kerja" htmlFor="op-email" required hint="Gunakan email @dentiva.co.id, bukan email akun klinik.">
        <Input id="op-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Role" htmlFor="op-role" required>
        <RoleSelect id="op-role" value={role} onChange={setRole} />
      </Field>
    </ReasonDialog>
  );
}

function EditDialog({ operator, isSelf, onClose }: { operator: Operator; isSelf: boolean; onClose: () => void }) {
  const [role, setRole] = useState<OperatorRole>(operator.role);
  const [isActive, setIsActive] = useState(operator.is_active);
  const update = useConsoleMutation("operators.update", {
    invalidate: ["operators.", "audit."],
    successMessage: "Operator diperbarui",
    onSuccess: onClose,
  });
  const changed = role !== operator.role || isActive !== operator.is_active;

  return (
    <ReasonDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Ubah ${operator.full_name}`}
      description={
        isSelf
          ? "Anda mengubah akun sendiri. Sistem menolak jika ini menghapus owner aktif terakhir."
          : "Menonaktifkan operator langsung mencabut semua sesinya."
      }
      confirmLabel="Simpan"
      variant={isActive ? "primary" : "danger"}
      confirmDisabled={!changed}
      isPending={update.isPending}
      onConfirm={(reason) =>
        update.mutate({
          operatorId: operator.user_id,
          role: role !== operator.role ? role : undefined,
          isActive: isActive !== operator.is_active ? isActive : undefined,
          reason,
        })
      }
    >
      <Field label="Role" htmlFor="op-edit-role">
        <RoleSelect id="op-edit-role" value={role} onChange={setRole} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-border" />
        Operator aktif
      </label>
    </ReasonDialog>
  );
}
