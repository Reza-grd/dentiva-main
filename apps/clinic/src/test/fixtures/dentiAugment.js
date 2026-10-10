/**
 * Siklus 38 · ketahanan otomatis — setiap kalimat latihan diturunkan menjadi beberapa bentuk yang
 * biasa diketik orang. Maksud kalimat tidak berubah, jadi jawaban Denti juga tidak boleh berubah.
 *   intent : "denti, …", "… ya", "…!!", HURUF KAPITAL, "… 😊"
 *   ke AI  : "denti, …", HURUF KAPITAL, "… ya" — tetap harus diteruskan ke AI
 */
const VARIANTS = [
  ['sapaan di depan', (p) => `denti, ${p}`],
  ['partikel "ya"', (p) => `${p} ya`],
  ['tanda seru', (p) => `${p}!!`],
  ['huruf kapital', (p) => p.toUpperCase()],
  ['emoji', (p) => `${p} 😊`],
];
const AI_VARIANTS = [VARIANTS[0], VARIANTS[1], VARIANTS[3]];
const hasWords = (p) => /\p{L}{2,}/u.test(p);

/** → [{ text, expect (intent | null), how }] */
export function augmentedCases(cycles) {
  const out = [];
  for (const c of cycles) {
    for (const [intent, phrases] of Object.entries(c.intents || {})) {
      for (const p of phrases) {
        if (typeof p !== 'string' || !hasWords(p) || p.length > 60) continue; // kalimat berkonteks / emoji saja dilewati
        for (const [how, f] of VARIANTS) out.push({ text: f(p), expect: intent, how });
      }
    }
    for (const q of c.ai || []) {
      if (typeof q !== 'string' || !hasWords(q)) continue;
      for (const [how, f] of AI_VARIANTS) out.push({ text: f(q), expect: null, how });
    }
  }
  return out;
}
