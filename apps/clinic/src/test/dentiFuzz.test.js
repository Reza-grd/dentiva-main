/**
 * Ketahanan salah ketik Denti: setiap kalimat latihan diberi salah ketik acak (hapus / tukar / gandakan satu huruf pada kata ≥ 6 huruf).
 *  • Maksud harus tetap dikenali (≥ 90%).
 *  • Pertanyaan data + salah ketik TIDAK boleh bocor jadi obrolan (≤ 0,5%) — harus tetap ke AI.
 * Pembangkit acak deterministik, jadi hasilnya stabil.
 */
import { describe, it, expect } from 'vitest';
import { smallTalk } from '../utils/dentiMood';
import { CYCLES as CYCLES_BASE } from './fixtures/dentiTrainingData';
import { CYCLES_V4 } from './fixtures/dentiTrainingV4';
import { CYCLES_V5 } from './fixtures/dentiTrainingV5';

const CYCLES = [...CYCLES_BASE, ...CYCLES_V4, ...CYCLES_V5];
const NOW = new Date(2026, 9, 10, 9, 5);
const asCase = (c) => (Array.isArray(c) ? c : [c, {}]);
const talk = (text, ctx = {}) => smallTalk(text, { now: NOW, afterAnswer: true, ...ctx });

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const mutate = (w, kind) => {
  const i = 1 + Math.floor(rnd() * (w.length - 2));
  if (kind === 0) return w.slice(0, i) + w.slice(i + 1); // hapus
  if (kind === 1) return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); // tukar
  return w.slice(0, i) + w[i] + w.slice(i); // gandakan
};
const variants = (text, minLen) => {
  const words = text.split(' ');
  const long = words.map((w, i) => [w, i]).filter(([w]) => w.length >= minLen);
  if (!long.length) return [];
  return [0, 1, 2].map((kind) => {
    const [w, i] = long[Math.floor(rnd() * long.length)];
    const ws = [...words];
    ws[i] = mutate(w, kind);
    return ws.join(' ');
  });
};

describe('Ketahanan salah ketik', () => {
  it('maksud tetap dikenali walau ada salah ketik (≥ 90%)', () => {
    let total = 0; let ok = 0;
    for (const c of CYCLES) {
      for (const [intent, phrases] of Object.entries(c.intents || {})) {
        for (const [phrase, ctx] of phrases.map(asCase)) {
          for (const text of variants(phrase, 6)) {
            total += 1;
            if ((talk(text, ctx)?.intent ?? null) === intent) ok += 1;
          }
        }
      }
    }
    expect(total).toBeGreaterThan(3000);
    expect(ok / total).toBeGreaterThanOrEqual(0.9);
  }, 120000);

  it('pertanyaan data + salah ketik tidak bocor menjadi obrolan (≤ 0,5%)', () => {
    let total = 0; const leaks = [];
    for (const c of CYCLES) {
      for (const [q, ctx] of (c.ai || []).map(asCase)) {
        for (const text of variants(q, 5)) {
          total += 1;
          if ((talk(text, ctx)?.intent ?? null) !== null) leaks.push(text);
        }
      }
    }
    expect(total).toBeGreaterThan(800);
    expect(leaks.length / total).toBeLessThanOrEqual(0.005);
  }, 120000);
});
