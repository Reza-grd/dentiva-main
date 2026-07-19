import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, DollarSign,
  BarChart3, Calendar, Settings, UserPlus, X,
  ClipboardList, TrendingUp, Package, CalendarClock, Receipt, User, Shield,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const { primaryColor } = useTheme();
  const role = userProfile?.role || 'admin';
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMenuItems = () => {
    const baseUrl = `/${role}`;
    const menus = {
      admin: [
        { group: 'UTAMA' },
        { icon: LayoutDashboard, label: 'Dashboard',        path: baseUrl },
        { group: 'KLINIK' },
        { icon: Calendar,        label: 'Jadwal Kunjungan', path: `${baseUrl}/jadwal` },
        { icon: CalendarClock,   label: 'Jadwal Dokter',    path: `${baseUrl}/jadwal-dokter` },
        { group: 'KEUANGAN' },
        { icon: DollarSign,      label: 'Pembayaran',       path: `${baseUrl}/pembayaran` },
        { icon: Receipt,         label: 'Transaksi',          path: `${baseUrl}/transaksi` },
        { icon: BarChart3,       label: 'Lap. Keuangan',    path: '/keuangan' },
        { group: 'LAINNYA' },
        { icon: Package,         label: 'Master Treatment', path: `${baseUrl}/treatments` },
        { icon: DollarSign,      label: 'Biaya & Modal',    path: `${baseUrl}/costing` },
        { icon: TrendingUp,      label: 'Laporan',          path: `${baseUrl}/laporan` },
        { icon: Users,           label: 'Kelola Pengguna',  path: `${baseUrl}/pengguna` },
        { icon: Shield,          label: 'Audit Log',        path: `${baseUrl}/audit-log` },
        { icon: Settings,        label: 'Pengaturan',       path: `${baseUrl}/pengaturan` },
      ],
      dokter: [
        { group: 'UTAMA' },
        { icon: LayoutDashboard, label: 'Dashboard',          path: baseUrl },
        { icon: Calendar,        label: 'Jadwal Hari Ini',    path: `${baseUrl}/jadwal` },
        { group: 'PASIEN' },
        { icon: Users,           label: 'Data Pasien',        path: '/pasien' },
        { icon: FileText,        label: 'Rekam Medis',        path: `${baseUrl}/rekam-medis` },
        { icon: ClipboardList,   label: 'Riwayat Kunjungan', path: `${baseUrl}/kunjungan` },
        { group: 'AKUN' },
        { icon: User,            label: 'Profil Dokter',      path: `${baseUrl}/profil-dokter` },
      ],
      resepsionis: [
        { group: 'UTAMA' },
        { icon: LayoutDashboard, label: 'Dashboard',          path: baseUrl },
        { group: 'PASIEN' },
        { icon: UserPlus,        label: 'Daftar Pasien',      path: '/pasien/daftar' },
        { icon: Users,           label: 'Data Pasien',        path: '/pasien' },
        { group: 'OPERASIONAL' },
        { icon: Calendar,        label: 'Jadwal',             path: `${baseUrl}/jadwal` },
        { icon: ClipboardList,   label: 'Riwayat Kunjungan', path: `${baseUrl}/kunjungan` },
        { icon: DollarSign,      label: 'Pembayaran',         path: `${baseUrl}/pembayaran` },
      ],
    };
    return menus[role] || [];
  };

  const items = getMenuItems();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          flex flex-col flex-shrink-0 w-72 h-[100dvh] lg:h-screen
          bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-r
          border-gray-100 dark:border-gray-800 shadow-xl transition-transform duration-300 ease-in-out
          ${isDesktop ? 'translate-x-0 static' : (isOpen ? 'translate-x-0 fixed left-0 top-0 z-50' : '-translate-x-full fixed left-0 top-0 z-50')}
        `}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <img src="/dentiva-logo.png" alt="Dentiva Logo" className="h-10 w-auto rounded-xl shadow-sm" />
            <div>
              <div className="font-bold text-2xl tracking-tighter text-gray-900 dark:text-white leading-none mb-1">Dentiva</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-none tracking-widest uppercase">Klinik Gigi</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {items.map((item, idx) => {
            if (item.group) {
              return (
                <div
                  key={`g-${idx}`}
                  className={`px-3 mb-2 text-[11px] font-bold text-gray-400/80 dark:text-gray-500 tracking-widest uppercase ${idx !== 0 ? 'mt-8' : ''}`}
                >
                  {item.group}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}`}
                onClick={() => !isDesktop && onClose()}
                style={({ isActive }) => 
                  isActive 
                    ? { 
                        background: 'linear-gradient(to right, var(--color-accent), var(--color-accent-secondary))',
                        color: '#fff',
                        boxShadow: 'var(--shadow-glow)'
                      } 
                    : {}
                }
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 mb-1.5 rounded-2xl transition-all duration-200 group relative
                  ${isActive 
                    ? 'font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'}
                    />
                    <span className="text-[14px]">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 mt-auto bg-white/30 dark:bg-black/20">
          <div className="bg-gray-50/80 dark:bg-gray-900/80 rounded-2xl p-4 text-xs shadow-sm border border-gray-100/50 dark:border-gray-800/50">
            <div className="font-semibold text-[var(--color-accent)]">Dentiva AI</div>
            <div className="text-gray-500 dark:text-gray-400 font-medium mt-0.5">Platform © 2026</div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
