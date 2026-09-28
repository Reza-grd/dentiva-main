import { useState } from "react";
import { cn } from "@dentiva/ui";
import { useDebounced } from "@/lib/hooks";
import { useConsoleQuery } from "@/lib/query";
import { StatusBadge } from "./StatusBadge";

/** Pilih klinik lewat pencarian server-side (daftar klinik bisa ratusan). */
export function ClinicPicker({
  value,
  onChange,
  id,
  invalid,
}: {
  value: { id: string; name: string } | null;
  onChange: (v: { id: string; name: string } | null) => void;
  id: string;
  invalid?: boolean;
}) {
  const [q, setQ] = useState("");
  const search = useDebounced(q, 300);
  const { data, isFetching } = useConsoleQuery("clinics.list", { search: search || undefined, pageSize: 8 }, { enabled: !value });

  if (value) {
    return (
      <div className="flex h-10 items-center justify-between rounded-xl border border-border bg-card px-3 text-sm">
        <span className="font-medium text-text-primary">{value.name}</span>
        <button type="button" className="text-xs text-accent-primary hover:underline" onClick={() => onChange(null)}>
          Ganti
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ketik nama klinik…"
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 w-full rounded-xl border bg-card px-3 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
          invalid ? "border-red-500" : "border-border",
        )}
      />
      <ul className="max-h-56 overflow-y-auto rounded-xl border border-border bg-card" role="listbox" aria-label="Hasil pencarian klinik">
        {isFetching && !data && <li className="px-3 py-2 text-sm text-text-muted">Mencari…</li>}
        {data?.items.length === 0 && <li className="px-3 py-2 text-sm text-text-muted">Tidak ada klinik yang cocok</li>}
        {data?.items.map((c) => (
          <li key={c.id} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => onChange({ id: c.id, name: c.name })}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-background"
            >
              <span className="truncate">{c.name}</span>
              <StatusBadge kind="clinic" value={c.status} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
