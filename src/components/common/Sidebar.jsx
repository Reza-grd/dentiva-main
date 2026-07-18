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
          flex flex-col flex-shrink-0 w-[260px] h-[100dvh] lg:h-[calc(100vh-2rem)] 
          bg-white/80 dark:bg-[#14171F]/80 backdrop-blur-xl border-r lg:border lg:rounded-3xl lg:my-4 lg:ml-4
          border-gray-200/50 dark:border-gray-800/50 shadow-card transition-transform duration-300 ease-in-out
          ${isDesktop ? 'translate-x-0 static' : (isOpen ? 'translate-x-0 fixed left-0 top-0 z-50' : '-translate-x-full fixed left-0 top-0 z-50')}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center gap-3">
            <img src="/dentiva-logo.png" alt="Dentiva Logo" className="h-10 w-auto rounded-xl shadow-sm" />
            <div>
              <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
                Dentiva
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 tracking-widest font-semibold uppercase">
                Klinik Gigi
              </div>
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
        <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {items.map((item, idx) => {
            if (item.group) {
              return (
                <div
                  key={`g-${idx}`}
                  className={`text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase ${idx === 0 ? 'px-3 pb-2 pt-1' : 'px-3 pb-2 pt-5'}`}
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
                    ? { backgroundColor: `${primaryColor}15`, color: primaryColor } 
                    : {}
                }
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 group
                  ${isActive 
                    ? 'font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 font-medium'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={18}
                      style={isActive ? { color: primaryColor } : {}}
                      className={`${!isActive && 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                    />
                    <span className="text-[13px]">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/20 lg:rounded-b-3xl">
          <div className="text-xs text-center text-gray-400 dark:text-gray-500 font-medium">
            <span className="font-semibold">Dentiva</span> AI Platform
            <br/>© 2026
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
