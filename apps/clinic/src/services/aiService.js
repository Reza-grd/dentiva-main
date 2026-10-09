import { supabase } from './supabase';

/** Ambil pesan error dari respons edge function (non-2xx). */
async function invokeError(error) {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return { message: body.error, status: body.status };
  } catch { /* abaikan */ }
  return { message: error?.message || 'Asisten AI tidak dapat dihubungi.' };
}

export const aiService = {
  /** { paket, tersedia_di_paket, aktif, kuota_bulanan, terpakai_bulan_ini } */
  async getStatus() {
    const { data, error } = await supabase.rpc('ai_status');
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  /** Penyedia AI yang aktif: { configured, provider, label, model, free_tier }. Tidak memakai kuota. */
  async getProvider() {
    const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { mode: 'info' } });
    if (error) return { success: false, error: (await invokeError(error)).message };
    return { success: true, data };
  },

  /** Aktifkan/nonaktifkan untuk klinik (hanya admin; persetujuan dicatat). */
  async setEnabled(enabled) {
    const { data, error } = await supabase.rpc('ai_set_enabled', { p_enabled: enabled });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  /**
   * Tanya Asisten Keuangan.
   * history: [{ role: 'user'|'assistant', content: string }] — percakapan sebelumnya (teks saja).
   */
  async ask(question, history = []) {
    const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { question, history } });
    if (error) {
      const e = await invokeError(error);
      return { success: false, error: e.message, status: e.status };
    }
    return { success: true, data };
  },

  /** Foto nota (JPEG base64) → { draft, status }. Tidak menyimpan apa pun. */
  async scanReceipt(base64, mediaType = 'image/jpeg') {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { mode: 'receipt', image: base64, media_type: mediaType },
    });
    if (error) {
      const e = await invokeError(error);
      return { success: false, error: e.message, status: e.status };
    }
    return { success: true, data };
  },

  /** Draf template WA recall dengan placeholder {nama} → { template, status }. */
  async draftRecallTemplate(instruction = '') {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { mode: 'recall_template', instruction },
    });
    if (error) {
      const e = await invokeError(error);
      return { success: false, error: e.message, status: e.status };
    }
    return { success: true, data };
  },
};
