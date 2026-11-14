import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { bacaPerintah, keFormatWa, riwayatAktif, samarkanNomor, teksHasilTautan, teksPilihKlinik } from "./waEira.ts";

Deno.test("bacaPerintah: kode tautan, perintah, dan pertanyaan biasa", () => {
  assertEquals(bacaPerintah("DENTIVA 482913"), { jenis: "kode", kode: "482913" });
  assertEquals(bacaPerintah("  dentiva:482913 "), { jenis: "kode", kode: "482913" });
  assertEquals(bacaPerintah("Bantuan"), { jenis: "bantuan" });
  assertEquals(bacaPerintah("ganti klinik"), { jenis: "ganti_klinik" });
  assertEquals(bacaPerintah("2"), { jenis: "pilih", nomor: 2 });
  assertEquals(bacaPerintah("PUTUSKAN"), { jenis: "putuskan" });
  assertEquals(bacaPerintah("Ya."), { jenis: "ya" });
  assertEquals(bacaPerintah("batal"), { jenis: "tidak" });
  assertEquals(bacaPerintah("berapa pendapatan hari ini?"), { jenis: "tanya", teks: "berapa pendapatan hari ini?" });
  // angka 6 digit tanpa kata DENTIVA bukan kode (bisa jadi nominal)
  assertEquals(bacaPerintah("482913").jenis, "tanya");
});

Deno.test("samarkanNomor: hanya awalan & 4 digit terakhir", () => {
  assertEquals(samarkanNomor("6281234567890"), "+62 812-••••-7890");
  assertEquals(samarkanNomor("123"), "+••••");
});

Deno.test("keFormatWa: markdown → format WhatsApp, dipotong bila terlalu panjang", () => {
  assertEquals(keFormatWa("## Ringkasan\n**Pendapatan** naik\n- satu\n- [Laporan](https://x.id/a)"), "*Ringkasan*\n*Pendapatan* naik\n• satu\n• Laporan (https://x.id/a)");
  const panjang = keFormatWa("a".repeat(5000));
  assert(panjang.length <= 3800 && panjang.includes("dipotong"));
});

Deno.test("riwayatAktif: kosong setelah 6 jam, maks 20 giliran", () => {
  const r = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: String(i) }));
  const t = new Date("2026-11-15T10:00:00Z").getTime();
  assertEquals(riwayatAktif(r, "2026-11-15T09:00:00Z", t).length, 20);
  assertEquals(riwayatAktif(r, "2026-11-15T03:00:00Z", t), []);
});

Deno.test("teks: hasil tautan & pilihan klinik", () => {
  assert(teksHasilTautan({ ok: true, nama: "drg. Lina", peran: "admin", klinik: "Klinik A" }).includes("Manajer"));
  assert(teksHasilTautan({ ok: false, alasan: "kode_salah" }).includes("kedaluwarsa"));
  assert(teksPilihKlinik([
    { user_id: "a", clinic_id: "1", nama: "x", peran: "dokter", klinik: "Klinik A" },
    { user_id: "b", clinic_id: "2", nama: "x", peran: "admin", klinik: "Klinik B" },
  ]).includes("2. Klinik B — Manajer"));
});
