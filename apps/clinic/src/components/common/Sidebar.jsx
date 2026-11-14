import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, DollarSign,
  BarChart3, Calendar, Settings, UserPlus, X,
  ClipboardList, Package, CalendarClock, User, Shield, CalendarCheck, Sparkles, Receipt, BellRing, Monitor,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
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
        { icon: CalendarClock,   label: 'Jadwal Dokter',    path: `${baseUrl}/jadwal-dokter` },
        { icon: Monitor,         label: 'Layar Antrean',    path: '/layar-antrean' },
        { group: 'KEUANGAN' },
        { icon: Receipt,         label: 'Pengeluaran',      path: `${baseUrl}/pengeluaran` },
        { icon: BarChart3,       label: 'Laporan',          path: `${baseUrl}/laporan` },
        { icon: Sparkles,        label: 'Asisten AI',       path: `${baseUrl}/asisten-ai` },
        { group: 'LAINNYA' },
        { icon: Package,         label: 'Master Treatment', path: `${baseUrl}/treatments` },
        { icon: DollarSign,      label: 'Biaya & Modal',    path: `${baseUrl}/costing` },
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
        { icon: CalendarCheck,   label: 'Booking Online',     path: '/booking-requests' },
        { icon: BellRing,        label: 'Recall Pasien',      path: `${baseUrl}/recall` },
        { icon: ClipboardList,   label: 'Riwayat Kunjungan', path: `${baseUrl}/kunjungan` },
        { icon: Monitor,         label: 'Layar Antrean',      path: '/layar-antrean' },
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
          flex flex-col flex-shrink-0 w-[232px] h-[100dvh] lg:h-screen
          bg-card border-r
          border-border transition-transform duration-300 ease-in-out ${isDesktop ? '' : 'shadow-xl'}
          ${isDesktop ? 'translate-x-0 static' : (isOpen ? 'translate-x-0 fixed left-0 top-0 z-50' : '-translate-x-full fixed left-0 top-0 z-50')}
        `}
      >
        {/* Logo */}
        <div className="h-14 lg:h-[56px] px-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <span className="h-8 w-8 shrink-0 rounded-lg bg-white p-1 ring-1 ring-black/5 flex items-center justify-center">
              <img src="/dentiva-logo.svg" alt="Dentiva Logo" className="h-full w-full object-contain" />
            </span>
            <div>
              <div className="font-semibold text-lg tracking-tight text-text-primary leading-none mb-0.5">Dentiva</div>
              <div className="text-xs text-text-muted font-medium leading-none">Klinik gigi</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="lg:hidden p-2 text-text-muted hover:text-text-primary hover:bg-background rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {items.map((item, idx) => {
            if (item.group) {
              return (
                <div
                  key={`g-${idx}`}
                  className={`px-3 mb-1.5 text-xs font-medium text-text-muted ${idx !== 0 ? 'mt-4' : ''}`}
                >
                  {item.group.charAt(0) + item.group.slice(1).toLowerCase()}
                </div>
              );
            }

            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                data-tur={item.path}
                end={item.path === `/${role}`}
                onClick={() => !isDesktop && onClose()}
                style={({ isActive }) => 
                  isActive 
                    ? { 
                        background: 'var(--color-accent)',
                        color: '#fff'
                      } 
                    : {}
                }
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 mb-0.5 rounded-lg transition-colors duration-150 group relative
                  ${isActive 
                    ? 'font-semibold' 
                    : 'text-text-muted hover:bg-background hover:text-text-primary font-medium'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      className={isActive ? 'text-white' : 'text-text-muted group-hover:text-text-primary'}
                    />
                    <span className="text-[14px]">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

      </aside>
    </>
  );
};

export default Sidebar;
