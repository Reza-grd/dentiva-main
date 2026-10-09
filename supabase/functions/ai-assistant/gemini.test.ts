// deno test supabase/functions/ai-assistant/gemini.test.ts
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { GeminiError, geminiGenerate, readResponse, toGeminiSchema } from "./gemini.ts";

Deno.test("toGeminiSchema: tipe huruf besar, buang additionalProperties, pertahankan enum/required/items", () => {
  const out = toGeminiSchema({
    type: "object", additionalProperties: false, required: ["a", "b"],
    properties: {
      a: { type: "string", enum: ["x", "y"], description: "pilih" },
      b: { type: "array", items: { type: "object", additionalProperties: false, properties: { n: { type: "number" } }, required: ["n"] } },
    },
  });
  assertEquals(out, {
    type: "OBJECT", required: ["a", "b"],
    properties: {
      a: { type: "STRING", description: "pilih", enum: ["x", "y"] },
      b: { type: "ARRAY", items: { type: "OBJECT", properties: { n: { type: "NUMBER" } }, required: ["n"] } },
    },
  });
});

Deno.test("readResponse: teks tanpa bagian thought, panggilan fungsi, token", () => {
  const r = readResponse({
    candidates: [{
      finishReason: "STOP",
      content: { role: "model", parts: [
        { text: "berpikir…", thought: true },
        { functionCall: { name: "ringkasan_pendapatan", args: { dari: "2026-10-01", sampai: "2026-10-09" }, id: "c1" }, thoughtSignature: "sig" },
        { text: "Jawaban" },
      ] },
    }],
    usageMetadata: { promptTokenCount: 120, cachedContentTokenCount: 20, candidatesTokenCount: 30, thoughtsTokenCount: 10 },
  });
  assertEquals(r.text, "Jawaban");
  assertEquals(r.calls, [{ name: "ringkasan_pendapatan", args: { dari: "2026-10-01", sampai: "2026-10-09" }, id: "c1" }]);
  assertEquals(r.parts.length, 3); // dikirim balik utuh, termasuk thoughtSignature
  assertEquals(r.usage, { input: 100, output: 40, cacheRead: 20 });
  assert(!r.blocked && !r.truncated);
});

Deno.test("readResponse: diblokir dan terpotong", () => {
  assert(readResponse({ promptFeedback: { blockReason: "SAFETY" } }).blocked);
  assert(readResponse({ candidates: [{ finishReason: "PROHIBITED_CONTENT" }] }).blocked);
  assert(readResponse({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "x" }] } }] }).truncated);
  assertEquals(readResponse({}).text, "");
});

Deno.test("geminiGenerate: kunci di header (bukan URL) dan error HTTP jadi GeminiError", async () => {
  const orig = globalThis.fetch;
  let seen: { url: string; init?: RequestInit } | null = null;
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    seen = { url, init };
    return Promise.resolve(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
  }) as typeof fetch;
  try {
    await geminiGenerate("KUNCI", "gemini-flash-latest", { contents: [] });
    assertEquals(seen!.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent");
    assertEquals((seen!.init!.headers as Record<string, string>)["x-goog-api-key"], "KUNCI");
    assert(!seen!.url.includes("KUNCI"));

    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ error: { message: "Quota exceeded" } }), { status: 429 }))) as typeof fetch;
    const err = await assertRejects(() => geminiGenerate("K", "m", {}), GeminiError);
    assertEquals((err as GeminiError).status, 429);
  } finally {
    globalThis.fetch = orig;
  }
});
