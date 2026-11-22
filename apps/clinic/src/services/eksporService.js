import { supabase } from './supabase.js';
import { encryptionService } from './encryptionService.js';
import { batasWaktuWib } from '../utils/periodeEkspor.js';

const HALAMAN = 1000; // batas baris per permintaan PostgREST

/** Ambil semua baris (berhalaman). `buat()` mengembalikan query baru setiap dipanggil. */
async function ambilSemua(buat, maks = 100000) {
  const hasil = [];
  for (let dari = 0; dari < maks; dari += HALAMAN) {
    const { data, error } = await buat().range(dari, dari + HALAMAN - 1);
    if (error) throw error;
    hasil.push(...(data || []));
    if (!data || data.length < HALAMAN) break;
  }
  return hasil;
}

/**
 * Kumpulkan data untuk Ekspor Lengkap Klinik. RLS tetap berlaku (hanya data klinik sendiri).
 * `onTahap(teks)` untuk menampilkan progres.
 */
export async function kumpulkanDataEkspor(periode, { sertakanNama = false, onTahap } = {}) {
  const { mulai, akhir } = periode;
  const { dari, sebelum } = batasWaktuWib(mulai, akhir);
  const tahap = (t) => onTahap?.(t);

  tahap('Transaksi pembayaran');
  const pembayaranMentah = await ambilSemua(() => supabase.from('payments')
    .select('id, invoice_number, tanggal_pembayaran, total_treatment, biaya_tambahan, keterangan_tambahan, diskon, total_bayar, jumlah_bayar, kembalian, metode_pembayaran, status_pembayaran, patients(no_rm, nama_lengkap), users(full_name)')
    .gte('tanggal_pembayaran', dari).lt('tanggal_pembayaran', sebelum)
    .order('tanggal_pembayaran', { ascending: true }));

  let namaTerbuka = [];
  if (sertakanNama) {
    tahap('Membuka nama pasien');
    const sandi = pembayaranMentah.map((p) => p.patients?.nama_lengkap || '');
    for (let i = 0; i < sandi.length; i += 200) {
      namaTerbuka.push(...(await encryptionService.decryptBatch(sandi.slice(i, i + 200))));
    }
  }
  const pembayaran = pembayaranMentah.map((p, i) => ({
    ...p,
    no_rm: p.patients?.no_rm || '',
    nama_pasien: sertakanNama ? namaTerbuka[i] || '' : undefined,
    kasir: p.users?.full_name || '',
  }));

  tahap('Pengeluaran & overhead');
  const [pengeluaran, overhead] = await Promise.all([
    ambilSemua(() => supabase.from('expenses').select('tanggal_expense, kategori, deskripsi, pemasok, nomor_nota, jumlah, sumber')
      .gte('tanggal_expense', mulai).lte('tanggal_expense', akhir).order('tanggal_expense', { ascending: true })),
    ambilSemua(() => supabase.from('overhead_costs').select('nama_biaya, kategori, jumlah_bulanan, aktif, catatan').order('nama_biaya')),
  ]);

  tahap('Tindakan & HPP');
  const tindakanMentah = await ambilSemua(() => supabase.from('visit_treatments')
    .select('tooth_number, quantity, harga_satuan, subtotal, treatments(nama_treatment), visits!inner(tanggal_kunjungan, deleted_at), treatment_cost_snapshot(total_biaya_bahan, overhead_allocated, total_modal)')
    .gte('visits.tanggal_kunjungan', mulai).lte('visits.tanggal_kunjungan', akhir).is('visits.deleted_at', null)
    .order('created_at', { ascending: true }));
  const tindakan = tindakanMentah.map((t) => {
    const s = Array.isArray(t.treatment_cost_snapshot) ? t.treatment_cost_snapshot[0] : t.treatment_cost_snapshot;
    return {
      tanggal: t.visits?.tanggal_kunjungan || '', nama: t.treatments?.nama_treatment || '', gigi: t.tooth_number || '',
      qty: t.quantity, harga_satuan: t.harga_satuan, subtotal: t.subtotal,
      biaya_bahan: s?.total_biaya_bahan ?? null, overhead: s?.overhead_allocated ?? null, total_modal: s?.total_modal ?? null,
    };
  }).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));

  tahap('Stok, mutasi & pembelian bahan');
  const [bahanMentah, batch, mutasiMentah, pembelianMentah] = await Promise.all([
    ambilSemua(() => supabase.from('master_bahan').select('id, kode_bahan, nama_bahan, kategori, satuan_dasar, stok_saat_ini, stok_minimum, harga_rata2, is_active').order('nama_bahan')),
    ambilSemua(() => supabase.from('material_batches').select('material_id, tanggal_kadaluarsa').gt('qty_sisa', 0).not('tanggal_kadaluarsa', 'is', null)),
    ambilSemua(() => supabase.from('stok_movements').select('created_at, tipe, jumlah, stok_sebelum, stok_sesudah, harga_saat_itu, referensi_tipe, catatan, master_bahan(nama_bahan)')
      .gte('created_at', dari).lt('created_at', sebelum).order('created_at', { ascending: true })),
    ambilSemua(() => supabase.from('material_purchases').select('tanggal, jumlah_beli, jumlah_dasar, harga_satuan_beli, total_harga, supplier, no_faktur, tanggal_kadaluarsa, master_bahan(nama_bahan)')
      .gte('tanggal', mulai).lte('tanggal', akhir).order('tanggal', { ascending: true })),
  ]);
  const kedaluwarsa = {};
  batch.forEach((b) => { if (!kedaluwarsa[b.material_id] || b.tanggal_kadaluarsa < kedaluwarsa[b.material_id]) kedaluwarsa[b.material_id] = b.tanggal_kadaluarsa; });
  const bahan = bahanMentah.map((b) => ({ ...b, kadaluarsa_terdekat: kedaluwarsa[b.id] || '' }));
  const mutasi = mutasiMentah.map((m) => ({ ...m, nama_bahan: m.master_bahan?.nama_bahan || '' }));
  const pembelian = pembelianMentah.map((b) => ({ ...b, nama_bahan: b.master_bahan?.nama_bahan || '' }));

  tahap('Ringkasan kunjungan');
  const { data: hit } = await supabase.rpc('report_counts', { p_start: mulai, p_end: akhir });
  const hitungan = { kunjungan: Number(hit?.[0]?.visits_in_range) || 0, pasien_baru: Number(hit?.[0]?.patients_new) || 0 };

  return { periode, pembayaran, pengeluaran, overhead, tindakan, bahan, mutasi, pembelian, hitungan };
}

/** Catat di audit log bahwa ekspor dibuat (siapa, periode, ada nama pasien atau tidak). */
export async function catatAuditEkspor(periode, { sertakanNama, role }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      user_role: role || 'unknown',
      module: 'REPORTS',
      action: 'EXPORT',
      new_value: { jenis: 'ekspor_lengkap', mulai: periode.mulai, akhir: periode.akhir, nama_pasien: Boolean(sertakanNama) },
      risk_level: sertakanNama ? 'HIGH' : 'MEDIUM',
    }]);
  } catch {
    /* audit gagal tidak menghalangi ekspor */
  }
}
