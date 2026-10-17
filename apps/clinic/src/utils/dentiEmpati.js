/**
 * Mesin "empati & suasana" Eira — digerakkan DATA (utils/data/dentiEmpatiData.js).
 * Siapa pun (termasuk GPT) cukup menambah entri data; mesin ini tidak perlu disentuh.
 *
 * Entri: { id, state, say: [frasa…], reply: [balasan…], follow?: [chip…], contains?: boolean }
 *  - say      : kalimat pengguna (ditulis alami, huruf biasa). Dicocokkan SETELAH dinormalkan (normalizeChat),
 *               sehingga huruf besar, tanda baca, "dong/ya", salah ketik ringan, dan "denti," di depan tidak perlu ditulis ulang.
 *  - reply    : variasi balasan Eira (dipilih bergiliran, tidak mengulang yang baru dipakai). Boleh memuat {nama} / {sapa}.
 *  - contains : true → frasa boleh berada di tengah kalimat pendek (≤ 10 kata); bawaan false = harus sama persis.
 *  - follow   : tombol saran lanjutan (maks. 3); semuanya harus dipahami Eira (dijaga tes).
 * Frasa pengguna yang memuat kata data klinik (pasien, omzet, jadwal, …) tidak pernah dijawab di sini — tetap ke AI.
 */
import { EMPATI } from './data/dentiEmpatiData.js';

const pickFresh = (list, seed, recent) => {
  for (let k = 0; k < list.length; k += 1) {
    const c = list[(Math.abs(seed) + k) % list.length];
    if (!recent.includes(c)) return c;
  }
  return list[Math.abs(seed) % list.length];
};

export const EMPATI_WORDS = [...new Set(EMPATI.flatMap((e) => e.say.flatMap((p) => String(p).toLowerCase().match(/[a-z]{4,}/g) || [])))];

/** Bangun indeks frasa ternormalisasi (dipanggil lambat oleh dentiMood dengan normalizeChat-nya). */
export function buildEmpatiIndex(normalize) {
  const exact = new Map();
  const loose = [];
  for (const e of EMPATI) {
    for (const raw of e.say) {
      const p = normalize(raw);
      if (!p) continue;
      if (!exact.has(p)) exact.set(p, e);
      if (e.contains) loose.push([p, e]);
    }
  }
  loose.sort((a, b) => b[0].length - a[0].length);
  return { exact, loose };
}

export function empatiEntry(id) {
  return EMPATI.find((e) => e.id === id) || null;
}

const fill = (text, name) => text.replace(/\{nama\}/g, name || 'Anda').replace(/\{sapa\}/g, name ? `, ${name}` : '');

/** → { intent: 'empati:<id>', state, reply } | null. `t` sudah dinormalkan. */
export function empatiReply(index, t, { seed = 0, recent = [], name = '' } = {}) {
  if (!t) return null;
  let e = index.exact.get(t) || null;
  if (!e && t.split(' ').length <= 10) {
    const padded = ` ${t} `;
    const hit = index.loose.find(([p]) => padded.includes(` ${p} `));
    e = hit ? hit[1] : null;
  }
  if (!e) return null;
  const recentPlain = recent.map((r) => String(r));
  const filled = e.reply.map((r) => fill(r, name));
  return { intent: `empati:${e.id}`, state: e.state, reply: pickFresh(filled, seed, recentPlain) };
}

// ── Keadaan darurat batin: SELALU dijawab dengan hati-hati & arahan bantuan, tidak oleh data/GPT ──
const CRISIS = /\b(bunuh diri|mengakhiri hidup|mengakhiri semuanya|akhiri hidup|tidak ingin hidup|nggak pengen hidup|gak mau hidup|pengen mati|ingin mati|menyakiti diri|melukai diri|self harm|suicide)\b/;
export function crisisReply(t) {
  if (!CRISIS.test(t)) return null;
  return {
    intent: 'crisis', state: 'sorry',
    reply: 'Saya turut prihatin mendengarnya, dan terima kasih sudah mau bercerita. 💙 Anda **tidak sendirian**.\n\n'
      + 'Saya hanyalah asisten klinik dan tidak bisa menggantikan bantuan manusia. Mohon **segera hubungi orang yang Anda percaya** '
      + '(keluarga, sahabat, atasan) dan, bila terasa mendesak, layanan darurat **112** atau layanan konseling kesehatan jiwa '
      + '**119 ext. 8** (Kemenkes). Bila ada bahaya langsung, jangan sendirian — datangi IGD terdekat.',
  };
}
