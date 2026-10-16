/**
 * Pemilihan model & harga Claude untuk Asisten AI.
 *  • Percakapan/agen & pindai nota : claude-sonnet-5-5  (kuat memilih alat, harga menengah)
 *  • Catatan otomatis dashboard & template recall : claude-haiku-5-5 (jauh lebih murah; tugas ringkas berstruktur)
 * Dapat diganti lewat secret ANTHROPIC_MODEL / ANTHROPIC_BRIEF_MODEL tanpa mengubah kode.
 */
export type Price = { input: number; output: number; cacheRead: number; cacheWrite: number }; // USD per 1 juta token

export const DEFAULT_CHAT_MODEL = "claude-sonnet-5-5";
export const DEFAULT_LIGHT_MODEL = "claude-haiku-5-5";

export const PRICES: Record<string, Price> = {
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  // Haiku 5.5: harga untuk prompt ≤ 100K token (di atas itu lebih mahal; catatan dashboard jauh di bawah batas ini). Cache: baca 10%, tulis 1,25×.
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};

/** Harga model; model tak dikenal dihitung dengan harga Sonnet (perkiraan konservatif, bukan nol). */
export const priceFor = (model: string): Price => PRICES[model] ?? PRICES[DEFAULT_CHAT_MODEL];

export function costUsd(model: string, u: { input: number; output: number; cacheRead: number; cacheWrite: number }): number {
  const p = priceFor(model);
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1_000_000;
}

/** Haiku 5.5 tidak punya fallback refusal sisi-server: parameter `fallbacks`/beta tidak boleh dikirim. */
export const supportsServerFallback = (model: string): boolean => !/haiku/i.test(model);

/** Model untuk percakapan dan untuk tugas ringan, dari nilai secret (kosong = bawaan). */
export function anthropicModels(chatEnv?: string, lightEnv?: string): { chat: string; light: string } {
  const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, "").trim() || "";
  return { chat: clean(chatEnv) || DEFAULT_CHAT_MODEL, light: clean(lightEnv) || DEFAULT_LIGHT_MODEL };
}
