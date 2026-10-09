import { Link } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { formatNumber, type ClinicHealthItem, type ClinicHealthLevel } from "@dentiva/shared";
import { Section } from "@/components/misc";
import { ErrorState, LoadingBlock } from "@/components/States";
import { useConsoleQuery } from "@/lib/query";

const LEVEL: Record<ClinicHealthLevel, { label: string; cls: string }> = {
  sehat: { label: "Sehat", cls: "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]" },
  perhatian: { label: "Perlu perhatian", cls: "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[var(--color-warning)]" },
  berisiko: { label: "Berisiko", cls: "bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]" },
};

const ADOPTION: Array<{ key: "booking" | "whatsapp" | "satusehat" | "ai" | "expenses"; label: string }> = [
  { key: "booking", label: "Booking online" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "satusehat", label: "SATUSEHAT" },
  { key: "ai", label: "Asisten AI" },
  { key: "expenses", label: "Pengeluaran" },
];

function HealthRow({ c }: { c: ClinicHealthItem }) {
  const lv = LEVEL[c.level];
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <Link to={`/clinics/${c.id}`} className="truncate text-sm font-medium text-text-primary hover:underline">
          {c.name}
        </Link>
        <p className="text-xs text-text-muted">
          {c.plan_name ?? "Tanpa paket"} · {formatNumber(c.metrics.visits_30)} kunjungan/30 hari · {formatNumber(c.metrics.users)} pengguna
        </p>
        {c.reasons.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-xs text-text-muted">
            {c.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
      </div>
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className="text-lg font-semibold tabular-nums text-text-primary">{c.score}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${lv.cls}`}>{lv.label}</span>
      </div>
    </li>
  );
}

/** Skor kesehatan klinik (aturan tetap, tanpa data pasien) + adopsi fitur. */
export function ClinicHealthSection() {
  const { data, isLoading, error, refetch } = useConsoleQuery("insights.clinicHealth", { limit: 50 }, { refetchInterval: 5 * 60_000 });
  const attention = data?.clinics.filter((c) => c.level !== "sehat") ?? [];

  return (
    <Section
      title={<span className="inline-flex items-center gap-2"><HeartPulse className="h-4 w-4" aria-hidden /> Kesehatan klinik</span>}
      description="Skor 0–100 dari aktivitas login, tren kunjungan, pencatatan pembayaran, tagihan, trial, dan pemakaian fitur."
    >
      {isLoading && !data && <LoadingBlock />}
      {error && !data && <ErrorState error={error} onRetry={() => void refetch()} />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {(["sehat", "perhatian", "berisiko"] as const).map((k) => (
              <div key={k} className="rounded-xl border border-border px-4 py-3">
                <p className="text-xs text-text-muted">{LEVEL[k].label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">{formatNumber(data.summary[k])}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-text-muted">Adopsi fitur (30 hari, dari {formatNumber(data.summary.total)} klinik aktif/trial)</p>
            <div className="space-y-1.5">
              {ADOPTION.map((a) => {
                const n = data.adoption[a.key];
                const pct = data.summary.total ? Math.round((n / data.summary.total) * 100) : 0;
                return (
                  <div key={a.key} className="flex items-center gap-3 text-xs">
                    <span className="w-28 flex-shrink-0 text-text-primary">{a.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                      <div className="h-full rounded-full bg-accent-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right tabular-nums text-text-muted">{formatNumber(n)} · {pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {attention.length === 0 ? (
            <p className="text-sm text-text-muted">Semua klinik dalam kondisi sehat.</p>
          ) : (
            <ul className="divide-y divide-border">
              {attention.slice(0, 8).map((c) => <HealthRow key={c.id} c={c} />)}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}
