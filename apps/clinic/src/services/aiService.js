import { supabase } from './supabase';

/** Ambil pesan error dari respons edge function (non-2xx). */
async function invokeError(error) {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return { message: body.error, status: body.status };
  } catch { /* abaikan */ }
  return { message: error?.message || 'Asisten AI tidak dapat dihubungi.' };
}

async function callAgent(body) {
  const { data, error } = await supabase.functions.invoke('ai-assistant', { body });
  if (error) {
    const e = await invokeError(error);
    return { success: false, error: e.message, status: e.status };
  }
  return { success: true, data };
}

/** Baca aliran jawaban ai-assistant; hasilnya peristiwa "done", atau null bila koneksi putus sebelum selesai. */
export async function readAnswerStream(response, { onDelta, onReset } = {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = null;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) return done;
    buffer += decoder.decode(chunk.value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      const event = JSON.parse(part.slice(6));
      if (event.type === 'delta') onDelta?.(event.text);
      else if (event.type === 'reset') onReset?.();
      else if (event.type === 'done') done = event;
    }
  }
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
   * opts.retry + opts.note: minta jawaban ulang karena jawaban sebelumnya dinilai kurang tepat.
   * opts.onDelta + opts.onReset: terima jawaban bertahap; penyedia tanpa aliran langsung mengirim hasil akhir.
   * Hasil: { answer, tools, usage_id, cached?, references?, status }.
   */
  async ask(question, history = [], opts = {}) {
    const body = { question, history, ...(opts.retry ? { retry: true, retry_note: opts.note || '' } : {}) };
    const headers = opts.onDelta ? { Accept: 'text/event-stream' } : undefined;
    const { data, error } = await supabase.functions.invoke('ai-assistant', { body, headers });
    if (error) {
      const e = await invokeError(error);
      return { success: false, error: e.message, status: e.status };
    }
    if (!(data instanceof Response)) return { success: true, data };
    try {
      const done = await readAnswerStream(data, opts);
      if (!done) return { success: false, error: 'Koneksi ke Asisten AI terputus. Coba lagi.' };
      if (done.status >= 400) return { success: false, error: done.data?.error || 'Asisten AI tidak dapat dihubungi.', status: done.data?.status };
      return { success: true, data: done.data };
    } catch {
      return { success: false, error: 'Koneksi ke Asisten AI terputus. Coba lagi.' };
    }
  },

  /** Nilai jawaban: tepat → disimpan sebagai jawaban terverifikasi; kurang tepat → tidak dipakai ulang. */
  async feedback(usageId, correct, note = '') {
    const { data, error } = await supabase.rpc('ai_answer_feedback', { p_usage_id: usageId, p_correct: correct, p_note: note || null });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  },

  /** Daftar jawaban terverifikasi klinik (admin). */
  async listKnowledge() {
    const { data, error } = await supabase.from('ai_knowledge')
      .select('id, question, answer, kind, hit_count, updated_at, last_used_at')
      .order('updated_at', { ascending: false }).limit(200);
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  },

  async deleteKnowledge(id) {
    const { error } = await supabase.from('ai_knowledge').delete().eq('id', id);
    return error ? { success: false, error: error.message } : { success: true };
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

  /**
   * Catatan Dashboard → { brief: { ringkasan, poin[], saran } | null, generated_at, cached, empty? }.
   * Bawaan: hanya membaca catatan tersimpan (diperbarui otomatis 00.00 & 12.00 WIB) — tanpa menunggu AI.
   * refresh=true meminta AI menyusun ulang sekarang.
   */
  async getBrief(refresh = false, variant = 'admin') {
    const mode = variant === 'staff' ? 'staff_brief' : 'brief';
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: refresh ? { mode, refresh: true } : { mode, cached_only: true },
    });
    if (error) {
      const e = await invokeError(error);
      return { success: false, error: e.message, status: e.status, httpStatus: error?.context?.status };
    }
    return { success: true, data };
  },

  /**
   * Eira Agen — keputusan admin atas usulan (tanpa model AI & tanpa kuota; database memeriksa admin, pemilik, kedaluwarsa).
   * applyActions: satu paket (atomik) → { ok, dijalankan, tindakan: [{ id, judul, hasil, bisa_batal }] }.
   */
  async applyActions(ids) { return callAgent({ mode: 'agent_apply', ids }); },
  async rejectActions(ids) { return callAgent({ mode: 'agent_reject', ids }); },
  async undoAction(id) { return callAgent({ mode: 'agent_undo', id }); },

  /** Riwayat usulan/tindakan Eira Agen klinik ini (admin). */
  async listActions(limit = 30) {
    const { data, error } = await supabase.from('ai_actions')
      .select('id, kind, preview, status, created_at, decided_at, undoable')
      .order('created_at', { ascending: false }).limit(limit);
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
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
