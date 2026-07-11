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
      style={{
        background: 'white',
        borderBottom: '1px solid rgba(15,76,129,0.08)',
        boxShadow: '0 2px 12px rgba(15,76,129,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ padding: '0 20px', maxWidth: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 62,
            gap: 12,
          }}
        >
          {/* Left: hamburger + logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={onMenuClick}
              className="lg:hidden"
              style={{
                padding: 8,
                borderRadius: 10,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#475569',
                display: 'flex',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Menu size={22} />
            </button>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(15,76,129,0.22)',
                  flexShrink: 0,
                  overflow: 'hidden',
                  backgroundColor: '#fff'
                }}
              >
                <img src="/dentiva-logo.png" alt="Dentiva Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="hidden sm:block">
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0F4C81', lineHeight: 1.1 }}>
                  Dentiva
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 500, letterSpacing: '0.04em' }}>
                  KLINIK GIGI
                </div>
              </div>
            </div>
          </div>

          {/* Center: page title (desktop) */}
          <div
            className="hidden md:flex"
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span style={{ color: '#cbd5e1' }}>Dentiva</span>
            <ChevronRight size={14} style={{ color: '#cbd5e1' }} />
            <span style={{ color: '#475569', fontWeight: 600 }}>{pageTitle}</span>
          </div>

          {/* Right: user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Name + role (desktop) */}
            <div className="hidden md:block" style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>
                {userProfile?.full_name || 'User'}
              </div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '1px 8px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  borderRadius: 99,
                  background: rc.bg,
                  color: rc.color,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {rc.label}
              </span>
            </div>

            {/* Avatar button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${rc.color}, ${rc.color}cc)`,
                  border: 'none',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(15,76,129,0.2)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,76,129,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,76,129,0.2)';
                }}
              >
                {initials}
              </button>

              {showUserMenu && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: 220,
                      background: 'white',
                      borderRadius: 14,
                      boxShadow: '0 12px 40px rgba(15,30,50,0.15)',
                      border: '1px solid rgba(15,76,129,0.08)',
                      overflow: 'hidden',
                      zIndex: 50,
                      animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
                      transformOrigin: 'top right',
                    }}
                  >
                    {/* User info header */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        background: '#fafbfc',
                      }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1e293b' }}>
                        {userProfile?.full_name || 'User'}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
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
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          fontSize: 13.5,
                          color: '#374151',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <span style={{ color: '#94a3b8' }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}

                    <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: logoutHover ? '#fef2f2' : 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 13.5,
                        color: '#EF4444',
                        fontWeight: 600,
                        transition: 'background 0.15s',
                        marginBottom: 4,
                      }}
                      onMouseEnter={() => setLogoutHover(true)}
                      onMouseLeave={() => setLogoutHover(false)}
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
