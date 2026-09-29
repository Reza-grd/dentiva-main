import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock, Layers, Pause, Pencil, Send, XCircle } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button, Input, Select } from "@dentiva/ui";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
  formatRupiah,
  type Clinic,
  type ClinicDetail,
} from "@dentiva/shared";
import { DataTable } from "@/components/DataTable";
import { Field, TextArea } from "@/components/Field";
import { Can, DescriptionList, Mono, Section, StatCard } from "@/components/misc";
import { PageHeader } from "@/components/PageHeader";
import { ReasonDialog } from "@/components/ReasonDialog";
import { ErrorState, LoadingBlock } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";
import { useAuth } from "@/lib/auth";

type Dialog = null | "approve" | "activate" | "suspend" | "close" | "extend" | "plan" | "edit";

const INVALIDATE = ["clinics.", "dashboard.", "users.", "billing.", "usage.", "audit."];

export function ClinicDetailPage() {
  const { clinicId = "" } = useParams();
  const { data, isLoading, error, refetch } = useConsoleQuery("clinics.get", { clinicId });
  const [dialog, setDialog] = useState<Dialog>(null);

  if (isLoading && !data) return <LoadingBlock />;
  if (error && !data) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const { clinic } = data;

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Klinik", to: "/clinics" }, { label: clinic.name }]}
        title={
          <span className="flex items-center gap-3">
            {clinic.name}
            <StatusBadge kind="clinic" value={clinic.status} />
          </span>
        }
        description={
          <>
            <Mono>{clinic.slug}</Mono> · terdaftar {formatDate(clinic.created_at)}
            {clinic.status === "trial" && clinic.trial_ends_at && <> · trial berakhir {formatRelative(clinic.trial_ends_at)}</>}
          </>
        }
        actions={<ClinicActions clinic={clinic} onOpen={setDialog} />}
      />

      {clinic.status === "suspended" && (
        <div role="status" className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-text-primary">Klinik ditangguhkan sejak {formatDateTime(clinic.suspended_at)}</p>
          <p className="mt-0.5 text-text-muted">Alasan: {clinic.suspended_reason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <UsageSection clinicId={clinic.id} detail={data} />
          <UsersSection detail={data} />
          <InvoicesSection detail={data} />
        </div>
        <div className="space-y-6">
          <Section title="Profil klinik" actions={
            <Can action="clinics.update">
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setDialog("edit")}>
                <Pencil className="h-3.5 w-3.5" /> Ubah
              </Button>
            </Can>
          }>
            <DescriptionList
              items={[
                { label: "Telepon", value: clinic.phone },
                { label: "Email", value: clinic.email },
                { label: "Kota", value: clinic.city },
                { label: "Provinsi", value: clinic.province },
                { label: "Alamat", value: clinic.address },
                { label: "Aktif sejak", value: clinic.activated_at ? formatDate(clinic.activated_at) : null },
              ]}
            />
          </Section>
          <SubscriptionSection detail={data} onChangePlan={() => setDialog("plan")} onExtend={() => setDialog("extend")} />
          <NotesSection clinicId={clinic.id} />
        </div>
      </div>

      <ClinicDialogs clinic={clinic} detail={data} dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function ClinicActions({ clinic, onOpen }: { clinic: Clinic; onOpen: (d: Dialog) => void }) {
  return (
    <>
      {clinic.status === "pending" && (
        <Can action="clinics.approve">
          <Button size="sm" className="gap-1.5" onClick={() => onOpen("approve")}>
            <CheckCircle2 className="h-4 w-4" /> Setujui pendaftaran
          </Button>
        </Can>
      )}
      {clinic.status !== "active" && clinic.status !== "closed" && (
        <Can action="clinics.activate">
          <Button size="sm" variant={clinic.status === "pending" ? "outline" : "primary"} className="gap-1.5" onClick={() => onOpen("activate")}>
            <CheckCircle2 className="h-4 w-4" /> Aktifkan
          </Button>
        </Can>
      )}
      {["trial", "active", "pending"].includes(clinic.status) && (
        <Can action="clinics.suspend">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onOpen("suspend")}>
            <Pause className="h-4 w-4" /> Tangguhkan
          </Button>
        </Can>
      )}
      {clinic.status !== "closed" && (
        <Can action="clinics.close">
          <Button size="sm" variant="ghost" className="gap-1.5 text-[var(--color-danger)]" onClick={() => onOpen("close")}>
            <XCircle className="h-4 w-4" /> Tutup
          </Button>
        </Can>
      )}
    </>
  );
}

function UsageSection({ clinicId, detail }: { clinicId: string; detail: ClinicDetail }) {
  const { data: series } = useConsoleQuery("usage.clinic", { clinicId, days: 30 });
  const u = detail.latestUsage;
  const maxPatients = detail.plan?.max_patients;
  return (
    <Section
      title="Pemakaian"
      description={u ? `Snapshot ${formatDate(u.date)} · tanpa data pasien` : "Belum ada snapshot (dikumpulkan tiap malam 00:15 WIB)"}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Pasien"
          value={formatNumber(u?.patients_total ?? 0)}
          hint={maxPatients ? `dari ${formatNumber(maxPatients)} (${Math.round(((u?.patients_total ?? 0) / maxPatients) * 100)}%)` : undefined}
          tone={maxPatients && (u?.patients_total ?? 0) / maxPatients > 0.9 ? "warning" : "default"}
        />
        <StatCard label="User aktif 30 hr" value={formatNumber(u?.active_users ?? 0)} hint={detail.plan ? `batas ${formatNumber(detail.plan.max_users)} user` : undefined} />
        <StatCard label="Penyimpanan" value={formatBytes(u?.storage_bytes ?? 0)} />
        <StatCard
          label="Error SATUSEHAT"
          value={formatNumber(u?.satusehat_errors ?? 0)}
          tone={(u?.satusehat_errors ?? 0) > 0 ? "danger" : "default"}
          hint={`WA terkirim: ${formatNumber(u?.wa_sent ?? 0)}`}
        />
      </div>
      {series && series.length > 1 && (
        <div className="mt-5 h-56" aria-label="Grafik kunjungan harian 30 hari terakhir">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8, 10)} stroke="var(--color-muted)" fontSize={11} />
              <YAxis allowDecimals={false} stroke="var(--color-muted)" fontSize={11} />
              <ChartTooltip
                contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => formatDate(String(d))}
              />
              <Line type="monotone" dataKey="visits_count" name="Kunjungan" stroke="var(--color-accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  );
}

function UsersSection({ detail }: { detail: ClinicDetail }) {
  return (
    <Section title={`Pengguna (${detail.users.length})`} actions={<Link to={`/users?clinicId=${detail.clinic.id}`} className="text-xs text-accent-primary hover:underline">Kelola</Link>}>
      <DataTable
        caption="Pengguna klinik"
        rows={detail.users}
        rowKey={(u) => u.id}
        columns={[
          {
            key: "name",
            header: "Nama",
            cell: (u) => (
              <div>
                <p className="font-medium">{u.full_name}</p>
                <p className="text-xs text-text-muted">{u.email}</p>
              </div>
            ),
          },
          { key: "role", header: "Role", cell: (u) => <StatusBadge kind="clinicRole" value={u.role} /> },
          { key: "status", header: "Status", cell: (u) => <StatusBadge kind="user" value={u.status} /> },
          {
            key: "login",
            header: "Login terakhir",
            cell: (u) => <span className="text-sm text-text-muted">{u.last_login_at ? formatRelative(u.last_login_at) : "Belum pernah"}</span>,
          },
        ]}
        empty={{ title: "Belum ada pengguna" }}
      />
    </Section>
  );
}

function InvoicesSection({ detail }: { detail: ClinicDetail }) {
  return (
    <Section
      title="Tagihan terbuka"
      actions={<Link to={`/billing?tab=invoices&clinicId=${detail.clinic.id}`} className="text-xs text-accent-primary hover:underline">Semua invoice</Link>}
    >
      {detail.openInvoices.length === 0 ? (
        <p className="text-sm text-text-muted">Tidak ada tagihan terbuka.</p>
      ) : (
        <ul className="divide-y divide-border">
          {detail.openInvoices.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <Mono>{i.number}</Mono>
                <p className="text-xs text-text-muted">jatuh tempo {formatDate(i.due_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{formatRupiah(i.amount_idr + i.tax_idr)}</span>
                <StatusBadge kind="invoice" value={i.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function SubscriptionSection({ detail, onChangePlan, onExtend }: { detail: ClinicDetail; onChangePlan: () => void; onExtend: () => void }) {
  const s = detail.subscription;
  return (
    <Section
      title="Langganan"
      actions={
        <>
          {detail.clinic.status === "trial" && (
            <Can action="clinics.extendTrial">
              <Button variant="ghost" size="sm" className="gap-1" onClick={onExtend}>
                <Clock className="h-3.5 w-3.5" /> Perpanjang trial
              </Button>
            </Can>
          )}
          {detail.clinic.status !== "closed" && (
            <Can action="clinics.changePlan">
              <Button variant="ghost" size="sm" className="gap-1" onClick={onChangePlan}>
                <Layers className="h-3.5 w-3.5" /> Ganti paket
              </Button>
            </Can>
          )}
        </>
      }
    >
      {s ? (
        <DescriptionList
          items={[
            { label: "Paket", value: s.plan?.name },
            { label: "Status", value: <StatusBadge kind="subscription" value={s.status} /> },
            { label: "Periode", value: `${formatDate(s.current_period_start)} – ${formatDate(s.current_period_end)}` },
            {
              label: "Harga / bulan",
              value: detail.plan ? formatRupiah(detail.plan.price_monthly) : null,
            },
            { label: "Batas user", value: detail.plan ? formatNumber(detail.plan.max_users) : null },
            { label: "Batas pasien", value: detail.plan ? formatNumber(detail.plan.max_patients) : null },
          ]}
        />
      ) : (
        <p className="text-sm text-text-muted">Belum ada langganan.</p>
      )}
    </Section>
  );
}

function NotesSection({ clinicId }: { clinicId: string }) {
  const { data: notes } = useConsoleQuery("clinics.notes.list", { clinicId });
  const [body, setBody] = useState("");
  const add = useConsoleMutation("clinics.notes.add", {
    invalidate: ["clinics.notes."],
    onSuccess: () => setBody(""),
  });

  return (
    <Section title="Catatan internal" description="Hanya terlihat oleh tim Dentiva.">
      <Can action="clinics.notes.add">
        <form
          className="mb-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (body.trim().length >= 2) add.mutate({ clinicId, body: body.trim() });
          }}
        >
          <TextArea
            aria-label="Catatan baru"
            placeholder="Tulis catatan (mis. hasil telepon, permintaan fitur)…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[72px]"
            maxLength={4000}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="gap-1.5" isLoading={add.isPending} disabled={body.trim().length < 2}>
              <Send className="h-3.5 w-3.5" /> Simpan catatan
            </Button>
          </div>
        </form>
      </Can>
      {notes && notes.length === 0 && <p className="text-sm text-text-muted">Belum ada catatan.</p>}
      <ul className="space-y-3">
        {notes?.map((n) => (
          <li key={n.id} className="rounded-lg border border-border px-3 py-2">
            <p className="whitespace-pre-wrap text-sm text-text-primary">{n.body}</p>
            <p className="mt-1 text-xs text-text-muted">
              {n.operator_name ?? "Operator"} · {formatDateTime(n.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ClinicDialogs({ clinic, detail, dialog, onClose }: { clinic: Clinic; detail: ClinicDetail; dialog: Dialog; onClose: () => void }) {
  const opts = { invalidate: INVALIDATE, onSuccess: onClose };
  const approve = useConsoleMutation("clinics.approve", { ...opts, successMessage: "Pendaftaran disetujui — klinik mulai trial" });
  const activate = useConsoleMutation("clinics.activate", { ...opts, successMessage: "Klinik diaktifkan" });
  const [trialDays, setTrialDays] = useState(14);
  const suspend = useConsoleMutation("clinics.suspend", { ...opts, successMessage: "Klinik ditangguhkan" });
  const close = useConsoleMutation("clinics.close", { ...opts, successMessage: "Klinik ditutup" });
  const extend = useConsoleMutation("clinics.extendTrial", { ...opts, successMessage: "Trial diperpanjang" });
  const changePlan = useConsoleMutation("clinics.changePlan", { ...opts, successMessage: "Paket diganti" });
  const [days, setDays] = useState(7);
  const [planId, setPlanId] = useState("");
  const { data: plans } = useConsoleQuery("billing.plans.list", {}, { enabled: dialog === "plan" });
  const { can } = useAuth();

  return (
    <>
      <ReasonDialog
        open={dialog === "approve"}
        onOpenChange={(o) => !o && onClose()}
        title={`Setujui pendaftaran ${clinic.name}?`}
        description="Klinik mendaftar sendiri dan menunggu verifikasi. Setelah disetujui, pemilik bisa langsung masuk dan masa uji coba dimulai hari ini. Pastikan data klinik wajar (nama, kota, kontak) — hubungi pemilik bila ragu."
        confirmLabel={`Setujui · trial ${trialDays} hari`}
        variant="primary"
        requireReason={false}
        isPending={approve.isPending}
        onConfirm={(reason) => approve.mutate({ clinicId: clinic.id, trialDays, reason: reason || undefined })}
      >
        <Field label="Lama trial (hari)" htmlFor="approve-days" required>
          <Input id="approve-days" type="number" min={1} max={90} value={trialDays} onChange={(e) => setTrialDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))} />
        </Field>
      </ReasonDialog>

      <ReasonDialog
        open={dialog === "activate"}
        onOpenChange={(o) => !o && onClose()}
        title={`Aktifkan ${clinic.name}?`}
        description={
          clinic.status === "trial"
            ? "Klinik trial akan menjadi aktif dan langganan berjalan 1 bulan. Pastikan pembayaran sudah diterima atau invoice sudah dibuat."
            : "Seluruh staf klinik langsung mendapatkan kembali akses ke datanya."
        }
        confirmLabel="Aktifkan"
        variant="primary"
        requireReason={false}
        isPending={activate.isPending}
        onConfirm={(reason) => activate.mutate({ clinicId: clinic.id, reason: reason || undefined })}
      />

      <ReasonDialog
        open={dialog === "suspend"}
        onOpenChange={(o) => !o && onClose()}
        title={`Tangguhkan ${clinic.name}?`}
        description="Semua staf klinik langsung kehilangan akses ke data (pasien, rekam medis, keuangan). Data tidak dihapus dan akses pulih saat klinik diaktifkan kembali."
        confirmLabel="Tangguhkan"
        isPending={suspend.isPending}
        onConfirm={(reason) => suspend.mutate({ clinicId: clinic.id, reason })}
      />

      <ReasonDialog
        open={dialog === "close"}
        onOpenChange={(o) => !o && onClose()}
        title={`Tutup ${clinic.name} secara permanen?`}
        description="Klinik ditutup dan langganan dibatalkan. Data tetap disimpan sesuai kewajiban retensi rekam medis (Permenkes 24/2022), tetapi tidak bisa diakses lagi. Tindakan ini tidak bisa dibatalkan dari Console."
        confirmLabel="Tutup klinik"
        confirmText={clinic.slug}
        isPending={close.isPending}
        onConfirm={(reason, typed) => close.mutate({ clinicId: clinic.id, reason, confirmSlug: typed })}
      />

      <ReasonDialog
        open={dialog === "extend"}
        onOpenChange={(o) => !o && onClose()}
        title="Perpanjang trial"
        description={clinic.trial_ends_at ? `Trial saat ini berakhir ${formatDateTime(clinic.trial_ends_at)}.` : undefined}
        confirmLabel={`Perpanjang ${days} hari`}
        variant="primary"
        isPending={extend.isPending}
        onConfirm={(reason) => extend.mutate({ clinicId: clinic.id, days, reason })}
      >
        <Field label="Tambah hari" htmlFor="extend-days" required>
          <Input id="extend-days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))} />
        </Field>
      </ReasonDialog>

      {can("clinics.changePlan") && (
        <ReasonDialog
          open={dialog === "plan"}
          onOpenChange={(o) => !o && onClose()}
          title="Ganti paket langganan"
          description={`Paket saat ini: ${detail.subscription?.plan?.name ?? "—"}. Perubahan berlaku segera; tagihan periode berikutnya mengikuti paket baru.`}
          confirmLabel="Ganti paket"
          variant="primary"
          confirmDisabled={!planId}
          isPending={changePlan.isPending}
          onConfirm={(reason) => planId && changePlan.mutate({ clinicId: clinic.id, planId, reason })}
        >
          <Select label="Paket baru" value={planId} onChange={(e) => setPlanId(e.target.value)} required>
            <option value="">Pilih paket…</option>
            {plans
              ?.filter((p) => p.id !== detail.subscription?.plan?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatRupiah(p.price_monthly)}/bulan · {formatNumber(p.max_users)} user · {formatNumber(p.max_patients)} pasien
                </option>
              ))}
          </Select>
        </ReasonDialog>
      )}

      {dialog === "edit" && <EditClinicDialog clinic={clinic} onClose={onClose} />}
    </>
  );
}

function EditClinicDialog({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  const [form, setForm] = useState({
    name: clinic.name,
    phone: clinic.phone ?? "",
    email: clinic.email ?? "",
    address: clinic.address ?? "",
    city: clinic.city ?? "",
    province: clinic.province ?? "",
  });
  const update = useConsoleMutation("clinics.update", {
    invalidate: INVALIDATE,
    successMessage: "Profil klinik disimpan",
    onSuccess: onClose,
    toastError: false,
  });
  const fields = update.error?.code === "invalid_params" ? update.error.fields ?? {} : {};

  const patch = Object.fromEntries(
    Object.entries(form).filter(([k, v]) => v !== ((clinic as unknown as Record<string, string | null>)[k] ?? "")),
  );

  return (
    <ReasonDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Ubah profil klinik"
      confirmLabel="Simpan"
      variant="primary"
      showReason={false}
      confirmDisabled={Object.keys(patch).length === 0}
      isPending={update.isPending}
      onConfirm={() => update.mutate({ clinicId: clinic.id, patch })}
    >
      {(
        [
          ["name", "Nama klinik"],
          ["phone", "Telepon"],
          ["email", "Email"],
          ["address", "Alamat"],
          ["city", "Kota"],
          ["province", "Provinsi"],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label} htmlFor={`edit-${key}`} error={fields[`patch.${key}`]}>
          <Input id={`edit-${key}`} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
        </Field>
      ))}
    </ReasonDialog>
  );
}
