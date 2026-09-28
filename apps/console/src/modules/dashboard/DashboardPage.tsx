import { Link } from "react-router-dom";
import { AlertTriangle, Building2, CalendarClock, CreditCard, Plus, TrendingUp } from "lucide-react";
import { CLINIC_STATUSES, CLINIC_STATUS_LABELS, formatDate, formatNumber, formatRelative, formatRupiah } from "@dentiva/shared";
import { PageHeader } from "@/components/PageHeader";
import { Can, LinkButton, Section, StatCard } from "@/components/misc";
import { ErrorState, LoadingBlock } from "@/components/States";
import { useConsoleQuery } from "@/lib/query";
import { useAuth } from "@/lib/auth";

export function DashboardPage() {
  const { operator } = useAuth();
  const { data, isLoading, error, refetch, dataUpdatedAt } = useConsoleQuery("dashboard.summary", {}, { refetchInterval: 60_000 });

  return (
    <>
      <PageHeader
        title={`Halo, ${operator?.full_name.split(" ")[0] ?? "Operator"}`}
        description={
          data ? `Ringkasan platform · diperbarui ${formatRelative(dataUpdatedAt ? new Date(dataUpdatedAt) : data.generatedAt)}` : "Ringkasan platform Dentiva"
        }
        actions={
          <Can action="clinics.create">
            <LinkButton to="/clinics/new">
              <Plus className="h-4 w-4" aria-hidden /> Daftarkan klinik
            </LinkButton>
          </Can>
        }
      />

      {isLoading && !data && <LoadingBlock />}
      {error && !data && <ErrorState error={error} onRetry={() => void refetch()} />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Klinik aktif"
              value={formatNumber(data.clinicsByStatus.active)}
              hint={`${formatNumber(data.clinicsByStatus.trial)} trial · ${formatNumber(data.newClinicsThisMonth)} baru bulan ini`}
              icon={<Building2 className="h-4 w-4" />}
            />
            <StatCard
              label="MRR"
              value={formatRupiah(data.mrrIdr)}
              hint={`${formatNumber(data.activeSubscriptions)} langganan aktif berbayar`}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              label="Tagihan belum dibayar"
              value={formatRupiah(data.invoicesDue.amountIdr)}
              hint={`${formatNumber(data.invoicesDue.count)} invoice terbuka`}
              icon={<CreditCard className="h-4 w-4" />}
            />
            <StatCard
              label="Jatuh tempo"
              value={formatRupiah(data.invoicesOverdue.amountIdr)}
              hint={`${formatNumber(data.invoicesOverdue.count)} invoice lewat jatuh tempo`}
              tone={data.invoicesOverdue.count > 0 ? "danger" : "default"}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
          </div>

          <Section title="Klinik per status" description="Klik status untuk melihat daftarnya.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {CLINIC_STATUSES.map((s) => (
                <Link
                  key={s}
                  to={`/clinics?status=${s}`}
                  className="rounded-xl border border-border px-4 py-3 transition-colors hover:bg-background"
                >
                  <p className="text-xs text-text-muted">{CLINIC_STATUS_LABELS[s]}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{formatNumber(data.clinicsByStatus[s])}</p>
                </Link>
              ))}
            </div>
          </Section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Trial berakhir ≤ 7 hari" description="Hubungi sebelum trial habis agar klinik tidak terputus.">
              {data.trialsEndingSoon.length === 0 ? (
                <p className="text-sm text-text-muted">Tidak ada trial yang segera berakhir.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.trialsEndingSoon.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link to={`/clinics/${c.id}`} className="truncate text-sm font-medium text-text-primary hover:underline">
                        {c.name}
                      </Link>
                      <span className="flex flex-shrink-0 items-center gap-1 text-xs text-text-muted">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(c.trial_ends_at)} ({formatRelative(c.trial_ends_at)})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Risiko berhenti" description="Klinik aktif/trial tanpa login staf ≥ 14 hari.">
              {data.churnRisk.length === 0 ? (
                <p className="text-sm text-text-muted">Semua klinik aktif menggunakan Dentiva.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.churnRisk.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link to={`/clinics/${c.id}`} className="truncate text-sm font-medium text-text-primary hover:underline">
                        {c.name}
                      </Link>
                      <span className="flex-shrink-0 text-xs text-text-muted">
                        {c.last_activity_at ? `login terakhir ${formatRelative(c.last_activity_at)}` : "belum pernah login"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
