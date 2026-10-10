/**
 * Latihan Denti — semua siklus di fixtures/dentiTrainingData.js harus lulus 100%.
 * Bila Denti salah paham, tambahkan kalimatnya ke siklus baru, perbaiki pola di utils/dentiMood.js,
 * lalu jalankan tes ini sampai lulus.
 */
import { describe, it, expect } from 'vitest';
import { smallTalk, normalizeChat, moodForAnswer, topicOf } from '../utils/dentiMood';
import { CYCLES } from './fixtures/dentiTrainingData';

const NOW = new Date(2026, 9, 10, 9, 5);
const asCase = (c) => (Array.isArray(c) ? c : [c, {}]);
const intentOf = (text, ctx = {}) => smallTalk(text, { now: NOW, afterAnswer: true, ...ctx })?.intent ?? null;

describe.each(CYCLES)('$name', ({ intents = {}, ai = [], moods = [], topics = [], replies = [] }) => {
  for (const [intent, phrases] of Object.entries(intents)) {
    it(`mengenali "${intent}" (${phrases.length} kalimat)`, () => {
      const wrong = phrases.map(asCase).map(([p, ctx]) => [p, intentOf(p, ctx)]).filter(([, got]) => got !== intent);
      expect(wrong).toEqual([]);
    });
  }
  if (ai.length) {
    it(`${ai.length} pertanyaan data tetap diteruskan ke AI`, () => {
      const leaked = ai.map(asCase).filter(([q, ctx]) => intentOf(q, ctx) !== null).map(([q]) => [q, intentOf(q)]);
      expect(leaked).toEqual([]);
    });
  }
  if (moods.length) {
    it(`${moods.length} ekspresi jawaban`, () => {
      const wrong = moods.filter(([t, s]) => moodForAnswer(t).state !== s).map(([t, s]) => [t, s, moodForAnswer(t).state]);
      expect(wrong).toEqual([]);
    });
  }
  if (replies.length) {
    it(`${replies.length} isi balasan`, () => {
      const reply = (t) => smallTalk(t, { now: NOW, afterAnswer: true })?.reply || '';
      const wrong = replies.filter(([t, want]) => !reply(t).includes(want)).map(([t, want]) => [t, want, reply(t)]);
      expect(wrong).toEqual([]);
    });
  }
  if (topics.length) {
    it(`${topics.length} topik analisis`, () => {
      const wrong = topics.filter(([q, tp]) => topicOf(q) !== tp).map(([q, tp]) => [q, tp, topicOf(q)]);
      expect(wrong).toEqual([]);
    });
  }
});

describe('Latihan Denti — balasan', () => {
  it('jam & tanggal dijawab dari perangkat', () => {
    expect(smallTalk('jam berapa?', { now: NOW }).reply).toContain('09.05');
    expect(smallTalk('hari ini tanggal berapa', { now: NOW }).reply).toMatch(/Sabtu, 10 Oktober 2026/);
  });

  it('balasan bervariasi & menyebut nama', () => {
    const a = smallTalk('makasih', { name: 'Rina', seed: 0 }).reply;
    const b = smallTalk('makasih', { name: 'Rina', seed: 1 }).reply;
    expect(a).not.toBe(b);
    expect(a).toContain('Rina');
  });

  it('keluhan: arahkan ke 👎 bila sudah ada jawaban AI', () => {
    expect(smallTalk('salah', { afterAnswer: true }).reply).toContain('Kurang tepat');
    expect(smallTalk('salah', { afterAnswer: false }).reply).not.toContain('Kurang tepat');
  });

  it('bantuan menampilkan daftar kemampuan', () => {
    expect(smallTalk('kamu bisa apa').reply).toMatch(/Keuangan[\s\S]*Perencanaan[\s\S]*Operasional/);
  });

  it('normalisasi: huruf berulang, emoji, sapaan ke Denti, partikel', () => {
    expect(normalizeChat('Makasihhh Denti!! 😍')).toBe('makasih');
    expect(normalizeChat('halo kak denti dong ya')).toBe('halo');
  });

  it('total data latihan', () => {
    const n = CYCLES.reduce((s, c) => s + Object.values(c.intents || {}).flat().length + (c.ai || []).length
      + (c.moods || []).length + (c.topics || []).length + (c.replies || []).length, 0);
    expect(n).toBeGreaterThanOrEqual(540);
  });
});
