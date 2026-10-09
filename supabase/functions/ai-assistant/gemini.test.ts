// deno test supabase/functions/ai-assistant/gemini.test.ts
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { GeminiError, geminiInteract, readInteraction, toGeminiSchema, userText } from "./gemini.ts";

Deno.test("toGeminiSchema: buang additionalProperties di semua tingkat, pertahankan enum/required/items", () => {
  const out = toGeminiSchema({
    type: "object", additionalProperties: false, required: ["a", "b"],
    properties: {
      a: { type: "string", enum: ["x", "y"], description: "pilih" },
      b: { type: "array", items: { type: "object", additionalProperties: false, properties: { n: { type: "number" } }, required: ["n"] } },
    },
  });
  assertEquals(out, {
    type: "object", required: ["a", "b"],
    properties: {
      a: { type: "string", enum: ["x", "y"], description: "pilih" },
      b: { type: "array", items: { type: "object", properties: { n: { type: "number" } }, required: ["n"] } },
    },
  });
});

Deno.test("readInteraction: teks, panggilan fungsi, langkah model untuk dikirim balik, token", () => {
  const r = readInteraction({
    status: "requires_action",
    steps: [
      { type: "user_input", content: [{ type: "text", text: "tanya" }] },
      { type: "thought", signature: "sig" },
      { type: "function_call", id: "call_1", name: "ringkasan_pendapatan", arguments: { dari: "2026-10-01", sampai: "2026-10-09" } },
    ],
    usage: { total_input_tokens: 120, total_cached_tokens: 20, total_output_tokens: 30, total_thought_tokens: 10 },
  });
  assertEquals(r.calls, [{ id: "call_1", name: "ringkasan_pendapatan", args: { dari: "2026-10-01", sampai: "2026-10-09" } }]);
  assertEquals(r.modelSteps.map((s) => s.type), ["thought", "function_call"]); // user_input tidak dikirim ulang
  assertEquals(r.usage, { input: 100, output: 40, cacheRead: 20 });
  assert(!r.failed);

  const done = readInteraction({
    status: "completed",
    steps: [{ type: "model_output", content: [{ type: "text", text: "Pendapatan " }, { type: "text", text: "naik." }] }],
  });
  assertEquals(done.text, "Pendapatan naik.");
  assertEquals(done.calls, []);
  assert(readInteraction({ status: "failed" }).failed);
  assertEquals(readInteraction({}).text, "");
});

Deno.test("geminiInteract: endpoint Interactions, kunci & Api-Revision di header, store=false", async () => {
  const orig = globalThis.fetch;
  let seen: { url: string; init?: RequestInit } | null = null;
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    seen = { url, init };
    return Promise.resolve(new Response(JSON.stringify({ status: "completed", steps: [] }), { status: 200 }));
  }) as typeof fetch;
  try {
    await geminiInteract("AQ.KUNCI", { model: "gemini-flash-latest", input: [userText("halo")] });
    assertEquals(seen!.url, "https://generativelanguage.googleapis.com/v1beta/interactions");
    const h = seen!.init!.headers as Record<string, string>;
    assertEquals(h["x-goog-api-key"], "AQ.KUNCI");
    assertEquals(h["Api-Revision"], "2026-05-20");
    const body = JSON.parse(String(seen!.init!.body));
    assertEquals(body.store, false);
    assertEquals(body.input, [{ type: "user_input", content: [{ type: "text", text: "halo" }] }]);
    assert(!seen!.url.includes("KUNCI"));

    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ error: { code: "resource_exhausted", message: "Quota exceeded" } }), { status: 429 }))) as typeof fetch;
    const err = await assertRejects(() => geminiInteract("K", {}), GeminiError);
    assertEquals((err as GeminiError).status, 429);
    assertEquals((err as GeminiError).message, "HTTP 429 Quota exceeded");
  } finally {
    globalThis.fetch = orig;
  }
});
