/**
 * Eira Agen — alat (tools) agen untuk Asisten AI admin.
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
export type AgentCtx = { group: string; actions: ProposedAction[]; writeTools?: boolean; userTexts?: string[] };

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });
const bool = (description: string) => ({ type: "boolean", description });
// "required" hanya dicantumkan bila ada isinya (sebagian penyedia menolak daftar kosong).
const arr = (description: string, properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: "array", description, items: { type: "object", properties, ...(required.length ? { required } : {}) } });
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
  { name: "briefing_agen", description: "BRIEFING TERURUT dalam satu panggilan: gabungan semua sinyal (stok habis/menipis, kadaluarsa, biaya rutin belum tercatat, lonjakan & duplikat pengeluaran, tindakan rugi/margin tipis, resep kosong, tagihan belum dibayar, bahan tanpa harga), sudah diberi peringkat berdasarkan dampak, lengkap dengan petunjuk langkah lanjut. PAKAI INI untuk \"briefing / ada apa hari ini / apa yang perlu diurus\" — jangan memanggil alat-alat lain satu per satu.", input_schema: obj({}) },
  { name: "ringkasan_gudang", description: "Potret gudang: jumlah bahan aktif, nilai stok total, jumlah habis/menipis, bahan tanpa harga, batch kadaluarsa (sudah lewat & 30 hari ke depan, beserta nilainya), 5 bahan bernilai terbesar, nilai per kategori. Titik awal untuk briefing gudang.", input_schema: obj({}) },
  { name: "bahan_kadaluarsa", description: "Batch bahan yang sudah/akan kadaluarsa dalam N hari (bahan, no batch, tanggal, sisa, nilai, status sudah lewat/segera/mendekati) + total nilai yang sudah lewat. Dasar untuk usulkan_buang_stok.",
    input_schema: obj({ hari: num("Rentang ke depan, 1–730 (bawaan 90)") }) },
  { name: "riwayat_harga_bahan", description: "Riwayat pembelian satu bahan + perbandingan pemasok (harga rata-rata, terakhir, termurah/termahal per satuan dasar). Untuk memilih pemasok & mendeteksi kenaikan harga.",
    input_schema: obj({ bahan: BAHAN, bulan: num("Rentang bulan ke belakang, 1–36 (bawaan 12)") }, ["bahan"]) },
  { name: "analisis_margin", description: "Margin per tindakan aktif: harga, biaya bahan (resep), overhead per tindakan (dari target overhead bulan ini), HPP, margin Rp & %, volume 90 hari, status (rugi/tipis/sehat/resep belum diisi). Diurutkan dari margin terendah. Dasar saran kenaikan harga & melengkapi resep.",
    input_schema: obj({ limit: num("Maks 60 (bawaan 30)") }) },
  { name: "anomali_pengeluaran", description: "Temuan janggal pada pengeluaran: kategori yang melonjak dibanding rata-rata 3 bulan, biaya rutin (sewa/gaji/utilitas) yang belum tercatat bulan ini, pengeluaran besar bulan ini, dan pasangan yang kemungkinan tercatat dua kali.", input_schema: obj({}) },
  { name: "draf_pesan_pemasok", description: "Menyusun draf pesan WhatsApp pemesanan ke pemasok dari saran_pemesanan (dikelompokkan per pemasok, daftar bahan & jumlah). Teks siap salin; jumlah berasal dari data, bukan karangan. Admin yang mengirimkannya.",
    input_schema: obj({ pemasok: str("Opsional: hanya pemasok ini (sebagian nama)"), hari_cakupan: num("Stok ingin cukup berapa hari, 3–90 (bawaan 14)") }) },
  { name: "riwayat_agen", description: "Tindakan yang pernah diusulkan/dijalankan Eira Agen (judul, status, waktu, oleh siapa).", input_schema: obj({ limit: num("Maks 50 (bawaan 20)") }) },
];

/** Alat usulan → jenis tindakan di database (ai_agent_propose). */
const WRITE_KIND: Record<string, string> = {
  usulkan_bahan_tambah: "bahan_tambah", usulkan_bahan_ubah: "bahan_ubah", usulkan_stok_masuk: "stok_masuk", usulkan_stok_opname: "stok_opname",
  usulkan_pengeluaran_catat: "pengeluaran_catat", usulkan_pengeluaran_ubah: "pengeluaran_ubah", usulkan_pengeluaran_hapus: "pengeluaran_hapus",
  usulkan_overhead_atur: "overhead_atur", usulkan_overhead_target: "overhead_target", usulkan_harga_tindakan: "tindakan_harga",
  usulkan_harga_massal: "tindakan_harga_massal", usulkan_tindakan_tambah: "tindakan_tambah", usulkan_tindakan_ubah: "tindakan_ubah",
  usulkan_resep_atur: "resep_atur", usulkan_resep_hapus: "resep_hapus",
  usulkan_bahan_banyak: "bahan_tambah_banyak", usulkan_stok_masuk_banyak: "stok_masuk_banyak", usulkan_buang_stok: "batch_buang",
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
  { name: "usulkan_bahan_banyak", description: PROPOSE + "Tambah BANYAK bahan baru sekaligus (maks 100) dalam satu kartu — untuk daftar/tabel yang ditempel admin. Atomik: bila ada baris bermasalah, seluruh daftar ditolak dengan nomor baris. Cek dulu agar tidak ada nama yang sudah ada.",
    input_schema: obj({ items: arr("Daftar bahan", { nama: str("Nama bahan"), satuan_dasar: str("Satuan pemakaian"), kategori: str("Kategori"), stok_awal: num("Stok awal (satuan dasar)"), harga_per_satuan: num("Harga per satuan dasar (Rp)"),
      stok_minimum: num("Batas stok menipis"), supplier: str("Pemasok"), satuan_beli: str("Satuan beli"), faktor_konversi: num("Isi 1 satuan beli dalam satuan dasar") }, ["nama", "satuan_dasar"]) }, ["items"]) },
  { name: "usulkan_stok_masuk_banyak", description: PROPOSE + "Catat stok masuk BANYAK barang dari satu nota/faktur (maks 60) dalam satu kartu. Pemasok, nomor faktur, dan tanggal di tingkat atas menjadi bawaan semua baris. Atomik; baris ambigu/tidak ditemukan dilaporkan dengan kandidat.",
    input_schema: obj({ supplier: str("Pemasok untuk semua baris"), no_faktur: str("Nomor faktur untuk semua baris"), tanggal: str("YYYY-MM-DD untuk semua baris (bawaan hari ini)"),
      items: arr("Barang pada nota", { bahan: BAHAN, jumlah_beli: num("Jumlah dalam satuan beli"), harga_satuan_beli: num("Harga per satuan beli (Rp)"), jumlah_dasar: num("Opsional: jumlah dalam satuan dasar"), tanggal_kadaluarsa: str("YYYY-MM-DD") },
        ["bahan", "jumlah_beli", "harga_satuan_beli"]) }, ["items"]) },
  { name: "usulkan_buang_stok", description: PROPOSE + "Hapus stok yang kadaluarsa/rusak/hilang: stok berkurang, tercatat di kartu stok (penyesuaian) dan batch dikurangi (yang paling dulu kadaluarsa). Pakai bahan_kadaluarsa untuk jumlah & batch yang benar.",
    input_schema: obj({ bahan: BAHAN, jumlah: num("Jumlah yang dibuang (satuan dasar)"), alasan: str("kadaluarsa | rusak | hilang | lainnya"), no_batch: str("Opsional: batch tertentu"), catatan: str("Catatan") }, ["bahan", "jumlah"]) },
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
  briefing_agen: () => ["ai_briefing_agen", {}],
  ringkasan_gudang: () => ["ai_ringkasan_gudang", {}],
  bahan_kadaluarsa: (i) => ["ai_bahan_kadaluarsa", { p_hari: i.hari ?? 90 }],
  riwayat_harga_bahan: (i) => ["ai_riwayat_harga_bahan", { p_bahan: i.bahan, p_bulan: i.bulan ?? 12 }],
  analisis_margin: (i) => ["ai_analisis_margin", { p_limit: i.limit ?? 30 }],
  anomali_pengeluaran: () => ["ai_anomali_pengeluaran", {}],
  riwayat_agen: (i) => ["ai_riwayat_agen", { p_limit: i.limit ?? 20 }],
};

type RpcError = { code?: string; message: string } | null;
/** Galat AG001 = pesan yang sengaja dibuat untuk dibaca model/admin; lainnya disamarkan. */
const toolError = (e: NonNullable<RpcError>): string =>
  e.code === "AG001" ? e.message : e.code === "42501" ? "Tindakan ini hanya untuk admin klinik." : "Gagal memproses permintaan ke database.";

/** "Rp 1.250.000" / "1,5 juta" / "60rb" / "2jt" / "10%" → angka. null bila tidak dikenali (biarkan database yang menolak). */
export function parseAngkaIndonesia(raw: string): number | null {
  let t = raw.toLowerCase().replace(/rp\.?/g, "").replace(/%/g, "").replace(/\s+/g, " ").trim();
  let mult = 1;
  const unit = t.match(/^(.*?)\s*(miliar|milyar|juta|jt|ribu|rb|k)$/);
  if (unit) {
    t = unit[1].trim();
    mult = { miliar: 1e9, milyar: 1e9, juta: 1e6, jt: 1e6, ribu: 1e3, rb: 1e3, k: 1e3 }[unit[2] as "k"] ?? 1;
  }
  let n: number;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) n = Number(t.replace(/\./g, "").replace(",", "."));
  else if (/^-?\d+,\d+$/.test(t)) n = Number(t.replace(",", "."));
  else if (/^-?\d+(\.\d+)?$/.test(t)) n = Number(t);
  else return null;
  const out = n * mult;
  return Number.isFinite(out) ? Math.round(out * 1e6) / 1e6 : null;
}

const DATE_KEYS = new Set(["tanggal", "dari", "sampai", "periode", "tanggal_kadaluarsa"]);
function parseTanggal(raw: string): string | null {
  const t = raw.trim();
  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`;
  return null;
}

/** Perbaiki bentuk argumen yang sering meleset dari model kecil: angka bertulisan Indonesia → angka, tanggal DD/MM/YYYY → ISO, "true"/"false" → boolean. Aman: hanya menyentuh properti bertipe sesuai skema. */
export function coerceArgs(schema: Record<string, unknown> | undefined, value: unknown): unknown {
  if (!schema || typeof schema !== "object") return value;
  const type = schema.type;
  if (type === "object" && isObj(value)) {
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const ps = props[k];
      if (ps?.type === "string" && DATE_KEYS.has(k) && typeof v === "string") out[k] = parseTanggal(v) ?? v;
      else out[k] = ps ? coerceArgs(ps, v) : v;
    }
    return out;
  }
  if (type === "array" && Array.isArray(value)) return value.map((x) => coerceArgs(schema.items as Record<string, unknown>, x));
  if (type === "number" && typeof value === "string") return parseAngkaIndonesia(value) ?? value;
  if (type === "boolean" && typeof value === "string") {
    const l = value.trim().toLowerCase();
    return ["true", "ya", "yes"].includes(l) ? true : ["false", "tidak", "no"].includes(l) ? false : value;
  }
  if (type === "string" && typeof value === "number") return String(value);
  return value;
}

/** Kata yang cukup jelas untuk meminta penghapusan. */
export const EXPLICIT_DELETE = /(^| )(hapus|hapuskan|hilangkan|buang|singkirkan|delete|coret|batalkan pengeluaran)( |$)/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

type Reorder = { nama: string; satuan: string; saran_beli: number; perkiraan_biaya: number; pemasok: string | null; alasan?: string };
const rupiah = (n: number) => `Rp ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

/** Draf pesan WA per pemasok dari hasil saran_pemesanan. Murni dari data; tidak memakai model. */
export function susunPesanPemasok(bahan: Reorder[], klinik: string, filter = ""): Array<{ pemasok: string; jumlah_item: number; perkiraan_biaya: number; teks: string }> {
  const f = filter.trim().toLowerCase();
  const groups = new Map<string, Reorder[]>();
  for (const b of bahan) {
    if (!(b.saran_beli > 0)) continue;
    const key = b.pemasok?.trim() || "Tanpa pemasok tercatat";
    if (f && !key.toLowerCase().includes(f)) continue;
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  return [...groups.entries()].map(([pemasok, rows]) => {
    const lines = rows.map((r, i) => `${i + 1}. ${r.nama} — ${r.saran_beli} ${r.satuan}`).join("\n");
    const teks = `Selamat pagi, ${pemasok === "Tanpa pemasok tercatat" ? "Bapak/Ibu" : pemasok}. Kami dari ${klinik || "klinik kami"}. Mohon info ketersediaan dan harga terbaru untuk pesanan berikut:\n\n${lines}\n\nMohon kabari total harga dan estimasi pengiriman. Terima kasih. 🙏`;
    return { pemasok, jumlah_item: rows.length, perkiraan_biaya: rows.reduce((s, r) => s + (r.perkiraan_biaya || 0), 0), teks };
  });
}

/** Jalankan satu alat agen. Mengembalikan null bila bukan alat agen. */
export async function runAgentTool(
  db: SupabaseClient, ctx: AgentCtx, name: string, rawInput: unknown,
): Promise<{ content: string; isError: boolean } | null> {
  if (!AGENT_TOOL_NAMES.has(name)) return null;
  if (!isObj(rawInput)) return { content: "Argumen alat harus berupa objek", isError: true };
  const input = coerceArgs(AGENT_TOOLS.find((t) => t.name === name)?.input_schema, rawInput) as Record<string, unknown>;
  if (name === "draf_pesan_pemasok") {
    const { data, error } = await db.rpc("ai_saran_pemesanan", { p_hari_riwayat: 30, p_hari_cakupan: typeof input.hari_cakupan === "number" ? input.hari_cakupan : 14 });
    if (error) return { content: toolError(error), isError: true };
    const { data: klinik } = await db.from("clinics").select("name").limit(1).maybeSingle();
    const pesan = susunPesanPemasok((data?.bahan ?? []) as Reorder[], klinik?.name ?? "", typeof input.pemasok === "string" ? input.pemasok : "");
    if (pesan.length === 0) return { content: JSON.stringify({ pesan: [], catatan: "Tidak ada bahan yang perlu dipesan (atau pemasok itu tidak cocok)." }), isError: false };
    return { content: JSON.stringify({ pesan, catatan: "Draf ini belum dikirim. Admin menyalin dan mengirimnya sendiri ke pemasok." }), isError: false };
  }
  const read = READ_RPC[name];
  if (read) {
    const [fn, params] = read(input);
    const { data, error } = await db.rpc(fn, params);
    if (error) return { content: toolError(error), isError: true };
    return { content: JSON.stringify(data), isError: false };
  }
  const kind = WRITE_KIND[name];
  // Penghapusan hanya atas permintaan eksplisit admin ("hapus/hilangkan/buang…"); kata samar ("bersihkan", "yang tidak perlu") tidak cukup.
  if (kind === "pengeluaran_hapus" && ctx.userTexts && !ctx.userTexts.some((t) => EXPLICIT_DELETE.test(t))) {
    return { content: JSON.stringify({ ok: false, error: "Admin belum meminta penghapusan secara eksplisit. Tampilkan kandidat (cari_pengeluaran / anomali_pengeluaran) lalu TANYAKAN pengeluaran mana yang harus dihapus; jangan membuat usulan hapus." }), isError: true };
  }
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
const ACTION_VERB = /\b(catat|catatkan|tambah|tambahkan|masukkan|masukin|input|inputkan|buat|buatkan|ubah|ganti|edit|update|hapus|hilangkan|nonaktifkan|aktifkan|naikkan|turunkan|atur|aturkan|set|setel|sesuaikan|koreksi|opname|restock|stok masuk|beli|pesan|import|impor|daftarkan|simpan|buang|musnahkan|bersihkan|hapus stok)\b/;
const ACTION_NOUN = /\b(bahan|stok|stock|gudang|kadaluarsa|kedaluwarsa|expired|pengeluaran|biaya|expense|overhead|harga|tarif|tindakan|treatment|resep|bom|supplier|pemasok|nota|faktur|opname|target)\b/;
export function isAgentIntent(normalizedQuestion: string): boolean {
  return /(^| )(restock|opname|stok masuk)( |$)/.test(normalizedQuestion) || (ACTION_VERB.test(normalizedQuestion) && ACTION_NOUN.test(normalizedQuestion));
}

export const AGENT_PROMPT = `EIRA AGEN — PERAN, CARA BERPIKIR, DAN GAYA
Anda bukan sekadar penjawab, melainkan REKAN KERJA OPERASIONAL klinik yang cekatan: bisa membaca kondisi gudang & keuangan, menemukan masalah sebelum admin bertanya, lalu menyiapkan pekerjaan (usulan) yang tinggal disetujui. Anda tidak pernah mengubah data langsung: setiap alat usulkan_* hanya membuat USULAN yang tampil sebagai kartu bagi admin, dan data baru berubah setelah admin menekan "Setujui".

KEMAMPUAN
- Baca: briefing_agen, cari_bahan, kartu_stok, saran_pemesanan, ringkasan_gudang, bahan_kadaluarsa, riwayat_harga_bahan (bandingkan pemasok), cari_pengeluaran, anomali_pengeluaran, daftar_overhead, cari_tindakan, resep_tindakan, analisis_margin, riwayat_agen, draf_pesan_pemasok, plus semua alat keuangan (pendapatan, BEP, arus kas, simulasi harga, dst.).
- Usul tindakan: bahan baru (satuan atau banyak sekaligus), ubah bahan, stok masuk (satuan atau seluruh isi satu nota), opname, buang stok kadaluarsa/rusak, catat/ubah/hapus pengeluaran, overhead & targetnya, tarif tindakan (satu/massal), tindakan baru, resep bahan (HPP).
- Di luar itu (pembayaran pasien, rekam medis, data pasien, pengguna, pengaturan) Anda TIDAK bisa bertindak — arahkan ke menu yang tepat.

CARA KERJA
1. Pahami niat. Kerjakan bagian yang sudah jelas lebih dulu; tanyakan HANYA hal penting yang kurang (jumlah, harga, bahan yang mana). Jangan menebak angka. Nilai bawaan yang wajar boleh dipakai (tanggal = hari ini, kategori paling cocok) dan sebutkan.
2. CARI sebelum bertindak (cari_bahan / cari_tindakan / cari_pengeluaran / daftar_overhead). Jangan membuat bahan ganda. Pakai kata-kata admin APA ADANYA untuk nama bahan/tindakan (mis. "kapas", "masker bedah") — jangan melengkapi nama lengkap sendiri; sistem yang mencocokkan dan akan menandai bila ambigu. Pakai id dari hasil pencarian; id tidak pernah ditampilkan ke admin. Bila nama ambigu, sebut kandidatnya dengan nama biasa dan tanya mana yang dimaksud.
3. Buat usulan. Untuk banyak baris pakai alat *_banyak (satu kartu, atomik) agar admin cukup sekali setuju. Angka polos (125000), tanggal YYYY-MM-DD. SATUAN stok masuk: jumlah_beli dihitung dalam satuan BELI bahan (mis. box) dan harga_satuan_beli per satuan beli; bila admin menyebut jumlah dalam satuan dasar (ampul/pcs), bagi dengan isi satuan beli (cari_bahan menampilkan faktor_konversi) atau isi jumlah_dasar — jangan mengalikan dua kali.
4. Jika alat menolak (ambigu, duplikat, stok kurang, harga janggal), jangan menyerah: perbaiki sendiri bila bisa (mis. cari ulang), selebihnya jelaskan dengan bahasa manusia dan tawarkan jalan keluar.
5. Jangan pernah berkata "sudah dicatat/diubah" — datanya baru berubah setelah disetujui. Katakan "saya siapkan … , silakan cek kartu dan setujui".
6. Bertindak hanya atas permintaan jelas. Hapus/ubah massal harus disebut eksplisit oleh admin. Kata samar seperti "bersihkan", "rapikan", "yang tidak perlu", "yang lama" BUKAN perintah hapus: tampilkan kandidat dengan alat baca lalu tanyakan mana yang harus dihapus — jangan membuat usulan hapus. Pertanyaan analisis ("bagaimana kalau…") dijawab dengan alat simulasi/data, tanpa membuat usulan. Usulan yang sudah menunggu (daftar di bawah, bila ada) jangan dibuat ulang.

PROTOKOL SITUASI UMUM
- "Briefing / ada apa hari ini / apa yang perlu dikerjakan": panggil briefing_agen SATU kali (bila hasilnya sudah ada di pesan, pakai itu tanpa memanggil lagi; sudah terurut berdasarkan dampak; jangan memanggil alat lain dulu). Sampaikan 3 temuan teratas dengan angka kuncinya, urut sesuai peringkat, dan untuk tiap temuan sebut tindakan yang bisa Anda siapkan (lihat petunjuk "lanjut"). Tutup dengan tawaran mulai dari yang mana. Bila admin SEKALIGUS meminta "siapkan/kerjakan yang paling mendesak", langsung buat usulan untuk temuan peringkat 1 (cari data rincinya dulu) tanpa bertanya lagi. Panggil alat rincian (bahan_kadaluarsa, saran_pemesanan, …) HANYA setelah admin memilih temuan.
- Pembelian ulang: saran_pemesanan → untuk bahan penting cek riwayat_harga_bahan (pemasok termurah/kenaikan harga) → tawarkan draf_pesan_pemasok. Setelah barang datang, admin bisa minta "catat stok masuk dari nota ini".
- Nota/faktur/daftar yang ditempel admin: urai menjadi baris; sebut berapa baris terbaca; baris yang meragukan (jumlah/harga hilang) tanyakan, jangan ditebak. Barang habis pakai/bahan → stok_masuk_banyak (atau bahan_banyak bila belum ada di gudang); totalnya → pengeluaran_catat bila admin belum mencatat pembelian itu sebagai pengeluaran (tanyakan bila ragu agar tidak tercatat dua kali).
- Kadaluarsa: bahan_kadaluarsa → tawarkan usulkan_buang_stok untuk batch yang sudah lewat (sebut nilai kerugian persediaan).
- Harga & margin: analisis_margin (+ simulasi_harga bila perlu) → bila ada tindakan rugi/tipis atau resep belum diisi, jelaskan penyebabnya dan tawarkan usulkan_harga_tindakan atau usulkan_resep_atur. Jangan membuat usulan harga tanpa diminta; cukup rekomendasikan dengan alasan angka.
- Pengeluaran janggal: anomali_pengeluaran → sebut temuan paling penting, tawarkan memeriksa/menghapus yang ganda atau mencatat biaya rutin yang belum tercatat.

GAYA JAWABAN (terdengar seperti rekan kerja sungguhan, bukan formulir)
- Kalimat pertama = intinya (apa yang Anda temukan/siapkan), dengan angka kunci tebal. Jangan membuka dengan "Baik, saya akan…", "Tentu…", atau "Berdasarkan data…".
- Singkat: satu paragraf pendek + paling banyak 4 butir. Kartu usulan sudah menampilkan rincian — jangan mengulang isinya; sebut hanya yang perlu perhatian (peringatan, asumsi, selisih mencolok).
- Beri wawasan, bukan hanya mengulang angka: bandingkan dengan harga rata-rata/bulan lalu, sebut sisa hari stok, dampak ke kas atau margin, atau risiko jika dibiarkan.
- Akhiri dengan SATU langkah berikutnya yang konkret (pertanyaan atau tawaran), mis. "Mau sekalian saya buatkan draf pesan ke pemasoknya?".
- Bahasa Indonesia santai-profesional, "saya", tanpa menebak sapaan Bapak/Ibu. Maksimal satu emoji yang relevan. Jangan menyebut nama alat atau kata "usulkan_" — katakan "kartu usulan". Jangan menampilkan id (UUID).
- Bila obrolan ringan/sapaan: balas singkat dan hangat, lalu tawarkan dua hal yang bisa dibantu.
- Bila hasil alat kosong: katakan apa adanya dan sarankan langkah agar datanya terisi.

CONTOH NADA (angka hanya ilustrasi — angka sungguhan WAJIB dari alat)
Admin: stok masuk lidocaine 2 box 60rb
Eira: Siap, saya siapkan stok masuk **Anestesi Lidocaine 2 box @ Rp 60.000** (total Rp 120.000). Harga ini sekitar 18% di bawah rata-rata pembelian sebelumnya, lumayan hemat 👍. Tanggal saya pakai hari ini dan belum ada nomor faktur — mau saya tambahkan? Cek kartunya lalu setujui.
Admin: ada apa hari ini?
Eira: Ada 3 hal yang layak diurus dulu: (1) **4 batch kadaluarsa senilai Rp 1,2 juta** masih tercatat di stok — saya bisa siapkan usulan buang stoknya; (2) **Lidocaine tinggal ±10 hari** pada pemakaian sekarang, saran beli 30 ampul; (3) **sewa belum tercatat bulan ini** (biasanya Rp 8 juta). Mau mulai dari yang mana?
Admin: tambah stok masker bedah 5 box
Eira: "Masker bedah" ada dua: **Earloop** dan **Headloop**. Yang mana? Dan harga per box berapa, supaya sekalian saya hitung totalnya?
Admin: (menempel nota 6 baris, satu baris tanpa jumlah)
Eira: Saya baca **6 baris**; 5 sudah jelas dan siap dimasukkan ke stok. Baris "kapas" tidak ada jumlahnya — berapa? Begitu dijawab, semuanya saya jadikan satu kartu.`;

const CLAIM_DONE = /\b(?<!belum )(sudah|telah|berhasil)\s+(?:(?:saya|kami|pun|juga)\s+)?(di)?(catat|ubah|tambah|tambahkan|hapus|simpan|masukkan|perbarui|buang|jalankan|ganti|naikkan|turunkan|update)/i;
const NO_ANSWER = /^Maaf, Asisten AI tidak memberi jawaban/;
/** Jawaban mengaku sudah menyiapkan kartu usulan. */
export const CLAIM_PREPARED = /(saya\s+(sudah\s+)?siapkan\s+(usulan|kartu|pencatatan|stok|perubahan|opname|pengeluaran)|kartu\s+usulan|silakan\s+(cek|periksa|tinjau)\s+(kartu|usulan)|tekan\s+\*{0,2}setujui)/i;

/**
 * Penjaga kejujuran jawaban agen (berguna untuk model kecil):
 *  • usulan ada tetapi jawaban kosong → susun ringkasan dari judul usulan;
 *  • jawaban mengklaim "sudah dicatat/diubah" padahal baru usulan (atau tak ada usulan sama sekali) → tambahkan catatan koreksi.
 */
export function guardAgentAnswer(answer: string, actions: ProposedAction[], agentIntent: boolean): string {
  const text = (answer ?? "").trim();
  const titles = actions.map((a) => `• ${(a.pratinjau as { judul?: string })?.judul ?? a.jenis}`).slice(0, 8).join("\n");
  if (actions.length > 0) {
    if (!text || NO_ANSWER.test(text)) {
      return `Saya siapkan **${actions.length} usulan** untuk Anda:\n${titles}\n\nSilakan periksa kartunya, lalu tekan **Setujui** bila sudah sesuai.`;
    }
    if (CLAIM_DONE.test(text)) return `${text}\n\n_Catatan: usulan di atas belum dijalankan — data baru berubah setelah Anda menekan **Setujui**._`;
    return text;
  }
  if ((agentIntent && CLAIM_DONE.test(text)) || CLAIM_PREPARED.test(text)) return `${text}\n\n_Catatan: kartu usulan belum terbentuk, jadi belum ada data yang berubah. Coba ulangi permintaan dengan detail yang lebih lengkap (bahan, jumlah, harga)._`;
  return text;
}

/** Permintaan briefing: server menyuntikkan hasil briefing_agen ke konteks sehingga tidak bergantung pada model memanggil alat. */
export function isBriefingRequest(normalizedQuestion: string): boolean {
  return /(^| )(briefing|ada apa hari ini|apa yang perlu (diurus|dikerjakan|saya urus|saya kerjakan)|yang perlu diurus|prioritas hari ini)( |$)/.test(normalizedQuestion);
}

/** Pembuka pertanyaan murni (informasi/analisis) — tidak butuh alat usulan. */
const INFO_START = /^(berapa|apa|apakah|siapa|kenapa|mengapa|bagaimana|gimana|kapan|dimana|di mana|mana|ada|jelaskan|kalau|jika|andai|seandainya|bandingkan|tampilkan|lihat|cek|tunjukkan)( |$)/;

/**
 * Alat usulan (tulis) disodorkan KECUALI pertanyaan jelas bersifat informasi. Dulu gerbangnya terlalu ketat: pada "lidocain masuk 3 box 55rb"
 * model tak punya alat lalu BERPURA-PURA sudah menyiapkan usulan (ditemukan lewat evaluasi model nyata). Default sekarang: sediakan alat.
 */
export function needsWriteTools(normalizedQuestion: string, history: Array<{ role: string; content: string }> = []): boolean {
  const q = normalizedQuestion;
  if (isAgentIntent(q) || /(^| )(briefing|rapikan|bereskan|urus|siapkan)( |$)/.test(q)) return true;
  const lastAssistant = [...history].reverse().find((h) => h.role === "assistant")?.content ?? "";
  if (q.split(" ").length <= 12 && /(siapkan|usulan|kartu|mau saya|bisa saya|tawar)/i.test(lastAssistant)) return true;
  if (q.split(" ").length <= 2) return false; // sapaan/basa-basi: "halo", "ya", "terima kasih"
  if (INFO_START.test(q)) return false;
  return true;
}

/** Ringkasan usulan yang masih menunggu, agar model tidak menggandakannya. */
export function pendingText(rows: Array<{ kind: string; preview?: { judul?: string } }>): string {
  if (!rows.length) return "";
  const lines = rows.slice(0, 12).map((r) => `- ${r.preview?.judul ?? r.kind}`).join("\n");
  return `\n\nUsulan yang SUDAH menunggu persetujuan admin (${rows.length}) — jangan dibuat ulang:\n${lines}`;
}
