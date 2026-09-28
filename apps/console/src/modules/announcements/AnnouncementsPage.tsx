import { useState } from "react";
import { Megaphone, Pencil, Plus, Square } from "lucide-react";
import { Button, Input, Select } from "@dentiva/ui";
import {
  ACTIONS,
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_AUDIENCE_LABELS,
  ANNOUNCEMENT_SEVERITIES,
  ANNOUNCEMENT_SEVERITY_LABELS,
  formatDateTime,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementSeverity,
} from "@dentiva/shared";
import { Field, TextArea } from "@/components/Field";
import { Can } from "@/components/misc";
import { PageHeader } from "@/components/PageHeader";
import { ReasonDialog } from "@/components/ReasonDialog";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { useConsoleMutation, useConsoleQuery } from "@/lib/query";

/** ISO → nilai <input type="datetime-local"> dalam WIB. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return d.toISOString().slice(0, 16);
}
/** Nilai datetime-local (dianggap WIB) → ISO dengan offset +07:00. */
function fromLocalInput(v: string): string | null {
  return v ? `${v}:00+07:00` : null;
}

function isActive(a: Announcement) {
  const now = Date.now();
  return new Date(a.starts_at).getTime() <= now && (!a.ends_at || new Date(a.ends_at).getTime() > now);
}

export function AnnouncementsPage() {
  const [showExpired, setShowExpired] = useState(false);
  const query = useConsoleQuery("announcements.list", { includeExpired: showExpired });
  const [editing, setEditing] = useState<Announcement | "new" | null>(null);
  const end = useConsoleMutation("announcements.end", { invalidate: ["announcements.", "audit."], successMessage: "Pengumuman diakhiri" });

  return (
    <>
      <PageHeader
        title="Pengumuman"
        description="Tampil sebagai banner di aplikasi klinik (maks. 5 sekaligus, yang kritis di atas)."
        actions={
          <Can action="announcements.upsert">
            <Button size="sm" className="gap-1.5" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Buat pengumuman
            </Button>
          </Can>
        }
      />

      <label className="mb-4 flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} className="h-4 w-4" />
        Tampilkan yang sudah berakhir
      </label>

      {query.isLoading && !query.data && <LoadingBlock />}
      {query.error && !query.data && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data?.length === 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <EmptyState title="Belum ada pengumuman" description="Gunakan untuk jadwal pemeliharaan, fitur baru, atau pemberitahuan penting." />
        </div>
      )}

      <ul className="space-y-3">
        {query.data?.map((a) => (
          <li key={a.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Megaphone className="h-4 w-4 text-text-muted" aria-hidden />
                  <h2 className="font-semibold text-text-primary">{a.title}</h2>
                  <StatusBadge kind="severity" value={a.severity} />
                  {isActive(a) ? (
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-600">Tayang</span>
                  ) : new Date(a.starts_at).getTime() > Date.now() ? (
                    <span className="rounded bg-background px-1.5 py-0.5 text-xs text-text-muted">Terjadwal</span>
                  ) : (
                    <span className="rounded bg-background px-1.5 py-0.5 text-xs text-text-muted">Berakhir</span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">{a.body}</p>
                <p className="mt-2 text-xs text-text-muted">
                  {ANNOUNCEMENT_AUDIENCE_LABELS[a.audience]} · {formatDateTime(a.starts_at)} – {a.ends_at ? formatDateTime(a.ends_at) : "tanpa batas"}
                </p>
              </div>
              <Can action="announcements.upsert">
                <div className="flex flex-shrink-0 gap-1">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => setEditing(a)}>
                    <Pencil className="h-3.5 w-3.5" /> Ubah
                  </Button>
                  {isActive(a) && (
                    <Button size="sm" variant="ghost" className="gap-1" isLoading={end.isPending} onClick={() => end.mutate({ id: a.id })}>
                      <Square className="h-3.5 w-3.5" /> Akhiri
                    </Button>
                  )}
                </div>
              </Can>
            </div>
          </li>
        ))}
      </ul>

      {editing && <EditAnnouncement value={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function EditAnnouncement({ value, onClose }: { value: Announcement | null; onClose: () => void }) {
  const [title, setTitle] = useState(value?.title ?? "");
  const [body, setBody] = useState(value?.body ?? "");
  const [severity, setSeverity] = useState<AnnouncementSeverity>(value?.severity ?? "info");
  const [audience, setAudience] = useState<AnnouncementAudience>(value?.audience ?? "all");
  const [startsAt, setStartsAt] = useState(toLocalInput(value?.starts_at ?? new Date().toISOString()));
  const [endsAt, setEndsAt] = useState(toLocalInput(value?.ends_at));

  const save = useConsoleMutation("announcements.upsert", {
    invalidate: ["announcements.", "audit."],
    successMessage: value ? "Pengumuman diperbarui" : "Pengumuman dibuat",
    onSuccess: onClose,
  });

  const params = {
    id: value?.id,
    title,
    body,
    severity,
    audience,
    startsAt: fromLocalInput(startsAt) ?? "",
    endsAt: fromLocalInput(endsAt),
  };
  const check = ACTIONS["announcements.upsert"].params.safeParse(params);
  const errors = check.success ? {} : Object.fromEntries(check.error.issues.map((i) => [i.path.join("."), i.message]));

  return (
    <ReasonDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={value ? "Ubah pengumuman" : "Buat pengumuman"}
      confirmLabel={value ? "Simpan" : "Terbitkan"}
      variant="primary"
      showReason={false}
      confirmDisabled={!check.success}
      isPending={save.isPending}
      onConfirm={() => save.mutate(params)}
    >
      <Field label="Judul" htmlFor="ann-title" required error={title && errors.title}>
        <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Pemeliharaan sistem Minggu 02.00–03.00 WIB" />
      </Field>
      <Field label="Isi" htmlFor="ann-body" required error={body && errors.body}>
        <TextArea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tingkat" htmlFor="ann-sev">
          <Select id="ann-sev" value={severity} onChange={(e) => setSeverity(e.target.value as AnnouncementSeverity)}>
            {ANNOUNCEMENT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {ANNOUNCEMENT_SEVERITY_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Target" htmlFor="ann-aud">
          <Select id="ann-aud" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
            {ANNOUNCEMENT_AUDIENCES.map((s) => (
              <option key={s} value={s}>
                {ANNOUNCEMENT_AUDIENCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mulai (WIB)" htmlFor="ann-start" required error={errors.startsAt}>
          <Input id="ann-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label="Selesai (WIB)" htmlFor="ann-end" error={errors.endsAt} hint="Kosongkan jika tanpa batas">
          <Input id="ann-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>
    </ReasonDialog>
  );
}
