import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "./cn";

/**
 * Select — Accessible drop-down selector component.
 * Uses cva for styling variants matching Input and Button.
 * Supports helper text, error state, disabled state, and icon prefix/suffix.
 */

const selectVariants = cva(
  "w-full appearance-none rounded-xl border bg-card text-text-primary pr-10 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-border focus:border-accent-primary focus:ring-accent-primary/20",
        error:
          "border-red-500 text-red-600 dark:text-red-400 focus:border-red-500 focus:ring-red-500/20",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {
  error?: React.ReactNode;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      variant,
      size,
      error,
      label,
      helperText,
      id,
      children,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const computedVariant = error ? "error" : variant;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-text-muted"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${selectId}-error`
                : helperText
                ? `${selectId}-helper`
                : undefined
            }
            className={cn(
              selectVariants({ variant: computedVariant, size, className })
            )}
            {...props}
          >
            {children}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
        {error ? (
          <p
            id={`${selectId}-error`}
            className="text-xs text-red-500 dark:text-red-400 mt-1"
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={`${selectId}-helper`}
            className="text-xs text-text-muted mt-1"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select, selectVariants };
