import { describe, it, expect } from 'vitest';
import { nomorWa } from '../utils/billingConfig';

describe('Konfigurasi billing', () => {
  it('menormalkan nomor WhatsApp ke format wa.me', () => {
    expect(nomorWa('0812-3456-7890')).toBe('6281234567890');
    expect(nomorWa('+62 812 3456 7890')).toBe('6281234567890');
    expect(nomorWa('81234567890')).toBe('6281234567890');
    expect(nomorWa('12345')).toBe('');
    expect(nomorWa('')).toBe('');
  });
});
