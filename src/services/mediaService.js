import { supabase } from './supabase';

export const mediaService = {
  /**
   * Upload media file to Supabase storage and create record in patient_media table
   */
  async uploadMedia(file, category, patientId, visitId = null, caption = '', notes = '') {
    try {
      const isRadiologi = ['panoramic', 'cephalometric', 'dental', 'other'].includes(category);
      const bucketName = isRadiologi ? 'radiologi' : 'klinik';
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}_${category}_${Date.now()}.${fileExt}`;
      const filePath = `${patientId}/${fileName}`;

      // 1. Upload to storage bucket
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      // 3. Create database record
      const mediaRecord = {
        patient_id: patientId,
        visit_id: visitId,
        category,
        filename: file.name,
        file_url: publicUrl,
        file_type: file.type,
        caption,
        notes
      };

      const { data, error: dbError } = await supabase
        .from('patient_media')
        .insert([mediaRecord])
        .select()
        .single();

      if (dbError) throw dbError;

      return { success: true, data };
    } catch (error) {
      console.error('Error uploading media:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch all media for a specific patient
   */
  async fetchPatientMedia(patientId) {
    try {
      const { data, error } = await supabase
        .from('patient_media')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching media:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete media from both storage and database
   */
    async deleteMedia(mediaRecord) {
    try {
      // 1. Delete from storage FIRST (to prevent orphaned files if DB deletion fails)
      const isRadiologi = ['panoramic', 'cephalometric', 'dental', 'other'].includes(mediaRecord.category);
      const bucketName = isRadiologi ? 'radiologi' : 'klinik';
      
      const urlParts = mediaRecord.file_url.split('/' + bucketName + '/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error: storageError } = await supabase.storage.from(bucketName).remove([filePath]);
        if (storageError) throw new Error('Gagal menghapus file fisik dari storage: ' + storageError.message);
      }

      // 2. Delete from database only after storage deletion succeeds
      const { error: dbError } = await supabase
        .from('patient_media')
        .delete()
        .eq('id', mediaRecord.id);

      if (dbError) throw dbError;

      return { success: true };
    } catch (error) {
      console.error('Error deleting media:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update caption or notes for existing media
   */
  async updateMediaCaption(mediaId, updates) {
    try {
      const { data, error } = await supabase
        .from('patient_media')
        .update(updates)
        .eq('id', mediaId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
