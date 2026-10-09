/**
 * Adaptor Groq (API kompatibel OpenAI: POST /openai/v1/chat/completions).
 * Dipakai bila AI_PROVIDER=groq. Kunci: GROQ_API_KEY (format gsk_…).
 */
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export class GroqError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// deno-lint-ignore no-explicit-any
type Json = any;

export async function groqChat(apiKey: string, body: Json): Promise<Json> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data: Json = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* bukan JSON */ }
  if (!res.ok) throw new GroqError(res.status, `HTTP ${res.status} ${data?.error?.message ?? raw.slice(0, 300)}`.trim());
  return data;
}

/** Definisi alat format Claude → format fungsi OpenAI/Groq. */
export function toGroqTools(tools: Array<{ name: string; description?: string; input_schema: Json }>) {
  return tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

export function readCompletion(data: Json) {
  const choice = data?.choices?.[0] ?? {};
  const msg = choice.message ?? {};
  const calls: Array<{ id: string; name: string; args: Json | null; rawArgs: string }> =
    (Array.isArray(msg.tool_calls) ? msg.tool_calls : [])
    .filter((c: Json) => c?.function?.name)
    .map((c: Json) => {
      let args: Json = {};
      try { args = c.function.arguments ? JSON.parse(c.function.arguments) : {}; } catch { args = null; }
      return { id: String(c.id ?? ""), name: String(c.function.name), args, rawArgs: c.function.arguments ?? "" };
    });
  return {
    text: typeof msg.content === "string" ? msg.content.trim() : "",
    calls,
    // Pesan asisten yang dikirim balik pada putaran berikutnya (tanpa field tambahan seperti "reasoning").
    assistantMessage: {
      role: "assistant",
      content: typeof msg.content === "string" ? msg.content : "",
      ...(Array.isArray(msg.tool_calls) && msg.tool_calls.length ? { tool_calls: msg.tool_calls } : {}),
    },
    truncated: choice.finish_reason === "length",
    usage: { input: data?.usage?.prompt_tokens ?? 0, output: data?.usage?.completion_tokens ?? 0 },
  };
}
