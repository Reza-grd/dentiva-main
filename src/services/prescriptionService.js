import { supabase } from './supabase';

export const prescriptionService = {
  /**
   * Mengambil daftar obat aktif dari master_obat
   */
  async getActiveObat() {
    try {
      const { data, error } = await supabase
        .from('master_obat')
        .select('*')
        .eq('is_active', true)
        .order('nama_obat', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching active obat:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Mengambil resep (obat) untuk kunjungan tertentu
   * @param {string} visitId - ID dari kunjungan
   */
  async getVisitObat(visitId) {
    try {
      if (!visitId) throw new Error('Visit ID is required');

      const { data, error } = await supabase
        .from('visit_obat')
        .select('*')
        .eq('visit_id', visitId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching visit obat:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Menambahkan/mengganti resep untuk sebuah kunjungan.
   * Karena ini bersifat atomik, kita bisa menghapus semua obat lama lalu memasukkan yang baru (mirip dgn visit_treatments).
   * @param {string} visitId
   * @param {Array} prescriptionsArray
   */
  async replaceVisitObat(visitId, prescriptionsArray) {
    try {
      if (!visitId) throw new Error('Visit ID is required');

      // Mulai dengan menghapus semua obat untuk visit ini
      const { error: deleteError } = await supabase
        .from('visit_obat')
        .delete()
        .eq('visit_id', visitId);

      if (deleteError) throw deleteError;

      if (!prescriptionsArray || prescriptionsArray.length === 0) {
        return { success: true, data: [] };
      }

      // Format payload untuk diinsert
      const payload = prescriptionsArray.map(p => ({
        visit_id: visitId,
        obat_id: p.obat_id,
        nama_obat: p.nama_obat,
        dosis: p.dosis || '',
        frekuensi: p.frekuensi || '',
        qty: parseInt(p.qty, 10) || 1,
        harga_satuan: parseFloat(p.harga_satuan) || 0,
        subtotal: (parseInt(p.qty, 10) || 1) * (parseFloat(p.harga_satuan) || 0)
      }));

      // Insert data baru
      const { data, error: insertError } = await supabase
        .from('visit_obat')
        .insert(payload)
        .select();

      if (insertError) throw insertError;
      return { success: true, data };
    } catch (error) {
      console.error('Error replacing visit obat:', error);
      return { success: false, error: error.message };
    }
  }
};
