import React from "react";
import { cn } from "../../lib/utils";

const badgeVariants = {
  default: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  primary: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  success: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  warning: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  danger: "bg-red-100 text-red-800 hover:bg-red-200",
  outline: "border border-gray-200 text-gray-800",
};

function Badge({ className, variant = "default", children, ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
