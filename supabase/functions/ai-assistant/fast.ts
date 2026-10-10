/**
 * JALUR CEPAT Asisten AI — menjawab pertanyaan umum TANPA memanggil model AI (< 1 detik).
 *
 *  1. DATA   : maksud pertanyaan dikenali dengan aturan kata kunci, jawaban disusun dari
 *              ai_snapshot() (angka selalu terbaru).
 *  2. PANDUAN: "pelajaran" cara pakai Dentiva yang sudah ditulis (FAQ) — dijawab langsung.
 *
 * Prinsip: KONSERVATIF. Bila pertanyaan mengandung analisis, perbandingan, periode khusus,
 * atau hal yang tidak tercakup → kembalikan null dan biarkan AI yang menjawab.
 * Menambah pelajaran baru: tambahkan entri di INTENTS (data) atau GUIDES (panduan),
 * lalu tambahkan contoh di fast.test.ts. Lihat docs/ai-jalur-cepat.md.
 */

// deno-lint-ignore no-explicit-any
type Snap = any;
export type FastResult = { answer: string; intent: string; kind: "data" | "panduan" };

const rp = (n: unknown) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(n) || 0);
const num = (n: unknown) => new Intl.NumberFormat("id-ID").format(Number(n) || 0);
const has = (q: string, re: RegExp) => re.test(q);

const STATUS_LABEL: Record<string, string> = {
  scheduled: "terjadwal", ongoing: "sedang diperiksa", completed: "selesai", cancelled: "dibatalkan",
};

/** Kata/frasa yang menandakan pertanyaan butuh analisis AI — jalur cepat dilewati. */
const COMPLEX = /\b(kenapa|mengapa|bandingkan|banding|dibanding|perbandingan|simulasi|seandainya|andaikan|jika|kalau|proyeksi|prediksi|bep|impas|tren|trend|analisis|analisa|evaluasi|saran|rekomendasi|strategi|tips|naik|turun|kemarin|lalu|tahun|kuartal|semester|minggu ini|tanggal|per dokter|setiap dokter|tiap dokter|masing masing|rata rata per|persentase|persen|margin|hpp|grafik|detail|rinci|rincian|lengkap)\b|\b\d{1,2} (jan|feb|mar|apr|mei|jun|jul|agu|agt|sep|okt|nov|des)|\b(19|20)\d\d\b/;

/** Penanda pertanyaan "cara pakai". */
const HOWTO = /\b(cara|bagaimana|gimana|dimana|di mana|langkah|aktifkan|mengaktifkan|membuat|bikin|atur|mengatur|tambah|menambah|menambahkan|undang|mengundang|ubah|mengubah|ganti|mengganti|cetak|mencetak|unduh|download|install|instal|pakai|memakai|menggunakan|mendaftarkan|daftarkan|hubungkan|menghubungkan|isi|mengisi|catat|mencatat|kirim|mengirim)\b/;

// ───────────────────────── 1. Jawaban dari data ─────────────────────────
type Intent = { id: string; match: (q: string) => boolean; answer: (s: Snap) => string | null };

const INTENTS: Intent[] = [
  {
    id: "pendapatan_hari_ini",
    match: (q) => has(q, /\b(pendapatan|pemasukan|omzet|omset|penghasilan|pembayaran masuk)\b/) && has(q, /\bhari ini\b/),
    answer: (s) => {
      const p = s?.hari_ini?.pembayaran_hari_ini;
      if (!p) return null;
      return p.transaksi > 0
        ? `Pendapatan hari ini **${rp(p.total)}** dari ${num(p.transaksi)} transaksi lunas.`
        : "Belum ada pembayaran lunas hari ini.";
    },
  },
  {
    id: "pendapatan_bulan_ini",
    match: (q) => has(q, /\b(pendapatan|pemasukan|omzet|omset|penghasilan)\b/) && has(q, /\bbulan ini\b/),
    answer: (s) => {
      const r = s?.pendapatan_bulan_ini;
      if (!r) return null;
      if (!r.jumlah_transaksi) return `Belum ada pembayaran lunas bulan ini (${r.periode?.dari} s.d. ${r.periode?.sampai}).`;
      const metode = (r.per_metode || []).map((m: Snap) => `| ${labelMetode(m.metode)} | ${rp(m.total)} | ${num(m.transaksi)} |`).join("\n");
      return [
        `Pendapatan bulan ini **${rp(r.total_pendapatan)}** dari ${num(r.jumlah_transaksi)} transaksi lunas (${r.periode?.dari} s.d. ${r.periode?.sampai}).`,
        `Rata-rata per transaksi ${rp(r.rata_rata_transaksi)}${Number(r.total_diskon) > 0 ? `, total diskon ${rp(r.total_diskon)}` : ""}.`,
        metode ? `\n| Metode | Total | Transaksi |\n|---|---:|---:|\n${metode}` : "",
      ].filter(Boolean).join("\n");
    },
  },
  {
    id: "pengeluaran_bulan_ini",
    match: (q) => has(q, /\b(pengeluaran|biaya|belanja)\b/) && has(q, /\bbulan ini\b/) && !has(q, /\b(pendapatan|laba|untung|rugi)\b/),
    answer: (s) => {
      const e = s?.pengeluaran_bulan_ini;
      if (!e) return null;
      if (!Number(e.total_pengeluaran)) {
        return "Belum ada pengeluaran yang dicatat bulan ini. Catat pengeluaran di menu **Pengeluaran** (bisa dengan **Pindai nota (AI)**) agar laporan laba lebih akurat.";
      }
      const rows = (e.per_kategori || []).map((k: Snap) => `| ${k.kategori} | ${rp(k.total)} |`).join("\n");
      return `Pengeluaran bulan ini **${rp(e.total_pengeluaran)}**.\n\n| Kategori | Total |\n|---|---:|\n${rows}`;
    },
  },
  {
    id: "laba_bulan_ini",
    match: (q) => has(q, /\b(laba|untung|rugi|profit|keuntungan)\b/) && has(q, /\bbulan ini\b/),
    answer: (s) => {
      const e = s?.pengeluaran_bulan_ini;
      if (!e) return null;
      const diff = Number(e.selisih_pendapatan_minus_pengeluaran) || 0;
      return [
        `Bulan ini pendapatan **${rp(e.total_pendapatan)}** dan pengeluaran tercatat **${rp(e.total_pengeluaran)}**, selisih **${diff < 0 ? "−" : ""}${rp(Math.abs(diff))}**.`,
        "Catatan: ini belum laba bersih resmi bila overhead bulanan (menu **Biaya & Modal**) dan biaya bahan per tindakan belum lengkap.",
      ].join("\n\n");
    },
  },
  {
    id: "pasien_baru_hari_ini",
    match: (q) => has(q, /\bpasien baru\b/) && has(q, /\bhari ini\b/),
    answer: (s) => {
      const n = s?.hari_ini?.pasien_baru_hari_ini;
      return n == null ? null : n > 0 ? `Ada **${num(n)} pasien baru** terdaftar hari ini.` : "Belum ada pasien baru terdaftar hari ini.";
    },
  },
  {
    id: "kunjungan_hari_ini",
    match: (q) => has(q, /\b(kunjungan|pasien|jadwal|antrean|antrian|janji)\b/) && has(q, /\bhari ini\b/) && !has(q, /\bpasien baru\b/),
    answer: (s) => {
      const h = s?.hari_ini;
      if (!h) return null;
      const per = h.kunjungan_per_status || {};
      const total = Object.values(per).reduce((a: number, b) => a + Number(b || 0), 0);
      if (!total) {
        return `Belum ada kunjungan tercatat hari ini.${h.booking_online_untuk_hari_ini ? ` Ada ${num(h.booking_online_untuk_hari_ini)} booking online untuk hari ini.` : ""}`;
      }
      const statusText = Object.entries(per).map(([k, v]) => `${num(v)} ${STATUS_LABEL[k] || k}`).join(", ");
      const dokter = (h.kunjungan_per_dokter || [])
        .map((d: Snap) => `| ${d.dokter || "—"} | ${num(d.terjadwal)} | ${num(d.selesai)} |`).join("\n");
      return [
        `Hari ini ada **${num(total)} kunjungan**: ${statusText}.`,
        dokter ? `\n| Dokter | Terjadwal | Selesai |\n|---|---:|---:|\n${dokter}` : "",
        h.selesai_belum_dibayar_hari_ini ? `\n${num(h.selesai_belum_dibayar_hari_ini)} kunjungan selesai hari ini belum dibayar.` : "",
      ].filter(Boolean).join("\n");
    },
  },
  {
    id: "jadwal_7_hari",
    match: (q) => has(q, /\b(jadwal|kunjungan|janji|terjadwal)\b/) && has(q, /\b(7 hari|minggu depan|seminggu|pekan depan)\b/),
    answer: (s) => {
      const n = s?.hari_ini?.terjadwal_7_hari_ke_depan;
      return n == null ? null : `Ada **${num(n)} kunjungan terjadwal** dalam 7 hari ke depan (tidak termasuk hari ini).`;
    },
  },
  {
    id: "stok",
    match: (q) => has(q, /\b(stok|stock|bahan|obat)\b/) && has(q, /\b(menipis|tipis|habis|minimum|kurang|kadaluarsa|kedaluwarsa|expired|kosong|aman|cek|status)\b/),
    answer: (s) => {
      const st = s?.stok;
      if (!st) return null;
      const low = st.stok_menipis || [];
      const exp = st.kadaluarsa_60_hari || [];
      if (!low.length && !exp.length) return "Stok aman: tidak ada bahan di bawah stok minimum dan tidak ada yang kedaluwarsa dalam 60 hari.";
      const parts: string[] = [];
      if (low.length) {
        parts.push(`**${num(low.length)} bahan** di bawah/sama dengan stok minimum:\n\n| Bahan | Stok | Minimum |\n|---|---:|---:|\n` +
          low.slice(0, 12).map((b: Snap) => `| ${b.bahan} | ${num(b.stok)} ${b.satuan || ""} | ${num(b.minimum)} |`).join("\n"));
      }
      if (exp.length) {
        parts.push(`**${num(exp.length)} batch** kedaluwarsa dalam 60 hari:\n` +
          exp.slice(0, 10).map((b: Snap) => `- ${b.bahan ?? b.nama ?? "Bahan"} — ${b.tanggal_kadaluarsa ?? b.kadaluarsa ?? ""}`).join("\n"));
      }
      parts.push("Lakukan pembelian lewat **Biaya & Modal → Stok Masuk**.");
      return parts.join("\n\n");
    },
  },
  {
    id: "belum_dibayar",
    match: (q) => has(q, /\b(belum dibayar|belum bayar|belum lunas|tagihan|piutang|belum ditagih)\b/),
    answer: (s) => {
      const u = s?.belum_dibayar_30_hari;
      if (!u) return null;
      return u.jumlah_kunjungan > 0
        ? `Ada **${num(u.jumlah_kunjungan)} kunjungan selesai** dalam ${u.rentang_hari} hari terakhir yang belum lunas, perkiraan nilai **${rp(u.perkiraan_nilai)}**. Tagih lewat menu **Pembayaran**.`
        : `Tidak ada kunjungan selesai yang belum dibayar dalam ${u.rentang_hari} hari terakhir.`;
    },
  },
  {
    id: "recall",
    match: (q) => has(q, /\b(recall|belum kembali|tidak kembali|lama tidak datang|perlu dihubungi|kontrol ulang)\b/),
    answer: (s) => {
      const r = s?.recall_6_bulan;
      if (!r) return null;
      return r.pasien_perlu_recall > 0
        ? `Ada **${num(r.pasien_perlu_recall)} pasien** yang terakhir datang ≥ ${r.batas_bulan} bulan lalu dan belum punya jadwal; ${num(r.dengan_izin_wa)} di antaranya mengizinkan dihubungi via WhatsApp, ${num(r.sudah_dihubungi_30_hari)} sudah dihubungi 30 hari terakhir. Daftarnya ada di menu **Recall Pasien**.`
        : `Tidak ada pasien yang perlu di-recall (batas ${r.batas_bulan} bulan) saat ini.`;
    },
  },
  {
    id: "booking_menunggu",
    match: (q) => has(q, /\bbooking\b/) && has(q, /\b(menunggu|pending|masuk|baru|konfirmasi|berapa|ada)\b/) && !HOWTO.test(q),
    answer: (s) => {
      const h = s?.hari_ini;
      if (!h) return null;
      return h.booking_online_menunggu > 0
        ? `Ada **${num(h.booking_online_menunggu)} booking online** menunggu konfirmasi${h.booking_online_untuk_hari_ini ? `, ${num(h.booking_online_untuk_hari_ini)} di antaranya untuk hari ini` : ""}. Konfirmasi di menu **Booking Online**.`
        : "Tidak ada booking online yang menunggu konfirmasi.";
    },
  },
  {
    id: "tindakan_terlaris",
    match: (q) => has(q, /\b(tindakan|treatment|perawatan|layanan)\b/) && has(q, /\b(terlaris|terbanyak|paling laku|populer|paling sering|paling banyak|teratas|top)\b/),
    answer: (s) => {
      const t = s?.tindakan_90_hari_top10;
      if (!t) return null;
      const rows = (t.tindakan || []).slice(0, 5);
      if (!rows.length) return "Belum ada tindakan yang dibayar dalam 90 hari terakhir.";
      return `Tindakan dengan pendapatan tertinggi 90 hari terakhir (${t.periode?.dari} s.d. ${t.periode?.sampai}):\n\n| Tindakan | Jumlah | Pendapatan |\n|---|---:|---:|\n` +
        rows.map((r: Snap) => `| ${r.nama} | ${num(r.jumlah)} | ${rp(r.pendapatan)} |`).join("\n");
    },
  },
];

function labelMetode(m: string) {
  return ({ cash: "Tunai", qris: "QRIS", transfer: "Transfer", debit: "Debit" } as Record<string, string>)[m] || m;
}

// ───────────────────────── 2. Pelajaran panduan ─────────────────────────
type Guide = { id: string; match: (q: string) => boolean; answer: string };

const GUIDES: Guide[] = [
  {
    id: "layar_antrean",
    match: (q) => has(q, /\b(layar antrean|layar antrian|antrean tv|antrian tv|tv antrean|tv antrian|display antrean|monitor antrean)\b/),
    answer: "Cara memasang layar antrean TV:\n1. Buka **Pengaturan → Layar Antrean TV**.\n2. Klik buat tautan baru, beri nama (mis. \"Ruang tunggu\").\n3. Buka tautan itu di browser TV/monitor ruang tunggu, lalu jadikan layar penuh (F11).\n4. Layar diperbarui otomatis setiap 10 detik mengikuti status kunjungan (Berlangsung/Selesai) dari resepsionis atau dokter. Nama pasien ditampilkan sebagai inisial.\n\nTautan bisa dicabut kapan saja dari halaman yang sama.",
  },
  {
    id: "booking_online",
    match: (q) => has(q, /\b(booking online|booking|janji online|link booking|halaman booking)\b/),
    answer: "Cara mengaktifkan booking online:\n1. Buka **Pengaturan → Booking Online**, aktifkan dan salin tautan halaman booking klinik.\n2. Bagikan tautan itu (Instagram, WhatsApp, Google Maps).\n3. Pastikan **Jadwal Dokter** sudah diisi — pasien hanya bisa memilih jam praktik yang tersedia.\n4. Permintaan masuk ke menu **Booking Online**; konfirmasi atau tolak, lalu kabari pasien lewat tombol WhatsApp.",
  },
  {
    id: "undang_pengguna",
    match: (q) => has(q, /\b(dokter|resepsionis|pengguna|staf|staff|karyawan|user|akun)\b/) && has(q, /\b(undang|mengundang|tambah|menambah|menambahkan|daftarkan|mendaftarkan|buat|membuat|bikin)\b/),
    answer: "Cara menambah dokter atau resepsionis:\n1. Buka **Kelola Pengguna**.\n2. Klik undang/tambah pengguna, isi nama, email, dan pilih peran (Dokter atau Resepsionis).\n3. Pengguna menerima email undangan untuk membuat kata sandi.\n4. Untuk dokter, lanjutkan mengatur jam praktik di **Jadwal Dokter**.",
  },
  {
    id: "jadwal_dokter",
    match: (q) => has(q, /\b(jadwal dokter|jam praktik|jadwal praktik)\b/),
    answer: "Cara mengatur jadwal dokter:\n1. Buka **Jadwal Dokter**.\n2. Pilih dokter, tambahkan hari dan jam praktik, serta kapasitas pasien per hari.\n3. Simpan. Jadwal ini dipakai saat membuat kunjungan dan di halaman booking online.",
  },
  {
    id: "qris",
    match: (q) => has(q, /\bqris\b/),
    answer: "Cara memakai QRIS:\n1. Buka **Pengaturan → Pembayaran & QRIS**, unggah gambar QRIS klinik (PNG/JPG, maks. 2 MB) dan nama merchant.\n2. Saat menerima pembayaran di menu **Pembayaran**, pilih metode **QRIS** — kode QRIS tampil untuk dipindai pasien.\n3. Setelah dana masuk, simpan pembayaran; kwitansi bisa dicetak atau dikirim via WhatsApp.",
  },
  {
    id: "daftar_pasien",
    match: (q) => has(q, /\bpasien\b/) && has(q, /\b(daftar|daftarkan|mendaftarkan|tambah|menambah|input|registrasi)\b/),
    answer: "Cara mendaftarkan pasien baru:\n1. Buka **Daftar Pasien** (resepsionis/admin).\n2. Isi identitas pasien; NIK, kontak, dan alamat disimpan terenkripsi.\n3. Centang izin dihubungi via WhatsApp bila pasien setuju (untuk pengingat jadwal dan recall).\n4. Simpan, lalu buat kunjungan di menu **Jadwal Kunjungan**.",
  },
  {
    id: "pembayaran",
    match: (q) => has(q, /\b(kwitansi|pembayaran|bayar|tagihan)\b/),
    answer: "Cara mencatat pembayaran:\n1. Buka **Pembayaran**, pilih kunjungan yang sudah selesai.\n2. Periksa tindakan, tambahkan biaya lain atau diskon bila perlu.\n3. Pilih metode: Tunai, Debit, Transfer, atau QRIS, lalu simpan.\n4. Cetak kwitansi (PDF) atau kirim konfirmasi lewat WhatsApp.",
  },
  {
    id: "whatsapp",
    match: (q) => has(q, /\b(whatsapp|wa)\b/) && has(q, /\b(pengingat|reminder|notifikasi|otomatis|konfirmasi|edukasi)\b/),
    answer: "Cara mengatur WhatsApp otomatis:\n1. Buka **Pengaturan → Pengaturan WhatsApp** untuk menghubungkan nomor klinik.\n2. Di **Pengaturan → Notifikasi**, aktifkan pengingat jadwal (H-1 hari dan H-1 jam) dan konfirmasi pembayaran.\n3. Atur pesan edukasi pasca tindakan di **Pengaturan → Edukasi Perawatan**.\n\nPesan hanya dikirim ke pasien yang mengizinkan kontak WhatsApp.",
  },
  {
    id: "satusehat",
    match: (q) => has(q, /\bsatu ?sehat\b/),
    answer: "Cara menghubungkan SATUSEHAT:\n1. Siapkan kredensial (Client ID, Client Secret, Organization ID) dari portal SATUSEHAT Kemenkes.\n2. Buka **Pengaturan → SATUSEHAT**, isi kredensial, lalu uji koneksi.\n3. Setelah terhubung, data kunjungan dikirim otomatis ke SATUSEHAT.",
  },
  {
    id: "hpp",
    match: (q) => has(q, /\b(hpp|margin|modal|bom|resep bahan|overhead|biaya operasional)\b/),
    answer: "Agar HPP dan margin tindakan terhitung:\n1. **Biaya & Modal → Master Bahan & Gudang**: isi bahan beserta harga dan satuannya.\n2. **Stok Masuk**: catat pembelian bahan.\n3. **Resep Bahan (BOM)**: tentukan bahan yang dipakai tiap tindakan.\n4. **Biaya Operasional**: isi overhead bulanan (sewa, gaji, listrik, dll.).\n5. Hasilnya tampil di **Lap. Profitabilitas**, dan Asisten AI dapat menghitung margin serta titik impas.",
  },
  {
    id: "pengeluaran",
    match: (q) => has(q, /\b(pengeluaran|nota|struk|kuitansi belanja)\b/),
    answer: "Cara mencatat pengeluaran:\n1. Buka **Pengeluaran**.\n2. Klik **Tambah** untuk input manual, atau **Pindai nota (AI)** untuk memotret nota — AI mengisi tanggal, toko, total, dan kategori.\n3. Periksa isiannya, lalu **Simpan**. Foto nota tersimpan sebagai bukti, dan ada peringatan bila nota tampak tercatat dua kali.",
  },
  {
    id: "recall_cara",
    match: (q) => has(q, /\brecall\b/),
    answer: "Cara memakai Recall Pasien:\n1. Buka **Recall Pasien**, pilih batas lama tidak datang (mis. 6 bulan).\n2. Klik **Kirim WA** pada pasien — WhatsApp terbuka berisi pesan dari template (hanya untuk pasien yang mengizinkan WA).\n3. Tandai **Sudah ditelepon** bila menghubungi lewat telepon.\n4. Admin dapat mengubah template pesan atau menyusunnya dengan AI.",
  },
  {
    id: "aplikasi_desktop",
    match: (q) => has(q, /\b(aplikasi desktop|desktop|windows|macos|mac|laptop|komputer|pc)\b/) || (has(q, /\b(unduh|download|install|instal)\b/) && has(q, /\b(aplikasi|dentiva)\b/)),
    answer: "Dentiva tersedia sebagai aplikasi desktop untuk **Windows** dan **macOS**. Unduh di **dentiva.id/unduh**, pasang, lalu masuk dengan akun yang sama seperti di browser.",
  },
  {
    id: "tema",
    match: (q) => has(q, /\b(tema|warna|mode gelap|dark mode|tampilan)\b/),
    answer: "Cara mengubah tampilan: buka **Pengaturan → Tampilan Tema** untuk memilih warna klinik dan mode terang/gelap. Ikon matahari/bulan di bagian atas aplikasi juga dapat dipakai untuk berpindah mode dengan cepat.",
  },
  {
    id: "profil_klinik",
    match: (q) => has(q, /\b(profil klinik|nama klinik|alamat klinik|telepon klinik|logo klinik)\b/),
    answer: "Cara mengubah profil klinik: buka **Pengaturan → Profil Klinik**, perbarui nama, alamat, dan nomor telepon, lalu simpan. Data ini tampil di kwitansi, resep, dan pesan WhatsApp.",
  },
  {
    id: "stok_masuk",
    match: (q) => has(q, /\b(stok|bahan|obat)\b/),
    answer: "Cara mengelola stok bahan:\n1. **Biaya & Modal → Master Bahan & Gudang**: daftar bahan, satuan, dan stok minimum.\n2. **Stok Masuk**: catat setiap pembelian (termasuk tanggal kedaluwarsa).\n3. **Stok Opname**: sesuaikan stok dengan hitungan fisik.\n4. **Kartu Stok**: riwayat keluar-masuk tiap bahan.",
  },
];

/**
 * Coba jawab tanpa AI. q = pertanyaan yang sudah dinormalisasi (normalizeQuestion).
 * Kembalikan null bila tidak yakin — AI yang akan menjawab.
 */
export function fastAnswer(q: string, snapshot: Snap): FastResult | null {
  if (!q || q.length > 160) return null;
  if (HOWTO.test(q)) {
    const g = GUIDES.find((x) => x.match(q));
    return g ? { answer: g.answer, intent: `panduan:${g.id}`, kind: "panduan" } : null;
  }
  if (COMPLEX.test(q)) return null;
  for (const it of INTENTS) {
    if (!it.match(q)) continue;
    const answer = it.answer(snapshot);
    return answer ? { answer, intent: it.id, kind: "data" } : null;
  }
  return null;
}
