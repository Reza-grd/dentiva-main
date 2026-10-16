// deno test --config supabase/functions/ai-assistant/deno.json supabase/functions/ai-assistant/pricing.test.ts
import { assert, assertAlmostEquals, assertEquals } from "jsr:@std/assert@1";
import { anthropicModels, costUsd, DEFAULT_CHAT_MODEL, DEFAULT_LIGHT_MODEL, priceFor, supportsServerFallback } from "./pricing.ts";

Deno.test("model bawaan: Sonnet 5.5 untuk percakapan, Haiku 5.5 untuk tugas ringan; dapat diganti lewat secret", () => {
  assertEquals(anthropicModels(undefined, undefined), { chat: "claude-sonnet-5-5", light: "claude-haiku-5-5" });
  assertEquals(anthropicModels("", "  "), { chat: DEFAULT_CHAT_MODEL, light: DEFAULT_LIGHT_MODEL });
  assertEquals(anthropicModels(' "claude-opus-5-5" ', "claude-sonnet-5-5"), { chat: "claude-opus-5-5", light: "claude-sonnet-5-5" });
});

Deno.test("harga per 1 juta token sesuai daftar resmi", () => {
  assertEquals(priceFor("claude-sonnet-5-5"), { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 });
  assertEquals(priceFor("claude-haiku-5-5").input, 0.1);
  assertEquals(priceFor("claude-haiku-5-5").output, 0.5);
  assertEquals(priceFor("claude-opus-5-5").input, 4);
  // model tak dikenal → harga Sonnet (konservatif), bukan nol
  assertEquals(priceFor("claude-entah-5"), priceFor("claude-sonnet-5-5"));
});

Deno.test("costUsd: contoh percakapan agen (38K masuk, 1,2K keluar) & catatan dashboard", () => {
  const chat = { input: 38_000, output: 1_200, cacheRead: 0, cacheWrite: 0 };
  assertAlmostEquals(costUsd("claude-sonnet-5-5", chat), 0.088, 1e-6);
  assertAlmostEquals(costUsd("claude-haiku-5-5", chat), 0.0044, 1e-6);
  // dengan cache: 15K tulis + 23K baca
  const cached = { input: 0, output: 1_200, cacheRead: 23_000, cacheWrite: 15_000 };
  assertAlmostEquals(costUsd("claude-sonnet-5-5", cached), 0.0375 + 0.0046 + 0.012, 1e-6);
  const brief = { input: 1_300, output: 300, cacheRead: 0, cacheWrite: 0 };
  assert(costUsd("claude-haiku-5-5", brief) < 0.0005);
  assertEquals(costUsd("claude-haiku-5-5", { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }), 0);
});

Deno.test("Haiku tidak mendukung fallback refusal sisi-server; model lain mendukung", () => {
  assertEquals(supportsServerFallback("claude-haiku-5-5"), false);
  assertEquals(supportsServerFallback("claude-haiku-4-5"), false);
  assertEquals(supportsServerFallback("claude-sonnet-5-5"), true);
  assertEquals(supportsServerFallback("claude-opus-5-5"), true);
});
