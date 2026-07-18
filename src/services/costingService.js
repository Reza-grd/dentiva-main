import { supabase } from './supabase.js';
import logger from '../utils/logger.js';

export const costingService = {
  // ==========================================
  // BIAYA OPERASIONAL (OVERHEAD)
  // ==========================================
  async getOverheadCosts() {
    try {
      const { data, error } = await supabase
        .from('overhead_costs')
        .select('*')
        .order('kategori', { ascending: true })
        .order('nama_biaya', { ascending: true });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching overhead costs:', error);
      return { success: false, error: error.message };
    }
  },

  async upsertOverheadCost(payload) {
    try {
      const { data, error } = await supabase
        .from('overhead_costs')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error upserting overhead cost:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteOverheadCost(id) {
    try {
      const { error } = await supabase
        .from('overhead_costs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      logger.error('Error deleting overhead cost:', error);
      return { success: false, error: error.message };
    }
  },

  // Target Bulanan Overhead
  async getMonthlyOverheadTarget(periode) {
    try {
      // periode format YYYY-MM-01
      const { data, error } = await supabase
        .from('overhead_monthly_target')
        .select('*')
        .eq('periode', periode)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching monthly overhead target:', error);
      return { success: false, error: error.message };
    }
  },

  async setMonthlyOverheadTarget(periode, totalOverhead, totalWeight, catatan = '') {
    try {
      const { data, error } = await supabase
        .from('overhead_monthly_target')
        .upsert({
          periode,
          total_overhead_bulanan: totalOverhead,
          total_bobot_estimasi: totalWeight,
          catatan
        }, { onConflict: 'periode' })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error setting monthly overhead target:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // RESEP BAHAN PER PERAWATAN (BOM)
  // ==========================================
  async getTreatmentMaterials(treatmentId) {
    try {
      const { data, error } = await supabase
        .from('treatment_materials')
        .select(`
          *,
          master_bahan (
            nama_bahan,
            satuan_dasar,
            harga_rata2,
            stok_saat_ini
          )
        `)
        .eq('treatment_id', treatmentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching treatment materials:', error);
      return { success: false, error: error.message };
    }
  },

  async upsertTreatmentMaterial(payload) {
    try {
      const { data, error } = await supabase
        .from('treatment_materials')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error upserting treatment material:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteTreatmentMaterial(id) {
    try {
      const { error } = await supabase
        .from('treatment_materials')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      logger.error('Error deleting treatment material:', error);
      return { success: false, error: error.message };
    }
  },

  // ==========================================
  // KALKULASI & LAPORAN
  // ==========================================
  async calculateTreatmentOverheadShare(treatmentId) {
    try {
      // 1. Ambil tier dari treatment
      const { data: treatment, error: treatmentErr } = await supabase
        .from('treatments')
        .select('tier')
        .eq('id', treatmentId)
        .single();
      if (treatmentErr) throw treatmentErr;

      // 2. Ambil bobot dari tier_weights
      const { data: tierWeight, error: tierErr } = await supabase
        .from('tier_weights')
        .select('bobot')
        .eq('tier', treatment?.tier || 'sedang')
        .single();
      if (tierErr) throw tierErr;
      const bobot = tierWeight?.bobot || 1;

      // 3. Ambil target overhead bulan berjalan
      const currentMonth = new Date().toISOString().substring(0, 8) + '01'; // YYYY-MM-01
      const { data: target, error: targetErr } = await supabase
        .from('overhead_monthly_target')
        .select('overhead_per_unit_bobot')
        .eq('periode', currentMonth)
        .maybeSingle();
      if (targetErr) throw targetErr;
      
      const overheadPerUnit = target?.overhead_per_unit_bobot || 0;
      
      return { 
        success: true, 
        data: {
          tier: treatment?.tier,
          bobot: bobot,
          overhead_per_unit: overheadPerUnit,
          estimated_overhead: bobot * overheadPerUnit
        }
      };
    } catch (error) {
      logger.error('Error calculating treatment overhead share:', error);
      return { success: false, error: error.message };
    }
  },

  async getTreatmentCostSnapshot(visitTreatmentId) {
    try {
      const { data, error } = await supabase
        .from('treatment_cost_snapshot')
        .select('*')
        .eq('visit_treatment_id', visitTreatmentId)
        .maybeSingle();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      logger.error('Error fetching treatment cost snapshot:', error);
      return { success: false, error: error.message };
    }
  },

  async getProfitabilityReport(startDate, endDate) {
    try {
      let query = supabase
        .from('treatment_cost_snapshot')
        .select(`
          *,
          visit_treatment:visit_treatments (
            id,
            harga_satuan,
            treatment:treatments (
              id,
              nama_treatment,
              kategori
            ),
            visit:visits (
              id,
              tanggal_kunjungan,
              status
            )
          )
        `);

      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
      
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out invalid joins (if any)
      const validData = data.filter(d => d.visit_treatment && d.visit_treatment.visit);
      return { success: true, data: validData };
    } catch (error) {
      logger.error('Error fetching profitability report:', error);
      return { success: false, error: error.message };
    }
  }
};
