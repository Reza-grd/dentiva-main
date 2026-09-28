import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, Settings, Menu, ChevronRight } from 'lucide-react';

const ROUTE_LABELS = {
  '/admin': 'Dashboard Manajer Klinik',
  '/dokter': 'Dashboard Dokter',
  '/resepsionis': 'Dashboard Resepsionis',
  '/pasien': 'Data Pasien',
  '/pasien/daftar': 'Daftar Pasien',
  '/keuangan': 'Laporan Keuangan',
  '/profil': 'Profil Saya',
  '/pengaturan': 'Pengaturan',
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
};

const roleConfig = {
  admin:       { label: 'Manajer Klinik', color: '#7c3aed', bg: '#f5f3ff' },
  dokter:      { label: 'Dokter',         color: '#0F4C81', bg: '#eff6ff' },
  resepsionis: { label: 'Resepsionis',    color: '#059669', bg: '#f0fdf4' },
};

const Navbar = ({ onMenuClick }) => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);

  const handleLogout = async () => {
    setShowUserMenu(false);
    const { success } = await signOut();
    if (success) navigate('/login');
  };

  const pageTitle = ROUTE_LABELS[location.pathname] || 'Dentiva';
  const role = userProfile?.role;
  const rc = roleConfig[role] || roleConfig.admin;
  const initials = getInitials(userProfile?.full_name);

  return (
    <nav
      className="bg-card border-b border-border shadow-sm sticky top-0 z-40"
    >
      <div className="px-5 max-w-full">
        <div
          className="flex items-center justify-between h-[62px] gap-3"
        >
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl text-text-muted hover:bg-background transition-colors border-0 bg-transparent cursor-pointer flex"
              aria-label="Buka menu navigasi"
            >
              <Menu size={22} />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden bg-card border border-border"
              >
                <img src="/dentiva-logo.png" alt="Dentiva Logo" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[17px] font-extrabold text-accent-primary leading-tight">
                  Dentiva
                </div>
                <div className="text-[10.5px] text-text-muted font-medium tracking-wider">
                  KLINIK GIGI
                </div>
              </div>
            </div>
          </div>

          {/* Center: page title (desktop) */}
          <div
            className="hidden md:flex flex-1 justify-center items-center gap-1.5 text-text-muted text-xs font-medium"
          >
            <span className="opacity-70">Dentiva</span>
            <ChevronRight size={14} className="opacity-50" />
            <span className="text-text-primary font-semibold">{pageTitle}</span>
          </div>

          {/* Right: user */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {/* Name + role (desktop) */}
            <div className="hidden md:block text-right">
              <div className="text-[13.5px] font-semibold text-text-primary leading-snug">
                {userProfile?.full_name || 'User'}
              </div>
              <span
                className="inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-full bg-accent-primary/10 text-accent-primary tracking-wider uppercase"
              >
                {rc.label}
              </span>
            </div>

            {/* Avatar button */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary border-0 cursor-pointer text-white text-sm font-bold flex items-center justify-center shadow-md hover:scale-105 transition-all flex-shrink-0"
              >
                {initials}
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] w-[220px] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right"
                  >
                    {/* User info header */}
                    <div
                      className="p-3.5 border-b border-border bg-background/50"
                    >
                      <div className="text-[13.5px] font-bold text-text-primary">
                        {userProfile?.full_name || 'User'}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 truncate">
                        {userProfile?.email || ''}
                      </div>
                    </div>

                    {/* Menu items */}
                    {[
                      { icon: <User size={15} />, label: 'Profil Saya', onClick: () => { setShowUserMenu(false); navigate('/profil'); } },
                      { icon: <Settings size={15} />, label: 'Pengaturan', onClick: () => { setShowUserMenu(false); navigate('/pengaturan'); } },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={item.onClick}
                        className="w-full px-4 py-2.5 bg-transparent border-0 cursor-pointer flex items-center gap-2.5 text-[13.5px] text-text-primary hover:bg-background transition-colors"
                      >
                        <span className="text-text-muted">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}

                    <div className="border-t border-border my-1" />

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 bg-transparent border-0 cursor-pointer flex items-center gap-2.5 text-[13.5px] text-red-600 font-semibold hover:bg-red-500/10 transition-colors mb-1"
                    >
                      <LogOut size={15} />
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
