import React, { useState, useEffect } from 'react';
import { userManagementService } from '../../services/userManagementService';
import { useToast } from '../common/ToastNotification';
import ConfirmDialog from '../common/ConfirmDialog';
import { UserPlus, Shield, UserX, UserCheck, RefreshCw, Edit2, ShieldAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userManagementSchema } from '../../utils/validationSchemas';
// Status akun (kolom users.status); is_active dipakai sebagai cadangan selama masa transisi.
const STATUS_LABEL = { invited: 'Diundang', active: 'Aktif', suspended: 'Ditangguhkan', deactivated: 'Nonaktif' };
const isUserActive = (u) => (u.status ? ['invited', 'active'].includes(u.status) : u.is_active !== false);

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const toast = useToast();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting: formSubmitting } } = useForm({
    resolver: zodResolver(userManagementSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      role: 'resepsionis',
      phone: ''
    }
  });

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

  const handleAddSubmit = async (data) => {
    const { success, error } = await userManagementService.createStaffUser(data);

    if (success) {
      toast.success('Staf berhasil ditambahkan');
      setShowAddModal(false);
      reset();
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
    const isCurrentlyActive = isUserActive(user);
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
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="text-accent-primary" /> Manajemen Pengguna
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Kelola staf klinik, peran, dan akses sistem
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="p-2 border border-border rounded-xl text-text-muted hover:bg-background transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl transition-all shadow-md shadow-accent-primary/20 hover:opacity-90 border-0"
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
              <tr className="bg-background/50 border-b border-border">
                <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Staf</th>
                <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-text-muted uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-text-muted">Memuat data...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-text-muted">Tidak ada staf ditemukan</td>
                </tr>
              ) : (
                users.map(u => {
                  const isActive = isUserActive(u);
                  const statusLabel = STATUS_LABEL[u.status] ?? (isActive ? 'Aktif' : 'Nonaktif');
                  return (
                    <tr key={u.id} className="hover:bg-background/50 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-text-primary">{u.full_name}</div>
                        <div className="text-xs text-text-muted">{u.email}</div>
                        {u.phone && <div className="text-xs text-text-muted mt-0.5">{u.phone}</div>}
                      </td>
                      <td className="p-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, u.full_name, e.target.value)}
                          className="text-sm bg-card text-text-primary border border-border rounded-lg px-2 py-1 font-medium focus:ring-2 focus:ring-accent-primary outline-none"
                          disabled={!isActive}
                        >
                          <option value="admin">Admin</option>
                          {/* Peran dokter hanya diberikan tim Dentiva (verifikasi) — tampil hanya bila sudah dokter */}
                          {u.role === 'dokter' && <option value="dokter">Dokter</option>}
                          <option value="resepsionis">Resepsionis</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          isActive 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => toggleStatus(u)}
                          // Status 'suspended' dipasang tim Dentiva; hanya bisa dilepas dari Dentiva Console.
                          disabled={u.status === 'suspended'}
                          className={`p-2 rounded-xl border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            isActive
                              ? 'text-rose-600 border-rose-200 hover:bg-rose-500/10 dark:border-rose-900'
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-500/10 dark:border-emerald-900'
                          }`}
                          title={
                            u.status === 'suspended'
                              ? 'Ditangguhkan oleh tim Dentiva — hubungi support@dentiva.co.id'
                              : isActive ? "Nonaktifkan Akses" : "Aktifkan Akses"
                          }
                          aria-label={
                            u.status === 'suspended'
                              ? `${u.full_name} ditangguhkan oleh tim Dentiva`
                              : `${isActive ? 'Nonaktifkan' : 'Aktifkan'} akses ${u.full_name}`
                          }
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
          <div className="bg-card text-text-primary rounded-2xl w-full max-w-md shadow-2xl border border-border animate-scale-in overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <UserPlus className="text-accent-primary" size={20} />
                Tambah Staf Baru
              </h2>
            </div>
            
            <form onSubmit={handleSubmit(handleAddSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Nama Lengkap</label>
                <input
                  type="text"
                  {...register('full_name')}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:ring-2 focus:ring-accent-primary outline-none"
                  placeholder="Budi Santoso"
                />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:ring-2 focus:ring-accent-primary outline-none"
                  placeholder="budi@klinik.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Nomor Telepon/WA</label>
                <input
                  type="text"
                  {...register('phone')}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:ring-2 focus:ring-accent-primary outline-none"
                  placeholder="081234567890"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Password Sementara</label>
                <input
                  type="text"
                  {...register('password')}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:ring-2 focus:ring-accent-primary outline-none font-mono"
                  placeholder="Minimal 6 karakter"
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted mb-1.5 uppercase tracking-wide">Peran (Role)</label>
                  <select
                    {...register('role')}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-text-primary text-sm focus:ring-2 focus:ring-accent-primary outline-none"
                  >
                    <option value="resepsionis">Resepsionis</option>
                  </select>
                  {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
                  <p className="text-xs text-text-muted mt-1">Akun dokter dibuat dan diverifikasi oleh tim Dentiva — hubungi dukungan.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    reset();
                  }}
                  className="flex-1 px-4 py-2.5 border border-border text-text-primary rounded-xl hover:bg-background transition-colors font-medium text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-xl hover:opacity-90 transition-all font-medium text-sm disabled:opacity-70 flex items-center justify-center gap-2 border-0"
                >
                  {formSubmitting ? (
                    <><RefreshCw size={18} className="animate-spin" /> Menyimpan...</>
                  ) : (
                    'Simpan Staf'
                  )}
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
