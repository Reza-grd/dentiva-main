import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Input = forwardRef(({ className, type = "text", error, ...props }, ref) => {
  const id = props.id || props.name;
  return (
    <input
      type={type}
      id={id}
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
      className={cn(
        "flex h-10 w-full rounded-xl border bg-white dark:bg-gray-900 border-gray-300 px-3 py-2 text-sm transition-all shadow-sm text-gray-900 dark:text-gray-100",
        "placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        error 
          ? "border-red-500 focus-visible:ring-red-400" 
          : "border-gray-300 dark:border-gray-700 focus-visible:ring-[var(--color-primary)] focus-visible:border-[var(--color-primary)]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
