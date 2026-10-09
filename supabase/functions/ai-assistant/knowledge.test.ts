// deno test supabase/functions/ai-assistant/knowledge.test.ts
import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import { dataFingerprint, normalizeQuestion, referenceText } from "./knowledge.ts";

Deno.test("normalizeQuestion: huruf kecil, tanpa tanda baca & kata pengisi", () => {
  assertEquals(normalizeQuestion("Tolong, berapa Pendapatan bulan ini ya?"), "berapa pendapatan bulan ini");
  assertEquals(normalizeQuestion("  Bagaimana   cara membuat tautan layar antrean TV?? "), "bagaimana cara membuat tautan layar antrean tv");
  assertEquals(normalizeQuestion("Berapa pendapatan bulan ini?"), normalizeQuestion("berapa pendapatan bulan ini dong"));
});

Deno.test("dataFingerprint: abaikan waktu hitung, berubah bila angka berubah", async () => {
  const a = await dataFingerprint({ dihitung_pada: "10:00", pendapatan: 100 });
  const b = await dataFingerprint({ dihitung_pada: "11:30", pendapatan: 100 });
  const c = await dataFingerprint({ dihitung_pada: "11:30", pendapatan: 150 });
  assertEquals(a, b);
  assertNotEquals(a, c);
  assertEquals(await dataFingerprint(null), null);
});

Deno.test("referenceText: kosong tanpa acuan; tandai angka yang mungkin berubah", () => {
  assertEquals(referenceText([]), "");
  const t = referenceText([{ question: "Pendapatan bulan ini?", answer: "Rp 1", kind: "data", same_data: false }]);
  assert(t.includes("dinilai TEPAT"));
  assert(t.includes("WAJIB perbarui"));
});
