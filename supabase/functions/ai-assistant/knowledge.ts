/**
 * Basis pengetahuan Asisten AI: normalisasi pertanyaan & sidik data.
 * Normalisasi harus stabil — dipakai sebagai kunci unik ai_knowledge.question_norm.
 */
const FILLERS = new Set([
  "tolong", "dong", "ya", "yah", "kak", "sih", "nih", "deh", "min", "mohon", "please", "kah", "gan", "bro", "pak", "bu",
]);

/** "Tolong, berapa Pendapatan bulan ini ya?" → "berapa pendapatan bulan ini" */
export function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLERS.has(w))
    .join(" ")
    .trim()
    .slice(0, 500);
}

/** Sidik data snapshot (tanpa waktu hitung) — sama berarti angka klinik belum berubah. */
export async function dataFingerprint(snapshot: unknown): Promise<string | null> {
  if (!snapshot || typeof snapshot !== "object") return null;
  const { dihitung_pada: _ignored, ...rest } = snapshot as Record<string, unknown>;
  const bytes = new TextEncoder().encode(JSON.stringify(rest));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

type Reference = { question: string; answer: string; kind: string; same_data: boolean };

/** Teks acuan dari jawaban terverifikasi yang mirip (disisipkan ke pertanyaan). */
export function referenceText(refs: Reference[]): string {
  if (!refs.length) return "";
  const items = refs.map((r, i) =>
    `[${i + 1}] Pertanyaan: ${r.question}\nJawaban terverifikasi${r.kind === "data" && !r.same_data ? " (angka mungkin sudah berubah — WAJIB perbarui dari data terbaru)" : ""}:\n${r.answer.slice(0, 1500)}`
  ).join("\n\n");
  return `\n\nJawaban yang sebelumnya dinilai TEPAT oleh admin untuk pertanyaan serupa — ikuti cara menjawab, susunan, dan langkahnya; sesuaikan dengan pertanyaan sekarang:\n${items}`;
}
