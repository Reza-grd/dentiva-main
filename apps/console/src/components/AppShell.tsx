import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  ScrollText,
  ShieldCheck,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button, cn } from "@dentiva/ui";
import type { ActionName } from "@dentiva/shared";
import { useAuth } from "@/lib/auth";
import { APP_ENV } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import { StatusBadge } from "./StatusBadge";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Aksi yang wajib boleh dijalankan role ini agar menu tampil. */
  requires: ActionName;
  end?: boolean;
}

const NAV: Array<{ heading?: string; items: NavItem[] }> = [
  {
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, requires: "dashboard.summary", end: true },
      { to: "/clinics", label: "Klinik", icon: Building2, requires: "clinics.list" },
      { to: "/users", label: "Pengguna", icon: Users, requires: "users.list" },
      { to: "/billing", label: "Langganan & Keuangan", icon: CreditCard, requires: "billing.invoices.list" },
      { to: "/usage", label: "Pemakaian", icon: Activity, requires: "usage.overview" },
      { to: "/audit", label: "Audit", icon: ScrollText, requires: "audit.list" },
    ],
  },
  {
    heading: "Pengaturan",
    items: [
      { to: "/announcements", label: "Pengumuman", icon: Megaphone, requires: "announcements.list" },
      { to: "/operators", label: "Operator", icon: ShieldCheck, requires: "operators.list" },
    ],
  },
];

export function AppShell() {
  const { operator, signOut, can } = useAuth();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const sidebar = (
    <nav aria-label="Navigasi utama" className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-primary text-xs font-bold text-white">D</div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-text-primary">Dentiva Console</p>
          <p className="text-[11px] text-text-muted">Internal · Tim Dentiva</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group, gi) => {
          const items = group.items.filter((i) => can(i.requires));
          if (items.length === 0) return null;
          return (
            <div key={gi} className={cn(gi > 0 && "mt-6")}>
              {group.heading && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{group.heading}</p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-accent-primary/10 font-medium text-accent-primary"
                            : "text-text-muted hover:bg-background hover:text-text-primary",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-5 py-3 text-[11px] text-text-muted">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-medium uppercase tracking-wide",
            APP_ENV === "production" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/15 text-amber-600",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {APP_ENV}
        </span>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow"
      >
        Lompati ke konten utama
      </a>

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card lg:block">{sidebar}</aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-card shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded p-1 text-text-muted hover:text-text-primary"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded p-1.5 text-text-muted hover:text-text-primary lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggle}
              aria-label={theme === "dark" ? "Gunakan tema terang" : "Gunakan tema gelap"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {operator && (
              <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
                <div className="text-right leading-tight">
                  <p className="text-sm font-medium text-text-primary">{operator.full_name}</p>
                  <p className="text-[11px] text-text-muted">{operator.email}</p>
                </div>
                <StatusBadge kind="operatorRole" value={operator.role} />
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => void signOut()} className="gap-1.5">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 focus:outline-none sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
