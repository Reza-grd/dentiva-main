import { supabase } from './supabase';

export const userManagementService = {
  /**
   * Mengambil daftar semua pengguna (staf)
   */
  async listUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name');
        
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Membuat pengguna staf baru via Edge Function
   */
  async createStaffUser(payload) {
    try {
      // Dapatkan token saat ini untuk otorisasi Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('No active session');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Gagal membuat pengguna');
      }

      // Log audit
      await this.logAudit('CREATE', `Mendaftarkan staf baru: ${payload.full_name} (${payload.role})`, null, payload);

      return { success: true, data: result.user };
    } catch (error) {
      console.error('Error creating staff user:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Mengubah peran (role) pengguna
   */
  async updateUserRole(userId, newRole, userName) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single();
        
      if (error) throw error;

      await this.logAudit('UPDATE', `Mengubah peran ${userName || userId} menjadi ${newRole}`, { old_role: 'unknown' }, { new_role: newRole });

      return { success: true, data };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Mengubah status aktif pengguna (deactivate/reactivate)
   */
  async toggleUserActiveStatus(userId, isActive, userName) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId)
        .select()
        .single();
        
      if (error) throw error;

      const actionText = isActive ? 'Mengaktifkan kembali' : 'Menonaktifkan';
      await this.logAudit(isActive ? 'REACTIVATE' : 'DEACTIVATE', `${actionText} akun staf ${userName || userId}`, { is_active: !isActive }, { is_active: isActive });

      return { success: true, data };
    } catch (error) {
      console.error('Error toggling user active status:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Internal helper untuk mencatat log audit ke tabel audit_logs
   */
  async logAudit(action, detailsStr, previousValue, newValue) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

      await supabase.from('audit_logs').insert([{
        user_id: user.id,
        user_role: profile?.role || 'unknown',
        module: 'USER_MANAGEMENT',
        action: action,
        previous_value: previousValue || null,
        new_value: newValue || null,
        risk_level: action === 'DEACTIVATE' || action === 'CREATE' ? 'HIGH' : 'MEDIUM'
      }]);
    } catch (err) {
      console.error('Failed to write audit log for user management:', err);
    }
  }
};
