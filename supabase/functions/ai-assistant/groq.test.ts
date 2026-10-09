// deno test supabase/functions/ai-assistant/groq.test.ts
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { GroqError, groqChat, readCompletion, toGroqTools } from "./groq.ts";

Deno.test("toGroqTools: format fungsi OpenAI", () => {
  const out = toGroqTools([{ name: "peringatan_stok", description: "stok", input_schema: { type: "object", properties: {}, required: [], additionalProperties: false } }]);
  assertEquals(out, [{
    type: "function",
    function: { name: "peringatan_stok", description: "stok", parameters: { type: "object", properties: {}, required: [], additionalProperties: false } },
  }]);
});

Deno.test("readCompletion: panggilan alat, argumen JSON, pesan asisten tanpa field reasoning", () => {
  const r = readCompletion({
    choices: [{
      finish_reason: "tool_calls",
      message: {
        role: "assistant", content: null, reasoning: "berpikir…",
        tool_calls: [
          { id: "call_1", type: "function", function: { name: "ringkasan_pendapatan", arguments: "{\"dari\":\"2026-10-01\",\"sampai\":\"2026-10-09\"}" } },
          { id: "call_2", type: "function", function: { name: "titik_impas", arguments: "{rusak" } },
        ],
      },
    }],
    usage: { prompt_tokens: 50, completion_tokens: 12 },
  });
  assertEquals(r.calls[0], { id: "call_1", name: "ringkasan_pendapatan", args: { dari: "2026-10-01", sampai: "2026-10-09" }, rawArgs: "{\"dari\":\"2026-10-01\",\"sampai\":\"2026-10-09\"}" });
  assertEquals(r.calls[1].args, null); // argumen rusak → ditolak sebagai error alat
  assertEquals(Object.keys(r.assistantMessage).sort(), ["content", "role", "tool_calls"]);
  assertEquals(r.usage, { input: 50, output: 12 });

  const done = readCompletion({ choices: [{ finish_reason: "length", message: { content: " Jawaban " } }] });
  assertEquals(done.text, "Jawaban");
  assert(done.truncated);
  assertEquals(done.calls, []);
});

Deno.test("groqChat: Bearer di header, error HTTP jadi GroqError", async () => {
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

    globalThis.fetch = (() => Promise.resolve(new Response(JSON.stringify({ error: { message: "Invalid API Key" } }), { status: 401 }))) as typeof fetch;
    const err = await assertRejects(() => groqChat("x", {}), GroqError);
    assertEquals((err as GroqError).status, 401);
    assertEquals((err as GroqError).message, "HTTP 401 Invalid API Key");
  } finally {
    globalThis.fetch = orig;
  }
});
