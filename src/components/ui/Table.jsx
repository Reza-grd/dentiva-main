import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

/**
 * Table — Responsive table system.
 * Supports standard table tags plus a Card-List layout on mobile/small screens.
 *
 * Components:
 * - TableContainer: Wrapper element handling horizontal scroll and optional mobile card view
 * - Table: <table> element
 * - TableHeader: <thead> element
 * - TableBody: <tbody> element
 * - TableFooter: <tfoot> element
 * - TableRow: <tr> element
 * - TableHead: <th> element
 * - TableCell: <td> element
 * - TableCaption: <caption> element
 */

const TableContainer = forwardRef(
  ({ className, children, responsive = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "w-full rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-sm overflow-hidden",
        responsive && "overflow-x-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
TableContainer.displayName = "TableContainer";

const Table = forwardRef(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn(
      "w-full text-left text-sm text-text-primary border-collapse",
      className
    )}
    {...props}
  />
));
Table.displayName = "Table";

const TableHeader = forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-background/80 border-b border-border text-xs uppercase tracking-wider text-text-muted font-semibold",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-border", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "bg-background/50 border-t border-border font-medium text-text-primary",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors hover:bg-background/60 data-[state=selected]:bg-background",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("h-11 px-4 py-3 align-middle font-semibold text-left", className)}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("px-4 py-3.5 align-middle text-sm", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-xs text-text-muted p-2", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
