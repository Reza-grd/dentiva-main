import { describe, it, expect, vi } from 'vitest';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({}) }));

import { normalizeLoginError, CAPTCHA_ERROR } from '../components/auth/LoginPage'; // vi.mock di atas di-hoist oleh vitest

describe('normalizeLoginError', () => {
  it('kunci login bertingkat: sisa waktu tetap terlihat', () => {
    const m = 'Terlalu banyak percobaan masuk. Coba lagi dalam 5 menit.';
    expect(normalizeLoginError(m)).toBe(m);
    expect(normalizeLoginError('Terlalu banyak percobaan masuk. Coba lagi dalam 24 jam.')).toMatch(/24 jam/);
  });

  it('CAPTCHA ditolak → pesan Indonesia', () => {
    expect(normalizeLoginError('captcha protection: request disallowed (no captcha_token found)')).toBe(CAPTCHA_ERROR);
  });

  it('batas per IP (429) dan kredensial salah tetap pesan umum', () => {
    expect(normalizeLoginError('429: Request rate limit reached')).toMatch(/Terlalu banyak percobaan\. Coba lagi beberapa menit/);
    expect(normalizeLoginError('Invalid login credentials')).toBe('Email atau password salah.');
  });
});
