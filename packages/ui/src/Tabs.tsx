import React, { forwardRef, createContext, useContext, useState, useCallback, useId } from "react";
import { cn } from "./cn";

/**
 * Tabs — Accessible tabbed interface with keyboard navigation.
 * Arrow keys move between tabs; Enter/Space activate focused tab.
 * Follows WAI-ARIA Tabs pattern.
 */

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = ({ defaultValue, value: controlledValue, onValueChange, children, className, ...props }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const baseId = useId();

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const setValue = useCallback(
    (v: string) => {
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

const TabsList = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => {
  const { baseId } = useTabsContext();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const triggers = container.querySelectorAll<HTMLElement>('[role="tab"]').length
      ? container.querySelectorAll<HTMLElement>('[role="tab"]')
      : document.querySelectorAll<HTMLElement>(`[data-tabs-base="${baseId}"]`);
    const arr = Array.from(triggers);
    const focused = document.activeElement as HTMLElement | null;
    const idx = focused ? arr.indexOf(focused) : -1;
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

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(({ className, value, children, disabled, ...props }, ref) => {
  const ctx = useTabsContext();
  const isSelected = ctx.value === value;

  const handleClick = () => {
    if (!disabled) ctx.setValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!disabled) ctx.setValue(value);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
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
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
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

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(({ className, value, children, ...props }, ref) => {
  const { value: activeValue, baseId } = useTabsContext();
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
