import { supabase } from './supabase';

/**
 * Pengaturan akun pribadi: ganti email (fungsi akun-ganti-email) dan penautan WhatsApp untuk Eira
 * (RPC wa_buat_kode_tautan + tabel wa_tautan_akun milik sendiri).
 */
export const akunService = {
  async gantiEmail(emailBaru, password) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: 'Sesi berakhir. Silakan masuk kembali.' };
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/akun-ganti-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ email_baru: emailBaru, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: body.error || 'Email gagal diganti.' };
      await supabase.auth.refreshSession().catch(() => {});
      return { ok: true, email: body.email };
    } catch {
      return { ok: false, error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' };
    }
  },

  async buatKodeWa() {
    const { data, error } = await supabase.rpc('wa_buat_kode_tautan');
    if (error) return { ok: false, error: error.message };
    return { ok: true, kode: data.kode, kedaluwarsa: data.kedaluwarsa };
  },

  async daftarTautanWa() {
    const { data, error } = await supabase.from('wa_tautan_akun')
      .select('id, nomor_tersamar, dibuat_pada, terakhir_dipakai').order('dibuat_pada', { ascending: false });
    if (error) return { ok: false, error: error.message, data: [] };
    return { ok: true, data: data || [] };
  },

  async putuskanWa(id) {
    const { error } = await supabase.from('wa_tautan_akun').delete().eq('id', id);
    return error ? { ok: false, error: error.message } : { ok: true };
  },
};
