import { describe, it, expect } from 'vitest';
import { nomorWa, pesanKonfirmasi, rekeningSiap, tautanKonfirmasi } from '../utils/billingConfig';

describe('Pembayaran langganan manual', () => {
  it('menormalkan nomor WhatsApp ke format wa.me', () => {
    expect(nomorWa('0812-3456-7890')).toBe('6281234567890');
    expect(nomorWa('+62 812 3456 7890')).toBe('6281234567890');
    expect(nomorWa('81234567890')).toBe('6281234567890');
    expect(nomorWa('12345')).toBe('');
    expect(nomorWa('')).toBe('');
  });

  it('pesan konfirmasi memuat klinik, paket, siklus, dan nominal — tanpa data pasien', () => {
    const p = pesanKonfirmasi({ klinik: 'Klinik Uji', paket: 'Pro', siklus: 'yearly', nominal: 2990000, admin: 'Admin Uji' });
    expect(p).toContain('Klinik: Klinik Uji');
    expect(p).toContain('Paket: Pro (tahunan)');
    expect(p).toContain('Rp 2.990.000');
  });

  it('memakai WhatsApp bila nomor ada, selain itu email', () => {
    const data = { klinik: 'Klinik Uji', paket: 'Starter', siklus: 'monthly', nominal: 149000 };
    const wa = tautanKonfirmasi(data, { wa: '6281234567890', email: 'support@dentiva.co.id' });
    expect(wa.jenis).toBe('wa');
    expect(wa.href.startsWith('https://wa.me/6281234567890?text=')).toBe(true);
    expect(decodeURIComponent(wa.href.split('text=')[1])).toContain('Paket: Starter (bulanan)');
    const mail = tautanKonfirmasi(data, { wa: '', email: 'support@dentiva.co.id' });
    expect(mail.jenis).toBe('email');
    expect(mail.href.startsWith('mailto:support@dentiva.co.id?')).toBe(true);
  });

  it('rekening dianggap siap hanya bila bank, nomor, dan atas nama terisi', () => {
    expect(rekeningSiap({ bank: 'BANK UJI', rekening: '123', atasNama: 'PT Uji' })).toBe(true);
    expect(rekeningSiap({ bank: 'BANK UJI', rekening: '', atasNama: 'PT Uji' })).toBe(false);
  });
});
