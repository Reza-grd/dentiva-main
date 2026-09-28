import { supabase } from './supabase.js';

const BUCKET = 'patient-photos';

export const storageService = {
  /**
   * Dapatkan clinic_id dari sesi aktif pengguna untuk isolasi tenant.
   */
  async getSessionClinicId() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.app_metadata?.clinic_id || 'd0000000-0000-0000-0000-000000000000';
  },

  /**
   * Upload foto pasien ke Supabase Storage (PRIVATE bucket).
   * Menyimpan path relatif (bukan full URL) ke kolom foto_profile di DB.
   * @param {string} patientId - UUID pasien
   * @param {File} file - File object dari input
   * @returns {{ success: boolean, path?: string, error?: string }}
   */
  async uploadPatientPhoto(patientId, file) {
    try {
      // Validasi tipe file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return { success: false, error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.' };
      }

      // Validasi ukuran (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return { success: false, error: 'Ukuran file terlalu besar. Maksimal 5MB.' };
      }

      const clinicId = await storageService.getSessionClinicId();

      // Buat path unik untuk menghindari cache lama
      const ext = file.name.split('.').pop().toLowerCase();
      const filePath = `${clinicId}/${patientId}/profile.${ext}`;

      // Hapus foto lama jika ada (semua extension)
      await supabase.storage.from(BUCKET).remove([
        `${clinicId}/${patientId}/profile.jpg`,
        `${clinicId}/${patientId}/profile.jpeg`,
        `${clinicId}/${patientId}/profile.png`,
        `${clinicId}/${patientId}/profile.webp`,
      ]);

      // Upload file baru
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      // PRIVATE FIX: buat signed URL valid 24 jam untuk konfirmasi upload
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 86400);

      if (signedError) throw signedError;

      // PRIVATE FIX: simpan path relatif (bukan full URL) ke DB
      const { error: updateError } = await supabase
        .from('patients')
        .update({ foto_profile: filePath })
        .eq('id', patientId);

      if (updateError) throw updateError;

      return { success: true, path: filePath, url: signedData.signedUrl };
    } catch (error) {
      console.error('Error uploading patient photo:', error);
      return { success: false, error: error.message || 'Gagal mengupload foto' };
    }
  },

  /**
   * Dapatkan URL yang bisa ditampilkan dari foto_profile.
   * Mendukung backward compatibility untuk data lama yang menyimpan full URL.
   * @param {string|null} filePath - path relatif atau full URL
   * @returns {Promise<string|null>}
   */
  async getPhotoUrl(filePath) {
    // Tidak ada path → return null
    if (!filePath) return null;

    // Backward compat: jika sudah berupa URL lengkap (http/https), langsung return
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    // Path relatif → buat signed URL valid 1 jam
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.warn('getPhotoUrl: gagal membuat signed URL:', error.message);
        return null;
      }
      return data.signedUrl;
    } catch (err) {
      console.warn('getPhotoUrl error:', err);
      return null;
    }
  },

  /**
   * Hapus foto pasien dari storage dan reset kolom foto_profile
   * @param {string} patientId - UUID pasien
   * @param {string} fotoPath - path relatif atau URL foto yang sedang aktif
   */
  async deletePatientPhoto(patientId, fotoPath) {
    try {
      if (fotoPath) {
        let filePathToDelete = fotoPath;

        // Jika berupa URL lengkap (data lama), ekstrak path relatif
        if (fotoPath.startsWith('http://') || fotoPath.startsWith('https://')) {
          try {
            const url = new URL(fotoPath);
            const marker = `/object/public/${BUCKET}/`;
            const idx = url.pathname.indexOf(marker);
            if (idx !== -1) {
              filePathToDelete = url.pathname.substring(idx + marker.length);
            } else {
              // Signed URL — cari setelah /object/sign/BUCKET/
              const signMarker = `/object/sign/${BUCKET}/`;
              const signIdx = url.pathname.indexOf(signMarker);
              if (signIdx !== -1) {
                filePathToDelete = url.pathname.substring(signIdx + signMarker.length);
              }
            }
          } catch (urlError) {
            console.warn('Could not parse photo URL for deletion:', urlError);
            filePathToDelete = null;
          }
        }

        if (filePathToDelete) {
          await supabase.storage.from(BUCKET).remove([filePathToDelete]);
        }
      }

      const { error } = await supabase
        .from('patients')
        .update({ foto_profile: null })
        .eq('id', patientId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting patient photo:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Tambahkan timestamp ke URL untuk busting cache browser
   */
  bustCache(url) {
    if (!url) return null;
    return `${url}?t=${Date.now()}`;
  }
};
