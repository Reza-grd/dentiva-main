import { supabase } from './supabase';
import { encryptionService } from './encryptionService';

// Bila dekripsi gagal, decryptBatch mengembalikan teks terenkripsi — jangan tampilkan itu.
const plainOr = (v) => (typeof v === 'string' && !/^(PGPM?:|ENC:v1:)/.test(v) ? v : '');

/** Recall pasien. Nama/WA dibuka di aplikasi, tidak pernah dikirim ke AI. */
export const recallService = {
  async candidates(months = 6, limit = 300) {
    const { data, error } = await supabase.rpc('recall_candidates', { p_bulan: months, p_limit: limit });
    if (error) return { success: false, error: error.message };
    const rows = Array.isArray(data) ? data : [];
    const plain = await encryptionService.decryptBatch(rows.flatMap((r) => [r.nama_lengkap, r.no_wa]));
    return {
      success: true,
      data: rows.map((r, i) => ({ ...r, nama_lengkap: plainOr(plain[i * 2]), no_wa: plainOr(plain[i * 2 + 1]) })),
    };
  },

  // ── Recall berbasis SOP perawatan ─────────────────────────────────────────

  /** SOP recall klinik + nama perawatan (semua staf boleh membaca). */
  async sopList() {
    const { data, error } = await supabase
      .from('recall_sop')
      .select('id, treatment_id, perlu, interval_hari, wajib, tujuan, updated_at, treatments(nama_treatment, kode_treatment, kategori, is_active)');
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data || []).map(({ treatments: t, ...s }) => ({
        ...s, nama_treatment: t?.nama_treatment || '', kode_treatment: t?.kode_treatment || '', kategori: t?.kategori || '', aktif: t?.is_active !== false,
      })),
    };
  },

  /** Simpan satu aturan SOP (manajer klinik). */
  async sopSimpan({ treatment_id, perlu, interval_hari, wajib, tujuan }) {
    const row = {
      treatment_id, perlu: !!perlu,
      interval_hari: perlu ? Number(interval_hari) : null,
      wajib: !!perlu && !!wajib,
      tujuan: (tujuan || '').trim().slice(0, 200) || null,
    };
    const { data, error } = await supabase.from('recall_sop').upsert(row, { onConflict: 'clinic_id,treatment_id' }).select().single();
    return error ? { success: false, error: error.message } : { success: true, data };
  },

  async sopHapus(treatmentId) {
    const { error } = await supabase.from('recall_sop').delete().eq('treatment_id', treatmentId);
    return error ? { success: false, error: error.message } : { success: true };
  },

  /** Isi SOP bawaan untuk perawatan yang belum punya aturan. */
  async sopIsiDefault() {
    const { data, error } = await supabase.rpc('recall_sop_isi_default_saya');
    return error ? { success: false, error: error.message } : { success: true, data: data ?? 0 };
  },

  /** Keputusan recall yang tersimpan untuk satu kunjungan (null bila belum ada). */
  async keputusanKunjungan(visitId) {
    const { data, error } = await supabase.from('recall_jadwal').select('*').eq('visit_id', visitId).maybeSingle();
    return error ? { success: false, error: error.message } : { success: true, data: data || null };
  },

  /** Dokter/manajer menyimpan keputusan: belum | tidak_perlu | perlu. */
  async simpanKeputusan(visitId, { keputusan, interval_hari, wajib, tujuan, sumber }) {
    const { data, error } = await supabase.rpc('recall_simpan_keputusan', {
      p_visit_id: visitId,
      p_keputusan: keputusan,
      p_interval_hari: keputusan === 'perlu' ? Number(interval_hari) : null,
      p_wajib: keputusan === 'perlu' && !!wajib,
      p_tujuan: keputusan === 'perlu' ? (tujuan || null) : null,
      p_sumber: sumber === 'sop' ? 'sop' : 'dokter',
    });
    return error ? { success: false, error: error.message } : { success: true, data };
  },

  /** Daftar per tab; nama & WA dibuka di aplikasi. */
  async daftar(tab, limit = 300) {
    const { data, error } = await supabase.rpc('recall_daftar', { p_tab: tab, p_limit: limit });
    if (error) return { success: false, error: error.message };
    const rows = Array.isArray(data) ? data : [];
    const plain = await encryptionService.decryptBatch(rows.flatMap((r) => [r.nama_lengkap, r.no_wa]));
    return {
      success: true,
      data: rows.map((r, i) => ({ ...r, nama_lengkap: plainOr(plain[i * 2]), no_wa: plainOr(plain[i * 2 + 1]) })),
    };
  },

  async ringkasan() {
    const { data, error } = await supabase.rpc('recall_ringkasan');
    if (error) return { success: false, error: error.message };
    return { success: true, data: (Array.isArray(data) ? data[0] : data) || {} };
  },

  async ubahStatus(id, status, catatan = null) {
    const { data, error } = await supabase.rpc('recall_ubah_status', { p_id: id, p_status: status, p_catatan: catatan });
    return error ? { success: false, error: error.message } : { success: true, data };
  },

  async markContacted(patientId, channel = 'wa') {
    const { error } = await supabase.rpc('recall_mark_contacted', { p_patient_id: patientId, p_channel: channel });
    return error ? { success: false, error: error.message } : { success: true };
  },
};
