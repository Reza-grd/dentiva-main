import { useEffect, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants, Card, cn } from "@dentiva/ui";
import type { ActionName } from "@dentiva/shared";
import { useAuth } from "@/lib/auth";
import { useDebounced } from "@/lib/hooks";

/** Render children hanya jika role operator boleh menjalankan aksi tersebut. */
export function Can({ action, children, fallback = null }: { action: ActionName; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useAuth();
  return <>{can(action) ? children : fallback}</>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "danger" | "warning" | "success";
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums tracking-tight",
          tone === "danger" && "text-[var(--color-danger)]",
          tone === "warning" && "text-[var(--color-warning)]",
          tone === "success" && "text-[var(--color-success)]",
          tone === "default" && "text-text-primary",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </Card>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("hover:shadow-card", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export function DescriptionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs text-text-muted">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-text-primary">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Kotak pencarian dengan debounce; memanggil onChange setelah pengguna berhenti mengetik. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Cari…",
  className,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value ?? "");
  const debounced = useDebounced(text, 350);

  useEffect(() => setText(value ?? ""), [value]);
  useEffect(() => {
    if ((value ?? "") !== debounced) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn("relative w-full sm:w-72", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-8 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Hapus pencarian"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Select kecil untuk filter di toolbar. */
export function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="h-9 rounded-xl border border-border bg-card px-3 pr-8 text-sm text-text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
    >
      <option value="">{label}: semua</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

/** Tampilkan teks kecil monospace (ID, nomor invoice). */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-xs", className)}>{children}</span>;
}

/** Tautan bergaya tombol (menghindari <button> di dalam <a>). */
export function LinkButton({
  to,
  children,
  variant = "primary",
  size = "sm",
  className,
}: {
  to: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  return (
    <Link to={to} className={cn(buttonVariants({ variant, size }), "gap-1.5", className)}>
      {children}
    </Link>
  );
}
