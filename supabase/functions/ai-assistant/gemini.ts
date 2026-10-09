/**
 * Adaptor minimal Gemini API (REST generateContent) untuk ai-assistant.
 * Dipakai bila AI_PROVIDER=gemini (atau hanya GEMINI_API_KEY yang terpasang).
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// deno-lint-ignore no-explicit-any
type Json = any;

/** JSON Schema (format alat Claude) → subset OpenAPI yang diterima Gemini. */
export function toGeminiSchema(s: Json): Json {
  if (!s || typeof s !== "object") return s;
  const out: Json = {};
  if (s.type) out.type = String(s.type).toUpperCase();
  if (s.description) out.description = s.description;
  if (Array.isArray(s.enum)) out.enum = s.enum;
  if (s.properties) {
    out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]));
  }
  if (Array.isArray(s.required) && s.required.length) out.required = s.required;
  if (s.items) out.items = toGeminiSchema(s.items);
  return out;
}

export async function geminiGenerate(apiKey: string, model: string, body: Json): Promise<Json> {
  const res = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GeminiError(res.status, data?.error?.message ?? `HTTP ${res.status}`);
  return data;
}

const BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_SAFETY"]);

/** Ringkas respons: teks (tanpa bagian "thought"), panggilan fungsi, status blokir, token. */
export function readResponse(data: Json) {
  const cand = data?.candidates?.[0];
  const parts: Json[] = cand?.content?.parts ?? [];
  const u = data?.usageMetadata ?? {};
  return {
    parts,
    text: parts.filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join("").trim(),
    calls: parts.filter((p) => p.functionCall).map((p) => p.functionCall as { name: string; args?: Json; id?: string }),
    blocked: Boolean(data?.promptFeedback?.blockReason) || BLOCKED.has(cand?.finishReason),
    truncated: cand?.finishReason === "MAX_TOKENS",
    usage: {
      input: (u.promptTokenCount ?? 0) - (u.cachedContentTokenCount ?? 0),
      output: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
      cacheRead: u.cachedContentTokenCount ?? 0,
    },
  };
}
