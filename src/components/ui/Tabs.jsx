import React, { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Tabs — Accessible tabbed interface with keyboard navigation.
 * Arrow keys move between tabs; Enter/Space activate focused tab.
 * Follows WAI-ARIA Tabs pattern.
 *
 * Usage:
 *   <Tabs defaultValue="tab1">
 *     <TabsList>
 *       <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *       <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="tab1">Content 1</TabsContent>
 *     <TabsContent value="tab2">Content 2</TabsContent>
 *   </Tabs>
 */

import { createContext, useContext, useState, useCallback, useId } from "react";

const TabsContext = createContext(null);

const Tabs = ({ defaultValue, value: controlledValue, onValueChange, children, className, ...props }) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const baseId = useId();

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const setValue = useCallback(
    (v) => {
      if (controlledValue === undefined) setInternalValue(v);
      onValueChange?.(v);
    },
    [controlledValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, setValue, baseId }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

const TabsList = forwardRef(({ className, children, ...props }, ref) => {
  const { value, setValue, baseId } = useContext(TabsContext);

  // Collect trigger values for keyboard navigation
  const handleKeyDown = (e) => {
    const triggers = ref?.current?.querySelectorAll('[role="tab"]') ||
      document.querySelectorAll(`[data-tabs-base="${baseId}"]`);
    const arr = Array.from(triggers);
    const focused = document.activeElement;
    const idx = arr.indexOf(focused);
    if (idx === -1) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      arr[(idx + 1) % arr.length]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      arr[(idx - 1 + arr.length) % arr.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      arr[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      arr[arr.length - 1]?.focus();
    }
  };

  return (
    <div
      ref={ref}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl p-1",
        "bg-background",
        "border border-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsList.displayName = "TabsList";

const TabsTrigger = forwardRef(({ className, value, children, disabled, ...props }, ref) => {
  const ctx = useContext(TabsContext);
  const isSelected = ctx.value === value;

  const handleClick = () => {
    if (!disabled) ctx.setValue(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) ctx.setValue(value);
    }
  };

  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isSelected}
      aria-controls={`${ctx.baseId}-panel-${value}`}
      id={`${ctx.baseId}-tab-${value}`}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      data-tabs-base={ctx.baseId}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        // Active state
        isSelected
          ? "bg-card text-text-primary shadow-sm"
          : "text-text-muted hover:text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = forwardRef(({ className, value, children, ...props }, ref) => {
  const { value: activeValue, baseId } = useContext(TabsContext);
  const isSelected = activeValue === value;

  if (!isSelected) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn(
        "mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 rounded-lg",
        "animate-in fade-in duration-150",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
