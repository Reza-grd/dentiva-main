import { supabase } from './supabase';

const BUCKET = 'klinik';
const COLUMNS = 'id, tanggal_expense, kategori, deskripsi, jumlah, pemasok, nomor_nota, sumber, bukti_url, created_at, recorded_by_user:users(full_name)';

const fail = (error) => ({ success: false, error: error?.message || String(error) });

/** Field yang boleh ditulis dari formulir (clinic_id diisi trigger, recorded_by dari sesi). */
function clean(form) {
  const jumlah = Number(form.jumlah);
  return {
    tanggal_expense: form.tanggal_expense,
    kategori: form.kategori,
    deskripsi: (form.deskripsi || '').trim() || null,
    jumlah: Number.isFinite(jumlah) ? Math.round(jumlah) : null,
    pemasok: (form.pemasok || '').trim() || null,
    nomor_nota: (form.nomor_nota || '').trim() || null,
    ...(form.sumber ? { sumber: form.sumber } : {}),
    ...(form.bukti_url !== undefined ? { bukti_url: form.bukti_url } : {}),
  };
}

/** Pengeluaran klinik (hanya admin — dijaga RLS). */
export const expenseService = {
  async list(from, to) {
    const { data, error } = await supabase.from('expenses').select(COLUMNS)
      .gte('tanggal_expense', from).lte('tanggal_expense', to)
      .order('tanggal_expense', { ascending: false }).order('created_at', { ascending: false });
    return error ? fail(error) : { success: true, data: data || [] };
  },

  /** Pengeluaran di sekitar tanggal tertentu (untuk cek nota ganda). */
  async around(date, days = 3) {
    const d = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return { success: true, data: [] };
    const shift = (n) => new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase.from('expenses').select('id, tanggal_expense, jumlah, nomor_nota, pemasok, kategori')
      .gte('tanggal_expense', shift(-days)).lte('tanggal_expense', shift(days));
    return error ? fail(error) : { success: true, data: data || [] };
  },

  /** Cari nomor nota yang sama di seluruh catatan. */
  async byNota(nomorNota) {
    const n = (nomorNota || '').trim();
    if (!n) return { success: true, data: [] };
    const { data, error } = await supabase.from('expenses').select('id, tanggal_expense, jumlah, nomor_nota, pemasok, kategori')
      .ilike('nomor_nota', n.replace(/[%_\\]/g, (c) => `\\${c}`)).limit(5);
    return error ? fail(error) : { success: true, data: data || [] };
  },

  async create(form) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('expenses')
      .insert([{ ...clean(form), recorded_by: user?.id }]).select(COLUMNS).single();
    return error ? fail(error) : { success: true, data };
  },

  async update(id, form) {
    const { data, error } = await supabase.from('expenses').update(clean(form)).eq('id', id).select(COLUMNS).single();
    return error ? fail(error) : { success: true, data };
  },

  async remove(row) {
    const { error } = await supabase.from('expenses').delete().eq('id', row.id);
    if (error) return fail(error);
    if (row.bukti_url) await supabase.storage.from(BUCKET).remove([row.bukti_url]);
    return { success: true };
  },

  /** Simpan foto nota di {clinic_id}/pengeluaran/… (bucket privat). Mengembalikan path. */
  async uploadReceipt(clinicId, blob) {
    if (!clinicId) return { success: false, error: 'Profil klinik belum termuat.' };
    const path = `${clinicId}/pengeluaran/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    return error ? fail(error) : { success: true, data: path };
  },

  async removeReceipt(path) {
    if (path) await supabase.storage.from(BUCKET).remove([path]);
  },

  async receiptUrl(path) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
    return error ? fail(error) : { success: true, data: data.signedUrl };
  },
};
