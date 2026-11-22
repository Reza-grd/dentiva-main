import { supabase } from './supabase';

/**
 * Notifikasi dalam aplikasi (ikon lonceng). RLS menyaring otomatis: hanya notifikasi
 * untuk saya, peran saya, seluruh staf klinik, atau yang saya kirim.
 */
export const notifikasiService = {
  async daftar(userId, batas = 40) {
    const { data, error } = await supabase
      .from('notifikasi')
      .select('id, jenis, judul, isi, tautan, created_at, pengirim_id, penerima_id, penerima_role, pengirim:users!notifikasi_pengirim_id_fkey(full_name, role), dibaca:notifikasi_dibaca(user_id)')
      .order('created_at', { ascending: false })
      .limit(batas);
    if (error) throw error;
    return (data || []).map((n) => ({
      ...n,
      milikSaya: n.pengirim_id === userId,
      sudahDibaca: n.pengirim_id === userId || (n.dibaca || []).some((d) => d.user_id === userId),
    }));
  },

  async tandaiDibaca(id) {
    const { error } = await supabase.from('notifikasi_dibaca').upsert({ notifikasi_id: id }, { onConflict: 'notifikasi_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
  },

  async tandaiSemuaDibaca() {
    const { error } = await supabase.rpc('tandai_semua_notifikasi_dibaca');
    if (error) throw error;
  },

  /** sasaran: { penerima_id } | { penerima_role } | {} (seluruh staf) */
  async kirim({ judul, isi, sasaran = {} }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('notifikasi').insert({
      jenis: 'pesan',
      pengirim_id: user?.id,
      judul: judul.trim().slice(0, 120),
      isi: isi?.trim() ? isi.trim().slice(0, 1000) : null,
      penerima_id: sasaran.penerima_id || null,
      penerima_role: sasaran.penerima_role || null,
    });
    if (error) throw error;
  },

  async hapus(id) {
    const { error } = await supabase.from('notifikasi').delete().eq('id', id);
    if (error) throw error;
  },

  async daftarStaf() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, role')
      .in('status', ['active', 'invited'])
      .order('full_name');
    if (error) throw error;
    return data || [];
  },

  /** Langganan perubahan realtime; kembalikan fungsi berhenti. */
  pantau(clinicId, onBaru) {
    if (!clinicId) return () => {};
    const ch = supabase
      .channel(`notifikasi:${clinicId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `clinic_id=eq.${clinicId}` }, (p) => onBaru(p.new))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  },
};
