// deno test supabase/functions/ai-assistant/fast.test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import { fastAnswer } from "./fast.ts";
import { normalizeQuestion } from "./knowledge.ts";

const snap = {
  hari_ini: {
    pembayaran_hari_ini: { total: 450000, transaksi: 2 },
    kunjungan_per_status: { scheduled: 3, completed: 2 },
    kunjungan_per_dokter: [{ dokter: "drg. Ahmad", terjadwal: 3, selesai: 2, batal: 0 }],
    pasien_baru_hari_ini: 1, booking_online_menunggu: 2, booking_online_untuk_hari_ini: 1,
    selesai_belum_dibayar_hari_ini: 1, terjadwal_7_hari_ke_depan: 9,
  },
  pendapatan_bulan_ini: {
    periode: { dari: "2026-10-01", sampai: "2026-10-10" }, total_pendapatan: 2500000, jumlah_transaksi: 10,
    rata_rata_transaksi: 250000, total_diskon: 0, per_metode: [{ metode: "cash", total: 1500000, transaksi: 6 }, { metode: "qris", total: 1000000, transaksi: 4 }],
  },
  pengeluaran_bulan_ini: { total_pendapatan: 2500000, total_pengeluaran: 700000, selisih_pendapatan_minus_pengeluaran: 1800000, per_kategori: [{ kategori: "Utilitas", total: 700000 }] },
  stok: { stok_menipis: [{ bahan: "Paracetamol 500mg", stok: 0, minimum: 5, satuan: "tablet" }], kadaluarsa_60_hari: [] },
  belum_dibayar_30_hari: { jumlah_kunjungan: 3, perkiraan_nilai: 600000, rentang_hari: 30 },
  recall_6_bulan: { batas_bulan: 6, pasien_perlu_recall: 4, dengan_izin_wa: 3, sudah_dihubungi_30_hari: 1 },
  tindakan_90_hari_top10: { periode: { dari: "2026-07-13", sampai: "2026-10-10" }, tindakan: [{ nama: "Scaling", jumlah: 8, pendapatan: 2000000 }] },
};
const ask = (q: string) => fastAnswer(normalizeQuestion(q), snap);

Deno.test("data: pendapatan hari ini & bulan ini dari snapshot", () => {
  const a = ask("Berapa pendapatan hari ini?")!;
  assertEquals(a.intent, "pendapatan_hari_ini");
  assertStringIncludes(a.answer, "Rp 450.000");
  const b = ask("tolong berapa omzet bulan ini ya")!;
  assertEquals(b.intent, "pendapatan_bulan_ini");
  assertStringIncludes(b.answer, "Rp 2.500.000");
  assertStringIncludes(b.answer, "QRIS");
});

Deno.test("data: pengeluaran, laba, kunjungan, stok, tagihan, recall, booking, terlaris, 7 hari", () => {
  assertEquals(ask("Pengeluaran bulan ini berapa?")!.intent, "pengeluaran_bulan_ini");
  assertStringIncludes(ask("Bulan ini untung atau rugi?")!.answer, "Rp 1.800.000");
  assertStringIncludes(ask("Ada berapa pasien hari ini?")!.answer, "5 kunjungan");
  assertEquals(ask("Ada pasien baru hari ini?")!.intent, "pasien_baru_hari_ini");
  assertStringIncludes(ask("Bahan apa yang stoknya menipis?")!.answer, "Paracetamol");
  assertStringIncludes(ask("Ada tagihan yang belum dibayar?")!.answer, "Rp 600.000");
  assertStringIncludes(ask("Berapa pasien yang perlu recall?")!.answer, "4 pasien");
  assertStringIncludes(ask("Ada booking baru yang menunggu?")!.answer, "2 booking");
  assertStringIncludes(ask("Tindakan apa yang paling laku?")!.answer, "Scaling");
  assertStringIncludes(ask("Berapa jadwal 7 hari ke depan?")!.answer, "9 kunjungan");
});

Deno.test("panduan: cara pakai dijawab dari pelajaran", () => {
  assertEquals(ask("Bagaimana cara membuat tautan layar antrean TV?")!.intent, "panduan:layar_antrean");
  assertEquals(ask("cara mengaktifkan booking online")!.intent, "panduan:booking_online");
  assertEquals(ask("Bagaimana cara menambah dokter baru?")!.intent, "panduan:undang_pengguna");
  assertEquals(ask("cara pakai qris")!.intent, "panduan:qris");
  assertEquals(ask("Apa yang perlu diisi agar HPP terhitung? cara isinya")!.intent, "panduan:hpp");
  assertEquals(ask("cara download aplikasi dentiva di laptop")!.intent, "panduan:aplikasi_desktop");
  assertEquals(ask("bagaimana cara mencatat pengeluaran")!.kind, "panduan");
});

Deno.test("rumit / tidak tercakup → serahkan ke AI", () => {
  assertEquals(ask("Kenapa pendapatan bulan ini turun?"), null);
  assertEquals(ask("Bandingkan pendapatan bulan ini dengan bulan lalu"), null);
  assertEquals(ask("Berapa pendapatan bulan lalu?"), null);
  assertEquals(ask("Pendapatan tanggal 5 Oktober berapa?"), null);
  assertEquals(ask("Kalau harga scaling naik 10%, berapa dampaknya?"), null);
  assertEquals(ask("Berapa pendapatan per dokter bulan ini?"), null);
  assertEquals(ask("Berapa BEP klinik?"), null);
  assertEquals(ask("Bagaimana cara terbang ke bulan?"), null); // panduan tak dikenal
  assertEquals(ask("halo"), null);
});

Deno.test("data kosong dijawab apa adanya", () => {
  const empty = { ...snap, hari_ini: { ...snap.hari_ini, pembayaran_hari_ini: { total: 0, transaksi: 0 } } };
  assert(fastAnswer(normalizeQuestion("pendapatan hari ini"), empty)!.answer.includes("Belum ada pembayaran"));
});
