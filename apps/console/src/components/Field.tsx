import { forwardRef, useId, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@dentiva/ui";

/** Label + kontrol + pesan error/bantuan, dengan atribut aksesibilitas yang benar. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary">
        {label}
        {required && (
          <span className="ml-0.5 text-[var(--color-danger)]" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-[88px] w-full rounded-xl border bg-card px-3 py-2 text-sm text-text-primary shadow-sm",
        "placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50",
        invalid ? "border-red-500 focus-visible:ring-red-400" : "border-border focus-visible:ring-accent-primary",
        className,
      )}
      {...props}
    />
  ),
);
TextArea.displayName = "TextArea";

export function useFieldId(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, "")}`;
}
