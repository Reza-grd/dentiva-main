import { supabase } from './supabase.js';
import { sanitizeSearchTerm } from '../utils/stringUtils.js';

export const treatmentService = {
  // Get all treatments
  async getAllTreatments() {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('is_active', true)
        .order('kategori', { ascending: true })
        .order('nama_treatment', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching treatments:', error);
      return { success: false, error: error.message };
    }
  },

  // Get treatments by category
  async getTreatmentsByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('kategori', category)
        .eq('is_active', true)
        .order('nama_treatment', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching treatments by category:', error);
      return { success: false, error: error.message };
    }
  },

  // Get treatment by ID
  async getTreatmentById(id) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new treatment
  async createTreatment(treatmentData) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .insert([treatmentData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // Update treatment
  async updateTreatment(id, treatmentData) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .update(treatmentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete (deactivate) treatment
  async deleteTreatment(id) {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error deleting treatment:', error);
      return { success: false, error: error.message };
    }
  },

  // Search treatments
  async searchTreatments(searchTerm) {
    try {
      let query = supabase.from('treatments').select('*').eq('is_active', true);
      if (searchTerm && searchTerm.trim()) {
        const term = sanitizeSearchTerm(searchTerm);
        if (term) {
          query = query.or(`nama_treatment.ilike.%${term}%,kode_treatment.ilike.%${term}%`);
        }
      }
      const { data, error } = await query.order('nama_treatment', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error searching treatments:', error);
      return { success: false, error: error.message };
    }
  },

  // Get treatment categories
  async getTreatmentCategories() {
    try {
      const { data, error } = await supabase
        .from('treatments')
        .select('kategori')
        .eq('is_active', true);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map(t => t.kategori))].filter(Boolean);
      return { success: true, data: categories };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: error.message };
    }
  },

  // Get popular treatments
  async getPopularTreatments(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('v_popular_treatments')
        .select('*')
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching popular treatments:', error);
      return { success: false, error: error.message };
    }
  }
};
