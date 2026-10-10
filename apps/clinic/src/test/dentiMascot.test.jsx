import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import DentiMascot, { useDentiDirector } from '../components/mascot/DentiMascot';

describe('Maskot Denti', () => {
  it('merender rig lengkap dengan state & mode anak', () => {
    const { container } = render(<DentiMascot state="call" kid size={200} />);
    const svg = screen.getByRole('img', { name: /Denti/ });
    expect(svg).toHaveAttribute('data-state', 'call');
    expect(svg).toHaveAttribute('data-kid', 'true');
    for (const part of ['.d-root', '.d-head', '.d-arm-l', '.d-arm-r', '.d-eye-open', '.d-eye-happy', '.d-waves', '.d-chest']) {
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
