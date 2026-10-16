#!/usr/bin/env node
/**
 * Membuat "bundel konteks" untuk anggota tim yang TIDAK punya akses repo (GPT).
 *   node scripts/tim/bundel-konteks.mjs            → docs/tim/bundel/GPT-umum.md, GPT-denti.md, GPT-desain.md, GPT-keamanan.md
 * Aman: hanya berkas teks yang terdaftar di bawah; tiap berkas dipotong; pola rahasia (JWT, kunci API, kunci privat, sandi) DIREDAKSI;
 * berkas .env* tidak pernah dibaca. Keluaran ada di .gitignore. Tinjau sekilas sebelum mengunggah.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "docs", "tim", "bundel");
const MAX_FILE = 24_000; // karakter per berkas
const MAX_BUNDLE = 260_000; // karakter per bundel

const SECRET_PATTERNS = [
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g, // JWT
  /sk-(?:ant-)?[A-Za-z0-9_-]{20,}/g, // kunci gaya OpenAI/Anthropic
  /AIza[0-9A-Za-z_-]{30,}/g, // kunci Google
  /\bAQ\.[A-Za-z0-9_-]{20,}/g, // kunci Gemini format baru
  /gh[pousr]_[A-Za-z0-9]{30,}/g, // token GitHub
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+=]{12,}['"]?/gi,
];
export const redact = (s) => SECRET_PATTERNS.reduce((t, re) => t.replace(re, "[REDAKSI]"), s);

const read = (rel) => {
  const p = join(ROOT, rel);
  if (!existsSync(p) || /(^|[\\/])\.env/.test(rel)) return null;
  return readFileSync(p, "utf8").replace(/\r\n/g, "\n");
};
const clip = (text, max = MAX_FILE) => (text.length > max ? `${text.slice(0, max)}\n… [DIPOTONG: ${text.length - max} karakter lagi di repo]\n` : text);
const lang = (rel) => ({ md: "markdown", js: "js", jsx: "jsx", ts: "ts", tsx: "tsx", css: "css", json: "json", sql: "sql", yml: "yaml", yaml: "yaml", sh: "bash" })[rel.split(".").pop()] ?? "";

const section = (rel, opts = {}) => {
  let t = read(rel);
  if (t === null) return `\n## ${rel}\n_(tidak ditemukan)_\n`;
  if (opts.transform) t = opts.transform(t);
  return `\n## ${rel}\n\`\`\`${lang(rel)}\n${redact(clip(t, opts.max))}\n\`\`\`\n`;
};
const tree = (dir, depth = 2, prefix = "") => {
  const p = join(ROOT, dir);
  if (!existsSync(p)) return "";
  return readdirSync(p, { withFileTypes: true })
    .filter((d) => !["node_modules", "dist", ".git", ".vite", "target", "bundel"].includes(d.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => `${prefix}${d.name}${d.isDirectory() ? "/" : ""}\n${d.isDirectory() && depth > 1 ? tree(join(dir, d.name), depth - 1, `${prefix}  `) : ""}`)
    .join("");
};
const list = (dir, re) => (existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).filter((f) => re.test(f)).sort() : []);

/** Ringkas kait rig Denti: kelas/ID yang dipakai markup SVG dan selektor di denti.css. */
const rigSummary = () => {
  const svg = read("apps/clinic/src/components/mascot/dentiSvg.js") ?? "";
  const css = read("apps/clinic/src/components/mascot/denti.css") ?? "";
  const classes = [...new Set([...svg.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)))].sort();
  const ids = [...new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]))].sort();
  const cssClasses = [...new Set([...css.matchAll(/\.(d-[a-z0-9-]+)/g)].map((m) => m[1]))].sort();
  const filters = (svg.match(/filter="[^"]+"/g) ?? []).length;
  const strokes = [...svg.matchAll(/stroke-width="([0-9.]+)"/g)].map((m) => Number(m[1]));
  const states = [...css.matchAll(/data-state="([a-z0-9-]+)"/g)].map((m) => m[1]);
  return `\n## Ringkasan kait rig Denti (dihitung otomatis)\n- Kelas di markup SVG (${classes.length}): ${classes.join(", ")}\n- ID di markup SVG (${ids.length}): ${ids.join(", ")}\n- Selektor kelas d-* di denti.css (${cssClasses.length}): ${cssClasses.join(", ")}\n- Jumlah atribut filter= di SVG: ${filters}\n- stroke-width di SVG: min ${Math.min(...strokes)}, maks ${Math.max(...strokes)}, jumlah ${strokes.length}\n- State yang dirujuk denti.css (${new Set(states).size}): ${[...new Set(states)].sort().join(", ")}\n`;
};

/** Ringkas kebijakan RLS dari snapshot baseline (nama policy per tabel) — tanpa isi kueri panjang. */
const policySummary = () => {
  const sql = read("supabase/tests/baseline/20261009170624_schema.sql") ?? "";
  const rows = [...sql.matchAll(/CREATE POLICY ("?[^" ]+"?|\S+) ON public\.(\w+) AS (PERMISSIVE|RESTRICTIVE) FOR (\w+)/g)].map((m) => `${m[2]} | ${m[1].replace(/"/g, "")} | ${m[3]} | ${m[4]}`);
  const rls = [...sql.matchAll(/ALTER TABLE (?:ONLY )?public\.(\w+) ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1]);
  return `\n## Ringkasan RLS (dari snapshot baseline 2026-10-09; migrasi sesudahnya menambah pembatasan peran — lihat daftar migrasi)\nTabel dengan RLS aktif (${new Set(rls).size}): ${[...new Set(rls)].sort().join(", ")}\n\nDaftar policy (tabel | nama | jenis | perintah):\n\`\`\`\n${rows.slice(0, 400).join("\n")}\n\`\`\`\n`;
};

const BUNDLES = {
  "GPT-umum.md": () => [
    section("docs/tim/00-ringkasan-proyek.md", { max: 40_000 }),
    section("docs/tim/03-aturan-kerja-tim.md", { max: 20_000 }),
    section("README.md", { max: 8_000 }),
    section("docs/denti-agen.md", { max: 30_000 }),
    section("package.json", { max: 6_000 }),
    `\n## Peta direktori (apps/clinic/src, kedalaman 2)\n\`\`\`\n${tree("apps/clinic/src", 2)}\`\`\`\n`,
    `\n## Layar & fitur (apps/clinic/src/components)\n\`\`\`\n${tree("apps/clinic/src/components", 1)}\`\`\`\n`,
  ],
  "GPT-denti.md": () => [
    section("docs/maskot-denti.md", { max: 30_000 }),
    rigSummary(),
    section("apps/clinic/src/components/mascot/DentiMascot.jsx", { max: 10_000 }),
    section("apps/clinic/src/components/mascot/denti.css", { max: 22_000 }),
    section("apps/clinic/src/components/mascot/dentiSvg.js", { max: 22_000 }),
    section("apps/clinic/src/components/ai/denti-widget.css", { max: 8_000 }),
    section("apps/clinic/src/components/ai/denti-companion.css", { max: 8_000 }),
    section("apps/clinic/src/styles/theme.css", { max: 14_000 }),
  ],
  "GPT-desain.md": () => [
    section("apps/clinic/src/styles/theme.css", { max: 20_000 }),
    section("apps/clinic/tailwind.config.js", { max: 6_000 }),
    ...list("packages/ui/src", /\.tsx$/).map((f) => section(`packages/ui/src/${f}`, { max: 3_500 })),
    section("apps/clinic/src/components/ai/ai-assistant.css", { max: 12_000 }),
    section("apps/clinic/src/components/ai/AgentActions.jsx", { max: 8_000 }),
    section("apps/clinic/src/components/ai/AiAssistantPage.jsx", { max: 9_000 }),
    section("apps/clinic/src/components/admin/AdminDashboard.jsx", { max: 9_000 }),
    section("docs/saas-maturity-log.md", { max: 8_000 }),
  ],
  "GPT-keamanan.md": () => [
    section("docs/tim/00-ringkasan-proyek.md", { max: 40_000 }),
    policySummary(),
    `\n## Daftar migrasi (nama = riwayat perubahan keamanan & fitur)\n\`\`\`\n${list("supabase/migrations", /\.sql$/).join("\n")}\n\`\`\`\n`,
    `\n## Edge functions\n\`\`\`\n${list("supabase/functions", /^[a-z_]/).join("\n")}\n\`\`\`\n`,
    section("apps/clinic/vercel.json", { max: 6_000 }),
    section("infra/vps/README.md", { max: 24_000 }),
    section("docs/audit-remediation-2026-10-10.md", { max: 16_000 }),
    section("docs/audit-2026-10-10.md", { max: 16_000 }),
    section("docs/migrasi-vps-indonesia.md", { max: 14_000 }),
    section(".github/workflows/ci.yml", { max: 6_000 }),
  ],
};

export function bangunBundel() {
  mkdirSync(OUT, { recursive: true });
  const hasil = [];
  for (const [nama, buat] of Object.entries(BUNDLES)) {
    let teks = `# Bundel konteks — ${nama.replace(".md", "")}\n_Dibuat otomatis ${new Date().toISOString().slice(0, 10)} oleh scripts/tim/bundel-konteks.mjs. Rahasia diredaksi; berkas dipotong bila panjang._\n${buat().join("")}`;
    if (teks.length > MAX_BUNDLE) teks = `${teks.slice(0, MAX_BUNDLE)}\n… [BUNDEL DIPOTONG pada ${MAX_BUNDLE} karakter]\n`;
    writeFileSync(join(OUT, nama), teks, "utf8");
    hasil.push({ nama, karakter: teks.length, sisa_rahasia: SECRET_PATTERNS.some((re) => { re.lastIndex = 0; return re.test(teks.replace(/\[REDAKSI\]/g, "")); }) });
  }
  return hasil;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("bundel-konteks.mjs")) {
  const r = bangunBundel();
  for (const x of r) console.log(`✓ ${relative(ROOT, join(OUT, x.nama))}  ${(x.karakter / 1024).toFixed(0)} KB${x.sisa_rahasia ? "  ⚠ pola rahasia tersisa — PERIKSA" : ""}`);
  console.log("\nUnggah berkas di docs/tim/bundel/ ke GPT bersama docs/tim/00-ringkasan-proyek.md & 03-aturan-kerja-tim.md (sudah ada di GPT-umum.md).");
  if (r.some((x) => x.sisa_rahasia)) process.exitCode = 1;
}
