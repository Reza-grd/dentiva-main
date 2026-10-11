import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import DentiMascot, { useDentiDirector, DENTI_DURATIONS } from '../components/mascot/DentiMascot';
import { DENTI_STATES } from '../components/mascot/dentiSvg';

describe('Maskot Denti', () => {
  it('merender rig lengkap dengan state & mode anak', () => {
    const { container } = render(<DentiMascot state="call" kid size={200} />);
    const svg = screen.getByRole('img', { name: /Denti/ });
    expect(svg).toHaveAttribute('data-state', 'call');
    expect(svg).toHaveAttribute('data-kid', 'true');
    for (const part of ['.d-root', '.d-head', '.d-arm-l', '.d-arm-r', '.d-eye-open', '.d-eye-happy', '.d-eye-wow', '.d-waves', '.d-chest', '.d-bubble', '.d-brackets', '.d-orbit', '.d-fin-l', '.d-ear-r']) {
      expect(container.querySelector(part)).not.toBeNull();
    }
  });

  it('state tak dikenal jatuh ke idle; id gradien unik per instans', () => {
    const { container } = render(<><DentiMascot state="terbang" /><DentiMascot /></>);
    const svgs = container.querySelectorAll('svg.denti');
    expect(svgs[0]).toHaveAttribute('data-state', 'idle');
    const ids = [...container.querySelectorAll('linearGradient')].map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('aksi tambahan dikenal dan propertinya tersedia', () => {
    for (const s of ['brush', 'tooth', 'dance', 'spin', 'laugh', 'love', 'shy', 'surprise', 'sorry', 'scan', 'point', 'thanks']) {
      expect(DENTI_STATES).toContain(s);
    }
    const { container } = render(<DentiMascot state="brush" />);
    expect(screen.getByRole('img', { name: /Denti/ })).toHaveAttribute('data-state', 'brush');
    for (const part of ['.d-brush', '.d-foam', '.d-tooth', '.d-eye-heart', '.d-lids', '.d-mouth-sad', '.d-scan', '.d-notes', '.d-exclaim', '.d-haha', '.d-sweat', '.d-arrows', '.d-chest-heart']) {
      expect(container.querySelector(part)).not.toBeNull();
    }
  });

  it('posisi bintang & hati ada di pembungkus, bukan di elemen yang dianimasikan', () => {
    const { container } = render(<DentiMascot />);
    for (const el of container.querySelectorAll('.d-star, .d-heart, .d-note')) {
      expect(el.getAttribute('transform')).toBeNull();
      expect(el.parentNode.getAttribute('transform')).toMatch(/translate/);
    }
  });

  it('lengan digambar setelah kepala (tangan bisa di depan wajah)', () => {
    const { container } = render(<DentiMascot />);
    const head = container.querySelector('.d-head');
    const arm = container.querySelector('.d-arm-r');
    expect(head.compareDocumentPosition(arm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('tidak ada antena atas kepala', () => {
    const { container } = render(<DentiMascot />);
    expect(container.querySelector('.d-antenna')).toBeNull();
  });

  it('useDentiDirector menjalankan rangkaian berurutan lalu kembali ke dasar', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDentiDirector('idle'));
    act(() => result.current.sequence([['wake'], ['wave', 2000]]));
    expect(result.current.state).toBe('wake');
    act(() => { vi.advanceTimersByTime(6000); });
    expect(result.current.state).toBe('wave');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.state).toBe('idle');
    vi.useRealTimers();
  });

  it('useDentiDirector: perubahan dasar saat rangkaian berjalan tidak memotong, lalu dipakai setelahnya', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ base }) => useDentiDirector(base), { initialProps: { base: 'scan' } });
    act(() => result.current.play('celebrate', 3000));
    rerender({ base: 'idle' });
    expect(result.current.state).toBe('celebrate');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('idle');
    rerender({ base: 'sleep' });
    expect(result.current.state).toBe('sleep');
    vi.useRealTimers();
  });

  it('useDentiDirector memainkan state sementara lalu kembali', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDentiDirector('idle'));
    act(() => result.current.play('call', 3000));
    expect(result.current.state).toBe('call');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('idle');
    vi.useRealTimers();
  });
});

describe('Maskot Denti — kelengkapan state', () => {
  const css = readFileSync(resolve(__dirname, '../components/mascot/denti.css'), 'utf8');

  it('setiap state punya aturan CSS (kecuali idle sebagai dasar)', () => {
    const tanpaAturan = DENTI_STATES.filter((s) => s !== 'idle' && !css.includes(`data-state="${s}"`));
    expect(tanpaAturan).toEqual([]);
  });

  it('state sekali-putar punya durasi bawaan agar kembali ke dasar', () => {
    for (const s of ['wink', 'cheer', 'jump', 'bow', 'shrug', 'cool', 'sigh', 'idea', 'confused', 'peek', 'excited', 'salute',
      'angry', 'cry', 'dizzy', 'stretch', 'search', 'phone', 'coffee', 'flex']) {
      expect(DENTI_DURATIONS[s]).toBeGreaterThan(0);
    }
  });
});
