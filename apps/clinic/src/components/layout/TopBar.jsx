import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, User, Settings, Menu, ChevronRight, Sun, Moon, Palette, Bell, ChevronDown } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { formatDoctorName } from '../../utils/dateUtils';
import GlobalSearch from './GlobalSearch';
import ThemeGallery from '../common/ThemeGallery';

const ROUTE_LABELS = {
  '/admin': 'Dashboard Manajer Klinik',
  '/dokter': 'Dashboard Dokter',
  '/resepsionis': 'Dashboard Resepsionis',
  '/pasien': 'Data Pasien',
  '/pasien/daftar': 'Daftar Pasien',
  '/keuangan': 'Laporan Keuangan',
  '/profil': 'Profil Saya',
  '/dokter/profil-dokter': 'Profil Dokter',
  '/pengaturan': 'Pengaturan',
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
};

const TopBar = ({ onMenuClick }) => {
  const { userProfile, signOut } = useAuth();
  const { theme, setThemeMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleLogout = async () => {
    setShowUserMenu(false);
    const { success } = await signOut();
    if (success) navigate('/login');
  };

  const pageTitle = ROUTE_LABELS[location.pathname] || 'Dentiva';
  const role = userProfile?.role === 'admin' ? 'Manajer Klinik' : (userProfile?.role || 'admin');
  const initials = getInitials(userProfile?.full_name);

  let profilePhotoUrl = null;
  if (userProfile?.foto_profil) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(userProfile.foto_profil);
    profilePhotoUrl = data?.publicUrl;
  }

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-card/70 border-b border-border/50 transition-colors duration-200">
      <div className="flex h-16 md:h-[72px] lg:h-20 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Menu & Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            aria-label="Buka menu navigasi"
            className="lg:hidden p-2 text-text-muted hover:bg-background rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-text-muted opacity-90">
            <span>Dentiva</span>
            <ChevronRight size={12} className="text-text-muted opacity-60" />
            <span className="text-text-primary text-sm font-bold opacity-100">{pageTitle}</span>
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 w-full max-w-sm md:max-w-md xl:max-w-lg mx-4 flex justify-center">
          <GlobalSearch />
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-4 md:gap-6">
          {/* Theme Controls */}
          <div className="flex items-center gap-1.5 bg-background/80 p-1 rounded-full border border-border">
            <button
              onClick={() => setThemeMode('light')}
              aria-label="Aktifkan mode terang"
              aria-pressed={theme === 'light'}
              className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'light' ? 'bg-card shadow-sm text-amber-500' : 'text-text-muted hover:text-text-primary'}`}
            >
              <Sun size={15} />
            </button>
            <button
              onClick={() => setThemeMode('dark')}
              aria-label="Aktifkan mode gelap"
              aria-pressed={theme === 'dark'}
              className={`p-1.5 rounded-full transition-all duration-200 ${theme === 'dark' ? 'bg-accent-primary/20 shadow-sm text-accent-primary' : 'text-text-muted hover:text-text-primary'}`}
            >
              <Moon size={15} />
            </button>
            
            <div className="relative flex items-center">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                aria-label="Ubah tema warna aksen"
                className="p-1.5 rounded-full text-text-muted hover:text-text-primary transition-colors"
              >
                <Palette size={15} />
              </button>
              
              {showColorPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-card border border-border rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
                    <ThemeGallery compact onSelect={() => setShowColorPicker(false)} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="h-6 w-px bg-border hidden sm:block"></div>

          {/* Notifications Placeholder */}
          <div className="relative">
            <button
              aria-label="Pemberitahuan / Notifikasi"
              className="p-2 rounded-full text-text-muted hover:bg-background transition-colors"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card"></span>
            </button>
          </div>

          {/* User Menu */}
          <div className="relative flex items-center">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-label="Menu profil pengguna"
              className="flex items-center gap-3 p-1.5 pr-4 rounded-full hover:bg-background transition-all duration-200 border border-transparent hover:border-border group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-background shadow-sm border border-border relative">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-xs bg-gradient-to-br from-accent-primary to-accent-secondary"
                  >
                    {initials}
                  </div>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-text-primary leading-tight">
                  {formatDoctorName(userProfile) || userProfile?.full_name || 'User'}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 w-fit px-1.5 py-0.5 rounded-md ${
                  userProfile?.role === 'admin' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                  userProfile?.role === 'resepsionis' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' :
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {role}
                </div>
              </div>
              <ChevronDown size={14} className="text-text-muted group-hover:text-text-primary transition-colors ml-1 hidden sm:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-border bg-background/50">
                    <div className="text-sm font-bold text-text-primary">
                      {formatDoctorName(userProfile) || userProfile?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-text-muted truncate">{userProfile?.email || ''}</div>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { setShowUserMenu(false); navigate(userProfile?.role === 'dokter' ? '/dokter/profil-dokter' : '/profil'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-background rounded-xl transition-colors">
                      <User size={16} className="text-text-muted" /> Profil Saya
                    </button>
                    <button onClick={() => { setShowUserMenu(false); navigate('/pengaturan'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-background rounded-xl transition-colors">
                      <Settings size={16} className="text-text-muted" /> Pengaturan
                    </button>
                  </div>
                  <div className="p-2 border-t border-border">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 rounded-xl transition-colors">
                      <LogOut size={16} /> Keluar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
