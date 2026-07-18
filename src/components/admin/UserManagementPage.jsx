import React, { useState, useEffect } from 'react';
import { userManagementService } from '../../services/userManagementService';
import { useToast } from '../common/ToastNotification';
import ConfirmDialog from '../common/ConfirmDialog';
import { UserPlus, Shield, UserX, UserCheck, RefreshCw, Edit2, ShieldAlert } from 'lucide-react';

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'resepsionis',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, user: null, action: null }); // action: 'deactivate' | 'reactivate'

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { success, data, error } = await userManagementService.listUsers();
    if (success) {
      setUsers(data || []);
    } else {
      toast.error('Gagal memuat data pengguna: ' + error);
    }
    setLoading(false);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (addForm.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    
    setIsSubmitting(true);
    const { success, error } = await userManagementService.createStaffUser(addForm);
    setIsSubmitting(false);

    if (success) {
      toast.success('Staf berhasil ditambahkan');
      setShowAddModal(false);
      setAddForm({ email: '', password: '', full_name: '', role: 'resepsionis', phone: '' });
      fetchUsers();
    } else {
      toast.error('Gagal menambahkan staf: ' + error);
    }
  };

  const handleRoleChange = async (userId, userName, newRole) => {
    const { success, error } = await userManagementService.updateUserRole(userId, newRole, userName);
    if (success) {
      toast.success(`Peran ${userName} diubah menjadi ${newRole}`);
      fetchUsers();
    } else {
      toast.error('Gagal mengubah peran: ' + error);
    }
  };

  const toggleStatus = (user) => {
    const isCurrentlyActive = user.is_active !== false;
    setConfirmDialog({
      isOpen: true,
      user,
      action: isCurrentlyActive ? 'deactivate' : 'reactivate'
    });
  };

  const executeToggleStatus = async () => {
    if (!confirmDialog.user) return;
    
    const isActive = confirmDialog.action === 'reactivate';
    const { success, error } = await userManagementService.toggleUserActiveStatus(
      confirmDialog.user.id, 
      isActive, 
      confirmDialog.user.full_name
    );
    
    if (success) {
      toast.success(`Akun staf berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchUsers();
    } else {
      toast.error('Gagal mengubah status staf: ' + error);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 relative max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-[var(--color-accent)]" /> Manajemen Pengguna
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Kelola staf klinik, peran, dan akses sistem
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white font-semibold rounded-xl transition-all shadow-md shadow-[var(--color-accent)]/20"
          >
            <UserPlus size={18} /> Tambah Staf
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staf</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">Memuat data...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">Tidak ada staf ditemukan</td>
                </tr>
              ) : (
                users.map(u => {
                  const isActive = u.is_active !== false;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{u.full_name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                        {u.phone && <div className="text-xs text-gray-400 mt-0.5">{u.phone}</div>}
                      </td>
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, u.full_name, e.target.value)}
                          className="text-sm bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-medium focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                          disabled={!isActive}
                        >
                          <option value="admin">Admin</option>
                          <option value="dokter">Dokter</option>
                          <option value="resepsionis">Resepsionis</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-800' 
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-800'
                        }`}>
                          {isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => toggleStatus(u)}
                          className={`p-2 rounded-xl border transition-colors ${
                            isActive 
                              ? 'text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-900/30' 
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-900/30'
                          }`}
                          title={isActive ? "Nonaktifkan Akses" : "Aktifkan Akses"}
                        >
                          {isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 animate-scale-in overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="text-[var(--color-accent)]" size={20} />
                Tambah Staf Baru
              </h2>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={addForm.full_name}
                  onChange={e => setAddForm({...addForm, full_name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                  placeholder="Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={e => setAddForm({...addForm, email: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                  placeholder="budi@klinik.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Password Sementara</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={addForm.password}
                  onChange={e => setAddForm({...addForm, password: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none font-mono"
                  placeholder="Minimal 6 karakter"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Peran (Role)</label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm({...addForm, role: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="dokter">Dokter</option>
                    <option value="resepsionis">Resepsionis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={e => setAddForm({...addForm, phone: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-accent)] outline-none"
                    placeholder="0812..."
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-secondary)] text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Deactivate/Reactivate */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.action === 'deactivate' ? "Nonaktifkan Akses" : "Aktifkan Akses"}
        message={`Apakah Anda yakin ingin ${confirmDialog.action === 'deactivate' ? 'menonaktifkan' : 'mengaktifkan kembali'} akses untuk ${confirmDialog.user?.full_name}?`}
        confirmText={confirmDialog.action === 'deactivate' ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
        type={confirmDialog.action === 'deactivate' ? 'danger' : 'info'}
        onClose={() => setConfirmDialog({ isOpen: false, user: null, action: null })}
        onConfirm={executeToggleStatus}
      />
    </div>
  );
};

export default UserManagementPage;
