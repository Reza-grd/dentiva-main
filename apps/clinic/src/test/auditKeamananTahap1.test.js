// Regresi audit keamanan 11 Okt 2026 — Tahap 1 (sisi aplikasi): B04 & B08.
import { vi, describe, it, expect, beforeEach } from 'vitest';

const inserted = [];
vi.mock('../services/supabase.js', () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
    insert: vi.fn((rows) => { inserted.push(...rows); return Promise.resolve({ data: null, error: null }); }),
  };
  return {
    supabase: {
      from: vi.fn(() => builder),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'adm-1' } }, error: null }),
      },
    },
  };
});

import { escapeHtml } from '../utils/sanitize.js';
import { userManagementService } from '../services/userManagementService.js';

describe('B08 — escapeHtml untuk kuitansi', () => {
  it('karakter khusus HTML menjadi entitas sehingga tampil sebagai teks', () => {
    expect(escapeHtml('<strong>Budi</strong> & "Ani" \'x\'')).toBe(
      '&lt;strong&gt;Budi&lt;/strong&gt; &amp; &quot;Ani&quot; &#39;x&#39;',
    );
    expect(escapeHtml('<img src=x onerror=alert(1)>')).not.toContain('<img');
  });

  it('null/undefined → kosong, angka → teks; teks biasa tidak berubah', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(3)).toBe('3');
    expect(escapeHtml('Scaling RA/RB (No. 11–18)')).toBe('Scaling RA/RB (No. 11–18)');
  });
});

describe('B04 — password staf tidak masuk audit log', () => {
  beforeEach(() => {
    inserted.length = 0;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { id: 'baru' } }) });
  });

  it('payload audit hanya nama & peran — password sintetis tidak pernah dikirim', async () => {
    const r = await userManagementService.createStaffUser({
      full_name: 'Staf Uji', email: 'staf@uji.test', role: 'resepsionis', password: 'RahasiaSintetis#123',
    });
    expect(r.success).toBe(true);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].new_value).toEqual({ full_name: 'Staf Uji', role: 'resepsionis' });
    expect(JSON.stringify(inserted)).not.toContain('RahasiaSintetis#123');
  });
});
