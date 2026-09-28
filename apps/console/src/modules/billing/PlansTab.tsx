import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Input } from "@dentiva/ui";
import { formatNumber, formatRupiah, type Plan } from "@dentiva/shared";
import { DataTable, type Column } from "@/components/DataTable";
import { Field } from "@/components/Field";
import { Can } from "@/components/misc";
import { ReasonDialog } from "@/components/ReasonDialog";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";

const FEATURE_LABELS: Record<string, string> = {
  whatsapp_reminders: "Pengingat WhatsApp",
  custom_reports: "Laporan kustom",
  priority_support: "Dukungan prioritas",
};

export function PlansTab() {
  const query = useConsoleQuery("billing.plans.list", { includeInactive: true });
  const [editing, setEditing] = useState<Plan | null>(null);

  const columns: Column<Plan>[] = [
    {
      key: "name",
      header: "Paket",
      cell: (p) => (
        <div>
          <p className="font-medium">{p.name}</p>
          {!p.is_active && <p className="text-xs text-text-muted">Tidak dijual</p>}
        </div>
      ),
    },
    { key: "monthly", header: "Bulanan", align: "right", cell: (p) => formatRupiah(p.price_monthly) },
    { key: "yearly", header: "Tahunan", align: "right", cell: (p) => formatRupiah(p.price_yearly) },
    { key: "users", header: "Maks. user", align: "right", cell: (p) => formatNumber(p.max_users) },
    { key: "patients", header: "Maks. pasien", align: "right", cell: (p) => formatNumber(p.max_patients) },
    {
      key: "features",
      header: "Fitur",
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          {Object.entries(p.features)
            .filter(([, on]) => on)
            .map(([k]) => (
              <span key={k} className="rounded bg-background px-1.5 py-0.5 text-xs text-text-muted">
                {FEATURE_LABELS[k] ?? k}
              </span>
            ))}
        </div>
      ),
      className: "hidden lg:table-cell",
    },
    {
      key: "actions",
      header: <span className="sr-only">Aksi</span>,
      align: "right",
      cell: (p) => (
        <Can action="billing.plans.update">
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditing(p)}>
            <Pencil className="h-3.5 w-3.5" /> Ubah
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <>
      <p className="mb-4 text-sm text-text-muted">
        Perubahan harga berlaku untuk tagihan berikutnya. Batas user &amp; pasien berlaku segera untuk semua klinik di paket tersebut.
      </p>
      <DataTable
        caption="Katalog paket"
        columns={columns}
        rows={query.data}
        rowKey={(p) => p.id}
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
      {editing && <EditPlanDialog plan={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditPlanDialog({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [form, setForm] = useState({
    price_monthly: String(plan.price_monthly),
    price_yearly: String(plan.price_yearly),
    max_users: String(plan.max_users),
    max_patients: String(plan.max_patients),
    is_active: plan.is_active,
    features: { ...plan.features } as Record<string, boolean>,
  });
  const update = useConsoleMutation("billing.plans.update", {
    invalidate: ["billing.", "clinics.", "dashboard.", "usage."],
    successMessage: `Paket ${plan.name} diperbarui`,
    onSuccess: onClose,
  });

  const num = (s: string) => Number(s.replace(/[^\d]/g, ""));
  const patch: Record<string, unknown> = {};
  if (num(form.price_monthly) !== plan.price_monthly) patch.price_monthly = num(form.price_monthly);
  if (num(form.price_yearly) !== plan.price_yearly) patch.price_yearly = num(form.price_yearly);
  if (num(form.max_users) !== plan.max_users) patch.max_users = num(form.max_users);
  if (num(form.max_patients) !== plan.max_patients) patch.max_patients = num(form.max_patients);
  if (form.is_active !== plan.is_active) patch.is_active = form.is_active;
  if (JSON.stringify(form.features) !== JSON.stringify(plan.features)) patch.features = form.features;

  const featureKeys = Array.from(new Set([...Object.keys(FEATURE_LABELS), ...Object.keys(plan.features)]));

  return (
    <ReasonDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Ubah paket ${plan.name}`}
      description="Perubahan berdampak ke semua klinik yang memakai paket ini dan tercatat di audit log."
      confirmLabel="Simpan perubahan"
      variant="primary"
      confirmDisabled={Object.keys(patch).length === 0}
      isPending={update.isPending}
      onConfirm={(reason) => update.mutate({ planId: plan.id, patch, reason })}
    >
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["price_monthly", "Harga bulanan (Rp)"],
            ["price_yearly", "Harga tahunan (Rp)"],
            ["max_users", "Maks. user"],
            ["max_patients", "Maks. pasien"],
          ] as const
        ).map(([k, label]) => (
          <Field key={k} label={label} htmlFor={`plan-${k}`}>
            <Input id={`plan-${k}`} inputMode="numeric" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
          </Field>
        ))}
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-text-primary">Fitur</legend>
        {featureKeys.map((k) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.features[k]}
              onChange={(e) => setForm((f) => ({ ...f, features: { ...f.features, [k]: e.target.checked } }))}
              className="h-4 w-4 rounded border-border"
            />
            {FEATURE_LABELS[k] ?? k}
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-border" />
        Paket dijual (tampil di halaman harga klinik)
      </label>
    </ReasonDialog>
  );
}
