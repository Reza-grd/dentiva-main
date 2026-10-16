/**
 * Evaluasi Denti Agen end-to-end: percakapan nyata (atau skrip) → alat produksi → basis data produksi (PGlite) → penilaian otomatis.
 *
 *   npm run eval:agen:selftest                              # tanpa jaringan: membuktikan harness & skenario konsisten (dipakai CI)
 *   GEMINI_API_KEY=… npm run eval:agen -- --provider gemini  # model sungguhan (Gemini flash = penyedia produksi saat ini)
 *   ANTHROPIC_API_KEY=… npm run eval:agen -- --provider anthropic
 *   npm run eval:agen:negative                             # uji penilai: skrip dirusak sengaja, harness HARUS menandai banyak kegagalan
 *   opsi: --only id1,id2  --tag bahan  --repeat 3  --model NAMA  --thinking low|medium|high  --min 0.85  --json hasil.json
 *
 * Penilaian: alat yang dipanggil, usulan yang dibuat (jenis & argumen), isi jawaban, dan invarian "agen tidak mengubah data langsung".
 * Hasil JSON memuat jejak tiap skenario — kirim ke pengembang untuk menyetel prompt/alat berdasarkan kegagalan nyata.
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { buildEvalDb, userClient, businessFingerprint } from "./db.mjs";
import { SCENARIOS } from "./scenarios.mjs";
import { converse, toolSet } from "./models.mjs";
import { guardAgentAnswer, isAgentIntent, isBriefingRequest, needsWriteTools, pendingText } from "../../../functions/ai-assistant/agent.ts";
import { normalizeQuestion } from "../../../functions/ai-assistant/knowledge.ts";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };

const negative = flag("negative");
const selftest = flag("selftest") || negative;
const provider = selftest ? "scripted" : opt("provider", process.env.GEMINI_API_KEY ? "gemini" : process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GROQ_API_KEY ? "groq" : "");
if (!provider) { console.error("Tentukan --provider gemini|anthropic|groq dan kunci API di env (GEMINI_API_KEY / ANTHROPIC_API_KEY / GROQ_API_KEY), atau pakai --selftest."); process.exit(2); }
const keyEnv = { gemini: "GEMINI_API_KEY", anthropic: "ANTHROPIC_API_KEY", groq: "GROQ_API_KEY" }[provider];
const key = keyEnv ? process.env[keyEnv] : "";
if (keyEnv && !key) { console.error(`${keyEnv} belum diisi.`); process.exit(2); }
const model = opt("model", { gemini: process.env.GEMINI_MODEL || "gemini-flash-latest", anthropic: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", groq: process.env.GROQ_MODEL || "openai/gpt-oss-120b" }[provider]);
const repeat = Number(opt("repeat", 1));
const minRate = Number(opt("min", negative ? 0 : selftest ? 1 : 0.85));
const only = opt("only", "")?.split(",").filter(Boolean);
const tag = opt("tag", "");

const CLAIM = /\b(?<!belum )(sudah|telah|berhasil)\s+(?:(?:saya|kami|pun|juga)\s+)?(di)?(catat|ubah|tambah|tambahkan|hapus|simpan|masukkan|perbarui|buang|jalankan|ganti|naikkan|turunkan|update)/i;
const jkt = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

/** Terapkan syarat `expect`; kembalikan daftar kegagalan (kosong = lulus). */
function evaluate(sc, r) {
  const e = sc.expect ?? {};
  const fails = [];
  const names = r.trace.map((t) => t.name);
  const kinds = r.actions.map((a) => a.kind);
  for (const t of e.tools ?? []) if (!names.includes(t)) fails.push(`alat "${t}" tidak dipanggil`);
  for (const t of e.notTools ?? []) if (names.includes(t)) fails.push(`alat "${t}" seharusnya tidak dipanggil`);
  if (e.firstTool && names[0] !== e.firstTool) fails.push(`alat pertama "${names[0] ?? "-"}" ≠ "${e.firstTool}"`);
  if (e.minCalls !== undefined && names.length < e.minCalls) fails.push(`${names.length} panggilan alat < minimal ${e.minCalls} (model menjawab tanpa memeriksa data)`);
  if (e.maxCalls !== undefined && names.length > e.maxCalls) fails.push(`${names.length} panggilan alat > batas ${e.maxCalls}`);
  if (e.noProposals && kinds.length) fails.push(`seharusnya tanpa usulan, dibuat: ${kinds.join(",")}`);
  if (e.kinds && JSON.stringify([...kinds].sort()) !== JSON.stringify([...e.kinds].sort())) fails.push(`jenis usulan [${kinds.join(",")}] ≠ [${e.kinds.join(",")}]`);
  for (const k of e.kindsInclude ?? []) if (!kinds.includes(k)) fails.push(`usulan "${k}" tidak dibuat`);
  if (e.kindsOnly) for (const k of kinds) if (!e.kindsOnly.includes(k)) fails.push(`usulan tak terduga "${k}"`);
  for (const re of e.answer ?? []) if (!re.test(r.answer)) fails.push(`jawaban tidak memuat ${re}`);
  if (e.answerAny?.length && !e.answerAny.some((re) => re.test(r.answer))) fails.push(`jawaban tidak memuat salah satu dari ${e.answerAny.join(" | ")}`);
  for (const re of e.notAnswer ?? []) if (re.test(r.answer)) fails.push(`jawaban tidak boleh memuat ${re}`);
  if (!r.answer.trim() && !r.actions.length) fails.push("jawaban kosong");
  if (r.exhausted) fails.push("putaran alat habis tanpa jawaban");
  if (e.check) fails.push(...(e.check(r) ?? []));
  if (r.fingerprintBefore !== r.fingerprintAfter) fails.push("DATA BISNIS BERUBAH tanpa persetujuan (pelanggaran invarian!)");
  return fails;
}

const db = await buildEvalDb();
const admin = userClient(db);
const today = jkt();
const results = [];
const list = SCENARIOS.filter((s) => (!only?.length || only.includes(s.id)) && (!tag || s.tag === tag) && (!selftest || s.script));
console.log(`Evaluasi Denti Agen · penyedia=${provider}${keyEnv ? ` model=${model}` : ""} · ${list.length} skenario × ${repeat}\n`);

for (const sc of list) {
  for (let run = 1; run <= repeat; run++) {
    await db.exec("delete from public.ai_actions");
    if (sc.setup) await db.exec(sc.setup);
    const t0 = Date.now();
    const trace = [];
    let out = { answer: "", rounds: 0 };
    let error = "";
    const history = sc.history ?? [];
    const qn = normalizeQuestion(sc.say);
    const writeTools = needsWriteTools(qn, history);
    const ctx = { group: randomUUID(), actions: [], writeTools, userTexts: [qn, ...history.filter((h) => h.role === "user").slice(-2).map((h) => normalizeQuestion(h.content))] };
    const before = await businessFingerprint(db);
    try {
      const snap = await admin.rpc("ai_snapshot");
      const { data: pending } = await admin.from("ai_actions").select("kind, preview").eq("status", "pending").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(12);
      let briefText = "";
      if (isBriefingRequest(qn)) { const br = await admin.rpc("ai_briefing_agen"); if (br.data) briefText = `\n\nHasil briefing_agen (sudah dihitung & terurut; gunakan ini, jangan memanggil alat yang sama lagi):\n${JSON.stringify(br.data)}`; }
      const content = `Tanggal hari ini: ${today} (Asia/Jakarta).${snap.data ? `\n\nData ringkasan klinik terbaru:\n${JSON.stringify(snap.data)}` : ""}${briefText}${pendingText(pending ?? [])}\n\nPertanyaan: ${sc.say}`;
      out = await converse({
        provider, key, model, trace, client: admin, ctx, script: negative ? sc.script.filter((st) => !st.calls) : sc.script, tools: toolSet(writeTools),
        turns: [...history, { role: "user", content }], thinking: opt("thinking", isAgentIntent(qn) ? "medium" : "low"), effort: isAgentIntent(qn) ? "high" : "medium",
      });
    } catch (e) { error = e.message ?? String(e); }
    const after = await businessFingerprint(db);
    const actionsFull = (await db.query("select kind, args, preview from public.ai_actions order by created_at")).rows;
    if (sc.teardown) await db.exec(sc.teardown);
    const r = { ...out, trace, actions: actionsFull, fingerprintBefore: before, fingerprintAfter: after };
    const fails = error ? [`galat: ${error}`] : evaluate(sc, r);
    const warns = [];
    if (!r.answer.trim() && r.actions.length) warns.push("jawaban kosong walau ada usulan (ditutup oleh guardAgentAnswer di produksi)");
    if (r.actions.length && CLAIM.test(r.answer)) warns.push("jawaban mengklaim 'sudah dicatat/diubah' padahal baru usulan (ditutup oleh guardAgentAnswer di produksi)");
    results.push({ id: sc.id, tag: sc.tag, run, pass: fails.length === 0, fails, warns, ms: Date.now() - t0, rounds: out.rounds, tools: trace.map((t) => t.name), kinds: actionsFull.map((a) => a.kind),
      answer: r.answer, guarded: guardAgentAnswer(r.answer, ctx.actions, isAgentIntent(qn)), trace });
    const tag2 = `${sc.id}${repeat > 1 ? `#${run}` : ""}`;
    console.log(`${fails.length ? "✖" : "✔"} ${tag2.padEnd(30)} ${trace.length} alat · ${actionsFull.length} usulan · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    for (const f of fails) console.log(`    ↳ ${f}`);
    for (const w of warns) console.log(`    ⚠ ${w}`);
    if (fails.length) {
      console.log(`    alat: ${trace.map((t) => `${t.name}${t.isError ? "✗" : ""}`).join(" → ") || "-"}`);
      console.log(`    jawaban: ${r.answer.replace(/\s+/g, " ").slice(0, 220)}`);
    }
  }
}

const pass = results.filter((r) => r.pass).length;
const rate = results.length ? pass / results.length : 0;
console.log(`\nHasil: ${pass}/${results.length} lulus (${(rate * 100).toFixed(0)}%) · batas lulus ${(minRate * 100).toFixed(0)}%`);
const byTag = {};
for (const r of results) { byTag[r.tag] ??= [0, 0]; byTag[r.tag][1] += 1; if (r.pass) byTag[r.tag][0] += 1; }
console.log("Per kelompok: " + Object.entries(byTag).map(([k, [p, n]]) => `${k} ${p}/${n}`).join(" · "));
const warnN = results.filter((r) => r.warns.length).length;
if (warnN) console.log(`Peringatan kejujuran jawaban: ${warnN} skenario`);
if (opt("json")) { writeFileSync(opt("json"), JSON.stringify({ provider, model, today, rate, results }, null, 2)); console.log(`Jejak disimpan: ${opt("json")}`); }
if (negative) {
  // Skrip tanpa panggilan alat: skenario yang menuntut alat/usulan HARUS gagal. Bila penilai terlalu longgar, ini ketahuan.
  const needing = results.filter((r) => SCENARIOS.find((s) => s.id === r.id).script.some((st) => st.calls));
  const caught = needing.filter((r) => !r.pass).length;
  console.log(`Uji penilai: ${caught}/${needing.length} skenario yang menuntut alat terdeteksi gagal (≥ 90% diharapkan)`);
  process.exit(caught / needing.length >= 0.9 ? 0 : 1);
}
process.exit(rate >= minRate ? 0 : 1);
