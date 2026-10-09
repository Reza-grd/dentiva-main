// deno test supabase/functions/ai-assistant/groq.test.ts
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { extractJson, groqChat, GroqError, readGroq, stripThinking } from "./groq.ts";

Deno.test("readGroq: panggilan alat, argumen JSON, token", () => {
  const r = readGroq({
    choices: [{
      finish_reason: "tool_calls",
      message: {
        role: "assistant", content: null,
        tool_calls: [
          { id: "t1", type: "function", function: { name: "titik_impas", arguments: "{\"bulan\":3}" } },
          { id: "t2", type: "function", function: { name: "ringkasan_hari_ini", arguments: "" } },
          { id: "t3", type: "function", function: { name: "x", arguments: "{rusak" } },
        ],
      },
    }],
    usage: { prompt_tokens: 50, completion_tokens: 7 },
  });
  assertEquals(r.calls, [
    { id: "t1", name: "titik_impas", args: { bulan: 3 } },
    { id: "t2", name: "ringkasan_hari_ini", args: {} },
    { id: "t3", name: "x", args: null },
  ]);
  assertEquals(r.usage, { input: 50, output: 7 });
  assertEquals(r.text, "");
});

Deno.test("readGroq: teks tanpa <think>, terpotong, diblokir", () => {
  assertEquals(readGroq({ choices: [{ message: { content: "<think>hmm</think>Jawaban" } }] }).text, "Jawaban");
  assert(readGroq({ choices: [{ finish_reason: "length", message: { content: "x" } }] }).truncated);
  assert(readGroq({ choices: [{ finish_reason: "content_filter", message: { content: "" } }] }).blocked);
  assertEquals(stripThinking("<THINK>a\nb</THINK> ok"), "ok");
});

Deno.test("extractJson: JSON murni, dalam pagar kode, dan rusak", () => {
  assertEquals(extractJson("{\"a\":1}"), { a: 1 });
  assertEquals(extractJson("Berikut:\n```json\n{\"template\":\"Halo {nama}\"}\n```"), { template: "Halo {nama}" });
  assertEquals(extractJson("<think>x</think>{\"b\":true}"), { b: true });
  assertEquals(extractJson("bukan json"), null);
});

Deno.test("groqChat: kunci di header Authorization dan error HTTP jadi GroqError", async () => {
  const orig = globalThis.fetch;
  let seen: { url: string; init?: RequestInit } | null = null;
  globalThis.fetch = ((url: string, init?: RequestInit) => {
    seen = { url, init };
    return Promise.resolve(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
  }) as typeof fetch;
  try {
    await groqChat("gsk_TEST", { model: "m", messages: [] });
    assertEquals(seen!.url, "https://api.groq.com/openai/v1/chat/completions");
    assertEquals((seen!.init!.headers as Record<string, string>).Authorization, "Bearer gsk_TEST");
    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ error: { message: "rate" } }), { status: 429 }))) as typeof fetch;
    const err = await assertRejects(() => groqChat("k", {}), GroqError);
    assertEquals((err as GroqError).status, 429);
  } finally {
    globalThis.fetch = orig;
  }
});
