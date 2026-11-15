import { describe, it, expect } from 'vitest';
import { statusPengingat } from '../components/billing/PengingatLangganan';

const HARI = 86_400_000;
const sekarang = new Date('2026-11-15T03:00:00Z').getTime();

describe('Pengingat langganan', () => {
  it('uji coba: sisa hari, total, dan status mendesak', () => {
    const sub = { status: 'trialing', current_period_start: new Date(sekarang - 4 * HARI).toISOString(), current_period_end: new Date(sekarang + 10 * HARI).toISOString() };
    expect(statusPengingat(sub, sekarang)).toEqual({ jenis: 'trial', sisa: 10, total: 14, mendesak: false });
    const dekat = { ...sub, current_period_end: new Date(sekarang + 3 * HARI).toISOString() };
    expect(statusPengingat(dekat, sekarang).mendesak).toBe(true);
    const lewat = { ...sub, current_period_end: new Date(sekarang - HARI).toISOString() };
    expect(statusPengingat(lewat, sekarang).sisa).toBe(0);
  });

  it('tunggakan selalu diingatkan; langganan aktif berbayar tidak', () => {
    expect(statusPengingat({ status: 'past_due' }, sekarang)).toEqual({ jenis: 'tunggakan', sisa: 0 });
    expect(statusPengingat({ status: 'active', current_period_end: new Date(sekarang + HARI).toISOString() }, sekarang)).toBeNull();
    expect(statusPengingat(null, sekarang)).toBeNull();
  });
});
