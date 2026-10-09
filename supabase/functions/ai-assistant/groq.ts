/**
 * Adaptor minimal Groq (API kompatibel OpenAI: /openai/v1/chat/completions) untuk ai-assistant.
 * Dipakai bila AI_PROVIDER=groq. Model bisa diganti lewat GROQ_MODEL / GROQ_VISION_MODEL.
 */
const URL = "https://api.groq.com/openai/v1/chat/completions";

export class GroqError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// deno-lint-ignore no-explicit-any
type Json = any;

export async function groqChat(apiKey: string, body: Json): Promise<Json> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GroqError(res.status, data?.error?.message ?? `HTTP ${res.status}`);
  return data;
}

/** Buang blok penalaran <think>…</think> yang kadang ikut di konten model penalaran. */
export const stripThinking = (t: string): string => t.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

/** Ambil objek JSON dari teks (toleran terhadap pagar ``` atau teks pembuka). */
export function extractJson(t: string): unknown {
  const s = stripThinking(t ?? "");
  try { return JSON.parse(s); } catch { /* coba potong */ }
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

/** Ringkas respons: pesan asisten, teks, panggilan alat, status, token. */
export function readGroq(data: Json) {
  const choice = data?.choices?.[0];
  const message = choice?.message ?? { role: "assistant", content: "" };
  const calls: Array<{ id: string; name: string; args: unknown }> = (message.tool_calls ?? []).map((c: Json) => {
    let args: unknown = {};
    try { args = c?.function?.arguments ? JSON.parse(c.function.arguments) : {}; } catch { args = null; }
    return { id: c.id, name: c?.function?.name, args };
  });
  return {
    message,
    text: stripThinking(typeof message.content === "string" ? message.content : ""),
    calls,
    truncated: choice?.finish_reason === "length",
    blocked: choice?.finish_reason === "content_filter",
    usage: { input: data?.usage?.prompt_tokens ?? 0, output: data?.usage?.completion_tokens ?? 0 },
  };
}
