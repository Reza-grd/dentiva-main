import { supabase } from './supabase.js';
import logger from '../utils/logger.js';

export const inventoryService = {
  // ==========================================
  // MASTER BAHAN
  // ==========================================
  async getMasterBahan() {
    try {
      const { data, error } = await supabase
        .from('master_bahan')
        .select('*')
        .order('kategori', { ascending: true })
        .order('nama_bahan', { ascending: true });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching master bahan:', error);
      return { success: false, error: error.message };
    }
  },

  async upsertMasterBahan(payload) {
    try {
      const { data, error } = await supabase
        .from('master_bahan')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error upserting master bahan:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteMasterBahan(id) {
    try {
      const { error } = await supabase
        .from('master_bahan')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      logger.error('Error deleting master bahan:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // MATERIAL BATCHES (FEFO Tracking)
  // ==========================================
  async getMaterialBatches(materialId) {
    try {
      let query = supabase
        .from('material_batches')
        .select('*');
      
      if (materialId) {
        query = query.eq('material_id', materialId);
      }
      
      const { data, error } = await query.order('tanggal_kadaluarsa', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching material batches:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // PEMBELIAN (STOK MASUK)
  // ==========================================
  async recordMaterialPurchase(payload) {
    try {
      // payload: { material_id, tanggal, jumlah_beli, jumlah_dasar, harga_satuan_beli, supplier, no_faktur, tanggal_kadaluarsa }
      // Trigger database akan otomatis menghitung total_harga, memproses update stok di master_bahan,
      // update harga rata-rata, dan mencatat ke stok_movements.
      const { data, error } = await supabase
        .from('material_purchases')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      
      // Jika ada tanggal kadaluarsa, tambahkan juga ke material_batches secara manual (karena trigger tidak handle ini)
      if (payload.tanggal_kadaluarsa) {
        await supabase.from('material_batches').insert({
          material_id: payload.material_id,
          no_batch: payload.no_faktur || `BATCH-${Date.now()}`,
          tanggal_masuk: payload.tanggal,
          tanggal_kadaluarsa: payload.tanggal_kadaluarsa,
          qty_awal: payload.jumlah_dasar,
          qty_sisa: payload.jumlah_dasar,
          harga_satuan: payload.harga_satuan_beli / (payload.jumlah_dasar / payload.jumlah_beli)
        });
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Error recording material purchase:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // KARTU STOK (STOK MOVEMENTS)
  // ==========================================
  async getStokMovements({ materialId, startDate, endDate, tipe } = {}) {
    try {
      let query = supabase
        .from('stok_movements')
        .select(`
          *,
          master_bahan (
            nama_bahan,
            satuan_dasar
          )
        `);

      if (materialId) query = query.eq('material_id', materialId);
      if (tipe && tipe !== 'all') query = query.eq('tipe', tipe);
      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching stok movements:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // STOK OPNAME
  // ==========================================
  async getStokOpnameHistory(materialId = null) {
    try {
      let query = supabase
        .from('stok_opname')
        .select(`
          *,
          master_bahan (nama_bahan, satuan_dasar),
          users (full_name)
        `);
        
      if (materialId) query = query.eq('material_id', materialId);
      
      const { data, error } = await query.order('tanggal', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching stok opname history:', error);
      return { success: false, error: error.message };
    }
  },

  async createStokOpname(payload) {
    try {
      // payload: { tanggal, material_id, stok_sistem, stok_fisik, catatan, dilakukan_oleh }
      const selisih = payload.stok_fisik - payload.stok_sistem;
      
      // 1. Catat ke tabel stok_opname
      const { data: opnameData, error: opnameError } = await supabase
        .from('stok_opname')
        .insert(payload)
        .select()
        .single();
      if (opnameError) throw opnameError;

      // 2. Update master_bahan
      const { error: updateError } = await supabase
        .from('master_bahan')
        .update({ stok_saat_ini: payload.stok_fisik, updated_at: new Date().toISOString() })
        .eq('id', payload.material_id);
      if (updateError) throw updateError;

      // 3. Catat ke stok_movements
      if (selisih !== 0) {
        const { error: moveError } = await supabase
          .from('stok_movements')
          .insert({
            material_id: payload.material_id,
            tipe: 'opname',
            jumlah: selisih,
            stok_sebelum: payload.stok_sistem,
            stok_sesudah: payload.stok_fisik,
            referensi_tipe: 'opname',
            referensi_id: opnameData.id,
            catatan: payload.catatan || 'Penyesuaian stok opname',
            created_by: payload.dilakukan_oleh
          });
        if (moveError) throw moveError;
      }

      return { success: true, data: opnameData };
    } catch (error) {
      logger.error('Error creating stok opname:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // ALERTS
  // ==========================================
  async getLowStockAlerts() {
    try {
      // Fetch materials where stok_saat_ini <= stok_minimum
      const { data, error } = await supabase
        .from('master_bahan')
        .select('*')
        .eq('is_active', true);
        
      if (error) throw error;
      
      const alerts = data.filter(item => item.stok_saat_ini <= item.stok_minimum);
      return { success: true, data: alerts };
    } catch (error) {
      logger.error('Error fetching low stock alerts:', error);
      return { success: false, error: error.message };
    }
  }
};
