import { supabase } from './supabase.js';

export const mediaService = {
  /**
   * Dapatkan signed URL yang aman untuk media.
   * Mendukung backward compatibility untuk URL publik lama.
   */
  async getMediaUrl(bucketName, filePathOrUrl) {
    if (!filePathOrUrl) return null;

    let filePath = filePathOrUrl;
    let bucket = bucketName;

    if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
      if (filePathOrUrl.includes('/object/sign/')) {
        return filePathOrUrl; // Sudah berupa signed URL
      }
      try {
        const url = new URL(filePathOrUrl);
        const publicMarker = '/object/public/';
        const idx = url.pathname.indexOf(publicMarker);
        if (idx !== -1) {
          const rest = url.pathname.substring(idx + publicMarker.length);
          const parts = rest.split('/');
          bucket = parts[0];
          filePath = parts.slice(1).join('/');
        }
      } catch (e) {
        console.error('Error parsing media URL:', e);
        return filePathOrUrl;
      }
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // Valid 1 jam

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.warn(`gagal membuat signed URL untuk ${bucket}/${filePath}:`, err.message);
      return filePathOrUrl;
    }
  },

  /**
   * Dapatkan clinic_id dari sesi aktif pengguna untuk isolasi tenant.
   */
  async getSessionClinicId() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.app_metadata?.clinic_id || 'd0000000-0000-0000-0000-000000000000';
  },

  /**
   * Upload media file to Supabase storage and create record in patient_media table
   */
  async uploadMedia(file, category, patientId, visitId = null, caption = '', notes = '') {
    try {
      const isRadiologi = ['panoramic', 'cephalometric', 'dental', 'other'].includes(category);
      const bucketName = isRadiologi ? 'radiologi' : 'klinik';
      
      const clinicId = await this.getSessionClinicId();
      const fileExt = file.name.split('.').pop();
      const fileName = `${patientId}_${category}_${Date.now()}.${fileExt}`;
      const filePath = `${clinicId}/${patientId}/${fileName}`;

      // 1. Upload to storage bucket
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // 2. Get public URL structure to store in DB
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

      // Generate signed URL for immediate preview in UI
      const signedUrl = await mediaService.getMediaUrl(bucketName, data.file_url);
      const returnedData = { ...data, file_url: signedUrl };

      return { success: true, data: returnedData };
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

      // Ubah semua URL publik menjadi signed URL
      const signedData = await Promise.all(
        data.map(async (item) => {
          const isRadiologi = ['panoramic', 'cephalometric', 'dental', 'other'].includes(item.category);
          const bucketName = isRadiologi ? 'radiologi' : 'klinik';
          const signedUrl = await mediaService.getMediaUrl(bucketName, item.file_url);
          return { ...item, file_url: signedUrl };
        })
      );

      return { success: true, data: signedData };
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
        // Jika file_url mengandung parameter signed token, bersihkan parameternya untuk mengambil file path
        let filePath = urlParts[1].split('?')[0];
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
