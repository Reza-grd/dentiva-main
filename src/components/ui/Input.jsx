import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Input = forwardRef(({ className, type = "text", error, ...props }, ref) => {
  return (
    <div className="w-full">
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm transition-all",
          "placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
          error 
            ? "border-red-500 focus-visible:ring-red-400" 
            : "border-gray-300 focus-visible:ring-blue-400 focus-visible:border-blue-400",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
});
Input.displayName = "Input";

export { Input };
