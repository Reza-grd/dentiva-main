import { supabase } from './supabase';

export const prescriptionService = {
  /**
   * Mengambil daftar obat aktif dari master_obat
   */
  async getActiveObat() {
    try {
      const { data, error } = await supabase
        .from('master_bahan')
        .select('*')
        .eq('is_active', true)
        .eq('kategori', 'Obat')
        .order('nama_bahan', { ascending: true });

      if (error) throw error;
      
      // Map it back to match the old expected format just in case UI hasn't been fully updated yet
      const mappedData = data.map(item => ({
        ...item,
        id: item.id,
        nama_obat: item.nama_bahan,
        satuan: item.satuan_dasar,
        harga_satuan: item.harga_rata2 || 0
      }));

      return { success: true, data: mappedData };
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
        obat_id: p.obat_id, // Tetap isi obat_id (legacy)
        master_bahan_id: p.obat_id, // Isi kolom baru master_bahan_id dengan id yang sama
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
