/** Saran per halaman harus selalu dipahami Eira untuk setiap peran (balasan lokal, bukan AI). */
import { describe, it, expect } from 'vitest';
import { smallTalk } from '../utils/dentiMood';
import { PAGE_HINTS, pageHints } from '../utils/dentiPageHints';

const NOW = new Date(2026, 9, 10, 9, 5);

describe('Saran per halaman', () => {
  it('memilih awalan paling spesifik', () => {
    expect(pageHints('/admin/pengaturan?tab=whatsapp')[0]).toBe('Ajarkan cara mengatur template pengingat');
    expect(pageHints('/pengaturan')).toContain('Ajarkan cara ganti password');
    expect(pageHints('/tidak-ada')).toEqual([]);
    expect(pageHints('/resepsionis/pembayaran/abc').length).toBeGreaterThan(0);
  });

  for (const role of ['admin', 'dokter', 'resepsionis']) {
    it(`semua saran dijawab lokal untuk peran ${role}`, () => {
      const unanswered = PAGE_HINTS.flatMap((p) => p.hints).filter((h) => smallTalk(h, { now: NOW, role }) === null);
      expect(unanswered).toEqual([]);
    });
  }
});
