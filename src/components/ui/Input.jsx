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
        "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm transition-all shadow-sm",
        "placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        error 
          ? "border-red-500 focus-visible:ring-red-400" 
          : "border-gray-300 focus-visible:ring-[var(--color-primary)] focus-visible:border-[var(--color-primary)]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
