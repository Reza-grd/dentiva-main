import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

const check = vi.fn();
const relaunch = vi.fn();
vi.mock('@tauri-apps/plugin-updater', () => ({ check: (...a) => check(...a) }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: (...a) => relaunch(...a) }));
// eslint-disable-next-line import/first
import DesktopUpdater from '../components/common/DesktopUpdater';

const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };
const advance = async (ms) => act(async () => { vi.advanceTimersByTime(ms); await flush(); });

describe('Pembaruan otomatis desktop', () => {
  beforeEach(() => { vi.useFakeTimers(); check.mockReset(); relaunch.mockReset(); });
  afterEach(() => vi.useRealTimers());

  it('tidak tampil bila tidak ada versi baru', async () => {
    check.mockResolvedValue(null);
    const { container } = render(<DesktopUpdater />);
    await advance(8000);
    expect(check).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
  });

  it('versi baru: tampil kartu; "Perbarui sekarang" mengunduh, memasang, lalu memulai ulang', async () => {
    const downloadAndInstall = vi.fn(async (cb) => {
      cb({ event: 'Started', data: { contentLength: 100 } });
      cb({ event: 'Progress', data: { chunkLength: 100 } });
      cb({ event: 'Finished', data: {} });
    });
    check.mockResolvedValue({ version: '1.11.0', downloadAndInstall });
    render(<DesktopUpdater />);
    await advance(8000);
    expect(screen.getByText('Dentiva 1.11.0 tersedia')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByText('Perbarui sekarang')); await flush(); });
    expect(downloadAndInstall).toHaveBeenCalled();
    expect(relaunch).toHaveBeenCalled();
  });

  it('"Nanti" menyembunyikan versi itu; gagal cek (offline) tidak menampilkan apa pun', async () => {
    check.mockResolvedValueOnce({ version: '1.11.0', downloadAndInstall: vi.fn() });
    const { container } = render(<DesktopUpdater />);
    await advance(8000);
    fireEvent.click(screen.getByText('Nanti'));
    expect(container).toBeEmptyDOMElement();
    check.mockResolvedValueOnce({ version: '1.11.0', downloadAndInstall: vi.fn() });
    await advance(6 * 60 * 60 * 1000);
    expect(container).toBeEmptyDOMElement();
    check.mockRejectedValueOnce(new Error('offline'));
    await advance(6 * 60 * 60 * 1000);
    expect(container).toBeEmptyDOMElement();
  });

  it('pemasangan gagal: pesan jelas + tombol coba lagi', async () => {
    check.mockResolvedValue({ version: '1.11.0', downloadAndInstall: vi.fn().mockRejectedValue(new Error('net')) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DesktopUpdater />);
    await advance(8000);
    await act(async () => { fireEvent.click(screen.getByText('Perbarui sekarang')); await flush(); });
    expect(screen.getByText(/Pembaruan gagal dipasang/)).toBeInTheDocument();
    expect(screen.getByText('Coba lagi')).toBeInTheDocument();
    expect(relaunch).not.toHaveBeenCalled();
  });
});
