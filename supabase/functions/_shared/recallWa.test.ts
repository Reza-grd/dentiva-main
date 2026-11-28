import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { dalamJendelaKirim, PESAN_PETUNJUK, pesanBalasan, pesanRecall, tafsirJawaban } from "./recallWa.ts";

Deno.test("tafsir jawaban: angka, frasa umum, BERHENTI; kalimat ambigu ditolak", () => {
  for (const t of ["1", " 1. ", "1 bisa datang", "Bisa datang", "iya", "OK!"]) assertEquals(tafsirJawaban(t), "bisa", t);
  for (const t of ["2", "2 - ganti jadwal", "Ganti jadwal", "ubah jadwal"]) assertEquals(tafsirJawaban(t), "ganti", t);
  for (const t of ["3", "Tidak perlu", "tdk", "gak usah"]) assertEquals(tafsirJawaban(t), "tidak", t);
  for (const t of ["BERHENTI", "stop"]) assertEquals(tafsirJawaban(t), "berhenti", t);
  for (const t of ["tidak bisa hari itu", "12", "4", "", null, "halo dok, gigi saya masih ngilu"]) assertEquals(tafsirJawaban(t), null, String(t));
});

Deno.test("pesan recall awal & ulang: formal, pilihan angka, tanpa emoji", () => {
  const d = { nama: "Budi Santoso", klinik: "Klinik Gigi Senyum", tanggal: "2026-12-05", tujuan: "Lanjutan perawatan saluran akar." };
  const awal = pesanRecall("awal", d);
  assertStringIncludes(awal, "Yth. Budi Santoso,");
  assertStringIncludes(awal, "sekitar Sabtu, 5 Desember 2026 untuk lanjutan perawatan saluran akar.");
  assertStringIncludes(awal, "1 - Bisa datang\n2 - Ganti jadwal\n3 - Tidak perlu");
  assertStringIncludes(awal, "Balas BERHENTI");
  const ulang = pesanRecall("ulang", d);
  assertStringIncludes(ulang, "kami belum menerima jawaban Anda");
  for (const t of [awal, ulang, PESAN_PETUNJUK]) assert(!/\p{Extended_Pictographic}/u.test(t), "tanpa emoji");
});

Deno.test("balasan per hasil; telepon '-' tidak ditampilkan", () => {
  const d = { nama: "Budi", klinik: "Klinik X", tanggal: "2026-12-05", telepon: "021-555" };
  assertStringIncludes(pesanBalasan("dikonfirmasi", d), "menetapkan jam kunjungan");
  assertStringIncludes(pesanBalasan("minta_ganti", d), "waktu lain");
  assertStringIncludes(pesanBalasan("tidak_jadi", d), "hubungi Klinik X di 021-555.");
  assertStringIncludes(pesanBalasan("diteruskan", d), "penjelasan lebih lanjut");
  assertStringIncludes(pesanBalasan("ditutup", { ...d, telepon: "-" }), "hubungi Klinik X.");
});

Deno.test("jendela kirim 09.00–16.00 WIB, bukan Minggu", () => {
  assertEquals(dalamJendelaKirim(new Date("2026-12-01T02:00:00Z")), true); // Selasa 09.00 WIB
  assertEquals(dalamJendelaKirim(new Date("2026-12-01T01:59:00Z")), false); // 08.59
  assertEquals(dalamJendelaKirim(new Date("2026-12-01T09:00:00Z")), false); // 16.00
  assertEquals(dalamJendelaKirim(new Date("2026-12-06T03:00:00Z")), false); // Minggu
});
