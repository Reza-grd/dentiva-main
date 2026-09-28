import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AccessDenied = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const roleHome = { admin: '/admin', dokter: '/dokter', resepsionis: '/resepsionis' };
  const home = roleHome[userProfile?.role] || '/login';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-5">
          <ShieldOff size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
        <p className="text-gray-500 mb-6 text-sm leading-relaxed">
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.
        </p>
        <button
          onClick={() => navigate(home)}
          className="btn btn-primary w-full justify-center"
        >
          <ArrowLeft size={16} />
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
