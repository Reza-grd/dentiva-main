/**
 * Latihan Denti — semua siklus di fixtures/dentiTrainingData.js harus lulus 100%.
 * Bila Denti salah paham, tambahkan kalimatnya ke siklus baru, perbaiki pola di utils/dentiMood.js
 * (atau utils/dentiSkills.js), lalu jalankan tes ini sampai lulus.
 */
import { describe, it, expect } from 'vitest';
import { smallTalk, normalizeChat, moodForAnswer, topicOf, followUps, lineForQuestion } from '../utils/dentiMood';
import { CYCLES as CYCLES_BASE } from './fixtures/dentiTrainingData';
import { CYCLES_V4 } from './fixtures/dentiTrainingV4';
import { augmentedCases } from './fixtures/dentiAugment';

const CYCLES = [...CYCLES_BASE, ...CYCLES_V4];
const NOW = new Date(2026, 9, 10, 9, 5);
const asCase = (c) => (Array.isArray(c) ? c : [c, {}]);
const talk = (text, ctx = {}) => smallTalk(text, { now: NOW, afterAnswer: true, ...ctx });
const intentOf = (text, ctx = {}) => talk(text, ctx)?.intent ?? null;
const asCase3 = (c) => [c[0], c[1], c[2] || {}];

describe.each(CYCLES)('$name', (c) => {
  const { intents = {}, ai = [], moods = [], topics = [], replies = [], actions = [], followups = [], lines = [], distinct = [], moodLines = [], states = [] } = c;
  for (const [intent, phrases] of Object.entries(intents)) {
    it(`mengenali "${intent}" (${phrases.length} kalimat)`, () => {
      const wrong = phrases.map(asCase).map(([p, ctx]) => [p, intentOf(p, ctx)]).filter(([, got]) => got !== intent);
      expect(wrong).toEqual([]);
    });
  }
  if (ai.length) {
    it(`${ai.length} pertanyaan data tetap diteruskan ke AI`, () => {
      const leaked = ai.map(asCase).filter(([q, ctx]) => intentOf(q, ctx) !== null).map(([q, ctx]) => [q, intentOf(q, ctx)]);
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
      const reply = (t, ctx) => talk(t, ctx)?.reply || '';
      const wrong = replies.filter(([t, want, ctx]) => !reply(t, ctx).includes(want)).map(([t, want, ctx]) => [t, want, reply(t, ctx)]);
      expect(wrong).toEqual([]);
    });
  }
  if (topics.length) {
    it(`${topics.length} topik analisis`, () => {
      const wrong = topics.filter(([q, tp]) => topicOf(q) !== tp).map(([q, tp]) => [q, tp, topicOf(q)]);
      expect(wrong).toEqual([]);
    });
  }
  if (actions.length) {
    it(`${actions.length} aksi (buka halaman, ingat nama, hapus obrolan)`, () => {
      const wrong = actions.filter(([t, type, value, ctx]) => {
        const a = talk(t, ctx)?.action;
        return !(a?.type === type && (value == null || a.to === value || a.name === value || a.mode === value || a.idx === value));
      }).map(([t, type, value, ctx]) => [t, type, value, talk(t, ctx)?.action ?? null]);
      expect(wrong).toEqual([]);
    });
  }
  if (states.length) {
    it(`${states.length} ekspresi gerak yang dipilih Denti`, () => {
      const wrong = states.map(asCase3).filter(([t, st, ctx]) => talk(t, ctx)?.state !== st).map(([t, st, ctx]) => [t, st, talk(t, ctx)?.state ?? null]);
      expect(wrong).toEqual([]);
    });
  }
  if (moodLines.length) {
    it(`${moodLines.length} gelembung Denti menyebut angka penting`, () => {
      const wrong = moodLines.filter(([t, want]) => !moodForAnswer(t).line.includes(want)).map(([t, want]) => [t, want, moodForAnswer(t).line]);
      expect(wrong).toEqual([]);
    });
  }
  if (followups.length) {
    it(`${followups.length} saran pertanyaan lanjutan`, () => {
      const wrong = followups.filter(([k, want]) => !followUps(k).some((x) => x.includes(want))).map(([k, want]) => [k, want, followUps(k)]);
      expect(wrong).toEqual([]);
    });
  }
  if (lines.length) {
    it(`${lines.length} kalimat Denti saat memproses`, () => {
      const wrong = lines.filter(([q, want]) => !lineForQuestion(q).includes(want)).map(([q, want]) => [q, want, lineForQuestion(q)]);
      expect(wrong).toEqual([]);
    });
  }
  if (distinct.length) {
    it(`${distinct.length} uji variasi balasan (tidak mengulang)`, () => {
      for (const [t, n, ctx] of distinct) {
        const recent = [];
        for (let k = 0; k < n; k += 1) recent.push(talk(t, { ...ctx, seed: 0, recent: [...recent] })?.reply || '');
        expect(new Set(recent).size).toBe(n);
      }
    });
  }
});

describe('Siklus 53 · ketahanan otomatis (augmentasi)', () => {
  const cases = augmentedCases(CYCLES);
  it(`${cases.length} variasi kalimat ("denti, …", "… ya", "…!!", KAPITAL, emoji) tetap dipahami sama`, () => {
    const wrong = cases.filter((k) => intentOf(k.text) !== k.expect).map((k) => [k.how, k.text, intentOf(k.text), k.expect]);
    expect(wrong).toEqual([]);
    expect(cases.length).toBeGreaterThanOrEqual(5000);
  }, 60000);
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
      + (c.moods || []).length + (c.topics || []).length + (c.replies || []).length + (c.actions || []).length
      + (c.followups || []).length + (c.lines || []).length + (c.distinct || []).length + (c.moodLines || []).length, 0);
    expect(n).toBeGreaterThanOrEqual(1500);
  });
});
