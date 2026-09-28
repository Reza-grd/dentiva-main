import React from "react";
import { cn } from "./cn";

const badgeVariants = {
  default: "bg-background text-text-primary hover:bg-card border border-border",
  primary: "bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 border border-accent-primary/20",
  secondary: "bg-accent-secondary/15 text-accent-secondary hover:bg-accent-secondary/25 border border-accent-secondary/20",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/20",
  danger: "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 border border-red-500/20",
  outline: "border border-border text-text-primary hover:bg-background",
};

export type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2",
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
