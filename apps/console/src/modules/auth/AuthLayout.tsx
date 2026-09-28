import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-primary text-sm font-bold text-white">D</div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-text-primary">Dentiva Console</p>
            <p className="text-xs text-text-muted">Khusus tim internal Dentiva</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 flex items-center gap-1.5 text-xs text-text-muted">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Semua aktivitas di Console dicatat di audit log.
        </p>
      </div>
    </div>
  );
}

export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
          : "rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-3 py-2 text-sm text-text-primary"
      }
    >
      {children}
    </div>
  );
}
