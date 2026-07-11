import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, User, Settings, Menu, ChevronRight, Sun, Moon, Palette } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { formatDoctorName } from '../../utils/dateUtils';

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
  const { theme, toggleTheme, primaryColor, setPrimaryColor } = useTheme();
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

  const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 dark:bg-[#0B0E14]/70 border-b border-gray-200/50 dark:border-gray-800/50 transition-colors duration-300">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Menu & Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            <span>Dentiva</span>
            <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{pageTitle}</span>
          </div>
        </div>

        {/* Right: Actions & User */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Theme Controls */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-full border border-gray-200 dark:border-gray-700/50">
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow-sm text-yellow-500' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Sun size={16} />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-gray-700 shadow-sm text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Moon size={16} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <Palette size={16} />
              </button>
              
              {showColorPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                  <div className="absolute right-0 top-full mt-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 flex gap-2">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => { setPrimaryColor(c); setShowColorPicker(false); }}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-850 hover:scale-110 transition-transform focus:outline-none"
                        style={{
                          backgroundColor: c,
                          boxShadow: primaryColor === c
                            ? `0 0 0 2px ${theme === 'dark' ? '#1F2937' : '#FFFFFF'}, 0 0 0 4px ${c}`
                            : 'none'
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800 shadow-sm border border-gray-250 dark:border-gray-750">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))' }}
                  >
                    {initials}
                  </div>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                  {formatDoctorName(userProfile) || userProfile?.full_name || 'User'}
                </div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {role}
                </div>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#14171F] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden transform origin-top-right animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatDoctorName(userProfile) || userProfile?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{userProfile?.email || ''}</div>
                  </div>
                  <div className="p-2">
                    <button onClick={() => { setShowUserMenu(false); navigate(userProfile?.role === 'dokter' ? '/dokter/profil-dokter' : '/profil'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                      <User size={16} className="text-gray-400" /> Profil Saya
                    </button>
                    <button onClick={() => { setShowUserMenu(false); navigate('/pengaturan'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                      <Settings size={16} className="text-gray-400" /> Pengaturan
                    </button>
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-gray-800/50">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
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
