import React, { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Select — Accessible drop-down selector component.
 * Uses cva for styling variants matching Input.jsx and Button.jsx.
 * Supports helper text, error state, disabled state, and icon prefix/suffix.
 */

const selectVariants = cva(
  "w-full appearance-none rounded-xl border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 pr-10 transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-gray-300 dark:border-gray-700 focus:border-[var(--color-accent)] focus:ring-[var(--color-accent)]/20",
        error:
          "border-red-500 text-red-900 dark:text-red-300 focus:border-red-500 focus:ring-red-500/20",
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

const Select = forwardRef(
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
            className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300"
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
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
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
            className="text-xs text-gray-500 dark:text-gray-400 mt-1"
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
