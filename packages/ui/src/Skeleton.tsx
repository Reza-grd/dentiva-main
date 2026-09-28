import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/**
 * Skeleton — Loading placeholder component.
 *
 *   <Skeleton />
 *   <Skeleton variant="circle" className="w-10 h-10" />
 *   <SkeletonText lines={3} />
 */

const skeletonVariants = cva("animate-pulse bg-border/60", {
  variants: {
    variant: {
      default: "rounded-md",
      circle: "rounded-full",
      card: "rounded-2xl",
      button: "rounded-xl",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="status"
    aria-label="Memuat..."
    aria-busy="true"
    className={cn(skeletonVariants({ variant }), "h-4 w-full", className)}
    {...props}
  />
));
Skeleton.displayName = "Skeleton";

const SkeletonText = ({ lines = 3, className }: { lines?: number; className?: string }) => (
  <div className={cn("space-y-2", className)} role="status" aria-label="Memuat...">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-3/4" : "w-full")} />
    ))}
  </div>
);

const SkeletonCard = ({ className }: { className?: string }) => (
  <div
    className={cn("rounded-2xl border border-border p-6 space-y-4", className)}
    role="status"
    aria-label="Memuat..."
  >
    <div className="flex items-center space-x-3">
      <Skeleton variant="circle" className="h-10 w-10 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

export { Skeleton, SkeletonText, SkeletonCard, skeletonVariants };
