import React, { forwardRef } from "react";
import { cn } from "./cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean | null;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type = "text", error, ...props }, ref) => {
  const id = props.id || props.name;
  return (
    <input
      type={type}
      id={id}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(
        "flex h-10 w-full rounded-xl border bg-card border-border px-3 py-2 text-sm transition-all shadow-sm text-text-primary",
        "placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-red-500 focus-visible:ring-red-400"
          : "border-border focus-visible:ring-accent-primary focus-visible:border-accent-primary",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
