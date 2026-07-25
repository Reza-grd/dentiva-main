import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  DollarSign,
  Settings,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

/**
 * BottomNav — Mobile navigation bar for screen widths < 768px (md breakpoint).
 * Uses env(safe-area-inset-bottom) for notched mobile devices (iOS/Android).
 */
export default function BottomNav() {
  const { userProfile } = useAuth();
  const role = userProfile?.role || "admin";

  const getNavItems = () => {
    const baseUrl = `/${role}`;
    switch (role) {
      case "dokter":
        return [
          { icon: LayoutDashboard, label: "Beranda", path: baseUrl },
          { icon: Calendar, label: "Jadwal", path: `${baseUrl}/jadwal` },
          { icon: Users, label: "Pasien", path: "/pasien" },
          { icon: FileText, label: "EMR", path: `${baseUrl}/rekam-medis` },
        ];
      case "resepsionis":
        return [
          { icon: LayoutDashboard, label: "Beranda", path: baseUrl },
          { icon: Users, label: "Pasien", path: "/pasien" },
          { icon: Calendar, label: "Jadwal", path: `${baseUrl}/jadwal` },
          { icon: DollarSign, label: "Kasir", path: `${baseUrl}/pembayaran` },
        ];
      default: // admin
        return [
          { icon: LayoutDashboard, label: "Beranda", path: baseUrl },
          { icon: Calendar, label: "Jadwal", path: `${baseUrl}/jadwal` },
          { icon: DollarSign, label: "Keuangan", path: `${baseUrl}/pembayaran` },
          { icon: Settings, label: "Pengaturan", path: `${baseUrl}/pengaturan` },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0B0E14]/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 px-2 py-1 shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      aria-label="Navigasi bawah seluler"
    >
      <div className="flex items-center justify-around h-12">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `/${role}`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full rounded-xl text-[10px] font-medium transition-colors ${
                  isActive
                    ? "text-[var(--color-accent)] font-bold"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
