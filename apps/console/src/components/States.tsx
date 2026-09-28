import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@dentiva/ui";
import { ConsoleApiError, errorMessage } from "@/lib/api";

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <Inbox className="mb-3 h-8 w-8 text-text-muted" aria-hidden />
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const ref = error instanceof ConsoleApiError ? error.requestId : undefined;
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-[var(--color-danger)]" aria-hidden />
      <p className="text-sm font-medium text-text-primary">Gagal memuat data</p>
      <p className="mt-1 max-w-md text-sm text-text-muted">{errorMessage(error)}</p>
      {ref && <p className="mt-1 font-mono text-xs text-text-muted">ref: {ref}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}

export function LoadingBlock({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoadingBlock label="Memuat Dentiva Console…" />
    </div>
  );
}
