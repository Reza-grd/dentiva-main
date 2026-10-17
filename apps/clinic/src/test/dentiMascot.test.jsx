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

describe('Maskot Denti — sistem LOD & render HD (A1)', () => {
  it('memilih LOD otomatis berdasarkan size (<=72 mini, <=160 standar, >160 hero) dan menghormati prop lod eksplisit', () => {
    const { container, rerender } = render(<DentiMascot size={58} />);
    const svg = container.querySelector('svg.denti');
    expect(svg).toHaveAttribute('data-lod', 'mini');
    expect(svg).toHaveAttribute('shape-rendering', 'geometricPrecision');
    // Dimensi piksel dibulatkan ke bilangan bulat (58 * 480 / 400 = 69.6 -> 70)
    expect(svg).toHaveAttribute('width', '58');
    expect(svg).toHaveAttribute('height', '70');

    rerender(<DentiMascot size={68} />);
    expect(container.querySelector('svg.denti')).toHaveAttribute('data-lod', 'mini');

    rerender(<DentiMascot size={96} />);
    expect(container.querySelector('svg.denti')).toHaveAttribute('data-lod', 'standar');

    rerender(<DentiMascot size={160} />);
    expect(container.querySelector('svg.denti')).toHaveAttribute('data-lod', 'standar');

    rerender(<DentiMascot size={220} />);
    expect(container.querySelector('svg.denti')).toHaveAttribute('data-lod', 'hero');

    // Prop lod eksplisit mengesampingkan ukuran otomatis
    rerender(<DentiMascot size={220} lod="mini" />);
    expect(container.querySelector('svg.denti')).toHaveAttribute('data-lod', 'mini');

    rerender(<DentiMascot size={58} lod="hero" />);
    expect(container.querySelector('svg.denti')).toHaveAttribute('data-lod', 'hero');
  });

  it('LOD mini bebas dari elemen <filter> dan atribut filter="url(...)" serta mempertebal garis utama', () => {
    const { container: miniContainer } = render(<DentiMascot size={58} />);
    expect(miniContainer.querySelectorAll('filter').length).toBe(0);
    expect(miniContainer.querySelectorAll('[filter]').length).toBe(0);

    const { container: heroContainer } = render(<DentiMascot size={220} />);
    const miniBodyStroke = Number(miniContainer.querySelector('.d-body > path').getAttribute('stroke-width'));
    const heroBodyStroke = Number(heroContainer.querySelector('.d-body > path').getAttribute('stroke-width'));
    expect(miniBodyStroke).toBeGreaterThan(heroBodyStroke);
    expect(miniBodyStroke).toBeGreaterThanOrEqual(5);
  });

  it('semua 93 state tetap valid pada setiap tingkat LOD (mini, standar, hero)', () => {
    expect(DENTI_STATES.length).toBe(93);
    for (const lod of ['mini', 'standar', 'hero']) {
      for (const st of ['idle', 'happy', 'talk', 'scan', 'call', 'celebrate', 'party', 'shield', 'money']) {
        const { container, unmount } = render(<DentiMascot state={st} lod={lod} />);
        const svg = container.querySelector('svg.denti');
        expect(svg).toHaveAttribute('data-state', st);
        expect(svg).toHaveAttribute('data-lod', lod);
        unmount();
      }
    }
  });
});

describe('Maskot Denti — polesan A1b (orbit, pegas lompat, glow hero, kontras tepi mini)', () => {
  const css = readFileSync(resolve(__dirname, '../components/mascot/denti.css'), 'utf8');

  it('(1) partikel orbit mengitari lintasan menggunakan CSS offset-path tanpa SMIL <animateMotion>', () => {
    const { container } = render(<DentiMascot size={220} />);
    expect(container.querySelectorAll('animateMotion').length).toBe(0);
    const dots = container.querySelectorAll('.d-orbit-dot');
    expect(dots.length).toBe(2);
    expect(dots[0]).toHaveAttribute('cx', '0');
    expect(dots[0]).toHaveAttribute('cy', '0');
    expect(css).toMatch(/\.denti\s+\.d-orbit-dot\s*\{[^}]*offset-path:\s*path\(/);
    expect(css).toMatch(/@keyframes\s+d-orbit-move\s*\{[\s\S]*?offset-distance:\s*100%/);
  });

  it('(2) animasi lompat/celebrate memiliki gerak pegas anggota tubuh & overshoot vertikal tanpa scale() pada seluruh badan', () => {
    expect(css).toContain('d-celebrate-jump');
    expect(css).toContain('d-celebrate-arm-l');
    expect(css).toContain('d-celebrate-head');
    expect(css).toContain('d-celebrate-fin-l');
    for (const kf of ['d-celebrate-jump', 'd-jump', 'd-bounce', 'd-hop', 'd-v-body', 'd-call-root', 'd-wk-root', 'd-spin', 'd-surprise', 'd-thx-root']) {
      const match = css.match(new RegExp(`@keyframes\\s+${kf}\\s*\\{(?:\\s*(?:from|to|[\\d%,\\s]+)\\s*\\{[^}]*\\})+\\s*\\}`));
      expect(match, `keyframe ${kf} harus ada`).not.toBeNull();
      expect(match[0]).not.toContain('scale(');
    }
  });

  it('(3) LOD hero & standar memulihkan pendaran cahaya visor/mata/dada via radialGradient tanpa <filter>', () => {
    const { container: hero } = render(<DentiMascot size={220} />);
    expect(hero.querySelectorAll('filter').length).toBe(0);
    expect(hero.querySelector('.d-visor-glow')).not.toBeNull();
    expect(hero.querySelectorAll('.d-eye-glow').length).toBeGreaterThanOrEqual(2);
    expect(hero.querySelector('.d-mouth-glow')).not.toBeNull();
    expect(hero.querySelector('.d-chest-glow')).not.toBeNull();

    const { container: mini } = render(<DentiMascot size={58} />);
    expect(mini.querySelector('.d-visor-glow')).toBeNull();
    expect(mini.querySelector('.d-eye-glow')).toBeNull();
    expect(mini.querySelector('.d-chest-glow')).toBeNull();
  });

  it('(4) kontras warna Denti Teal (A1c) memenuhi standar WCAG: outline terang vs #FFFFFF >= 3:1, tepi gelap vs #0B1220 >= 3:1, wajah #5EEAD4 vs visor #0B1220 >= 4.5:1', () => {
    const relLum = (hex) => {
      const n = parseInt(hex.replace('#', ''), 16);
      const chans = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * chans[0] + 0.7152 * chans[1] + 0.0722 * chans[2];
    };
    const contrast = (hexA, hexB) => {
      const l1 = relLum(hexA);
      const l2 = relLum(hexB);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    // 1. Outline tema terang (#163047) vs putih (#FFFFFF) >= 3:1 (aktual ~13.57:1) & vs enamel (#F8FAFC) >= 3:1
    expect(contrast('#163047', '#FFFFFF')).toBeGreaterThanOrEqual(3.0);
    expect(contrast('#163047', '#F8FAFC')).toBeGreaterThanOrEqual(3.0);

    // 2. Tepi luar tema gelap (--d-outline: #5EEAD4) vs latar gelap (#0B1220) >= 3:1 (aktual ~12.66:1)
    expect(css).toMatch(/\.dark\s+\.denti[^{]*\{[^}]*--d-outline:\s*#5EEAD4/i);
    expect(contrast('#5EEAD4', '#0B1220')).toBeGreaterThanOrEqual(3.0);

    // 3. Wajah/mata/mulut (#5EEAD4) vs visor (#0B1220) >= 4.5:1 (aktual ~12.66:1)
    const { container } = render(<DentiMascot size={220} />);
    const visorFill = container.querySelector('.d-visor > path').getAttribute('fill');
    const eyeFill = container.querySelector('.d-eye-l').getAttribute('fill');
    const smileStroke = container.querySelector('.d-mouth-smile').getAttribute('stroke');
    expect(visorFill).toBe('#0B1220');
    expect(eyeFill).toBe('#5EEAD4');
    expect(smileStroke).toBe('#5EEAD4');
    expect(contrast(eyeFill, visorFill)).toBeGreaterThanOrEqual(4.5);
  });

  it('(5) aturan LOD G1/A1c: 0 <filter> di semua LOD, mini 0 gradien & stroke >= 13, standar <= 1 gradien, hero <= 3 gradien, ID unik per instans', () => {
    const { container: mini } = render(<DentiMascot size={58} />);
    expect(mini.querySelectorAll('filter, [filter]').length).toBe(0);
    expect(mini.querySelectorAll('linearGradient, radialGradient').length).toBe(0);
    expect(Number(mini.querySelector('.d-body > path').getAttribute('stroke-width'))).toBeGreaterThanOrEqual(13);

    const { container: standar } = render(<DentiMascot size={120} />);
    expect(standar.querySelectorAll('filter, [filter]').length).toBe(0);
    expect(standar.querySelectorAll('linearGradient, radialGradient').length).toBeLessThanOrEqual(1);
    expect(Number(standar.querySelector('.d-body > path').getAttribute('stroke-width'))).toBe(7);

    const { container: hero } = render(<DentiMascot size={220} />);
    expect(hero.querySelectorAll('filter, [filter]').length).toBe(0);
    expect(hero.querySelectorAll('linearGradient, radialGradient').length).toBeLessThanOrEqual(3);
    expect(Number(hero.querySelector('.d-body > path').getAttribute('stroke-width'))).toBe(4);

    // Dua instans Denti di satu halaman memiliki seluruh ID defs unik
    const { container: dual } = render(<><DentiMascot size={220} /><DentiMascot size={220} /></>);
    const allIds = [...dual.querySelectorAll('defs [id]')].map((el) => el.id);
    expect(allIds.length).toBeGreaterThan(0);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('(6) alis state sorry (.d-lids) dan worried (.d-brows-w) berupa garis lengkung ramah (#5EEAD4, fill="none"), bukan balok poligon gelap', () => {
    const { container } = render(<DentiMascot state="sorry" size={220} />);
    const lids = container.querySelector('.d-lids');
    const browsW = container.querySelector('.d-brows-w');
    expect(lids.getAttribute('fill')).toBe('none');
    expect(lids.getAttribute('stroke')).toBe('#5EEAD4');
    expect(browsW.getAttribute('fill')).toBe('none');
    expect(browsW.getAttribute('stroke')).toBe('#5EEAD4');
  });
});

