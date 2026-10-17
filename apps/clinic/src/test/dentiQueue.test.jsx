import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { dentiScene, isClosed, delayMinutes, DENTI_TIPS, SORRY_TEXT, SLEEP_TEXT } from '../utils/dentiQueue';

const rpc = vi.fn();
vi.mock('../services/supabase', () => ({ supabase: { rpc: (...a) => rpc(...a) } }));
// eslint-disable-next-line import/first
import QueueDisplay from '../components/queue/QueueDisplay';

const at = (h, m = 0) => new Date(2026, 9, 10, h, m);
const HOURS = { open: '08:00', close: '17:00' };

describe('Eira di layar antrean — aturan keadaan', () => {
  it('jam praktik: buka 30 mnt lebih awal, tutup 30 mnt sesudahnya; tanpa jadwal tutup 22–06', () => {
    expect(isClosed(HOURS, at(7, 29))).toBe(true);
    expect(isClosed(HOURS, at(7, 30))).toBe(false);
    expect(isClosed(HOURS, at(17, 29))).toBe(false);
    expect(isClosed(HOURS, at(17, 30))).toBe(true);
    expect(isClosed(null, at(23))).toBe(true);
    expect(isClosed(null, at(12))).toBe(false);
  });

  it('tidur hanya bila tutup DAN antrean kosong', () => {
    expect(dentiScene({ hours: HOURS, now: at(20), waiting: [] })).toMatchObject({ state: 'sleep', text: SLEEP_TEXT });
    expect(dentiScene({ hours: HOURS, now: at(20), waiting: [{ no: 1 }] }).state).not.toBe('sleep');
    expect(dentiScene({ hours: HOURS, now: at(20), primary: { no: 1 }, waiting: [] }).state).toBe('idle');
  });

  it('minta maaf bila pasien berikutnya terlambat ≥ 30 mnt dari jam janji', () => {
    expect(delayMinutes({ time: '09:00' }, at(9, 45))).toBe(45);
    expect(delayMinutes({ time: null }, at(9, 45))).toBe(0);
    expect(dentiScene({ hours: HOURS, now: at(9, 30), waiting: [{ no: 2, time: '09:00' }] })).toMatchObject({ state: 'sorry', text: SORRY_TEXT });
    expect(dentiScene({ hours: HOURS, now: at(9, 20), waiting: [{ no: 2, time: '09:00' }] }).state).not.toBe('sorry');
  });

  it('senggang: tips bergilir; ada pasien diperiksa: siaga + mode anak dari penanda kid', () => {
    const a = dentiScene({ hours: HOURS, now: at(10), waiting: [], tick: 0 });
    const b = dentiScene({ hours: HOURS, now: at(10), waiting: [], tick: 1 });
    expect(a).toMatchObject(DENTI_TIPS[0]);
    expect(b).toMatchObject(DENTI_TIPS[1]);
    expect(dentiScene({ hours: HOURS, now: at(10), primary: { no: 1, kid: true } })).toMatchObject({ state: 'idle', kid: true, text: null });
  });
});

describe('Eira di layar antrean — tampilan', () => {
  beforeEach(() => rpc.mockReset());
  const mount = () => render(
    <MemoryRouter initialEntries={['/antrean/tok']}>
      <Routes><Route path="/antrean/:token" element={<QueueDisplay />} /></Routes>
    </MemoryRouter>,
  );

  it('antrean kosong: Eira tampil besar di panggung', async () => {
    rpc.mockResolvedValue({ data: { ok: true, clinic_name: 'Klinik Senyum', hours: { open: '00:00', close: '23:59' }, visits: [] }, error: null });
    mount();
    expect(await screen.findByText('Belum ada pasien yang dipanggil')).toBeInTheDocument();
    expect(document.querySelector('.qd-denti--stage')).not.toBeNull();
    expect(document.querySelector('.qd-denti--host')).toBeNull();
  });

  it('ada pasien anak diperiksa: Eira jadi pembawa acara di bar bawah dengan mode anak', async () => {
    rpc.mockResolvedValue({ data: { ok: true, clinic_name: 'Klinik Senyum', hours: null, visits: [
      { no: 1, initials: 'A.', doctor: 'drg. Ani', time: null, status: 'ongoing', kid: true },
    ] }, error: null });
    mount();
    expect(await screen.findByText('A.')).toBeInTheDocument();
    const host = document.querySelector('.qd-denti--host');
    expect(host).not.toBeNull();
    expect(host).toHaveAttribute('data-kid', 'true');
    expect(document.querySelector('.qd-denti--stage')).toBeNull();
  });
});
