import React, { createContext, useContext, useCallback, useReducer, useRef, useEffect } from "react";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Toast — Queue-based notification system.
 *
 * Usage:
 *   // 1. Wrap your app (already done in main.jsx or App.jsx via ToastProvider)
 *   <ToastProvider />
 *
 *   // 2. In any component:
 *   const { toast } = useToast();
 *   toast({ title: "Saved!", variant: "success" });
 *   toast({ title: "Error", description: "Something failed", variant: "error" });
 *   toast({ title: "Info", variant: "info", duration: 6000 });
 */

// --- Context ---
const ToastContext = createContext(null);

// --- Reducer ---
const toastReducer = (state, action) => {
  switch (action.type) {
    case "ADD":
      return [...state, action.toast];
    case "REMOVE":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
};

let toastCounter = 0;

// --- Provider ---
export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = "default",
      duration = 4000,
    }) => {
      const id = `toast-${++toastCounter}`;
      dispatch({ type: "ADD", toast: { id, title, description, variant, duration } });
      if (duration > 0) {
        setTimeout(() => dispatch({ type: "REMOVE", id }), duration);
      }
      return id;
    },
    []
  );

  const dismiss = useCallback((id) => {
    dispatch({ type: "REMOVE", id });
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// --- Hook ---
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
};

// --- Variant config ---
const variantConfig = {
  default: {
    icon: Info,
    iconClass: "text-[var(--color-accent)]",
    barClass: "bg-[var(--color-accent)]",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-[var(--color-success)]",
    barClass: "bg-[var(--color-success)]",
  },
  error: {
    icon: XCircle,
    iconClass: "text-[var(--color-danger)]",
    barClass: "bg-[var(--color-danger)]",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-[var(--color-warning)]",
    barClass: "bg-[var(--color-warning)]",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-500",
    barClass: "bg-blue-500",
  },
};

// --- Individual Toast ---
const ToastItem = ({ toast, onDismiss }) => {
  const config = variantConfig[toast.variant] || variantConfig.default;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        // Layout
        "relative flex items-start gap-3 p-4 pr-10 w-full max-w-sm",
        // Appearance — matches Card glassmorphism style
        "rounded-2xl border border-border",
        "bg-card/95 backdrop-blur-md",
        "shadow-xl",
        // Animation
        "animate-in slide-in-from-right-4 fade-in duration-300"
      )}
    >
      {/* Colored left accent bar */}
      <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-full", config.barClass)} />

      {/* Icon */}
      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.iconClass)} aria-hidden="true" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-text-primary leading-tight">
            {toast.title}
          </p>
        )}
        {toast.description && (
          <p className="text-sm text-text-muted mt-0.5 leading-snug">
            {toast.description}
          </p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup notifikasi"
        className={cn(
          "absolute right-2 top-2 rounded-lg p-1",
          "text-text-muted hover:text-text-primary",
          "hover:bg-background",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
        )}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
};

// --- Viewport (renders toast stack) ---
const ToastViewport = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end"
      aria-label="Notifikasi"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export { ToastItem };
