/**
 * Adaptor Gemini memakai Interactions API (POST /v1beta/interactions), antarmuka yang
 * direkomendasikan Google dan mendukung kunci format baru "auth key" (AQ.…).
 * Mode stateless (store=false): riwayat dikirim ulang setiap putaran, tidak disimpan Google.
 * Dipakai bila AI_PROVIDER=gemini (atau hanya GEMINI_API_KEY yang terpasang).
 */
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// deno-lint-ignore no-explicit-any
type Json = any;

/** JSON Schema (format alat Claude) → skema untuk Gemini: buang additionalProperties/strict. */
export function toGeminiSchema(s: Json): Json {
  if (Array.isArray(s)) return s.map(toGeminiSchema);
  if (!s || typeof s !== "object") return s;
  const out: Json = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "additionalProperties" || k === "strict") continue;
    out[k] = k === "properties"
      ? Object.fromEntries(Object.entries(v as Json).map(([pk, pv]) => [pk, toGeminiSchema(pv)]))
      : (typeof v === "object" ? toGeminiSchema(v) : v);
  }
  return out;
}

export async function geminiInteract(apiKey: string, body: Json): Promise<Json> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, "Api-Revision": API_REVISION },
    body: JSON.stringify({ store: false, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GeminiError(res.status, data?.error?.message ?? `HTTP ${res.status}`);
  return data;
}

export const userText = (text: string) => ({ type: "user_input", content: [{ type: "text", text }] });

/** Ringkas respons interaction: teks keluaran, panggilan fungsi, langkah model (dikirim balik utuh), token. */
export function readInteraction(data: Json) {
  const steps: Json[] = Array.isArray(data?.steps) ? data.steps : [];
  // Langkah dari model (thought, function_call, model_output) — bukan user_input/function_result kiriman kita.
  const modelSteps = steps.filter((s) => s?.type !== "user_input" && s?.type !== "function_result");
  const text = modelSteps
    .filter((s) => s.type === "model_output")
    .flatMap((s) => (Array.isArray(s.content) ? s.content : []))
    .filter((c: Json) => c?.type === "text" && typeof c.text === "string")
    .map((c: Json) => c.text)
    .join("")
    .trim();
  const calls = modelSteps
    .filter((s) => s.type === "function_call" && typeof s.name === "string")
    .map((s) => ({ id: s.id as string | undefined, name: s.name as string, args: (s.arguments ?? {}) as Json }));
  const u = data?.usage ?? {};
  const input = u.total_input_tokens ?? u.prompt_tokens ?? 0;
  const cached = u.total_cached_tokens ?? 0;
  return {
    status: String(data?.status ?? ""),
    modelSteps,
    text,
    calls,
    failed: data?.status === "failed" || data?.status === "cancelled",
    usage: {
      input: Math.max(0, input - cached),
      output: (u.total_output_tokens ?? u.completion_tokens ?? 0) + (u.total_thought_tokens ?? 0),
      cacheRead: cached,
    },
  };
}
