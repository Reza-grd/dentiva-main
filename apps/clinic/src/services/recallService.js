import { supabase } from './supabase';
import { encryptionService } from './encryptionService';

// Bila dekripsi gagal, decryptBatch mengembalikan teks terenkripsi — jangan tampilkan itu.
const plainOr = (v) => (typeof v === 'string' && !/^(PGPM?:|ENC:v1:)/.test(v) ? v : '');

/** Recall pasien (admin & resepsionis). Nama/WA dibuka di aplikasi, tidak pernah dikirim ke AI. */
export const recallService = {
  async candidates(months = 6, limit = 300) {
    const { data, error } = await supabase.rpc('recall_candidates', { p_bulan: months, p_limit: limit });
    if (error) return { success: false, error: error.message };
    const rows = data || [];
    const plain = await encryptionService.decryptBatch(rows.flatMap((r) => [r.nama_lengkap, r.no_wa]));
    return {
      success: true,
      data: rows.map((r, i) => ({ ...r, nama_lengkap: plainOr(plain[i * 2]), no_wa: plainOr(plain[i * 2 + 1]) })),
    };
  },

  async markContacted(patientId, channel = 'wa') {
    const { error } = await supabase.rpc('recall_mark_contacted', { p_patient_id: patientId, p_channel: channel });
    return error ? { success: false, error: error.message } : { success: true };
  },
};
