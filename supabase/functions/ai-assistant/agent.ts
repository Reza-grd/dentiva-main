/**
 * Denti Agen — alat (tools) agen untuk Asisten AI admin.
 *
 *  • Alat BACA  : cari_bahan, kartu_stok, saran_pemesanan, cari_pengeluaran, daftar_overhead, cari_tindakan, resep_tindakan, riwayat_agen
 *                 → RPC ai_* (admin saja, hasil ringkas & terbatas).
 *  • Alat USUL  : usulkan_* → ai_agent_propose(). Model TIDAK PERNAH menulis data; ia hanya membuat usulan yang divalidasi database.
 *                 Data baru berubah setelah admin menekan "Setujui" di aplikasi (mode agent_apply → ai_agent_apply()).
 *
 * Semua RPC dipanggil memakai JWT pengguna sehingga peran admin & klinik diperiksa di database.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

export type ToolDef = { name: string; description: string; input_schema: Record<string, unknown> };
export type ProposedAction = { id: string; jenis: string; pratinjau: Record<string, unknown> };
export type AgentCtx = { group: string; actions: ProposedAction[] };

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });
const bool = (description: string) => ({ type: "boolean", description });
// "required" hanya dicantumkan bila ada isinya (sebagian penyedia menolak daftar kosong).
const obj = (properties: Record<string, unknown>, required: string[] = []): ToolDef["input_schema"] =>
  ({ type: "object", properties, ...(required.length ? { required } : {}) });

const BAHAN = str("Nama bahan (boleh sebagian, mis. \"lidocaine\"), kode bahan, atau id (UUID) dari hasil cari_bahan");
const TINDAKAN = str("Nama tindakan (mis. \"scaling\"), kode, atau id (UUID) dari hasil cari_tindakan");
const KATEGORI_BIAYA = "Bahan & Alat Habis Pakai | Alat Medis | Lab Gigi | Gaji | Sewa | Utilitas | Pemeliharaan | Marketing | Administrasi | Lainnya";

export const AGENT_READ_TOOLS: ToolDef[] = [
  { name: "cari_bahan", description: "Cari bahan di gudang: stok, minimum, harga rata-rata (HPP per satuan dasar), satuan, pemasok, status (aman/menipis/habis). Kosongkan kata untuk daftar semua (maks 60). WAJIB dipakai sebelum mengubah/menambah stok agar tidak membuat bahan ganda.",
    input_schema: obj({ kata: str("Bagian nama/kategori/kode bahan; kosong = semua"), hanya_aktif: bool("true (bawaan) = hanya bahan aktif"), limit: num("Maks hasil, 1–60 (bawaan 30)") }) },
  { name: "kartu_stok", description: "Riwayat pergerakan stok satu bahan (masuk, keluar, opname) beserta total masuk/keluar pada N hari terakhir.",
    input_schema: obj({ bahan: BAHAN, hari: num("Rentang hari ke belakang, 1–365 (bawaan 60)") }, ["bahan"]) },
  { name: "saran_pemesanan", description: "Bahan yang perlu dipesan ulang: pemakaian per hari (dari riwayat), sisa hari stok, saran jumlah beli untuk mencukupi N hari, perkiraan biaya, dan pemasok.",
    input_schema: obj({ hari_riwayat: num("Hari riwayat pemakaian, 7–180 (bawaan 30)"), hari_cakupan: num("Stok ingin cukup berapa hari, 3–90 (bawaan 14)") }) },
  { name: "cari_pengeluaran", description: "Cari pengeluaran tercatat (id, tanggal, kategori, deskripsi, jumlah, pemasok, nomor nota) + total. Dipakai sebelum mengubah/menghapus pengeluaran atau memeriksa duplikat.",
    input_schema: obj({ dari: str("YYYY-MM-DD (bawaan 90 hari lalu)"), sampai: str("YYYY-MM-DD (bawaan hari ini)"), kata: str("Kata di deskripsi/pemasok atau nomor nota persis"), kategori: str(`Salah satu: ${KATEGORI_BIAYA}`), limit: num("Maks 50 (bawaan 25)") }) },
  { name: "daftar_overhead", description: "Biaya operasional/overhead bulanan (nama, jumlah per bulan, aktif) + total aktif + target overhead bulan ini.", input_schema: obj({}) },
  { name: "cari_tindakan", description: "Cari tindakan/treatment: id, kode, harga, tier, aktif, jumlah bahan di resep, dan biaya bahan per tindakan. Dipakai sebelum mengubah harga atau resep.",
    input_schema: obj({ kata: str("Bagian nama/kategori/kode; kosong = semua"), limit: num("Maks 60 (bawaan 30)") }) },
  { name: "resep_tindakan", description: "Resep bahan (BOM) satu tindakan: bahan, jumlah, susut, biaya per bahan, total biaya bahan.", input_schema: obj({ tindakan: TINDAKAN }, ["tindakan"]) },
  { name: "riwayat_agen", description: "Tindakan yang pernah diusulkan/dijalankan Denti Agen (judul, status, waktu, oleh siapa).", input_schema: obj({ limit: num("Maks 50 (bawaan 20)") }) },
];

/** Alat usulan → jenis tindakan di database (ai_agent_propose). */
const WRITE_KIND: Record<string, string> = {
  usulkan_bahan_tambah: "bahan_tambah", usulkan_bahan_ubah: "bahan_ubah", usulkan_stok_masuk: "stok_masuk", usulkan_stok_opname: "stok_opname",
  usulkan_pengeluaran_catat: "pengeluaran_catat", usulkan_pengeluaran_ubah: "pengeluaran_ubah", usulkan_pengeluaran_hapus: "pengeluaran_hapus",
  usulkan_overhead_atur: "overhead_atur", usulkan_overhead_target: "overhead_target", usulkan_harga_tindakan: "tindakan_harga",
  usulkan_harga_massal: "tindakan_harga_massal", usulkan_tindakan_tambah: "tindakan_tambah", usulkan_tindakan_ubah: "tindakan_ubah",
  usulkan_resep_atur: "resep_atur", usulkan_resep_hapus: "resep_hapus",
};

const PROPOSE = "Membuat USULAN (belum mengubah data); admin menyetujuinya di kartu usulan. ";
export const AGENT_WRITE_TOOLS: ToolDef[] = [
  { name: "usulkan_bahan_tambah", description: PROPOSE + "Bahan baru di gudang (opsional dengan stok awal & harganya). Cek dulu dengan cari_bahan bahwa bahan itu belum ada. Angka polos tanpa titik/koma ribuan.",
    input_schema: obj({ nama: str("Nama bahan lengkap"), satuan_dasar: str("Satuan pemakaian, mis. pcs, ml, gram, ampul"), kategori: str("Mis. APD, Anestesi, Bahan Tambal"), stok_awal: num("Stok awal dalam satuan dasar (bawaan 0)"),
      harga_per_satuan: num("Harga per satuan dasar (Rp), dipakai bila ada stok awal"), stok_minimum: num("Batas peringatan stok menipis"), supplier: str("Pemasok"),
      satuan_beli: str("Satuan pembelian bila beda, mis. box"), faktor_konversi: num("Isi 1 satuan beli dalam satuan dasar, mis. 1 box = 10 ampul → 10"), kode_bahan: str("Opsional; kosong = otomatis BHN-0001") }, ["nama", "satuan_dasar"]) },
  { name: "usulkan_bahan_ubah", description: PROPOSE + "Ubah data bahan (nama, satuan, kategori, pemasok, stok minimum, satuan beli, aktif/nonaktif). TIDAK mengubah stok/harga: untuk itu pakai stok_masuk / stok_opname.",
    input_schema: obj({ bahan: BAHAN, nama: str("Nama baru"), satuan_dasar: str("Satuan dasar baru"), kategori: str("Kategori baru"), supplier: str("Pemasok baru"), stok_minimum: num("Stok minimum baru"),
      satuan_beli: str("Satuan beli baru"), faktor_konversi: num("Faktor konversi baru"), is_active: bool("false = nonaktifkan") }, ["bahan"]) },
  { name: "usulkan_stok_masuk", description: PROPOSE + "Catat pembelian/penerimaan bahan (stok bertambah, harga rata-rata tertimbang diperbarui otomatis, batch kadaluarsa bila diisi). Harga per SATUAN BELI.",
    input_schema: obj({ bahan: BAHAN, jumlah_beli: num("Jumlah dalam satuan beli (mis. 2 box)"), harga_satuan_beli: num("Harga per satuan beli (Rp)"), jumlah_dasar: num("Opsional: jumlah dalam satuan dasar; kosong = jumlah_beli × faktor konversi"),
      tanggal: str("YYYY-MM-DD, bawaan hari ini"), supplier: str("Pemasok"), no_faktur: str("Nomor faktur/nota"), tanggal_kadaluarsa: str("YYYY-MM-DD") }, ["bahan", "jumlah_beli", "harga_satuan_beli"]) },
  { name: "usulkan_stok_opname", description: PROPOSE + "Sesuaikan stok sistem dengan hasil hitung fisik (opname) dan catat ke kartu stok.",
    input_schema: obj({ bahan: BAHAN, stok_fisik: num("Jumlah fisik sebenarnya (satuan dasar)"), catatan: str("Alasan/catatan") }, ["bahan", "stok_fisik"]) },
  { name: "usulkan_pengeluaran_catat", description: PROPOSE + "Catat pengeluaran operasional klinik. Sistem memperingatkan bila mirip pengeluaran yang sudah ada.",
    input_schema: obj({ kategori: str(`Salah satu: ${KATEGORI_BIAYA}`), deskripsi: str("Ringkas, mis. \"Listrik Oktober\""), jumlah: num("Rupiah, angka polos"), tanggal: str("YYYY-MM-DD, bawaan hari ini"), pemasok: str("Toko/pemasok"), nomor_nota: str("Nomor nota") }, ["kategori", "deskripsi", "jumlah"]) },
  { name: "usulkan_pengeluaran_ubah", description: PROPOSE + "Ubah pengeluaran yang sudah tercatat (id dari cari_pengeluaran).",
    input_schema: obj({ id: str("UUID pengeluaran"), tanggal: str("YYYY-MM-DD"), kategori: str(KATEGORI_BIAYA), deskripsi: str("Deskripsi baru"), jumlah: num("Rupiah"), pemasok: str("Pemasok"), nomor_nota: str("Nomor nota") }, ["id"]) },
  { name: "usulkan_pengeluaran_hapus", description: PROPOSE + "Hapus pengeluaran (id dari cari_pengeluaran). Hanya bila admin jelas memintanya; bisa dikembalikan lewat Batalkan.",
    input_schema: obj({ id: str("UUID pengeluaran") }, ["id"]) },
  { name: "usulkan_overhead_atur", description: PROPOSE + "Tambah biaya overhead bulanan baru atau ubah yang sudah ada (dikenali dari nama). Untuk menonaktifkan: aktif=false.",
    input_schema: obj({ nama_biaya: str("Mis. Sewa Ruko, Internet, Gaji Staf"), jumlah_bulanan: num("Rupiah per bulan"), kategori: str("Kategori"), aktif: bool("false = nonaktifkan"), catatan: str("Catatan") }, ["nama_biaya"]) },
  { name: "usulkan_overhead_target", description: PROPOSE + "Atur target overhead bulanan untuk perhitungan HPP (total overhead default = jumlah overhead aktif; bobot estimasi = perkiraan jumlah bobot tindakan sebulan).",
    input_schema: obj({ periode: str("YYYY-MM-DD (bulan), bawaan bulan ini"), total_overhead_bulanan: num("Kosong = jumlah overhead aktif"), total_bobot_estimasi: num("Wajib bila target bulan itu belum ada"), catatan: str("Catatan") }) },
  { name: "usulkan_harga_tindakan", description: PROPOSE + "Ubah tarif satu tindakan: isi harga_baru ATAU perubahan_persen (bukan keduanya). Berlaku untuk kunjungan baru. Untuk dasar keputusan gunakan simulasi_harga lebih dulu bila diminta.",
    input_schema: obj({ tindakan: TINDAKAN, harga_baru: num("Harga baru (Rp)"), perubahan_persen: num("Mis. 10 = naik 10%, -5 = turun 5%"), pembulatan: num("Bulatkan ke kelipatan (Rp), mis. 5000") }, ["tindakan"]) },
  { name: "usulkan_harga_massal", description: PROPOSE + "Ubah tarif banyak tindakan aktif sekaligus dengan persentase (semua atau satu kategori), dibulatkan. Satu usulan untuk seluruhnya.",
    input_schema: obj({ perubahan_persen: num("-50 s.d. 100"), kategori: str("Opsional: hanya kategori ini"), pembulatan: num("Kelipatan pembulatan Rp (bawaan 1000)") }, ["perubahan_persen"]) },
  { name: "usulkan_tindakan_tambah", description: PROPOSE + "Tambah tindakan/treatment baru ke daftar tarif.",
    input_schema: obj({ nama: str("Nama tindakan"), harga_dasar: num("Tarif (Rp)"), tier: str("ringan | sedang | berat (bobot overhead; bawaan sedang)"), kategori: str("Kategori"), durasi_menit: num("Durasi menit"), kode: str("Opsional; kosong = otomatis") }, ["nama", "harga_dasar"]) },
  { name: "usulkan_tindakan_ubah", description: PROPOSE + "Ubah data tindakan selain harga (nama, kategori, tier, durasi, aktif/nonaktif). Untuk harga pakai usulkan_harga_tindakan.",
    input_schema: obj({ tindakan: TINDAKAN, nama: str("Nama baru"), kategori: str("Kategori"), tier: str("ringan | sedang | berat"), durasi_menit: num("Menit"), is_active: bool("false = nonaktifkan") }, ["tindakan"]) },
  { name: "usulkan_resep_atur", description: PROPOSE + "Atur bahan yang dipakai satu tindakan (resep/BOM) — menambah atau mengubah jumlahnya; dasar perhitungan HPP & pemotongan stok.",
    input_schema: obj({ tindakan: TINDAKAN, bahan: BAHAN, qty_rata2: num("Jumlah rata-rata per tindakan (satuan dasar bahan)"), wajib: bool("Bahan wajib (bawaan true)"), wastage_percent: num("Susut/terbuang %, 0–100"), catatan: str("Catatan") }, ["tindakan", "bahan", "qty_rata2"]) },
  { name: "usulkan_resep_hapus", description: PROPOSE + "Hapus satu bahan dari resep tindakan.", input_schema: obj({ tindakan: TINDAKAN, bahan: BAHAN }, ["tindakan", "bahan"]) },
];

export const AGENT_TOOLS: ToolDef[] = [...AGENT_READ_TOOLS, ...AGENT_WRITE_TOOLS];
export const AGENT_TOOL_NAMES = new Set(AGENT_TOOLS.map((t) => t.name));

const READ_RPC: Record<string, (i: Record<string, unknown>) => [string, Record<string, unknown>]> = {
  cari_bahan: (i) => ["ai_cari_bahan", { p_kata: i.kata ?? "", p_aktif: i.hanya_aktif ?? true, p_limit: i.limit ?? 30 }],
  kartu_stok: (i) => ["ai_kartu_stok", { p_bahan: i.bahan, p_hari: i.hari ?? 60 }],
  saran_pemesanan: (i) => ["ai_saran_pemesanan", { p_hari_riwayat: i.hari_riwayat ?? 30, p_hari_cakupan: i.hari_cakupan ?? 14 }],
  cari_pengeluaran: (i) => ["ai_cari_pengeluaran", { p_dari: i.dari ?? null, p_sampai: i.sampai ?? null, p_kata: i.kata ?? "", p_kategori: i.kategori ?? "", p_limit: i.limit ?? 25 }],
  daftar_overhead: () => ["ai_daftar_overhead", {}],
  cari_tindakan: (i) => ["ai_cari_tindakan", { p_kata: i.kata ?? "", p_limit: i.limit ?? 30 }],
  resep_tindakan: (i) => ["ai_resep_tindakan", { p_tindakan: i.tindakan }],
  riwayat_agen: (i) => ["ai_riwayat_agen", { p_limit: i.limit ?? 20 }],
};

type RpcError = { code?: string; message: string } | null;
/** Galat AG001 = pesan yang sengaja dibuat untuk dibaca model/admin; lainnya disamarkan. */
const toolError = (e: NonNullable<RpcError>): string =>
  e.code === "AG001" ? e.message : e.code === "42501" ? "Tindakan ini hanya untuk admin klinik." : "Gagal memproses permintaan ke database.";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Jalankan satu alat agen. Mengembalikan null bila bukan alat agen. */
export async function runAgentTool(
  db: SupabaseClient, ctx: AgentCtx, name: string, input: unknown,
): Promise<{ content: string; isError: boolean } | null> {
  if (!AGENT_TOOL_NAMES.has(name)) return null;
  if (!isObj(input)) return { content: "Argumen alat harus berupa objek", isError: true };
  const read = READ_RPC[name];
  if (read) {
    const [fn, params] = read(input);
    const { data, error } = await db.rpc(fn, params);
    if (error) return { content: toolError(error), isError: true };
    return { content: JSON.stringify(data), isError: false };
  }
  const kind = WRITE_KIND[name];
  const { data, error } = await db.rpc("ai_agent_propose", { p_kind: kind, p_args: input, p_group: ctx.group });
  if (error) return { content: toolError(error), isError: true };
  if (!data?.ok) {
    // Galat validasi/ambigu: kembalikan ke model agar memperbaiki (mis. memilih kandidat) atau bertanya ke admin.
    return { content: JSON.stringify({ ok: false, error: data?.error ?? "Usulan ditolak", kandidat: data?.kandidat ?? undefined }), isError: true };
  }
  ctx.actions.push({ id: data.action_id, jenis: data.jenis, pratinjau: data.pratinjau });
  return {
    content: JSON.stringify({
      ok: true, status: "menunggu_persetujuan_admin", action_id: data.action_id, pratinjau: data.pratinjau,
      catatan: "Data BELUM berubah. Beri tahu admin bahwa usulan ini menunggu persetujuannya di kartu usulan.",
    }),
    isError: false,
  };
}

// ── Niat "agen": pertanyaan yang meminta tindakan harus melewati jawaban cepat / basis pengetahuan ──
const ACTION_VERB = /\b(catat|catatkan|tambah|tambahkan|masukkan|masukin|input|inputkan|buat|buatkan|ubah|ganti|edit|update|hapus|hilangkan|nonaktifkan|aktifkan|naikkan|turunkan|atur|aturkan|set|setel|sesuaikan|koreksi|opname|restock|stok masuk|beli|pesan|import|impor|daftarkan|simpan)\b/;
const ACTION_NOUN = /\b(bahan|stok|stock|gudang|pengeluaran|biaya|expense|overhead|harga|tarif|tindakan|treatment|resep|bom|supplier|pemasok|nota|faktur|opname|target)\b/;
export function isAgentIntent(normalizedQuestion: string): boolean {
  return /(^| )(restock|opname|stok masuk)( |$)/.test(normalizedQuestion) || (ACTION_VERB.test(normalizedQuestion) && ACTION_NOUN.test(normalizedQuestion));
}

export const AGENT_PROMPT = `DENTI AGEN — KEMAMPUAN BERTINDAK
Selain menjawab, Anda adalah AGEN yang membantu admin MENGELOLA data keuangan & bahan klinik lewat alat "usulkan_*". Anda tidak pernah mengubah data secara langsung: setiap usulkan_* hanya membuat USULAN yang tampil sebagai kartu bagi admin, dan data baru berubah setelah admin menekan "Setujui".

Cakupan tindakan: bahan baru & ubah data bahan; stok masuk (pembelian) dengan harga rata-rata otomatis & batch kadaluarsa; stok opname; catat/ubah/hapus pengeluaran; overhead bulanan & targetnya; tarif tindakan (satu/massal) & tindakan baru; resep bahan per tindakan (HPP). Di luar itu (pembayaran pasien, rekam medis, data pasien, pengguna, pengaturan) Anda TIDAK bisa bertindak — arahkan ke menu yang tepat.

Cara bekerja:
1. Pahami niat. Bila informasi penting kurang (jumlah, harga, bahan mana, tanggal), TANYAKAN dulu dengan singkat — jangan menebak angka. Hal yang jelas boleh dilengkapi dengan nilai bawaan (tanggal = hari ini, kategori yang paling cocok).
2. CARI dulu sebelum bertindak: cari_bahan / cari_tindakan / cari_pengeluaran / daftar_overhead. Jangan membuat bahan ganda (nama sudah ada → pakai stok_masuk atau bahan_ubah). Gunakan id (UUID) dari hasil pencarian bila ada. Bila nama ambigu, tampilkan kandidat dan tanya admin; jangan memilih sendiri.
3. Buat usulan dengan usulkan_*. Untuk daftar (mis. admin menempel 15 bahan atau nota berisi banyak barang) buat satu usulan per baris — boleh sekaligus. Angka selalu polos (125000, bukan "Rp 125.000"); tanggal YYYY-MM-DD.
4. Setelah usulan dibuat, jelaskan singkat apa yang Anda siapkan dan minta admin memeriksa & menyetujui di kartu. JANGAN mengatakan "sudah dicatat/diubah" — datanya baru berubah setelah disetujui. Bila alat mengembalikan galat/peringatan (duplikat, harga janggal, ambigu), sampaikan apa adanya dan tawarkan langkah perbaikan.
5. Hanya bertindak atas permintaan jelas admin. Menghapus/mengubah massal harus disebut eksplisit oleh admin. Pertanyaan analisis ("bagaimana kalau harga naik?") dijawab dengan alat simulasi/data, BUKAN dengan usulan.
6. Pesan usulan yang sudah menunggu (daftar di bawah, bila ada) jangan dibuat ulang.
7. Untuk saran pembelian ulang gunakan saran_pemesanan, lalu tawarkan membuat draf pesan WhatsApp ke pemasok (teks biasa) atau mencatat stok masuk setelah barang datang.
8. Nada tetap Denti: hangat, ringkas, langsung ke inti. Sebut angka kunci tebal.`;

/** Ringkasan usulan yang masih menunggu, agar model tidak menggandakannya. */
export function pendingText(rows: Array<{ kind: string; preview?: { judul?: string } }>): string {
  if (!rows.length) return "";
  const lines = rows.slice(0, 12).map((r) => `- ${r.preview?.judul ?? r.kind}`).join("\n");
  return `\n\nUsulan yang SUDAH menunggu persetujuan admin (${rows.length}) — jangan dibuat ulang:\n${lines}`;
}
