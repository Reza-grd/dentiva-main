import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/ToastNotification';
import LoadingSpinner from '../common/LoadingSpinner';
import { User, Phone, Mail, Shield, Save, Check } from 'lucide-react';

const ProfilePage = () => {
  const { user, userProfile, updateProfile } = useAuth();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.full_name || '');
      setPhone(userProfile.phone || '');
    }
  }, [userProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrors({});
    
    const newErrors = {};
    if (!fullName.trim()) {
      newErrors.fullName = 'Nama Lengkap wajib diisi';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Harap lengkapi formulir dengan benar.');
      return;
    }

    setLoading(true);
    const { success, error } = await updateProfile({
      full_name: fullName,
      phone: phone || null,
    });
    setLoading(false);

    if (success) {
      toast.success('Profil berhasil diperbarui!');
    } else {
      toast.error('Gagal memperbarui profil: ' + error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <User className="text-[var(--color-accent)]" size={32} />
          Profil Saya
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Kelola informasi pribadi dan data profil Anda</p>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-2xl space-y-8">
        {/* Avatar Banner */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary, var(--color-accent)))' }}
          >
            {getInitials(userProfile?.full_name)}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{userProfile?.full_name || 'User'}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                <Shield size={12} />
                {userProfile?.role === 'admin' ? 'Manajer Klinik' : userProfile?.role}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Terdaftar sejak: {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: null })); }}
                className={`glass-input w-full px-4 py-2.5 rounded-xl ${errors.fullName ? 'border-rose-500 ring-rose-500' : ''}`}
                placeholder="Nama lengkap Anda..."
              />
              {errors.fullName && <p className="text-rose-500 text-xs mt-1.5">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Phone size={16} className="text-gray-400" />
                Nomor Telepon
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl"
                placeholder="Nomor telepon aktif..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Mail size={16} className="text-gray-400" />
                Email (Hanya-Baca)
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="glass-input w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Shield size={16} className="text-gray-400" />
                Hak Akses / Role (Hanya-Baca)
              </label>
              <input
                type="text"
                value={userProfile?.role === 'admin' ? 'Manajer Klinik' : (userProfile?.role || '')}
                disabled
                className="glass-input w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-gray-500 dark:text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-800 uppercase font-semibold text-xs tracking-wider"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
