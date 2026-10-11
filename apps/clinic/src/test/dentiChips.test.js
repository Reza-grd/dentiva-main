/** Setiap tombol saran (chip) yang ditampilkan Denti harus dipahami Denti sendiri — tanpa kuota AI. */
import { describe, it, expect } from 'vitest';
import { followUps, smallTalk } from '../utils/dentiMood';

const NOW = new Date(2026, 9, 10, 9, 5);
const CTX = {
  define: {}, glossaryList: {}, tip: {}, daily: {}, guide: {}, navlist: {}, offerNo: {}, navdeny: {}, navunknown: {},
  fact: { lastIntent: 'fact' }, showoff: { lastIntent: 'showoff' }, quizRight: { lastIntent: 'quizRight' }, quizReveal: { lastIntent: 'quizReveal' },
  quiz: { quiz: 0 }, quizHint: { quiz: 0 }, quizWrong: { quiz: 0 },
  'move:wink': { lastIntent: 'move:wink' }, 'move:coffee': { lastIntent: 'move:coffee' }, 'emo:sad': {}, 'emo:proud': {},
};

describe('Chip saran Denti', () => {
  for (const [key, ctx] of Object.entries(CTX)) {
    it(`semua chip untuk "${key}" dijawab lokal`, () => {
      const chips = followUps(key);
      expect(chips.length).toBeGreaterThan(0);
      const unanswered = chips.filter((c) => smallTalk(c, { now: NOW, afterAnswer: true, ...ctx }) === null);
      expect(unanswered).toEqual([]);
    });
  }
});
