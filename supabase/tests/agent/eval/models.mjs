/**
 * Putaran percakapan agen untuk evaluasi — meniru chatGemini / chatAnthropic / chatGroq di index.ts:
 * instruksi sistem & alat SAMA (core.ts / agent.ts), pelaksana alat SAMA (runTool), basis data nyata (PGlite).
 * Mode "scripted" memakai skrip percakapan tetap (uji mandiri harness, tanpa jaringan).
 */
import { ALL_TOOLS, READ_TOOLS, runTool, SYSTEM } from "../../../functions/ai-assistant/core.ts";
import { geminiInteract, readInteraction, toGeminiSchema, userText } from "../../../functions/ai-assistant/gemini.ts";
import { groqChat, readCompletion, toGroqTools } from "../../../functions/ai-assistant/groq.ts";

const MAX_ROUNDS = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function toolSet(writeTools) { return writeTools ? ALL_TOOLS : READ_TOOLS; }

/** Eksekusi satu panggilan alat lewat pelaksana produksi; catat jejaknya. */
async function exec(client, ctx, trace, name, args) {
  const res = await runTool(client, name, args ?? {}, ctx);
  trace.push({ name, args, isError: res.isError, result: res.content.slice(0, 1500) });
  return res;
}

async function geminiLoop({ key, model, turns, tools, client, ctx, trace, thinking }) {
  const gtools = tools.map((t) => ({
    type: "function", name: t.name, description: t.description,
    ...(Object.keys(t.input_schema.properties ?? {}).length ? { parameters: toGeminiSchema(t.input_schema) } : {}),
  }));
  const history = turns.map((t) => (t.role === "user" ? userText(t.content) : { type: "model_output", content: [{ type: "text", text: t.content }] }));
  let nudged = false;
  for (let round = 0; round <= MAX_ROUNDS; round++) {
    let raw;
    for (let attempt = 0; ; attempt++) {
      try {
        raw = await geminiInteract(key, { model, system_instruction: SYSTEM, generation_config: { thinking_level: thinking }, input: history, tools: gtools });
        break;
      } catch (e) {
        if (attempt < 3 && [429, 500, 502, 503, 504].includes(e.status)) { await sleep(2500 * (attempt + 1)); continue; }
        throw e;
      }
    }
    const r = readInteraction(raw);
    if (r.calls.length === 0 && !r.text && !nudged) {
      nudged = true;
      history.push(userText("Tuliskan jawaban akhir untuk admin berdasarkan hasil alat di atas (ringkas, natural, sebut langkah berikutnya)."));
      continue;
    }
    if (r.calls.length === 0) return { answer: r.text, rounds: round + 1 };
    history.push(...r.modelSteps);
    for (const c of r.calls) {
      const res = await exec(client, ctx, trace, c.name, c.args ?? {});
      history.push({ type: "function_result", name: c.name, ...(c.id ? { call_id: c.id } : {}), result: [{ type: "text", text: res.isError ? `ERROR: ${res.content}` : res.content }] });
    }
  }
  return { answer: "", rounds: MAX_ROUNDS + 1, exhausted: true };
}

async function anthropicLoop({ key, model, turns, tools, client, ctx, trace, effort }) {
  const messages = turns.map((t) => ({ role: t.role, content: t.content }));
  const atools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 8000, system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }], tools: atools, messages, ...(effort ? { output_config: { effort } } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data?.error?.message ?? `HTTP ${res.status}`), { status: res.status });
    const uses = data.content.filter((b) => b.type === "tool_use");
    if (data.stop_reason !== "tool_use" || uses.length === 0) return { answer: data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim(), rounds: round + 1 };
    messages.push({ role: "assistant", content: data.content });
    const results = [];
    for (const u of uses) {
      const r = await exec(client, ctx, trace, u.name, u.input);
      results.push({ type: "tool_result", tool_use_id: u.id, content: r.content, is_error: r.isError });
    }
    messages.push({ role: "user", content: results });
  }
  return { answer: "", rounds: MAX_ROUNDS + 1, exhausted: true };
}

async function groqLoop({ key, model, turns, tools, client, ctx, trace }) {
  const gt = toGroqTools(tools);
  const messages = [{ role: "system", content: SYSTEM }, ...turns.map((t) => ({ role: t.role, content: t.content }))];
  for (let round = 0; round <= MAX_ROUNDS; round++) {
    const r = readCompletion(await groqChat(key, { model, messages, tools: gt, tool_choice: "auto" }));
    if (r.calls.length === 0) return { answer: r.text, rounds: round + 1 };
    messages.push(r.assistantMessage);
    for (const c of r.calls) {
      const res = c.args === null ? { content: "Argumen alat bukan JSON yang valid", isError: true } : await exec(client, ctx, trace, c.name, c.args);
      messages.push({ role: "tool", tool_call_id: c.id, content: res.isError ? `ERROR: ${res.content}` : res.content });
    }
  }
  return { answer: "", rounds: MAX_ROUNDS + 1, exhausted: true };
}

/**
 * Skrip: daftar langkah. Langkah { calls: [{ name, args | (hasilSebelumnya) => args }] } memanggil alat; langkah { text } menutup percakapan.
 * hasilSebelumnya = { <namaAlat>: <JSON hasil terakhir> }.
 */
async function scriptedLoop({ script, client, ctx, trace }) {
  const seen = {};
  for (let i = 0; i < script.length; i++) {
    const step = script[i];
    if (step.text !== undefined) return { answer: step.text, rounds: i + 1 };
    for (const c of step.calls) {
      const args = typeof c.args === "function" ? c.args(seen) : c.args;
      const res = await exec(client, ctx, trace, c.name, args);
      try { seen[c.name] = JSON.parse(res.content); } catch { seen[c.name] = res.content; }
    }
  }
  return { answer: "", rounds: script.length };
}

export async function converse(opts) {
  const { provider } = opts;
  if (provider === "scripted") return scriptedLoop(opts);
  if (provider === "gemini") return geminiLoop(opts);
  if (provider === "anthropic") return anthropicLoop(opts);
  if (provider === "groq") return groqLoop(opts);
  throw new Error(`Penyedia tidak dikenal: ${provider}`);
}
